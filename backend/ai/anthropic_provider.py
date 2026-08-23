import logging
from typing import Dict, Any
from backend.config import settings
from backend.ai.base import BaseAIProvider

logger = logging.getLogger("patent_plus.ai.anthropic")

class AnthropicProvider(BaseAIProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        try:
            from anthropic import AsyncAnthropic
            self.client = AsyncAnthropic(api_key=self.api_key)
        except Exception as e:
            logger.error(f"Failed to initialize AsyncAnthropic client: {e}")
            self.client = None

    def get_provider_name(self) -> str:
        return "ANTHROPIC_AI"

    async def generate_business_rationale(self, patent: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Anthropic client uninitialized.")

        prompt = f"""You are an expert patent strategist evaluating an in-house patent asset for renewal or lapse.
Explain in plain English why this patent received its Business Value Score ({patent.get('businessValueScore')}/100).

Patent Details:
- Title: {patent.get('title')}
- Jurisdiction: {patent.get('jurisdiction')}
- Assignee: {patent.get('applicant')}
- Remaining Patent Life: {patent.get('remainingLifeNormalized')}/100
- Commercial Product Relevance: {patent.get('productRelevance')}/100
- Citation Percentile: {patent.get('citationPercentile')}/100
- Renewal Cost Efficiency Percentile: {patent.get('inverseRenewalCostPercentile')}/100 (Fee: ${patent.get('renewalCost', 0):,.0f})
- Current Status: {patent.get('renewalStatus')} (Flagged: {patent.get('isFlagged')})

Provide a concise, 2-3 sentence executive business rationale. State clearly whether the patent protects active commercial lines or represents an underperforming cost center. Do not use markdown headers."""

        try:
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=250,
                messages=[{"role": "user", "content": prompt}]
            )
            rationale_text = message.content[0].text.strip()
            return {
                "rationale": rationale_text,
                "provider": "ANTHROPIC_AI"
            }
        except Exception as e:
            logger.error(f"Anthropic rationale generation error: {e}")
            raise e

    async def generate_office_action_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Anthropic client uninitialized.")

        prompt = f"""You are an elite registered US patent attorney drafting a rigorous FIRST-PASS response to a USPTO Office Action for internal attorney review.

CRITICAL INSTRUCTIONS:
- You are preparing a FIRST-PASS response for attorney review.
- Use ONLY the supplied patent, claims, rejections, prior art, and prosecution information.
- Do NOT invent claims, prior art references, examiner statements, or legal facts.
- Do NOT claim that an argument was made previously unless the supplied prosecution history supports it.
- Clearly distinguish source facts from proposed legal arguments.
- Include the explicit disclaimer: "AI GENERATED — ATTORNEY REVIEW REQUIRED".

SUPPLIED SOURCE MATERIAL:
Application No: {context.get('applicationNumber')}
Patent / Publication: {context.get('patentNumber')}
Invention Title: {context.get('title')}
Applicant: {context.get('applicant')}
Examiner: {context.get('examinerName')} (Art Unit: {context.get('artUnit')})
Office Action Date: {context.get('documentDate')}
Rejection Type: {context.get('rejectionType')}

EXAMINER REJECTIONS:
{context.get('rejectionSummary')}

REJECTION GROUNDS & EXAMINER ANALYSIS:
{context.get('rejectionGroundsText')}

CITED PRIOR ART (PTO-892):
{context.get('priorArtText')}

PENDING CLAIMS:
{context.get('claimsText')}

PROSECUTION HISTORY:
{context.get('historyText')}

OUTPUT STRUCTURE:
1. Header & Formal Caption
2. Executive Summary of Response & Status of Claims
3. Detailed Response to 35 U.S.C. § 102 Rejection (Demonstrating specific claim limitations missing in primary reference)
4. Detailed Response to 35 U.S.C. § 103 Obviousness Rejection (Lack of motivation to combine, bodily incorporation flaws, teaching away)
5. Proposed Claim 1 Narrowing Amendments (strictly based on supported dependent limitations)
6. Conclusion & Request for Allowance

Draft the complete, formal legal document now."""

        try:
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2500,
                messages=[{"role": "user", "content": prompt}]
            )
            draft_text = message.content[0].text.strip()
            return {
                "draft": draft_text,
                "provider": "ANTHROPIC_AI"
            }
        except Exception as e:
            logger.error(f"Anthropic Office Action response generation error: {e}")
            raise e
