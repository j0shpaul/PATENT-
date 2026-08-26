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

async function inspect() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();
  const appId = 'doodhroti_wins.patentplus';

  console.log('=== 1. LIST VERSIONS FOR APP ===');
  const versions = await client.deploy.versions(appId);
  console.log('Versions:', JSON.stringify(versions, null, 2));

  console.log('\n=== 2. WHERE APP IS LIVE (Audience bindings) ===');
  try {
    const where = await client.call('rrext_deploy', { subcommand: 'where', appId });
    console.log('Where:', JSON.stringify(where, null, 2));
  } catch (e) {
    console.log('rrext_deploy where error:', e.message);
  }

  console.log('\n=== 3. AUDIT HISTORY ===');
  try {
    const history = await client.call('rrext_deploy', { subcommand: 'history', appId });
    console.log('History:', JSON.stringify(history, null, 2));
  } catch (e) {
    console.log('rrext_deploy history error:', e.message);
  }

  console.log('\n=== 4. TEST DEPLOY / PUBLISH COMMANDS ===');
  // Check if we can point the production and development teams to version 3!
  try {
    const pubProd = await client.deploy.deploy(appId, 3, '50237d4f-01ad-4abc-b020-6cedc56a4510');
    console.log('Deployed v3 to Production Team:', JSON.stringify(pubProd, null, 2));
  } catch (e) {
    console.log('Deploy v3 to Production Team error:', e.message);
  }

  try {
    const pubDev = await client.deploy.deploy(appId, 3, '116c0691-0fe3-455d-abff-b5d62e434e71');
    console.log('Deployed v3 to Dev Team:', JSON.stringify(pubDev, null, 2));
  } catch (e) {
    console.log('Deploy v3 to Dev Team error:', e.message);
  }

  await client.disconnect();
}

inspect().catch(console.error);
