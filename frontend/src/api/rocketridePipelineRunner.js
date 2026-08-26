// ==============================================================================
// PATENT+ — RocketRide Pipeline Execution & Multi-Agent Orchestration Engine
// ==============================================================================

import { executePipelineBatchAPI } from './client.js';

export const PIPELINE_PROJECT_ID = '7f8b9e12-4c3a-4a89-9e52-bd6198f12a34';
export const PIPELINE_NAME = 'PATENT+ Multi-Agent Portfolio Decision Pipeline';

/**
 * Standard Patent Record Schema Definition
 */
export const REQUIRED_PATENT_FIELDS = [
  'patentNumber',
  'title',
  'jurisdiction',
  'renewalDeadline',
  'renewalCost'
];

/**
 * Validates a single raw patent record against the required schema.
 * Returns { valid: boolean, errors: string[] }
 */
export function validatePatentSchema(record) {
  const errors = [];
  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['Record is not a valid JSON object'] };
  }

  for (const field of REQUIRED_PATENT_FIELDS) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      errors.push(`Missing mandatory field: ${field}`);
    }
  }

  if (record.renewalCost !== undefined && record.renewalCost !== null) {
    const cost = Number(record.renewalCost);
    if (isNaN(cost) || cost < 0) {
      errors.push(`Invalid renewal cost value: ${record.renewalCost}`);
    }
  }

  if (record.renewalDeadline) {
    const deadline = new Date(record.renewalDeadline);
    if (isNaN(deadline.getTime())) {
      errors.push(`Invalid renewal deadline date format: ${record.renewalDeadline}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Agent 1: Technical & Innovation Analyst
 * Evaluates technical scope, commercial product relevance, and citation importance.
 */
export function runTechnicalAnalystAgent(patent) {
  const productRel = typeof patent.productRelevance === 'number' ? patent.productRelevance : 65;
  const citationScore = typeof patent.citationPercentile === 'number' ? patent.citationPercentile : 58;
  const claimsCount = patent.claims ? patent.claims.length : 12;

  // Technical Score calculation (0-100)
  const technicalScore = Math.min(100, Math.max(0, Math.round(
    productRel * 0.55 + citationScore * 0.35 + Math.min(10, claimsCount) * 1.0
  )));

  const technologyRisk = technicalScore < 45 ? 'HIGH' : technicalScore < 70 ? 'MODERATE' : 'LOW';
  
  let technicalRationale = '';
  if (technicalScore >= 75) {
    technicalRationale = `Core technological asset protecting active enterprise product line. High forward citation centrality in ${patent.jurisdiction || 'US'} registry.`;
  } else if (technicalScore >= 50) {
    technicalRationale = `Moderate technical relevance. Surrounding prior art density is increasing; defensive coverage remains viable.`;
  } else {
    technicalRationale = `Low product relevance (${Math.round(productRel)}%). Underlying architecture has migrated toward newer alternative standards.`;
  }

  return {
    agentName: 'Technical & Innovation Analyst',
    technicalScore,
    technologyRisk,
    productRelevance: Math.round(productRel),
    citationPercentile: Math.round(citationScore),
    keyFindings: [
      `Commercial alignment evaluated at ${Math.round(productRel)}%`,
      `Citation authority rank: ${Math.round(citationScore)}th percentile`,
      `Active independent claims: ${patent.claims ? patent.claims.filter(c => c.isIndependent).length : 1}`
    ],
    technicalRationale
  };
}

/**
 * Agent 2: Financial & Commercial Valuation Specialist
 * Analyzes renewal economics, maintenance cost curve, and expected ROI.
 */
export function runValuationAnalystAgent(patent) {
  const cost = Number(patent.renewalCost) || 2400;
  const remainingLife = typeof patent.remainingLifeNormalized === 'number' ? patent.remainingLifeNormalized : 60;
  const rawBusinessValue = typeof patent.businessValueScore === 'number' ? patent.businessValueScore : 55;

  const valuationScore = Math.min(100, Math.max(0, Math.round(
    rawBusinessValue * 0.6 + remainingLife * 0.25 + (cost < 3000 ? 15 : cost < 6000 ? 8 : 0)
  )));

  const renewalRoi = (valuationScore * 1000) / Math.max(500, cost);
  const tier = valuationScore >= 75 ? 'TIER 1 (HIGH CONVICTION)' : valuationScore >= 45 ? 'TIER 2 (CORE DEFENSIVE)' : 'TIER 3 (PRUNING CANDIDATE)';
  const commercialRisk = valuationScore < 40 ? 'HIGH' : valuationScore < 70 ? 'MEDIUM' : 'LOW';

  return {
    agentName: 'Valuation & ROI Specialist',
    valuationScore,
    renewalRoi: Number(renewalRoi.toFixed(2)),
    tier,
    annualCostUSD: cost,
    commercialRisk,
    valuationRationale: valuationScore < 45
      ? `Renewal cost of $${cost.toLocaleString()} exceeds defensibility value threshold. Low commercial return projected.`
      : `High commercial conviction ($${cost.toLocaleString()} annual fee). Favorable ${renewalRoi.toFixed(1)}x defensive ROI multiplier.`
  };
}

/**
 * Agent 3: Patent Prosecution & Legal Risk Analyst
 * Analyzes claim breadth, 35 U.S.C. 102/103 rejection grounds, and file wrapper events.
 */
export function runLegalAnalystAgent(patent) {
  const hasOa = Boolean(patent.hasOfficeAction || (patent.officeActions && patent.officeActions.length > 0));
  const oaGrounds = patent.rejectionGrounds || [];
  
  let has102Risk = false;
  let has103Risk = false;

  if (hasOa) {
    has102Risk = oaGrounds.some(g => (g.statute || '').includes('102') || (g.rejectionType || '').includes('102'));
    has103Risk = oaGrounds.some(g => (g.statute || '').includes('103') || (g.rejectionType || '').includes('103'));
  }

  // Legal Score: High = strong/clean legal position, Low = high litigation/office-action rejection risk
  let legalScore = 85;
  if (has102Risk) legalScore -= 35;
  if (has103Risk) legalScore -= 20;
  if (patent.isFlagged) legalScore -= 15;

  legalScore = Math.min(100, Math.max(10, legalScore));
  const prosecutionRisk = legalScore < 50 ? 'HIGH' : legalScore < 75 ? 'MODERATE' : 'LOW';

  return {
    agentName: 'Patent Prosecution & Legal Analyst',
    legalScore,
    hasOfficeAction: hasOa,
    rejection102Risk: has102Risk,
    rejection103Risk: has103Risk,
    prosecutionRisk,
    claimBreadth: patent.claims && patent.claims.length > 5 ? 'BROAD' : 'NARROW',
    legalRationale: hasOa
      ? `Active file wrapper rejection pending under 35 U.S.C. ${has102Risk ? '§ 102 (Anticipation)' : '§ 103 (Obviousness)'}. Timely response required.`
      : `Clean registry status in ${patent.jurisdiction || 'US'}. No pending statutory rejections or validity assertions recorded.`
  };
}

/**
 * Agent 4: Adversarial Critic & Devil's Advocate
 * Actively looks for counterarguments, design-around risks, and over-optimism.
 */
export function runAdversarialCriticAgent(patent, technicalOutput, valuationOutput, legalOutput) {
  const contradictions = [];
  let confidencePenalty = 0;

  // 1. Check for Valuation vs Legal mismatch
  if (valuationOutput.valuationScore > 65 && legalOutput.legalScore < 50) {
    contradictions.push('Valuation is optimistic despite severe pending 35 U.S.C. 102/103 prosecution rejections.');
    confidencePenalty += 20;
  }

  // 2. Check for High Maintenance Cost vs Low Product Relevance
  if (valuationOutput.annualCostUSD > 4000 && technicalOutput.productRelevance < 50) {
    contradictions.push(`High annuity obligation ($${valuationOutput.annualCostUSD.toLocaleString()}) on low commercial product relevance (${technicalOutput.productRelevance}%).`);
    confidencePenalty += 15;
  }

  // 3. Check for Short Remaining Life vs High Renewal Cost
  if (patent.remainingLifeYears && patent.remainingLifeYears < 2 && valuationOutput.annualCostUSD > 3000) {
    contradictions.push('Asset expires within 24 months; continued renewal fee offers diminished defensive window.');
    confidencePenalty += 10;
  }

  // 4. Overly optimistic consensus without independent claims
  const indepClaims = patent.claims ? patent.claims.filter(c => c.isIndependent).length : 1;
  if (indepClaims === 0) {
    contradictions.push('No independent claims indexed; narrow dependent claim perimeter is easily designed around.');
    confidencePenalty += 15;
  }

  const criticScore = Math.max(10, 100 - (confidencePenalty * 2));

  return {
    agentName: "Adversarial Critic & Devil's Advocate",
    criticScore,
    confidencePenalty,
    contradictions,
    counterarguments: contradictions.length > 0 
      ? contradictions 
      : ['No fatal design-around or validity flaws identified. Asset withstands adversarial scrutiny.'],
    criticRecommendation: contradictions.length > 1 ? 'ALLOW TO LAPSE' : 'PROCEED WITH CAUTION'
  };
}

/**
 * Consensus Validator & Confidence Gate
 * Synthesizes all 4 agent outputs, detects divergence, and determines routing.
 */
export function runConsensusValidator(patent, technical, valuation, legal, critic) {
  // Aggregate composite score
  const compositeScore = Math.round(
    technical.technicalScore * 0.35 +
    valuation.valuationScore * 0.35 +
    legal.legalScore * 0.20 +
    (critic.criticScore * 0.10)
  );

  // Confidence calculation (Base 0.95 minus penalties for disagreements)
  let rawConfidence = 0.95;

  // Penalty for critic contradictions
  rawConfidence -= (critic.confidencePenalty / 100);

  // Penalty for wide spread between Technical and Valuation
  const scoreSpread = Math.abs(technical.technicalScore - valuation.valuationScore);
  if (scoreSpread > 35) {
    rawConfidence -= 0.12;
  }

  // Penalty for legal uncertainty
  if (legal.hasOfficeAction) {
    rawConfidence -= 0.08;
  }

  const confidenceScore = Number(Math.max(0.20, Math.min(0.99, rawConfidence)).toFixed(2));
  const hasCriticalContradiction = critic.contradictions.length > 0 || scoreSpread > 40;

  // Decision Gate Routing Rule
  let recommendation = compositeScore >= 50 ? 'RENEW' : 'LAPSE';
  let status = 'COMPLETED';
  let requiresHumanReview = false;
  let escalationReason = null;

  if (confidenceScore < 0.85 || hasCriticalContradiction) {
    status = 'HUMAN_REVIEW';
    requiresHumanReview = true;
    escalationReason = hasCriticalContradiction
      ? `Cross-agent contradiction detected: ${critic.contradictions[0] || 'Divergent valuation vs legal scores'}`
      : `Confidence score (${Math.round(confidenceScore * 100)}%) is below the automated 85% authorization threshold.`;
  } else {
    status = 'AUTO_RECOMMENDATION';
  }

  return {
    compositeScore,
    confidenceScore,
    recommendation,
    status,
    requiresHumanReview,
    escalationReason,
    contradictions: critic.contradictions
  };
}

/**
 * Executes full RocketRide Multi-Agent Pipeline for an arbitrary batch of patent records.
 * Handles schema validation, quarantine isolation, multi-agent evaluation,
 * consensus validation, decision routing, and observable telemetry.
 * 
 * @param {Array<Object>} patentBatch - List of raw patent records.
 * @param {Object} options - Execution options (client instance, onProgress callback).
 */
export async function executeRocketRidePatentBatch(patentBatch, options = {}) {
  const { onProgress = null, batchId = `batch-${Date.now()}` } = options;
  const startTime = Date.now();

  // Attempt real backend multi-agent pipeline first
  try {
    const backendResult = await executePipelineBatchAPI(patentBatch, batchId);
    if (backendResult && backendResult.results) {
      if (onProgress) {
        onProgress({
          stage: 'EVALUATED',
          current: backendResult.results.length,
          total: patentBatch.length,
          itemStatus: 'COMPLETED'
        });
      }
      return backendResult;
    }
  } catch (err) {
    console.info('[PATENT+ Pipeline] Running local multi-agent execution pipeline.');
  }

  const total = Array.isArray(patentBatch) ? patentBatch.length : 0;
  const quarantined = [];
  const processed = [];
  const humanReviewQueue = [];
  const autoRecommended = [];
  
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  // Step 1: Ingestion & Schema Quarantine
  for (let i = 0; i < total; i++) {
    const rawRecord = patentBatch[i];
    const validation = validatePatentSchema(rawRecord);

    if (!validation.valid) {
      const quarantinedItem = {
        batchId,
        id: rawRecord?.id || `quarantine-${i + 1}`,
        patentNumber: rawRecord?.patentNumber || `UNASSIGNED-REC-${i + 1}`,
        title: rawRecord?.title || 'Malformed Record',
        status: 'QUARANTINED',
        validationErrors: validation.errors,
        originalRecord: rawRecord,
        timestamp: new Date().toISOString(),
        quarantineReason: validation.errors.join('; ')
      };
      quarantined.push(quarantinedItem);
      
      if (onProgress) {
        onProgress({
          stage: 'VALIDATING',
          current: i + 1,
          total,
          itemStatus: 'QUARANTINED',
          patentNumber: quarantinedItem.patentNumber
        });
      }
      continue;
    }

    // Step 2: Multi-Agent Analysis Execution (Valid Record)
    if (onProgress) {
      onProgress({
        stage: 'ANALYZING',
        current: i + 1,
        total,
        itemStatus: 'ANALYZING',
        patentNumber: rawRecord.patentNumber
      });
    }

    // Token attribution per agent wave
    const recordPromptTokens = 1680;
    const recordCompletionTokens = 720;
    totalPromptTokens += recordPromptTokens;
    totalCompletionTokens += recordCompletionTokens;

    // Run 4 Specialist Agents
    const technical = runTechnicalAnalystAgent(rawRecord);
    const valuation = runValuationAnalystAgent(rawRecord);
    const legal = runLegalAnalystAgent(rawRecord);
    const critic = runAdversarialCriticAgent(rawRecord, technical, valuation, legal);

    // Run Consensus Validator
    const validationResult = runConsensusValidator(rawRecord, technical, valuation, legal, critic);

    const evaluatedPatent = {
      ...rawRecord,
      batchId,
      status: validationResult.status,
      recommendation: validationResult.recommendation,
      confidenceScore: validationResult.confidenceScore,
      compositeScore: validationResult.compositeScore,
      requiresHumanReview: validationResult.requiresHumanReview,
      escalationReason: validationResult.escalationReason,
      contradictions: validationResult.contradictions,
      agents: {
        technical,
        valuation,
        legal,
        critic
      },
      telemetry: {
        promptTokens: recordPromptTokens,
        completionTokens: recordCompletionTokens,
        estimatedCostUSD: Number(((recordPromptTokens * 0.003 + recordCompletionTokens * 0.015) / 1000).toFixed(4)),
        evaluatedAt: new Date().toISOString()
      }
    };

    processed.push(evaluatedPatent);

    if (validationResult.requiresHumanReview) {
      humanReviewQueue.push(evaluatedPatent);
    } else {
      autoRecommended.push(evaluatedPatent);
    }

    if (onProgress) {
      onProgress({
        stage: 'EVALUATED',
        current: i + 1,
        total,
        itemStatus: validationResult.status,
        patentNumber: rawRecord.patentNumber
      });
    }
  }

  const durationMs = Date.now() - startTime;
  const estimatedCostTotalUSD = Number(((totalPromptTokens * 0.003 + totalCompletionTokens * 0.015) / 1000).toFixed(4));
  const avgCostPerPatentUSD = processed.length > 0 ? Number((estimatedCostTotalUSD / processed.length).toFixed(4)) : 0;

  return {
    batchId,
    timestamp: new Date().toISOString(),
    pipelineProjectId: PIPELINE_PROJECT_ID,
    summary: {
      totalSubmitted: total,
      totalProcessed: processed.length,
      totalQuarantined: quarantined.length,
      autoRecommendedCount: autoRecommended.length,
      humanReviewRequiredCount: humanReviewQueue.length,
      renewRecommendations: processed.filter(p => p.recommendation === 'RENEW').length,
      lapseRecommendations: processed.filter(p => p.recommendation === 'LAPSE').length
    },
    telemetry: {
      durationMs,
      averageLatencyPerPatentMs: processed.length > 0 ? Math.round(durationMs / processed.length) : 0,
      inferenceType: 'GROUNDED_RULE_ENGINE',
      isRealModelInference: false,
      actualPromptTokens: 0,
      actualCompletionTokens: 0,
      actualCostUSD: 0.0,
      estimatedPromptTokens: totalPromptTokens,
      estimatedCompletionTokens: totalCompletionTokens,
      estimatedTokens: totalPromptTokens + totalCompletionTokens,
      estimatedCostUSD: estimatedCostTotalUSD,
      avgCostPerPatentUSD,
      pipelineEngine: 'RocketRide Wave Multi-Agent Pipeline',
      status: 'SUCCESS'
    },
    results: processed,
    quarantined,
    humanReviewQueue,
    autoRecommended
  };
}
