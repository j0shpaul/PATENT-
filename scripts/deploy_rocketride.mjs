// ==============================================================================
// PATENT+ — RocketRide Deployment & Publication Runner
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RocketRideClient } from '../apps/patentplus-ui/node_modules/rocketride/dist/esm/client/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables manually from .env if present
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const deployUri = process.env.ROCKETRIDE_DEPLOY_URI || process.env.ROCKETRIDE_URI || 'https://staging.rocketride.ai:443';
const deployApiKey = process.env.ROCKETRIDE_DEPLOY_APIKEY || process.env.ROCKETRIDE_APIKEY;

console.log('◈ ==========================================================');
console.log('◈ PATENT+ — ROCKETRIDE CLOUD DEPLOYMENT & PUBLISHING PIPELINE');
console.log('◈ ==========================================================');
console.log(`◈ Target Server: ${deployUri}`);
console.log(`◈ Target API Key: ${deployApiKey ? 'Present (rr_...)' : 'MISSING'}`);

if (!deployUri || !deployApiKey) {
  console.error('❌ Error: ROCKETRIDE_DEPLOY_URI and ROCKETRIDE_DEPLOY_APIKEY must be set in .env');
  process.exit(1);
}

const appFolder = path.join(rootDir, 'apps', 'patentplus-ui');

async function main() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  console.log('\n[STEP 1/4] Verifying App Manifest & Assets...');
  const verifyResult = await client.deploy.verifyApp(appFolder);
  console.log('✓ App Verification Output:', JSON.stringify(verifyResult, null, 2));

  console.log('\n[STEP 2/4] Connecting to RocketRide Server...');
  try {
    const conn = await client.connect();
    console.log('✓ Connected to RocketRide Server:', JSON.stringify(conn, null, 2));
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
    process.exit(1);
  }

  console.log('\n[STEP 3/4] Packaging & Deploying Application to RocketRide Registry...');
  let deployResult;
  try {
    deployResult = await client.deploy.addApp(appFolder, {
      comment: 'PATENT+ v1.0.0 — Load-bearing RocketRide Multi-Agent Patent Intelligence & Batch Engine',
      onProgress: (p) => {
        if (typeof p === 'string') {
          console.log(`  [PACK] ${p}`);
        } else {
          console.log(`  [PACK] ${p.phase || 'Progress'}: ${p.percent || ''}% ${p.message || ''}`);
        }
      }
    });
    console.log('✓ Deployment Succeeded:', JSON.stringify(deployResult, null, 2));
  } catch (err) {
    console.error('❌ Deployment Error:', err.message);
    deployResult = { error: err.message };
  }

  console.log('\n[STEP 4/4] Inspecting Deployed App Registry & Pipelines...');
  try {
    const deployments = await client.deploy.list();
    console.log('✓ Active Deployments:', JSON.stringify(deployments, null, 2));
  } catch (e) {
    console.log('Deployments list note:', e.message);
  }

  await client.disconnect();
}

main().catch((err) => {
  console.error('Fatal Deployment Execution Error:', err);
  process.exit(1);
});
