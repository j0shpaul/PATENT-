import React, { useState, useEffect } from 'react';
import { fetchOfficeActions, fetchOfficeAction, generateOfficeActionDraft } from '../api/client';

export default function OfficeActionView({ onNotify }) {
  const [oaList, setOaList] = useState([]);
  const [selectedOaId, setSelectedOaId] = useState(null);
  const [oaData, setOaData] = useState(null);
  const [loadingOa, setLoadingOa] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('rejections'); // 'claims' | 'rejections' | 'priorArt' | 'history'

  const stages = [
    'CLAIMS',
    'REJECTIONS (35 U.S.C. § 102/103)',
    'PRIOR ART',
    'DRAFT'
  ];

  useEffect(() => {
    loadOfficeActions();
  }, []);

  const loadOfficeActions = async () => {
    try {
      const list = await fetchOfficeActions();
      setOaList(list || []);
      if (list && list.length > 0) {
        setSelectedOaId(list[0].id);
        loadSingleOfficeAction(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load OA list:', err);
    }
  };

  const loadSingleOfficeAction = async (id) => {
    setLoadingOa(true);
    try {
      const data = await fetchOfficeAction(id);
      setOaData(data);
    } catch (err) {
      console.error('Failed to load OA details:', err);
    } finally {
      setLoadingOa(false);
    }
  };

  const handleSelectOa = (id) => {
    setSelectedOaId(id);
    loadSingleOfficeAction(id);
  };

  const handleGenerate = async () => {
    if (!oaData) return;
    setGenerating(true);
    setGenerationStage(0);

    const interval = setInterval(() => {
      setGenerationStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await generateOfficeActionDraft(oaData.id);
      setOaData((prev) => ({
        ...prev,
        aiResponseDraft: res.draft,
        aiProviderUsed: res.provider,
        responseDraftedAt: res.responseDraftedAt,
      }));
      if (onNotify) {
        onNotify(`First-pass response drafted via ${res.provider === 'ANTHROPIC_AI' ? 'Claude 3.5 Sonnet' : 'Local Grounded Legal Engine'}`);
      }
    } catch (err) {
      console.error('Failed to generate OA response:', err);
      if (onNotify) {
        onNotify('Response generation error: ' + err.message);
      }
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!oaData || !oaData.aiResponseDraft) return;
    navigator.clipboard.writeText(oaData.aiResponseDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
    if (onNotify) {
      onNotify('✓ Legal response draft copied to clipboard');
    }
  };

  return (
    <div className="oa-caseroom-screen">
      {/* 1. TOP HEADER CASE ROOM TITLE */}
      <div className="caseroom-header-bar">
        <div className="caseroom-title-group">
          <div className="caseroom-kicker">PROSECUTION CASE ROOM</div>
          <h1 className="caseroom-patent-heading">
            {oaData ? `${oaData.patentNumber} — APPL NO. ${oaData.applicationNumber}` : 'PROSECUTION WORKSTATION'}
          </h1>
        </div>

        <div className="caseroom-selector-group">
          <label className="caseroom-sel-lbl">SELECT ACTIVE CASE:</label>
          <select
            className="terminal-select caseroom-dropdown"
            value={selectedOaId || ''}
            onChange={(e) => handleSelectOa(e.target.value)}
          >
            {oaList.map((oa) => (
              <option key={oa.id} value={oa.id}>
                {oa.patentNumber} — App {oa.applicationNumber} ({oa.rejectionType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. SPLIT WORKSTATION: EVIDENCE (LEFT) vs RESPONSE (RIGHT) */}
      <div className="caseroom-split-grid">
        {/* ============================================================
            LEFT PANEL: EVIDENCE (Document Viewer)
            ============================================================ */}
        <div className="caseroom-panel evidence-viewer-panel">
          <div className="caseroom-panel-toolbar">
            <span className="panel-mode-title">01. SOURCE EVIDENCE</span>

            <div className="evidence-sub-tabs">
              <button
                className={`tab-btn ${activeEvidenceTab === 'rejections' ? 'active' : ''}`}
                onClick={() => setActiveEvidenceTab('rejections')}
              >
                102 / 103 REJECTIONS ({oaData?.rejectionGrounds?.length || 0})
              </button>
              <button
                className={`tab-btn ${activeEvidenceTab === 'claims' ? 'active' : ''}`}
                onClick={() => setActiveEvidenceTab('claims')}
              >
                CLAIMS ({oaData?.claims?.length || 0})
              </button>
              <button
                className={`tab-btn ${activeEvidenceTab === 'priorArt' ? 'active' : ''}`}
                onClick={() => setActiveEvidenceTab('priorArt')}
              >
                PRIOR ART ({oaData?.citedPriorArt?.length || 0})
              </button>
              <button
                className={`tab-btn ${activeEvidenceTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveEvidenceTab('history')}
              >
                FILE WRAPPER
              </button>
            </div>
          </div>

          <div className="caseroom-panel-body">
            {loadingOa ? (
              <div className="caseroom-loading">
                <span className="loading-spinner" />
                <span>Loading prosecution file wrapper...</span>
              </div>
            ) : !oaData ? (
              <div className="caseroom-empty">No office action record loaded.</div>
            ) : (
              <>
                {/* Meta summary strip */}
                <div className="doc-meta-strip">
                  <div><strong>EXAMINER:</strong> {oaData.examinerName} (Art Unit {oaData.artUnit})</div>
                  <div><strong>ACTION DATE:</strong> {oaData.documentDate}</div>
                  <div><strong>TYPE:</strong> {oaData.rejectionType}</div>
                </div>

                {/* Sub-View: 102/103 Rejections */}
                {activeEvidenceTab === 'rejections' && (
                  <div className="doc-flow-container">
                    {oaData.rejectionGrounds.map((rg, idx) => (
                      <div key={idx} className="doc-rejection-card">
                        <div className="doc-rejection-hdr">
                          <span className="statute-badge">{rg.statute}</span>
                          <span className="statute-name">{rg.rejectionType}</span>
                        </div>
                        <div className="doc-rejection-claims">
                          <strong>CLAIMS REJECTED:</strong> Claims {rg.claimsRejected.join(', ')}
                        </div>
                        <div className="doc-rejection-refs">
                          <strong>CITED REFERENCES:</strong> {rg.citedReferences.join('; ')}
                        </div>
                        <div className="doc-examiner-quote">
                          <span className="quote-tag">EXAMINER ANALYSIS:</span>
                          <p>{rg.examinerAnalysis}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-View: Claims */}
                {activeEvidenceTab === 'claims' && (
                  <div className="doc-flow-container">
                    {oaData.claims.map((clm) => (
                      <div key={clm.id} className="doc-claim-card font-mono">
                        <div className="doc-claim-hdr">
                          <span className="claim-num-tag">Claim {clm.claimNumber}</span>
                          <span className="badge-jur">{clm.isIndependent ? 'INDEPENDENT' : 'DEPENDENT'}</span>
                          <span className="terminal-status-tag lapse">{clm.status}</span>
                        </div>
                        <p className="doc-claim-text">{clm.claimText}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-View: Prior Art */}
                {activeEvidenceTab === 'priorArt' && (
                  <div className="doc-flow-container">
                    {oaData.citedPriorArt.map((pa, idx) => (
                      <div key={idx} className="doc-prior-art-card">
                        <div className="doc-pa-hdr">
                          <span className="pa-ref-num font-mono">{pa.referenceNumber}</span>
                          <span className="pa-date font-mono">{pa.publicationDate}</span>
                        </div>
                        <div className="pa-title">{pa.title}</div>
                        <div className="pa-owner">Assignee / Inventor: {pa.inventorOrApplicant}</div>
                        <div className="pa-summary">
                          <strong>Distinction Profile:</strong> {pa.relevanceSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-View: File Wrapper History */}
                {activeEvidenceTab === 'history' && (
                  <div className="doc-flow-container">
                    <div className="history-flow-list font-mono">
                      {oaData.prosecutionHistory.map((ev, idx) => (
                        <div key={idx} className="history-entry-row">
                          <span className="hist-date">{ev.date}</span>
                          <span className="hist-code">{ev.eventCode}</span>
                          <span className="hist-desc">{ev.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ============================================================
            RIGHT PANEL: RESPONSE (AI Legal Writing Workstation)
            ============================================================ */}
        <div className="caseroom-panel writing-workstation-panel">
          <div className="caseroom-panel-toolbar">
            <span className="panel-mode-title">02. RESPONSE DRAFT</span>

            {oaData?.aiResponseDraft && (
              <div className="workstation-actions">
                <button className="caseroom-copy-btn" onClick={handleCopy}>
                  {copied ? '✓ COPIED' : 'COPY DRAFT'}
                </button>
                <button
                  className="caseroom-regen-btn"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  RE-GENERATE
                </button>
              </div>
            )}
          </div>

          <div className="caseroom-panel-body writing-body">
            {generating ? (
              <div className="caseroom-generating-state">
                <div className="generating-spinner-ring">
                  <span className="loading-spinner large" />
                </div>
                <div className="generating-title">SYNTHESIZING LEGAL RESPONSE</div>
                <div className="generating-stages-box font-mono">
                  {stages.map((st, i) => (
                    <div
                      key={i}
                      className={`stage-line ${i === generationStage ? 'active' : i < generationStage ? 'done' : 'pending'}`}
                    >
                      <span>{i < generationStage ? '✓' : i === generationStage ? '▶' : '○'}</span>
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : oaData?.aiResponseDraft ? (
              <div className="response-draft-display">
                {/* Minimal Review Disclaimer Header */}
                <div className="caseroom-disclaimer-banner">
                  <div className="disclaimer-title font-mono">
                    <span>⚠</span>
                    <strong>FIRST-PASS RESPONSE · AI GENERATED · ATTORNEY REVIEW REQUIRED</strong>
                  </div>
                </div>

                <div className="draft-meta-strip font-mono">
                  <span>Synthesizer: <strong>{oaData.aiProviderUsed === 'ANTHROPIC_AI' ? 'Claude 3.5' : 'Legal Engine'}</strong></span>
                  <span>Drafted: {oaData.responseDraftedAt || 'Current Session'}</span>
                </div>

                <pre className="legal-response-text font-mono">
                  {oaData.aiResponseDraft}
                </pre>
              </div>
            ) : (
              <div className="writing-initial-callout">
                <h3 className="initial-title">GENERATE FIRST-PASS RESPONSE</h3>
                <div className="initial-stages-preview font-mono">
                  <span>CLAIMS ➔ REJECTION ➔ PRIOR ART ➔ DRAFT</span>
                </div>
                <button
                  className="generate-response-action-btn font-mono"
                  onClick={handleGenerate}
                  disabled={loadingOa}
                >
                  ⚡ GENERATE RESPONSE →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
