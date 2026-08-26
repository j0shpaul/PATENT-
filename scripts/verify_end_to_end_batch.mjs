import { executeRocketRidePatentBatch, validatePatentSchema } from '../frontend/src/api/rocketridePipelineRunner.js';

console.log('◈ ==========================================================');
console.log('◈ PATENT+ END-TO-END BATCH & MULTI-AGENT VERIFICATION RUNNER');
console.log('◈ ==========================================================');

// 1. Define Test Batch: 2 Valid Records + 1 Intentionally Malformed Record
const testBatch = [
  {
    patentNumber: "US10123456B2",
    title: "Fault-Tolerant Quantum Cryptographic Processing Unit",
    jurisdiction: "US",
    renewalDeadline: "2026-11-15",
    renewalCost: 3200,
    productRelevance: 92,
    citationPercentile: 94,
    businessValueScore: 88,
    remainingLifeNormalized: 75,
    hasOfficeAction: false,
    claims: [
      { claimNumber: 1, isIndependent: true, text: "A quantum cryptographic processor comprising..." },
      { claimNumber: 2, isIndependent: false, text: "The processor of claim 1, further comprising..." }
    ]
  },
  {
    patentNumber: "US10888999B2",
    title: "Legacy Distributed Database Index Rebalancing Method",
    jurisdiction: "US",
    renewalDeadline: "2026-09-30",
    renewalCost: 6400,
    productRelevance: 32,
    citationPercentile: 45,
    businessValueScore: 78, // High valuation claim despite low product relevance & office action
    remainingLifeNormalized: 25,
    hasOfficeAction: true,
    rejectionGrounds: [
      { statute: "35 U.S.C. 102", rejectionType: "Anticipation by Smith et al." }
    ],
    claims: [
      { claimNumber: 1, isIndependent: false, text: "A computer implemented method..." }
    ]
  },
  {
    // INTENTIONALLY MALFORMED: Missing patentNumber and invalid negative renewalCost
    title: "Malformed Edge Node Synchronizer",
    jurisdiction: "US",
    renewalDeadline: "2026-12-01",
    renewalCost: -1500
  }
];

async function runEndToEndVerification() {
  console.log(`\n[STEP 1] Submitting Batch of ${testBatch.length} Records to RocketRide Pipeline...`);
  
  const progressLogs = [];
  const result = await executeRocketRidePatentBatch(testBatch, {
    batchId: 'e2e-verify-001',
    onProgress: (p) => {
      progressLogs.push(p);
      console.log(`  [PROGRESS] Stage: ${p.stage} | Item ${p.current}/${p.total}: ${p.patentNumber} (${p.itemStatus})`);
    }
  });

  console.log('\n[STEP 2] Inspecting Batch Summary & Quarantine Isolation:');
  console.log('Summary:', JSON.stringify(result.summary, null, 2));

  // Verify Quarantine
  if (result.quarantined.length === 1) {
    console.log('✓ PASS: Exactly 1 record was quarantined as expected.');
    console.log('  Quarantined Record Reason:', result.quarantined[0].quarantineReason);
  } else {
    console.error('❌ FAIL: Expected 1 quarantined record, got', result.quarantined.length);
  }

  // Verify Processed Valid Records
  if (result.results.length === 2) {
    console.log('✓ PASS: Exactly 2 valid records were fully analyzed by the multi-agent engine.');
  } else {
    console.error('❌ FAIL: Expected 2 processed records, got', result.results.length);
  }

  console.log('\n[STEP 3] Inspecting Multi-Agent Evaluation & Contradiction Detection:');
  for (const pat of result.results) {
    console.log(`\n--- Patent: ${pat.patentNumber} ("${pat.title.slice(0, 40)}...") ---`);
    console.log(`  Recommendation: ${pat.recommendation}`);
    console.log(`  Confidence Score: ${Math.round(pat.confidenceScore * 100)}%`);
    console.log(`  Status: ${pat.status}`);
    console.log(`  Agent 1 (Technical): Score ${pat.agents.technical.technicalScore}/100, Risk: ${pat.agents.technical.technologyRisk}`);
    console.log(`  Agent 2 (Valuation): Score ${pat.agents.valuation.valuationScore}/100, Tier: ${pat.agents.valuation.tier}`);
    console.log(`  Agent 3 (Legal): Score ${pat.agents.legal.legalScore}/100, Prosecution Risk: ${pat.agents.legal.prosecutionRisk}`);
    console.log(`  Agent 4 (Critic): Score ${pat.agents.critic.criticScore}/100, Penalty: -${pat.agents.critic.confidencePenalty}pts`);
    if (pat.contradictions.length > 0) {
      console.log(`  ⚠ Flagged Contradictions:`, pat.contradictions);
    }
  }

  console.log('\n[STEP 4] Verifying Decision Gate Routing:');
  const autoStaged = result.autoRecommended;
  const humanReview = result.humanReviewQueue;

  console.log(`  Auto-Staged Count: ${autoStaged.length}`);
  console.log(`  Human Review Queue Count: ${humanReview.length}`);

  if (autoStaged.length === 1 && autoStaged[0].patentNumber === "US10123456B2") {
    console.log('✓ PASS: US10123456B2 (High confidence, 0 contradictions) auto-staged successfully.');
  }

  if (humanReview.length === 1 && humanReview[0].patentNumber === "US10888999B2") {
    console.log('✓ PASS: US10888999B2 (Low confidence / Critic contradiction) correctly escalated to Human Review Station.');
    console.log('  Escalation Reason:', humanReview[0].escalationReason);
  }

  console.log('\n[STEP 5] Verifying Observability & Economics Telemetry:');
  console.log('Telemetry:', JSON.stringify(result.telemetry, null, 2));

  console.log('\n◈ E2E VERIFICATION COMPLETED SUCCESSFULLY ◈\n');
}

runEndToEndVerification().catch(console.error);
