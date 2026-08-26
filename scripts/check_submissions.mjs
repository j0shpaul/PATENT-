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

async function checkSubmissions() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();
  const projectId = 'doodhroti_wins.patentplus';

  console.log('=== CHECKING RPC METHODS FOR REVIEW/SUBMIT ===');
  
  // Let's test calling rrext_deploy with subcommand 'submit' or similar
  try {
    const submitRes = await client.call('rrext_deploy', {
      subcommand: 'submit',
      projectId,
      version: 3,
      comment: 'Submission for Hackathon Judge Review — PATENT+ AI Patent Intelligence Workstation'
    });
    console.log('rrext_deploy submit result:', JSON.stringify(submitRes, null, 2));
  } catch (e) {
    console.log('rrext_deploy submit error:', e.message);
  }

  // Let's check history
  try {
    const hist = await client.call('rrext_deploy', {
      subcommand: 'history',
      projectId
    });
    console.log('rrext_deploy history:', JSON.stringify(hist, null, 2));
  } catch (e) {
    console.log('rrext_deploy history error:', e.message);
  }

  await client.disconnect();
}

checkSubmissions().catch(console.error);
