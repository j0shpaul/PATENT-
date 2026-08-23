import logging
from typing import Dict, Any, List
from backend.ai.base import BaseAIProvider

logger = logging.getLogger("patent_plus.ai.demo")

class DemoLocalProvider(BaseAIProvider):
    def get_provider_name(self) -> str:
        return "LOCAL_DEMO_AI"

    async def generate_business_rationale(self, patent: Dict[str, Any]) -> Dict[str, Any]:
        score = patent.get("businessValueScore", 50)
        relevance = patent.get("productRelevance", 50.0)
        citations = patent.get("citationPercentile", 50.0)
        remaining_life = patent.get("remainingLifeNormalized", 50.0)
        cost = patent.get("renewalCost", 3000.0)
        cost_eff = patent.get("inverseRenewalCostPercentile", 50.0)
        title = patent.get("title", "Asset")

        if score < 40:
            rationale = (
                f"Why this is flagged: This asset scores {score}/100 due to low commercial product alignment ({relevance:.0f}/100) "
                f"and declining forward citation relevance ({citations:.0f}th percentile). With an impending maintenance renewal fee "
                f"of ${cost:,.0f} and an unfavorable cost-efficiency profile ({cost_eff:.0f}/100), continuing maintenance represents an "
                f"inefficient use of budget. Allowing this patent to lapse is strongly indicated unless an unannounced product dependency is identified."
            )
        elif score >= 70:
            rationale = (
                f"High-conviction core portfolio asset (Score: {score}/100). The patent provides direct commercial exclusivity "
                f"({relevance:.0f}/100 relevance) with robust citation defensibility ({citations:.0f}th percentile) over a remaining "
                f"enforceable term of {remaining_life:.0f}/100. Maintenance payment of ${cost:,.0f} is highly justified."
            )
        else:
            rationale = (
                f"Moderate commercial utility (Score: {score}/100). The asset retains defensive citation value ({citations:.0f}th percentile) "
                f"against an annual maintenance obligation of ${cost:,.0f}. Scheduled for human IP committee review prior to deadline."
            )

        return {
            "rationale": rationale,
            "provider": "LOCAL_DEMO_AI"
        }

    async def generate_office_action_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        app_no = context.get("applicationNumber", "15/624,192")
        pat_no = context.get("patentNumber", "US10123456B2")
        title = context.get("title", "Ultra-low latency edge data aggregation and dispatching architecture")
        applicant = context.get("applicant", "Cloudflare, Inc.")
        examiner = context.get("examinerName", "Robert M. Vance")
        art_unit = context.get("artUnit", "2447")
        oa_date = context.get("documentDate", "2018-03-14")
        rejection_type = context.get("rejectionType", "Non-Final Rejection")
        
        claims = context.get("claims", [])
        rejection_grounds = context.get("rejectionGrounds", [])
        prior_art = context.get("citedPriorArt", [])
        
        # Primary reference names
        primary_ref = "Srivastava (US 9,438,682 B1)"
        secondary_refs = ["Bovet (US 8,924,561 B2)", "Chen (US 2015/0341421 A1)"]

        draft_lines = [
            "DEMO GENERATED — ATTORNEY REVIEW REQUIRED",
            "================================================================================",
            "IN THE UNITED STATES PATENT AND TRADEMARK OFFICE",
            "",
            f"In re Application of:    {applicant}",
            f"Application No.:         {app_no}",
            f"Filing Date:             June 15, 2017",
            f"Title:                   {title}",
            f"Examiner:                {examiner}",
            f"Art Unit:                {art_unit}",
            f"Office Action Date:      {oa_date}",
            "================================================================================",
            "",
            "RESPONSE UNDER 37 C.F.R. § 1.111 TO NON-FINAL OFFICE ACTION",
            "",
            "Mail Stop Amendment",
            "Commissioner for Patents",
            "P.O. Box 1450, Alexandria, VA 22313-1450",
            "",
            "Sir:",
            "",
            f"In responsive to the Non-Final Office Action mailed on {oa_date}, Applicant respectfully requests reconsideration of the application and allowance of the pending claims in view of the following remarks and proposed amendments.",
            "",
            "--------------------------------------------------------------------------------",
            "I. STATUS OF THE CLAIMS",
            "--------------------------------------------------------------------------------",
            "Claims 1-18 are currently pending in this application. In response to the Office Action:",
            "  - Claim 1 is AMENDED herein to incorporate the specific dynamic jitter-adapted threshold features of Claim 3 and pre-queue zero-allocation buffering.",
            "  - Claims 2-5 are retained and depend from amended Claim 1.",
            "  - Claims 6-18 are maintained pending.",
            "",
            "--------------------------------------------------------------------------------",
            "II. AMENDMENTS TO THE CLAIMS",
            "--------------------------------------------------------------------------------",
            "Claim 1 (Currently Amended):",
            "A computer-implemented edge data aggregation and dispatching system comprising:",
            "  one or more edge processors;",
            "  a non-transitory computer-readable memory storing instructions that, when executed by the one or more edge processors, cause the system to:",
            "    intercept an incoming stream of unformatted payload chunks from a plurality of client sessions at an edge routing node;",
            "    compute a cryptographic integrity tag for each payload chunk prior to local queue insertion;",
            "    evaluate a composite dispatch threshold comprising both a time-window threshold (Tw) and an accumulated payload byte volume threshold (Bv), [[wherein]] <<wherein the composite dispatch threshold dynamically adjusts the time-window threshold (Tw) inversely proportional to detected ingress packet jitter over a preceding sliding monitoring epoch;>>",
            "    upon satisfaction of either threshold, compress and aggregate the queued payload chunks into a single unified cryptographic dispatch envelope without round-trip signaling to a centralized origin cluster; and",
            "    dispatch the unified cryptographic dispatch envelope across an asynchronous multi-path pipeline to one of a plurality of downstream edge egress nodes selected via a zero-allocation circular buffer <<operating in kernel space>>.",
            "",
            "--------------------------------------------------------------------------------",
            "III. REMARKS AND REBUTTAL OF 35 U.S.C. § 102(a)(1) REJECTION",
            "--------------------------------------------------------------------------------",
            f"The Examiner rejected Claim 1 under 35 U.S.C. § 102(a)(1) as allegedly anticipated by {primary_ref}.",
            "",
            "To establish anticipation under 35 U.S.C. § 102, each and every element of the claimed invention must be disclosed in a single prior art reference, arranged as in the claim. (See Net MoneyIN, Inc. v. VeriSign, Inc., 545 F.3d 1359, 1369 (Fed. Cir. 2008)).",
            "",
            f"Applicant respectfully traverses this rejection because {primary_ref} fails to disclose at least the following limitations:",
            "  1. Dynamic adjustment of the time-window threshold (Tw) inversely proportional to detected ingress packet jitter over a sliding monitoring epoch.",
            "  2. Computation of a cryptographic integrity tag strictly prior to local queue insertion into a zero-allocation circular buffer.",
            "",
            "While Srivastava discloses basic packet buffering at an edge node based on a static timeout or fixed byte size (col. 6, lines 18-35), Srivastava contains no teaching or suggestion of modulating the temporal threshold based on real-time sliding jitter metrics.",
            "In Srivastava, if packet jitter spikes, packets remain stuck until the static timer expires, inducing downstream tail-latency degradation. In stark contrast, Claim 1 dynamically contracts Tw when jitter is detected, ensuring deterministic envelope delivery.",
            "",
            "Accordingly, Srivastava does not anticipate Claim 1 as amended. Reconsideration and withdrawal of the § 102 rejection is respectfully requested.",
            "",
            "--------------------------------------------------------------------------------",
            "IV. REMARKS AND REBUTTAL OF 35 U.S.C. § 103 REJECTION",
            "--------------------------------------------------------------------------------",
            f"The Examiner rejected Claims 2-5 under 35 U.S.C. § 103 as obvious over {primary_ref} in view of Bovet (US 8,924,561 B2) and Chen (US 2015/0341421 A1).",
            "",
            "Applicant respectfully submits that this proposed combination reflects impermissible hindsight reconstruction (KSR Int'l Co. v. Teleflex Inc., 550 U.S. 398 (2007)).",
            "",
            "1. NO MOTIVATION TO COMBINE WITHOUT IMPERMISSIBLE HINDSIGHT:",
            "Bovet is directed to application-level session failover on distributed hash rings and explicitly relies on heavy centralized heartbeat exchanges across peer nodes (Bovet, col. 9, lines 20-35). Incorporating Bovet's heavy session-layer negotiation into Srivastava's stateless edge routing node would destroy Srivastava's core objective of lightweight sub-millisecond edge forwarding.",
            "",
            "2. PHYSICAL INCORPORATION DEFICIENCY:",
            "Chen teaches post-queue erasure coding for long-haul WAN transmissions. Chen does not teach or suggest computing pre-queue cryptographic tags combined with sliding-epoch jitter threshold adjustment in a zero-allocation circular buffer.",
            "",
            "Because the cited references neither teach nor render obvious the claimed system, and because their combination is counter-indicated by their conflicting architectural assumptions, Claims 1-5 are patentable over the cited art.",
            "",
            "--------------------------------------------------------------------------------",
            "V. CONCLUSION",
            "--------------------------------------------------------------------------------",
            "In view of the above amendments and remarks, all pending claims are in condition for allowance.",
            "Early issuance of a Notice of Allowance is respectfully requested.",
            "",
            "Respectfully submitted,",
            f"/Attorney for {applicant}/",
            "Registration No. 64,892",
            "Customer Number: 28941"
        ]

        return {
            "draft": "\n".join(draft_lines),
            "provider": "LOCAL_DEMO_AI"
        }
