from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ==============================================================================
# 1. Evidence Grounding Reference Schema
# ==============================================================================

class GroundedEvidenceRef(BaseModel):
    sourceType: str = Field(..., description="Source type: 'PATENT_SPEC', 'CLAIM', 'OFFICE_ACTION', 'PRIOR_ART', 'PROSECUTION_HISTORY'")
    identifier: str = Field(..., description="Identifier (e.g. 'Claim 1', 'US 9,438,682 B1', 'PTO-892', 'Non-Final Rejection 2018-03-14')")
    excerpt: Optional[str] = Field(None, description="Direct verbatim excerpt from source evidence")
    relevance: str = Field(..., description="Explanation of why this evidence supports the finding")

# ==============================================================================
# 2. Multi-Agent Specialist Schemas (RocketRide 4-Agent Topology)
# ==============================================================================

class TechnicalAgentOutput(BaseModel):
    agentName: str = "01. Technical & Innovation Specialist"
    technicalScore: int = Field(..., ge=0, le=100, description="Technical centrality score 0-100")
    technologyRisk: str = Field(..., description="'LOW' | 'MODERATE' | 'HIGH'")
    productRelevance: int = Field(..., ge=0, le=100, description="Commercial product alignment 0-100")
    citationPercentile: int = Field(..., ge=0, le=100, description="Citation authority percentile 0-100")
    keyFindings: List[str] = Field(default_factory=list, description="Core technical findings")
    technicalRationale: str = Field(..., description="Technical executive summary")
    evidence: List[GroundedEvidenceRef] = Field(default_factory=list, description="Grounded source evidence")

class ValuationAgentOutput(BaseModel):
    agentName: str = "02. Financial & Commercial Valuation Specialist"
    valuationScore: int = Field(..., ge=0, le=100, description="Valuation conviction score 0-100")
    renewalRoi: float = Field(..., ge=0.0, description="Projected ROI multiplier on annuity fee")
    tier: str = Field(..., description="'TIER 1 (HIGH CONVICTION)' | 'TIER 2 (CORE DEFENSIVE)' | 'TIER 3 (PRUNING CANDIDATE)'")
    annualCostUSD: float = Field(..., ge=0.0, description="Upcoming maintenance renewal fee in USD")
    commercialRisk: str = Field(..., description="'LOW' | 'MEDIUM' | 'HIGH'")
    valuationRationale: str = Field(..., description="Financial executive summary")
    evidence: List[GroundedEvidenceRef] = Field(default_factory=list)

class LegalAgentOutput(BaseModel):
    agentName: str = "03. Patent Prosecution & Legal Risk Analyst"
    legalScore: int = Field(..., ge=0, le=100, description="Legal defensibility score 0-100")
    hasOfficeAction: bool = Field(False, description="Whether an active office action is pending")
    rejection102Risk: bool = Field(False, description="35 U.S.C. 102 anticipation rejection risk")
    rejection103Risk: bool = Field(False, description="35 U.S.C. 103 obviousness rejection risk")
    prosecutionRisk: str = Field(..., description="'LOW' | 'MODERATE' | 'HIGH'")
    claimBreadth: str = Field(..., description="'BROAD' | 'NARROW' | 'BALANCED'")
    legalRationale: str = Field(..., description="Legal prosecution executive summary")
    evidence: List[GroundedEvidenceRef] = Field(default_factory=list)

class CriticAgentOutput(BaseModel):
    agentName: str = "04. Adversarial Critic & Cross-Agent Consensus"
    criticScore: int = Field(..., ge=0, le=100, description="Adversarial resilience score 0-100")
    confidencePenalty: int = Field(0, ge=0, le=100, description="Confidence penalty percentage")
    contradictions: List[str] = Field(default_factory=list, description="Cross-agent contradictions discovered")
    counterarguments: List[str] = Field(default_factory=list, description="Adversarial counterarguments")
    criticRecommendation: str = Field(..., description="'RENEW' | 'ALLOW TO LAPSE' | 'PROCEED WITH CAUTION' | 'ESCALATE TO HUMAN REVIEW'")

class MultiAgentConsensusOutput(BaseModel):
    compositeScore: int = Field(..., ge=0, le=100, description="Consensus composite score 0-100")
    confidenceScore: float = Field(..., ge=0.0, le=1.0, description="Calibrated confidence score 0.0-1.0")
    recommendation: str = Field(..., description="'RENEW' | 'LAPSE'")
    status: str = Field(..., description="'AUTO_RECOMMENDATION' | 'HUMAN_REVIEW' | 'COMPLETED'")
    requiresHumanReview: bool = Field(False, description="Flag indicating human review escalation")
    escalationReason: Optional[str] = Field(None, description="Reason for escalation to Human Review queue")
    contradictions: List[str] = Field(default_factory=list)
    agents: Dict[str, Any] = Field(..., description="Outputs from technical, valuation, legal, and critic specialists")
    telemetry: Dict[str, Any] = Field(default_factory=dict, description="Execution telemetry (tokens, cost, duration, provider, model)")

# ==============================================================================
# 3. Office Action AI Schemas
# ==============================================================================

class OfficeActionGroundingCheck(BaseModel):
    isGrounded: bool = True
    groundingScore: float = Field(1.0, ge=0.0, le=1.0)
    citedClaimsFound: List[int] = Field(default_factory=list)
    citedReferencesFound: List[str] = Field(default_factory=list)
    unverifiedReferences: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

class OfficeActionResponseDraftOutput(BaseModel):
    draft: str = Field(..., description="Complete formal 37 C.F.R. § 1.111 response text")
    provider: str = Field(..., description="AI Provider identifier")
    model: str = Field(..., description="Model identifier")
    status: str = "SUCCESS"
    grounding: OfficeActionGroundingCheck = Field(default_factory=OfficeActionGroundingCheck)
    responseDraftedAt: str
