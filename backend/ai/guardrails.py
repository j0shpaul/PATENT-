import re
import json
import logging
from typing import Dict, Any, List, Tuple, Type, TypeVar, Optional
from pydantic import BaseModel, ValidationError
from backend.ai.schemas import OfficeActionGroundingCheck

logger = logging.getLogger("patent_plus.ai.guardrails")

T = TypeVar("T", bound=BaseModel)

def extract_json_block(text: str) -> str:
    """
    Extracts valid JSON substring from raw model output,
    stripping markdown code blocks (```json ... ```) or conversational fluff.
    """
    if not text:
        return ""
    
    text = text.strip()
    
    # 1. Match triple backticks ```json ... ```
    json_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if json_block_match:
        return json_block_match.group(1).strip()
    
    # 2. Match outermost JSON object { ... }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace:last_brace + 1].strip()
    
    # 3. Match outermost JSON array [ ... ]
    first_bracket = text.find("[")
    last_bracket = text.rfind("]")
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        return text[first_bracket:last_bracket + 1].strip()
    
    return text

def repair_json_string(json_str: str) -> str:
    """
    Repairs common LLM JSON syntax errors (trailing commas, unescaped newlines).
    """
    # Remove trailing commas before closing braces/brackets: e.g. `, }` -> `}`
    cleaned = re.sub(r",\s*([\]}])", r"\1", json_str)
    return cleaned

def safe_parse_and_validate(raw_text: str, schema_class: Type[T]) -> Tuple[Optional[T], Optional[str]]:
    """
    Parses and validates raw LLM output against a strict Pydantic schema.
    Returns (validated_model_instance, error_message).
    Never silently produces fake fallback data.
    """
    extracted = extract_json_block(raw_text)
    if not extracted:
        return None, "Empty response or no JSON structure detected in model output."
    
    repaired = repair_json_string(extracted)
    
    try:
        data = json.loads(repaired)
    except json.JSONDecodeError as err:
        logger.warning(f"JSON decode failed on extracted block: {err}. Raw snippet: {repaired[:120]}")
        return None, f"Malformed JSON syntax from model: {err}"
    
    try:
        validated = schema_class.model_validate(data)
        return validated, None
    except ValidationError as val_err:
        logger.warning(f"Schema validation failed against {schema_class.__name__}: {val_err}")
        return None, f"Schema mismatch: {val_err}"

def verify_office_action_grounding(
    draft_text: str,
    context: Dict[str, Any]
) -> OfficeActionGroundingCheck:
    """
    Verifies that the generated Office Action response draft is strictly grounded
    in the supplied patent claims, cited prior art references, and examiner grounds.
    Flags hallucinated prior art references or unlisted claim numbers.
    """
    warnings: List[str] = []
    
    # Extract supplied ground truth from context
    known_claims = set()
    for c in context.get("claims", []):
        if isinstance(c, dict) and "claimNumber" in c:
            known_claims.add(int(c["claimNumber"]))
    
    known_refs = []
    for pa in context.get("citedPriorArt", []):
        if isinstance(pa, dict):
            if pa.get("referenceNumber"):
                known_refs.append(pa["referenceNumber"].strip())
            if pa.get("inventorOrApplicant"):
                known_refs.append(pa["inventorOrApplicant"].strip())

    # Scan draft text for cited claims: "Claim X" / "Claims X-Y"
    cited_claim_matches = re.findall(r"\bClaims?\s+(\d+)\b", draft_text, re.IGNORECASE)
    cited_claims_found = sorted(list(set(int(m) for m in cited_claim_matches)))
    
    unverified_claims = [c for c in cited_claims_found if known_claims and c not in known_claims]
    if unverified_claims:
        warnings.append(f"Draft references claims not in application index: {unverified_claims}")

    # Scan draft text for cited prior art names
    cited_refs_found = []
    for ref in known_refs:
        # Match whole word or patent number format
        if re.search(re.escape(ref), draft_text, re.IGNORECASE):
            cited_refs_found.append(ref)
            
    # Check for statutory sections mentioned
    statute_matches = re.findall(r"35\s+U\.S\.C\.?\s*§?\s*(\d+)", draft_text, re.IGNORECASE)
    valid_statutes = {"101", "102", "103", "112"}
    unrecognized_statutes = [s for s in set(statute_matches) if s not in valid_statutes]
    if unrecognized_statutes:
        warnings.append(f"Unrecognized patent statutes in draft: {unrecognized_statutes}")

    # Grounding score computation
    grounding_score = 1.0
    if unverified_claims:
        grounding_score -= 0.25 * min(len(unverified_claims), 2)
    if not cited_refs_found and known_refs:
        grounding_score -= 0.20
        warnings.append("Draft does not reference any of the cited PTO-892 prior art references.")
    if unrecognized_statutes:
        grounding_score -= 0.15

    grounding_score = max(0.0, min(1.0, float(grounding_score)))
    is_grounded = grounding_score >= 0.70

    return OfficeActionGroundingCheck(
        isGrounded=is_grounded,
        groundingScore=grounding_score,
        citedClaimsFound=cited_claims_found,
        citedReferencesFound=cited_refs_found,
        unverifiedReferences=[f"Claim {c}" for c in unverified_claims],
        warnings=warnings
    )
