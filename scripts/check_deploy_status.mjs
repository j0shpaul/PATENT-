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

async function check() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();

  const appId = 'doodhroti_wins.patentplus';
  console.log(`Checking deployment status for ${appId}...`);

  try {
    const res = await client.call('rrext_deploy', {
      subcommand: 'versions',
      projectId: appId
    });
    console.log('Versions:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('Versions error:', e.message);
  }

  try {
    const history = await client.call('rrext_deploy', {
      subcommand: 'history',
      projectId: appId
    });
    console.log('History:', JSON.stringify(history, null, 2));
  } catch (e) {
    console.error('History error:', e.message);
  }

  await client.disconnect();
}

check().catch(console.error);
