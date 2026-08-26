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

async function run() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();
  const appId = 'doodhroti_wins.patentplus';
  const version = 2;

  console.log('◈ Checking available methods on RocketRideClient...');
  console.log('client.publishApp:', typeof client.publishApp);
  console.log('client.whereApp:', typeof client.whereApp);
  console.log('client.submitApp:', typeof client.submitApp);
  console.log('client.listDeployments:', typeof client.listDeployments);

  console.log(`\n◈ 1. Checking whereApp for ${appId}...`);
  try {
    const where = await client.whereApp(appId);
    console.log('whereApp result:', JSON.stringify(where, null, 2));
  } catch (e) {
    console.error('whereApp error:', e.message);
  }

  console.log(`\n◈ 2. Publishing ${appId} v${version} to @me...`);
  try {
    const pubMe = await client.publishApp(appId, version, '@me');
    console.log('publishApp @me result:', JSON.stringify(pubMe, null, 2));
  } catch (e) {
    console.error('publishApp @me error:', e.message);
  }

  console.log(`\n◈ 3. Publishing ${appId} v${version} to @team/Development...`);
  try {
    const pubTeam = await client.publishApp(appId, version, '@team/Development');
    console.log('publishApp @team result:', JSON.stringify(pubTeam, null, 2));
  } catch (e) {
    console.error('publishApp @team error:', e.message);
  }

  console.log(`\n◈ 4. Submitting ${appId} v${version} for store review...`);
  try {
    const submitRes = await client.submitApp(appId, version);
    console.log('submitApp result:', JSON.stringify(submitRes, null, 2));
  } catch (e) {
    console.error('submitApp error:', e.message);
  }

  console.log(`\n◈ 5. Final whereApp check...`);
  try {
    const finalWhere = await client.whereApp(appId);
    console.log('final whereApp result:', JSON.stringify(finalWhere, null, 2));
  } catch (e) {
    console.error('final whereApp error:', e.message);
  }

  await client.disconnect();
}

run().catch(console.error);
