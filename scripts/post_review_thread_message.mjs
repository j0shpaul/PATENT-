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

async function postReviewNote() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();
  const appId = 'doodhroti_wins.patentplus';
  const version = 3;

  console.log(`Posting submission message into RocketRide Review Conversation for ${appId} v${version}...`);

  try {
    const replyRes = await client.call('rrext_deploy_app', {
      subcommand: 'reply',
      appId,
      version,
      message: 'PATENT+ Hackathon Submission (v3): Enterprise Patent Intelligence & Pruning Workstation powered by RocketRide 4-Agent Pipeline orchestration, batch schema quarantine, contradiction consensus engine, and human-in-the-loop review station.'
    });
    console.log('✓ Review Thread Message Posted:', JSON.stringify(replyRes, null, 2));
  } catch (e) {
    console.error('Reply error:', e.message);
  }

  await client.disconnect();
}

postReviewNote().catch(console.error);
