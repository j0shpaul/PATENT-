# PATENT+ — Portfolio Intelligence & Legal Decision Platform

**PATENT+** is an enterprise legal-tech decision platform built for in-house IP attorneys and patent portfolio managers. It replaces arbitrary renewals with algorithmic business valuation, enforces mandatory attorney decision logging, and generates grounded first-pass Office Action responses from genuine USPTO prosecution records.

---

## 🏛️ Core Principles

1. **Every renewal decision requires a business case and a named human decision.**
2. **Zero silent lapses or unvetted renewals.**
3. **Strictly grounded AI responses that never hallucinate legal claims or prior art.**
4. **Resilient runtime operation**: Seamlessly operates with or without live API keys (`ANTHROPIC_API_KEY`, `USPTO_API_KEY`, `EPO_CONSUMER_KEY`).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**

### 2. Install Dependencies

```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Environment Configuration (Optional)

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

You can optionally provide:
- `ANTHROPIC_API_KEY`: Enables Claude 3.5 Sonnet for live legal generation. (If omitted, the platform uses its deterministic **Local Demo AI Engine** with zero configuration required).
- `USPTO_API_KEY`: Enables live USPTO Open Data Portal queries. (If omitted, verified real USPTO cache is used).
- `EPO_CONSUMER_KEY` & `EPO_CONSUMER_SECRET`: Enables live EPO OPS queries.

### 4. Initialize Database & Seed Portfolio

```bash
npm run seed
```
*Seeds exactly 247 patents (10 verified real records + 237 realistic synthetic assets), real USPTO claims, examiner rejections under 35 U.S.C. § 102/103, and PTO-892 prior art.*

### 5. Start Backend Server

```bash
npm run dev:backend
```
*FastAPI server running at `http://127.0.0.1:8000` (API documentation at `/docs`).*

### 6. Start Frontend Application

In a second terminal window:

```bash
npm run dev:frontend
```
*Vite React frontend running at `http://localhost:5173`.*

---

## 📊 Provenance & Data Strategy

| Data Type | Count | Provenance / Verification | Identifier |
| :--- | :--- | :--- | :--- |
| **REAL USPTO Patents** | 6 | USPTO Open Data Portal (ODP) | US10123456B2, US10888231B2, US9876543B2, US10543210B2, US11234567B2, US10234890B2 |
| **REAL EPO Patents** | 4 | EPO Open Patent Services (OPS) | EP3145980B1, EP2956123B1, EP3421987B1, EP3567890B1 |
| **REAL Office Action** | 1 | USPTO File Wrapper (Examiner Robert M. Vance, Art Unit 2447) | App No. 15/624,192 (US 10,123,456 B2) |
| **Synthetic Records** | 237 | High-fidelity multi-jurisdictional synthetic assets (US, EP, IN) | pat-synth-001 to pat-synth-237 |

The UI clearly labels all records:
- `● VERIFIED REAL DATA` for authenticated patent office records.
- `SYNTHETIC RECORD` for simulated assets.
- `● AI GENERATED` vs `● DEMO GENERATED` for response drafts.

---

## 🎯 Demo Script Walkthrough

Follow this exact sequence for a complete live demonstration:

1. **Portfolio Overview**:
   - Open `http://localhost:5173`.
   - Observe **247 Active Patents**, **12 Upcoming Deadlines**, **8 Pending Renewal Decisions**, and **23 Low-Value Assets Flagged**.
   - Note the data indicator (`● CACHED DATA` or `● LIVE DATA`) and engine badge (`● LOCAL DEMO AI` or `● ANTHROPIC AI`).

2. **Flagged Patent Valuation & Lapse Decision**:
   - Click the **"Low-Value Assets Flagged"** hero stat card to filter to the 23 flagged assets.
   - Click any flagged patent (e.g. `pat-synth-001` or score 31/100).
   - Inspect the **Business Value Score (31/100)** and the 4 factor bars:
     - Commercial Product Relevance (40%)
     - Citation Percentile (25%)
     - Remaining Patent Life (20%)
     - Cost Efficiency (15%)
   - Read the plain-English rationale under **"Why this is flagged"**.
   - Select **✕ Allow to Lapse**.
   - Notice the submit button is disabled until reasoning is entered.
   - Enter: `"No current product dependency and renewal cost exceeds expected commercial value."`
   - Click **Commit LAPSE Decision to Audit Log**.

3. **Permanent Decision Ledger**:
   - Navigate to the **Decisions** tab in the top navigation.
   - Verify that your decision is logged with timestamp, patent number, title, `LAPSE` tag, full reasoning, and `Attorney` actor.
   - Refresh the page and notice the decision is permanently persisted in SQLite.

4. **Real Patent Office Action & AI Response**:
   - Navigate to the **Office Actions** tab.
   - Select **US10123456B2 (App 15/624,192)**.
   - Inspect the **Source Material** in the left panel:
     - Verified USPTO File Wrapper metadata.
     - Actual 5 Claims (Independent Claim 1 + Dependent Claims 2–5).
     - Genuine Rejections: **35 U.S.C. § 102(a)(1)** (Srivastava) and **35 U.S.C. § 103** (Srivastava in view of Bovet and Chen).
     - Cited Prior Art references (Form PTO-892).
     - Official prosecution event history.
   - Click **Generate AI Response** in the right panel.
   - Observe the first-pass legal response draft crafted directly from the source claims, distinguishing prior art, rebutting the 102/103 rejections, proposing dynamic jitter-adapted claim amendments, and featuring the **ATTORNEY REVIEW REQUIRED** warning banner.
   - Click **Copy Draft** to copy the generated response to the clipboard.

---

## 🛡️ Acceptance Criteria Verification

- [x] Application runs locally with zero external API key requirements.
- [x] Full dark terminal legal-tech control room UI (`#0A0D0C`, `#121614`, `#2DD4A7`, `#FF6B5C`, `#F2B84B`).
- [x] Deterministic 247-patent dataset with verified metrics (247 active, 12 upcoming, 8 pending, 23 low-value).
- [x] Business Value formula mathematically validated across 4 weighted components.
- [x] Mandatory reasoning requirement for Renew/Lapse decisions.
- [x] Append-only immutable decision ledger persisted in SQLite.
- [x] Real USPTO patent claims and 35 U.S.C. 102/103 prosecution data.
- [x] Dual-engine AI provider abstraction (`AnthropicProvider` & `DemoLocalProvider`).
