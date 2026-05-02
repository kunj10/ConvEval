# ConvEval: AI Generation & Prompt Log

This document serves as the prompt log and architectural specification used to generate the **ConvEval** platform using Advanced Agentic AI. 

The system was built iteratively through pair-programming between the User and the AI. Below are the core macro-level prompts that drove the generation of each phase of the codebase.

---

## Phase 1: Data & Facet Design
> "Design a production-ready conversation evaluation benchmark. Load 300 facets from a CSV covering Linguistic Quality, Pragmatics, Safety, and Emotion — 75 facets per domain. Engineer additional columns: prompt templates, complexity tiers, confidence priors, aggregation keys, domain encodings. Generate 50 sample conversations with synthetic scores as the evaluation dataset."

**Files:** `backend/core/preprocessing.py`, `scripts/generate_data.py`, `data/Facets_Assignment.csv`

---

## Phase 2: Evaluation Pipeline
> "Build a ConvEvalPipeline that scores every conversation turn on every facet using an instruction-tuned open-weights LLM — Qwen2-7B-Instruct or Llama3-8B-Instruct. No one-shot prompting — use structured prompt templates filled at inference time. Extract per-facet confidence from token log-probabilities. Provide a deterministic heuristic fallback for no-GPU environments, seeded by (text, facet_id) for reproducibility. Cache results by turn hash to avoid redundant inference. Architecture must scale to 5000+ facets with zero code changes — facets live entirely in the CSV."

**Files:** `backend/pipeline/evaluator.py`

---

## Phase 3: Fine-Tuning Module
> "Add an optional LoRA fine-tuning module using PEFT and TRL. Format training examples from the scored CSV into instruction-tuning format. The model learns a general evaluation skill — adding new facets at inference time requires no retraining."

**Files:** `backend/models/finetune.py`

---

## Phase 4: FastAPI Backend
> "Expose the pipeline via FastAPI with full CORS support. Endpoints: `/health`, `/facets` with domain filtering, `/evaluate` for single conversations, `/evaluate/batch` using BackgroundTasks with job ID tracking, `/evaluate/upload` for JSON file upload, `/samples` and `/samples/{id}/scores` for the pre-computed dataset."

**Files:** `backend/api/main.py`, `backend/api/schemas.py`

---

## Phase 5: Initial React Frontend
> "Build a React and Vite frontend with a dark UI. Dashboard page showing API health status, per-domain facet counts, architecture overview cards, and a sample conversation browser with score summaries. Evaluate page with a live JSON editor, domain toggle checkboxes, JSON file upload, per-turn domain radar chart using Recharts, and a searchable filterable sortable table of all 300 facet scores with confidence pills and score bars."

**Files:** `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/EvaluatePage.jsx`, `frontend/src/components/`

---

## Phase 6: Frontend Overhaul ("Swiss Grid" Architectural Redesign)
> "Act as an expert React & Tailwind Developer. Overhaul the current Dashboard to match the BentoML aesthetic. Use a High-Contrast Dark Mode design system. Background: #050505, Surface: #0A0A0A, Text: #FFFFFF. Use a rigid 12-column CSS Grid. Remove all gradients and drop shadows. Use 1px borders with rgba(255, 255, 255, 0.1). Create a 'BentoCard' component. The UI must feel like a premium, professional engineering tool, not a consumer app. Additionally, create a minimalist logo icon of a single, continuous, thin white line forming an abstract infinity loop composed of small nodes."

**Files:** `frontend/src/App.jsx`, `frontend/src/pages/Dashboard.jsx`, `frontend/tailwind.config.js`, `frontend/src/components/BentoCard.jsx`

---

## Phase 7: Tests and Infrastructure
> "Write 27 pytest tests covering preprocessing column engineering, heuristic scorer determinism and range, pipeline evaluation structure, domain filtering, facet ID filtering, result caching, architectural scaling to 600 facets, and edge cases including empty text, special characters, and long inputs. Dockerize with separate backend and frontend Dockerfiles, Nginx multi-stage build for the frontend, and a `docker-compose.yml` for one-command deployment. Include a `.env.example` to toggle `USE_LLM`."

**Files:** `backend/tests/test_pipeline.py`, `docker/Dockerfile.frontend`, `docker/Dockerfile.backend`, `docker-compose.yml`, `.env.example`

---

*Note: This log captures the macro-level prompts that drove each phase. Iterative micro-interactions for debugging, UI polishing, fixing test assertions, and refining output structure occurred between these major phases.*
