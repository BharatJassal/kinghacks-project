# backend/server.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ibm.cos import log_decision_to_cos
from schemas import TrustEvaluationPayload, GovernanceResponse
from governance import evaluate_governance

# Optional IBM explanation hook (safe stub)
try:
    from ibm.watsonx import generate_explanation
except ImportError:
    def generate_explanation(flags, trust_score):
        return "Explanation service unavailable."


app = FastAPI(
    title="Human Presence Trust Backend",
    description="Governance and explainability layer for webcam trust evaluation",
    version="1.0.0"
)

# --- CORS (allow React frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hackathon-safe; restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Human Presence Trust Backend"
    }


@app.post("/evaluate", response_model=GovernanceResponse)
def evaluate(payload: TrustEvaluationPayload):
    payload_dict = payload.dict()

    flags, risk_level = evaluate_governance(payload_dict)

    explanation = generate_explanation(flags, payload.trustScore)

    decision = {
        "risk_level": risk_level,
        "flags": flags,
        "explanation": explanation
    }

    log_decision_to_cos(payload_dict, decision)

    return GovernanceResponse(**decision)
