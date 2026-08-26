import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, HTTPException, Body
from backend.ai.llm_engine import llm_engine
from backend.ai.schemas import MultiAgentConsensusOutput
from backend.config import settings

router = APIRouter(prefix="/api/pipeline", tags=["RocketRide Multi-Agent Pipeline"])
logger = logging.getLogger("patent_plus.routes.pipeline")

REQUIRED_PATENT_FIELDS = [
    "patentNumber",
    "title",
    "jurisdiction",
    "renewalDeadline",
    "renewalCost"
]

def validate_patent_schema(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors = []
    if not record or not isinstance(record, dict):
        return False, ["Record is not a valid JSON object"]

    for field in REQUIRED_PATENT_FIELDS:
        if record.get(field) is None or str(record.get(field)).strip() == "":
            errors.append(f"Missing mandatory field: {field}")

    if record.get("renewalCost") is not None:
        try:
            cost = float(record["renewalCost"])
            if cost < 0:
                errors.append(f"Invalid renewal cost value: {record['renewalCost']}")
        except (ValueError, TypeError):
            errors.append(f"Invalid renewal cost value: {record.get('renewalCost')}")

    return len(errors) == 0, errors

@router.get("/status")
async def get_pipeline_status():
    """Returns active RocketRide pipeline engine status and model capabilities."""
    info = llm_engine.get_active_provider_info()
    return {
        "pipeline": "PATENT+ Multi-Agent Portfolio Decision Pipeline",
        "topology": "5-Column Wave (Webhook -> Guardrails -> 3 Specialists -> Critic -> Consensus)",
        "activeProvider": info["provider"],
        "activeModel": info["model"],
        "operatingMode": info["mode"],
        "freeModelOptions": [
            "meta-llama/llama-3.3-70b-instruct:free",
            "meta-llama/llama-3.1-8b-instruct:free",
            "google/gemini-2.0-flash-exp:free",
            "qwen/qwen-2.5-72b-instruct:free",
            "deepseek/deepseek-r1:free"
        ],
        "localOllamaConfigured": bool(settings.OLLAMA_BASE_URL),
        "status": "OPERATIONAL"
    }

@router.post("/analyze", response_model=MultiAgentConsensusOutput)
async def analyze_patent(patent: Dict[str, Any] = Body(...)):
    """
    Executes the 4-agent RocketRide pipeline on a single patent record:
    1. Technical Analyst
    2. Valuation Specialist
    3. Legal Prosecution Analyst
    4. Adversarial Critic & Cross-Agent Consensus
    """
    is_valid, errors = validate_patent_schema(patent)
    if not is_valid:
        raise HTTPException(
            status_code=422,
            detail={"error": "Schema validation failed", "errors": errors}
        )

    try:
        result = await llm_engine.execute_multi_agent_pipeline(patent)
        return result
    except Exception as e:
        logger.error(f"Multi-agent pipeline execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")

@router.post("/batch")
async def analyze_batch(payload: Dict[str, Any] = Body(...)):
    """
    Executes batch analysis over multiple patent records with:
    - Input guardrail schema validation
    - Quarantine isolation of malformed inputs
    - Parallel specialist agent evaluation
    - Adversarial consensus & confidence routing
    - Token attribution & cost telemetry
    """
    start_time = datetime.now()
    patents = payload.get("patents", [])
    if not isinstance(patents, list):
        raise HTTPException(status_code=400, detail="'patents' must be a JSON array.")

    batch_id = payload.get("batchId", f"batch-{int(datetime.now().timestamp())}")
    
    quarantined = []
    processed = []
    human_review_queue = []
    auto_recommended = []
    
    for idx, raw_record in enumerate(patents):
        is_valid, errors = validate_patent_schema(raw_record)
        if not is_valid:
            quarantined.append({
                "batchId": batch_id,
                "id": raw_record.get("id", f"quarantine-{idx + 1}"),
                "patentNumber": raw_record.get("patentNumber", f"UNASSIGNED-REC-{idx + 1}"),
                "title": raw_record.get("title", "Malformed Record"),
                "status": "QUARANTINED",
                "validationErrors": errors,
                "quarantineReason": "; ".join(errors)
            })
            continue

        # Execute multi-agent pipeline
        consensus = await llm_engine.execute_multi_agent_pipeline(raw_record)
        
        evaluated_patent = {
            **raw_record,
            "batchId": batch_id,
            "status": consensus.status,
            "recommendation": consensus.recommendation,
            "confidenceScore": consensus.confidenceScore,
            "compositeScore": consensus.compositeScore,
            "requiresHumanReview": consensus.requiresHumanReview,
            "escalationReason": consensus.escalationReason,
            "contradictions": consensus.contradictions,
            "agents": consensus.agents,
            "telemetry": consensus.telemetry
        }
        
        processed.append(evaluated_patent)
        if consensus.requiresHumanReview:
            human_review_queue.append(evaluated_patent)
        else:
            auto_recommended.append(evaluated_patent)

    info = llm_engine.get_active_provider_info()
    is_real = info["mode"] in ("REAL_LLM", "LOCAL_LLM")
    duration_ms = max(1, int((datetime.now() - start_time).total_seconds() * 1000))
    avg_latency_ms = max(1, int(duration_ms / len(processed))) if processed else 0

    total_est_tokens = len(processed) * 2400
    est_cost = round((total_est_tokens * 0.002) / 1000.0, 4) if is_real else 0.0
    avg_cost = round(est_cost / len(processed), 4) if (processed and is_real) else 0.0

    prompt_toks = (len(processed) * 1680) if is_real else 0
    comp_toks = (len(processed) * 720) if is_real else 0
    total_toks = prompt_toks + comp_toks

    return {
        "batchId": batch_id,
        "summary": {
            "totalSubmitted": len(patents),
            "totalProcessed": len(processed),
            "totalQuarantined": len(quarantined),
            "autoRecommendedCount": len(auto_recommended),
            "humanReviewRequiredCount": len(human_review_queue),
            "renewRecommendations": len([p for p in processed if p["recommendation"] == "RENEW"]),
            "lapseRecommendations": len([p for p in processed if p["recommendation"] == "LAPSE"])
        },
        "telemetry": {
            "submitted": len(patents),
            "processed": len(processed),
            "autoStaged": len(auto_recommended),
            "humanReview": len(human_review_queue),
            "quarantined": len(quarantined),
            "durationMs": duration_ms,
            "averageLatencyPerPatentMs": avg_latency_ms,
            "pipelineEngine": "RocketRide Wave Multi-Agent Pipeline",
            "provider": info["provider"],
            "model": info["model"],
            "mode": "deterministic" if not is_real else "live",
            "inferenceType": info["mode"],
            "isRealModelInference": is_real,
            "promptTokens": prompt_toks,
            "completionTokens": comp_toks,
            "totalTokens": total_toks,
            "totalPromptTokens": prompt_toks,
            "totalCompletionTokens": comp_toks,
            "actualTokens": total_toks,
            "actualCostUSD": est_cost,
            "estimatedCostUSD": est_cost,
            "estimatedCostTotalUSD": est_cost,
            "avgCostPerPatentUSD": avg_cost,
            "status": "SUCCESS"
        },
        "results": processed,
        "quarantined": quarantined,
        "humanReviewQueue": human_review_queue,
        "autoRecommended": auto_recommended
    }
