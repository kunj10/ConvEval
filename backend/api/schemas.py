from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field

class TurnIn(BaseModel):
    turn_id: int
    speaker: str
    text: str

class ConversationIn(BaseModel):
    conversation_id: str = "conv_001"
    conversation_type: str = "general"
    turns: list[TurnIn]

class EvaluationRequest(BaseModel):
    conversation: ConversationIn
    facet_ids: list[str] | None = None
    domains: list[str] | None = None

class BatchEvaluationRequest(BaseModel):
    conversations: list[ConversationIn]
    facet_ids: list[str] | None = None
    domains: list[str] | None = None

class FacetResult(BaseModel):
    facet_id: str
    facet_name: str
    domain: str
    score: int
    confidence: float
    evaluation_question: str

class TurnResult(BaseModel):
    turn_id: int
    speaker: str
    text: str
    facet_results: list[FacetResult]
    domain_summaries: dict[str, Any]

class EvaluationResponse(BaseModel):
    conversation_id: str
    conversation_type: str
    turn_results: list[TurnResult]
    overall_summary: dict[str, Any]
    elapsed_seconds: float = 0.0

class HealthResponse(BaseModel):
    status: str
    facets_loaded: int
    pipeline_ready: bool
    version: str

class FacetsListResponse(BaseModel):
    total: int
    facets: list[dict[str, Any]]

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    results: Any = None
    error: str | None = None
