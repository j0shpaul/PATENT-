import React, { useState, useEffect } from 'react';
import { fetchOfficeActions, fetchOfficeAction, generateOfficeActionDraft } from '../api/client';

export default function OfficeActionView({ onNotify }) {
  const [oaList, setOaList] = useState([]);
  const [selectedOaId, setSelectedOaId] = useState(null);
  const [oaData, setOaData] = useState(null);
  const [loadingOa, setLoadingOa] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0); // 0, 1, 2, 3
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('claims'); // 'claims' | 'rejections' | 'priorArt' | 'history'

  const stages = [
    'PARSING CLAIMS & LIMITATIONS',
    'ANALYZING 35 U.S.C. § 102/103 REJECTIONS',
    'MAPPING PRIOR ART DISTINCTIONS (PTO-892)',
    'SYNTHESIZING ATTORNEY-READY RESPONSE DRAFT'
  ];

  useEffect(() => {
    loadOfficeActions();
  }, []);

  const loadOfficeActions = async () => {
    try {
      const list = await fetchOfficeActions();
      setOaList(list);
      if (list.length > 0) {
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

    // Multi-stage cinematic progress timer
    const interval = setInterval(() => {
      setGenerationStage((prev) => (prev < 3 ? prev + 1 : prev));
    }, 600);

    try {
      const res = await generateOfficeActionDraft(oaData.id);
      setOaData((prev) => ({
        ...prev,
        aiResponseDraft: res.draft,
        aiProviderUsed: res.provider,
        responseDraftedAt: res.responseDraftedAt,
      }));
      if (onNotify) {
        onNotify(`Response drafted via ${res.provider === 'ANTHROPIC_AI' ? 'Claude 3.5 Sonnet' : 'Grounded Legal AI Engine'}`);
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
    setTimeout(() => setCopied(false), 2200);
    if (onNotify) {
      onNotify('Legal response draft copied to clipboard');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Case Selector Card */}
      <div className="table-filter-bar" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ACTIVE PROSECUTION CASE:
          </span>
          <select
            className="terminal-select"
            style={{ fontSize: '12px', padding: '8px 12px' }}
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

        {oaData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`badge-micro-source ${oaData.sourceType === 'REAL' ? 'real' : 'synth'}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
              {oaData.sourceType === 'REAL' ? '● USPTO ODP FILE WRAPPER (VERIFIED REAL DATA)' : 'DEMO CASE'}
            </span>
          </div>
        )}
      </div>

      {/* Split Workstation Layout */}
      <div className="oa-workstation-container">
        {/* LEFT COLUMN: SOURCE MATERIAL */}
        <div className="oa-workstation-panel">
          <div className="oa-workstation-header">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)' }}>▶</span> PROSECUTION RECORD
            </div>

            <div className="source-nav-pills">
              <button
                className={`source-nav-pill ${activeSection === 'claims' ? 'active' : ''}`}
                onClick={() => setActiveSection('claims')}
              >
                Claims ({oaData?.claims?.length || 0})
              </button>
              <button
                className={`source-nav-pill ${activeSection === 'rejections' ? 'active' : ''}`}
                onClick={() => setActiveSection('rejections')}
              >
                Rejections ({oaData?.rejectionGrounds?.length || 0})
              </button>
              <button
                className={`source-nav-pill ${activeSection === 'priorArt' ? 'active' : ''}`}
                onClick={() => setActiveSection('priorArt')}
              >
                Prior Art ({oaData?.citedPriorArt?.length || 0})
              </button>
              <button
                className={`source-nav-pill ${activeSection === 'history' ? 'active' : ''}`}
                onClick={() => setActiveSection('history')}
              >
                File Wrapper
              </button>
            </div>
          </div>

          <div className="oa-workstation-body">
            {loadingOa ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Loading prosecution records...
              </div>
            ) : !oaData ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No office action selected.
              </div>
            ) : (
              <>
                {/* Document Header Metadata */}
                <div style={{
                  backgroundColor: 'var(--surface-inset)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11.5px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px 16px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>PATENT:</span>{' '}
                    <strong style={{ color: 'var(--accent)' }}>{oaData.patentNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>APPLICATION:</span>{' '}
                    <strong>{oaData.applicationNumber}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>EXAMINER:</span>{' '}
                    <span>{oaData.examinerName} (Art Unit {oaData.artUnit})</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>MAIL DATE:</span>{' '}
                    <span>{oaData.documentDate}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>TITLE:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{oaData.title}</span>
                  </div>
                </div>

                {/* Section Content */}
                {activeSection === 'claims' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Pending Patent Claims ({oaData.claims.length}):
                    </div>
                    {oaData.claims.map((clm) => (
                      <div
                        key={clm.id}
                        style={{
                          backgroundColor: 'var(--surface-inset)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px 16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                            Claim {clm.claimNumber}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span className="badge-jur" style={{ fontSize: '10px' }}>
                              {clm.isIndependent ? 'INDEPENDENT' : 'DEPENDENT'}
                            </span>
                            <span
                              className="terminal-status-tag"
                              style={{
                                color: clm.status === 'REJECTED' ? 'var(--urgent)' : 'var(--text-muted)',
                                borderColor: clm.status === 'REJECTED' ? 'var(--urgent-border)' : 'var(--border)'
                              }}
                            >
                              {clm.status}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                          {clm.claimText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'rejections' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Official Statutory Rejections:
                    </div>
                    {oaData.rejectionGrounds.map((rg, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--surface-inset)',
                          border: '1px solid var(--border)',
                          borderLeft: '3px solid var(--urgent)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px 16px'
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--urgent)', marginBottom: '4px' }}>
                          {rg.statute} — {rg.rejectionType}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          <strong>Rejected Claims:</strong> {rg.claimsRejected.join(', ')} |{' '}
                          <strong>Cited References:</strong> {rg.citedReferences.join(', ')}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {rg.examinerAnalysis}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'priorArt' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Cited Prior Art References (Form PTO-892):
                    </div>
                    {oaData.citedPriorArt.map((pa, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--surface-inset)',
                          border: '1px solid var(--border)',
                          borderLeft: '3px solid var(--warning)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px 16px'
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--warning)', fontSize: '12.5px' }}>
                          {pa.referenceNumber}
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '12.5px', marginTop: '2px', fontWeight: 600 }}>
                          {pa.title}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {pa.inventorOrApplicant} • Published: {pa.publicationDate}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.45' }}>
                          {pa.relevanceSummary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === 'history' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      USPTO File History Events:
                    </div>
                    {oaData.prosecutionHistory.map((ev, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '12px',
                          padding: '8px 12px',
                          backgroundColor: 'var(--surface-inset)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11.5px'
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', width: '90px' }}>
                          {ev.date}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600, width: '75px' }}>
                          [{ev.eventCode}]
                        </span>
                        <span style={{ color: 'var(--text-primary)', flex: 1 }}>{ev.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI RESPONSE WORKSPACE */}
        <div className="oa-workstation-panel">
          <div className="oa-workstation-header">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)' }}>▶</span> FIRST-PASS LEGAL DRAFT
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {oaData?.aiResponseDraft && (
                <button
                  className="terminal-reset-btn"
                  onClick={handleCopy}
                  style={{
                    backgroundColor: copied ? 'var(--accent-dim)' : 'transparent',
                    borderColor: copied ? 'var(--accent)' : 'var(--border)',
                    color: copied ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: 600
                  }}
                >
                  {copied ? '✓ COPIED' : 'COPY DRAFT'}
                </button>
              )}

              <button
                className="commit-decision-btn"
                style={{ width: 'auto', padding: '6px 14px', fontSize: '11px' }}
                onClick={handleGenerate}
                disabled={generating || !oaData}
              >
                {generating
                  ? 'ANALYZING & DRAFTING...'
                  : oaData?.aiResponseDraft
                  ? 'REGENERATE'
                  : 'GENERATE RESPONSE'}
              </button>
            </div>
          </div>

          <div className="oa-workstation-body">
            {generating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px' }}>
                <div className="generation-stage-container">
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    LEGAL REASONING PIPELINE:
                  </div>

                  {stages.map((stageName, idx) => {
                    const isDone = generationStage > idx;
                    const isActive = generationStage === idx;
                    return (
                      <div
                        key={idx}
                        className={`generation-stage-item ${isActive ? 'active' : isDone ? 'done' : ''}`}
                      >
                        <div className="stage-step-bullet">
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span>{stageName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : oaData?.aiResponseDraft ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Banner */}
                <div
                  className={`legal-review-badge ${
                    oaData.aiProviderUsed === 'ANTHROPIC_AI' ? 'ai' : 'demo'
                  }`}
                >
                  {oaData.aiProviderUsed === 'ANTHROPIC_AI'
                    ? '● AI GENERATED (CLAUDE 3.5 SONNET) — ATTORNEY REVIEW REQUIRED'
                    : '● DEMO GENERATED (GROUNDED LEGAL AI) — ATTORNEY REVIEW REQUIRED'}
                </div>

                <div className="formal-legal-doc-view">
                  {oaData.aiResponseDraft}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  AWAITING ATTORNEY INITIATION
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: '1.5' }}>
                  Click <strong>GENERATE RESPONSE</strong> to initiate a grounded legal analysis rebutting the 35 U.S.C. § 102/103 rejections with dynamic jitter threshold amendments.
                </p>
                <button
                  className="commit-decision-btn"
                  style={{ width: 'auto', padding: '10px 20px', fontSize: '11.5px', marginTop: '6px' }}
                  onClick={handleGenerate}
                >
                  GENERATE RESPONSE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
