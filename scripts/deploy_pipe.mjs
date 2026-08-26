import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RocketRideClient } from '../apps/patentplus-ui/node_modules/rocketride/dist/esm/client/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

const deployUri = process.env.ROCKETRIDE_DEPLOY_URI || process.env.ROCKETRIDE_URI;
const deployApiKey = process.env.ROCKETRIDE_DEPLOY_APIKEY || process.env.ROCKETRIDE_APIKEY;

async function deployPipeline() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();

  const pipePath = path.join(rootDir, 'pipelines', 'patent_analysis.pipe');
  const pipeContent = JSON.parse(fs.readFileSync(pipePath, 'utf8'));

  console.log('Deploying canonical patent_analysis.pipe to RocketRide Pipeline Registry...');
  const res = await client.deploy.add({
    kind: 'pipe',
    pipeline: {
      ...pipeContent,
      name: 'PATENT+ Multi-Agent Portfolio Decision Pipeline'
    },
    comment: 'PATENT+ v1.0.0 — Webhook, Schema Guardrails, 4 Specialist Agents, and JSON Response'
  });

  console.log('✓ Pipeline Deployed Successfully:', JSON.stringify(res, null, 2));
  await client.disconnect();
}

deployPipeline().catch(console.error);
