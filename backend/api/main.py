"""
ConvEval FastAPI Backend
Production-ready conversation evaluation API
"""
from __future__ import annotations
import logging, time, uuid, json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from backend.api.schemas import (
    ConversationIn, EvaluationRequest, EvaluationResponse,
    FacetsListResponse, HealthResponse, BatchEvaluationRequest,
    JobStatusResponse,
)
from backend.pipeline.evaluator import ConvEvalPipeline
from backend.core.preprocessing import load_and_preprocess_facets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="ConvEval API", version="1.0.0", docs_url="/docs")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

DATA_DIR = Path(__file__).parent.parent.parent / "data"
FACETS_CSV = DATA_DIR / "Facets_Assignment.csv"

pipeline: ConvEvalPipeline | None = None
facets_df: pd.DataFrame | None = None
_job_store: dict[str, dict] = {}


@app.on_event("startup")
async def startup_event():
    global pipeline, facets_df
    facets_df = load_and_preprocess_facets(FACETS_CSV)
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    use_llm = os.getenv("USE_LLM", "false").lower() == "true"
    use_heuristic = not use_llm
    
    pipeline = ConvEvalPipeline(facets_df=facets_df, use_heuristic=use_heuristic)
    logger.info("ConvEval ready — %d facets. LLM Mode: %s", len(facets_df), use_llm)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "facets_loaded": len(facets_df) if facets_df is not None else 0,
            "pipeline_ready": pipeline is not None, "version": "1.0.0"}


@app.get("/facets", tags=["Facets"])
async def list_facets(domain: str | None = None, limit: int = 300):
    if facets_df is None:
        raise HTTPException(503, "Not ready")
    df = facets_df.copy()
    if domain:
        df = df[df["domain"] == domain]
    cols = ["facet_id","facet_name","domain","evaluation_question",
            "scale_labels","complexity_tier","default_confidence_prior"]
    return {"total": len(df.head(limit)), "facets": df.head(limit)[cols].to_dict("records")}


@app.get("/facets/domains", tags=["Facets"])
async def list_domains():
    if facets_df is None:
        raise HTTPException(503, "Not ready")
    return {"domains": facets_df["domain"].unique().tolist(),
            "counts": facets_df["domain"].value_counts().to_dict()}


@app.post("/evaluate", tags=["Evaluation"])
async def evaluate_conversation(request: EvaluationRequest):
    if pipeline is None:
        raise HTTPException(503, "Pipeline not ready")
    start = time.time()
    try:
        result = pipeline.evaluate(
            conversation=request.conversation.model_dump(),
            facet_ids=request.facet_ids,
            domains=request.domains,
        )
        result["elapsed_seconds"] = round(time.time() - start, 3)
        return result
    except Exception as e:
        logger.exception("Evaluation failed")
        raise HTTPException(500, f"Evaluation error: {e}")


@app.post("/evaluate/batch", tags=["Evaluation"])
async def batch_evaluate(request: BatchEvaluationRequest, background_tasks: BackgroundTasks):
    if pipeline is None:
        raise HTTPException(503, "Pipeline not ready")
    job_id = str(uuid.uuid4())
    _job_store[job_id] = {"status": "queued", "progress": 0, "results": None}

    def _run():
        try:
            _job_store[job_id]["status"] = "running"
            results, total = [], len(request.conversations)
            for i, conv in enumerate(request.conversations):
                results.append(pipeline.evaluate(
                    conversation=conv.model_dump(),
                    facet_ids=request.facet_ids,
                    domains=request.domains,
                ))
                _job_store[job_id]["progress"] = round((i+1)/total*100)
            _job_store[job_id].update({"status": "done", "results": results})
        except Exception as e:
            _job_store[job_id].update({"status": "failed", "error": str(e)})

    background_tasks.add_task(_run)
    return {"job_id": job_id, "status": "queued"}


@app.get("/evaluate/batch/{job_id}", tags=["Evaluation"])
async def job_status(job_id: str):
    job = _job_store.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")
    return {"job_id": job_id, **job}


@app.post("/evaluate/upload", tags=["Evaluation"])
async def evaluate_upload(file: UploadFile = File(...), domains: str | None = None):
    if not file.filename.endswith(".json"):
        raise HTTPException(400, "Only JSON files supported")
    content = await file.read()
    try:
        conversation = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(400, f"Invalid JSON: {e}")
    return pipeline.evaluate(conversation=conversation, domains=domains.split(",") if domains else None)


@app.get("/samples", tags=["Data"])
async def get_samples(limit: int = 5):
    p = DATA_DIR / "sample_conversations.json"
    if not p.exists():
        raise HTTPException(404, "Sample data not found")
    convs = json.loads(p.read_text())
    return {"conversations": convs[:limit], "total": len(convs)}


@app.get("/samples/{conversation_id}/scores", tags=["Data"])
async def get_sample_scores(conversation_id: str):
    p = DATA_DIR / "sample_scores.csv"
    if not p.exists():
        raise HTTPException(404, "Sample scores not found")
    df = pd.read_csv(p)
    filtered = df[df["conversation_id"] == conversation_id]
    if filtered.empty:
        raise HTTPException(404, f"Not found: {conversation_id}")
    return {
        "conversation_id": conversation_id,
        "scores": filtered.to_dict("records"),
        "summary": {
            "mean_score": round(filtered["score"].mean(), 3),
            "mean_confidence": round(filtered["confidence"].mean(), 3),
            "by_domain": filtered.groupby("domain")["score"].mean().round(3).to_dict(),
        },
    }
