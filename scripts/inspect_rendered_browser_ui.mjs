import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const ARTIFACT_DIR = '/Users/a1/.gemini/antigravity-ide/brain/cc7897e3-eea3-448c-8eb2-ab657033ba8c';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function inspectElement(page, selector, name) {
  const el = await page.$(selector);
  if (!el) {
    return { name, selector, found: false, error: 'Element not found in DOM' };
  }
  const styles = await page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) return null;
    const computed = window.getComputedStyle(target);
    return {
      text: target.innerText || target.textContent,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      borderColor: computed.borderColor,
      opacity: computed.opacity,
      display: computed.display,
      visibility: computed.visibility,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight
    };
  }, selector);
  return { name, selector, found: true, ...styles };
}

async function run() {
  console.log('◈ Launching Brave Browser in Headless Mode...');
  const browser = await puppeteer.launch({
    executablePath: BRAVE_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('◈ Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });

  console.log('\n=============================================================');
  console.log('1. INSPECTING COMMAND OVERVIEW / MISSION CONTROL');
  console.log('=============================================================');
  const reviewPill = await inspectElement(page, '.mc-signal-pill.review', 'Review Signal Pill');
  const urgentPill = await inspectElement(page, '.mc-signal-pill.urgent', 'Urgent Signal Pill');
  console.log('Review Signal Pill:', JSON.stringify(reviewPill, null, 2));
  console.log('Urgent Signal Pill:', JSON.stringify(urgentPill, null, 2));

  console.log('\n=============================================================');
  console.log('2. INSPECTING HUMAN REVIEW STATION');
  console.log('=============================================================');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.sidebar-nav-btn'));
    const btn = btns.find(b => b.textContent.includes('HUMAN REVIEW'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const renewBtn = await inspectElement(page, '.hitl-btn.renew', 'Authorise Renewal Button');
  const lapseBtn = await inspectElement(page, '.hitl-btn.lapse', 'Authorise Lapse Button');
  const overrideBtn = await inspectElement(page, '.hitl-btn.override', 'Override Agents Button');
  const queueKicker = await inspectElement(page, '.queue-kicker', 'Queue Kicker');
  const queueTitle = await inspectElement(page, '.queue-title', 'Queue Title');

  console.log('Authorise Renewal Button:', JSON.stringify(renewBtn, null, 2));
  console.log('Authorise Lapse Button:', JSON.stringify(lapseBtn, null, 2));
  console.log('Override Agents Button:', JSON.stringify(overrideBtn, null, 2));
  console.log('Queue Title:', JSON.stringify(queueTitle, null, 2));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_human_review.png') });

  console.log('\n=============================================================');
  console.log('3. INSPECTING PORTFOLIO TABS & FILTERING');
  console.log('=============================================================');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.sidebar-nav-btn'));
    const btn = btns.find(b => b.textContent.includes('PORTFOLIO'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const allTab = await inspectElement(page, '.portfolio-quick-pills-row button:nth-child(1)', 'ALL Tab');
  const urgentTab = await inspectElement(page, '.portfolio-quick-pills-row button:nth-child(2)', 'URGENT Tab');
  const reviewTab = await inspectElement(page, '.portfolio-quick-pills-row button:nth-child(3)', 'REVIEW Tab');
  const usTab = await inspectElement(page, '.portfolio-quick-pills-row button:nth-child(4)', 'US Tab');
  const epTab = await inspectElement(page, '.portfolio-quick-pills-row button:nth-child(5)', 'EP Tab');

  console.log('ALL Tab:', JSON.stringify(allTab, null, 2));
  console.log('URGENT Tab:', JSON.stringify(urgentTab, null, 2));
  console.log('REVIEW Tab:', JSON.stringify(reviewTab, null, 2));
  console.log('US Tab:', JSON.stringify(usTab, null, 2));
  console.log('EP Tab:', JSON.stringify(epTab, null, 2));

  // Test clicking URGENT
  await page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('.portfolio-pill'));
    const p = pills.find(el => el.textContent.includes('URGENT'));
    if (p) p.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  const urgentRowCount = await page.evaluate(() => document.querySelectorAll('.portfolio-tbody tr').length);
  console.log(`Rendered rows under URGENT tab: ${urgentRowCount}`);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_portfolio.png') });

  console.log('\n=============================================================');
  console.log('4. INSPECTING OFFICE ACTION WORKSTATION & SOURCE EVIDENCE');
  console.log('=============================================================');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.sidebar-nav-btn'));
    const btn = btns.find(b => b.textContent.includes('OFFICE ACTIONS'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const panelModeTitle = await inspectElement(page, '.panel-mode-title', 'Panel Mode Title');
  const rejTabBtn = await inspectElement(page, '.evidence-sub-tabs button:nth-child(1)', 'Rejections Tab Btn');
  const docRejectionClaims = await inspectElement(page, '.doc-rejection-claims', 'Rejection Claims Text');
  const docRejectionRefs = await inspectElement(page, '.doc-rejection-refs', 'Rejection References Text');
  const examinerQuote = await inspectElement(page, '.doc-examiner-quote', 'Examiner Quote Box');

  console.log('Panel Mode Title:', JSON.stringify(panelModeTitle, null, 2));
  console.log('Rejection Claims Text:', JSON.stringify(docRejectionClaims, null, 2));
  console.log('Rejection References Text:', JSON.stringify(docRejectionRefs, null, 2));
  console.log('Examiner Quote Box:', JSON.stringify(examinerQuote, null, 2));

  // Switch to Claims sub-tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.evidence-sub-tabs .tab-btn'));
    const b = btns.find(el => el.textContent.includes('CLAIMS'));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const claimText = await inspectElement(page, '.doc-claim-text', 'Claim Text');
  console.log('Claim Text:', JSON.stringify(claimText, null, 2));

  // Switch to Prior Art sub-tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.evidence-sub-tabs .tab-btn'));
    const b = btns.find(el => el.textContent.includes('PRIOR ART'));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const paTitle = await inspectElement(page, '.pa-title', 'Prior Art Title');
  const paSummary = await inspectElement(page, '.pa-summary', 'Prior Art Summary');
  console.log('Prior Art Title:', JSON.stringify(paTitle, null, 2));
  console.log('Prior Art Summary:', JSON.stringify(paSummary, null, 2));

  // Switch to File Wrapper sub-tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.evidence-sub-tabs .tab-btn'));
    const b = btns.find(el => el.textContent.includes('FILE WRAPPER'));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const histDesc = await inspectElement(page, '.hist-desc', 'File Wrapper History Event Desc');
  console.log('File Wrapper History Event Desc:', JSON.stringify(histDesc, null, 2));

  // Test Generate Response Action
  console.log('Generating Office Action Response Draft...');
  await page.evaluate(() => {
    const btn = document.querySelector('.generate-response-action-btn, .caseroom-regen-btn');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2000));
  const legalResponse = await inspectElement(page, '.legal-response-text', 'Rendered Legal Response Draft');
  console.log('Rendered Legal Response Draft:', JSON.stringify(legalResponse, null, 2));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_office_action.png') });

  console.log('\n=============================================================');
  console.log('5. INSPECTING SYSTEM DIAGNOSTICS VIEW');
  console.log('=============================================================');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.sidebar-nav-btn'));
    const btn = btns.find(b => b.textContent.includes('SYSTEM'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const sysKicker = await inspectElement(page, '.system-kicker, .section-title-tag', 'System Kicker');
  const sysHeading = await inspectElement(page, '.system-main-heading', 'System Main Heading');
  const sysSubtitle = await inspectElement(page, '.system-subtitle-text', 'System Subtitle');
  const sysTileLabel = await inspectElement(page, '.tile-label', 'Diagnostic Tile Label');
  const sysTileVal = await inspectElement(page, '.tile-value', 'Diagnostic Tile Value');
  const provLabel = await inspectElement(page, '.prov-label', 'Provenance Label');

  console.log('System Kicker:', JSON.stringify(sysKicker, null, 2));
  console.log('System Main Heading:', JSON.stringify(sysHeading, null, 2));
  console.log('System Subtitle:', JSON.stringify(sysSubtitle, null, 2));
  console.log('Diagnostic Tile Label:', JSON.stringify(sysTileLabel, null, 2));
  console.log('Diagnostic Tile Value:', JSON.stringify(sysTileVal, null, 2));
  console.log('Provenance Label:', JSON.stringify(provLabel, null, 2));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screen_system.png') });

  await browser.close();
  console.log('\n◈ BROWSER DOM & COMPUTED STYLE INSPECTION COMPLETE ◈');
}

run().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
