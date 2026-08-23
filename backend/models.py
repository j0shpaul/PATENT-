from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class FactorBreakdown(BaseModel):
    productRelevance: float = Field(..., description="0-100 Commercial relevance weight 40%")
    citationPercentile: float = Field(..., description="0-100 Citation index weight 25%")
    remainingLifeNormalized: float = Field(..., description="0-100 Remaining life weight 20%")
    inverseRenewalCostPercentile: float = Field(..., description="0-100 Cost efficiency weight 15%")

class PatentModel(BaseModel):
    id: str
    patentNumber: str
    applicationNumber: str
    title: str
    jurisdiction: str  # "US", "EP", "IN"
    applicant: str
    filingDate: str
    grantDate: Optional[str] = None
    expiryDate: str
    
    # Scoring Factors
    productRelevance: float
    citationPercentile: float
    remainingLifeNormalized: float
    renewalCost: float
    inverseRenewalCostPercentile: float
    
    businessValueScore: int
    businessValueTier: str  # "HIGH", "MEDIUM", "LOW"
    businessValueRationale: str
    
    renewalDeadline: str
    renewalStatus: str  # "REVIEW", "RENEW", "LAPSE", "PENDING"
    isFlagged: bool = False
    
    sourceType: str  # "REAL" | "SYNTHETIC"
    sourceProvider: str  # "USPTO_ODP", "EPO_OPS", "CACHED_USPTO", "CACHED_EPO", "SYNTHETIC_GENERATOR"
    sourceIdentifier: Optional[str] = None
    retrievalTimestamp: Optional[str] = None
    sourceMetadata: Optional[Dict[str, Any]] = None
    
    createdAt: str
    updatedAt: str

class ClaimModel(BaseModel):
    id: str
    patentId: str
    claimNumber: int
    claimText: str
    isIndependent: bool = True
    claimType: str = "System"
    status: str = "ACTIVE"

class RejectionGround(BaseModel):
    statute: str  # "35 U.S.C. 102", "35 U.S.C. 103", "35 U.S.C. 112"
    rejectionType: str  # "Anticipation", "Obviousness", "Indefiniteness"
    claimsRejected: List[int]
    citedReferences: List[str]
    examinerAnalysis: str

class PriorArtReference(BaseModel):
    referenceNumber: str
    title: str
    inventorOrApplicant: str
    publicationDate: str
    relevanceSummary: str

class ProsecutionEvent(BaseModel):
    date: str
    eventCode: str
    description: str

class OfficeActionModel(BaseModel):
    id: str
    patentId: str
    patentNumber: str
    applicationNumber: str
    documentDate: str
    examinerName: str
    artUnit: str
    rejectionType: str
    rejectionSummary: str
    rejectionGrounds: List[RejectionGround]
    citedPriorArt: List[PriorArtReference]
    prosecutionHistory: List[ProsecutionEvent]
    rawOfficeActionText: str
    sourceType: str  # "REAL" | "SYNTHETIC"
    sourceProvider: str
    sourceIdentifier: Optional[str] = None
    retrievalTimestamp: Optional[str] = None
    sourceMetadata: Optional[Dict[str, Any]] = None
    
    aiResponseDraft: Optional[str] = None
    aiProviderUsed: Optional[str] = None  # "ANTHROPIC_AI" | "LOCAL_DEMO_AI"
    responseDraftedAt: Optional[str] = None

class DecisionLogModel(BaseModel):
    id: str
    timestamp: str
    patentNumber: str
    patentTitle: str
    decision: str  # "RENEW" | "LAPSE"
    reasoning: str
    actor: str = "Attorney"

class DecisionCreateRequest(BaseModel):
    patentNumber: str
    decision: str  # "RENEW" | "LAPSE"
    reasoning: str
    actor: Optional[str] = "Attorney"

class DashboardStats(BaseModel):
    activePatents: int
    upcomingDeadlines: int
    pendingDecisions: int
    lowValueFlagged: int
    realPatentsCount: int
    syntheticPatentsCount: int
    dataSourceStatus: str  # "LIVE DATA" | "CACHED DATA" | "DEMO DATA"
    aiProviderStatus: str  # "ANTHROPIC AI" | "LOCAL DEMO AI"

class SystemStatusResponse(BaseModel):
    uspto: str  # "LIVE", "CACHED", "UNAVAILABLE"
    epo: str    # "LIVE", "CACHED", "UNAVAILABLE"
    ai: str     # "ANTHROPIC AI", "LOCAL DEMO AI"
    database: str  # "CONNECTED"
    activePatentsTotal: int
    sourceBreakdown: Dict[str, int]
