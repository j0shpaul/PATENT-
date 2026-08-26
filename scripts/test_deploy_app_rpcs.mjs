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
  const version = 3;

  console.log('=== 1. rrext_deploy_app: versions ===');
  try {
    const versions = await client.call('rrext_deploy_app', { subcommand: 'versions', appId });
    console.log('Versions:', JSON.stringify(versions, null, 2));
  } catch (e) {
    console.error('versions error:', e.message);
  }

  console.log('\n=== 2. rrext_deploy_app: where ===');
  try {
    const where = await client.call('rrext_deploy_app', { subcommand: 'where', appId });
    console.log('Where:', JSON.stringify(where, null, 2));
  } catch (e) {
    console.error('where error:', e.message);
  }

  console.log(`\n=== 3. rrext_deploy_app: publish ${appId} v${version} to @me ===`);
  try {
    const pubMe = await client.call('rrext_deploy_app', { subcommand: 'publish', appId, version, target: '@me' });
    console.log('Publish @me:', JSON.stringify(pubMe, null, 2));
  } catch (e) {
    console.error('publish @me error:', e.message);
  }

  console.log(`\n=== 4. rrext_deploy_app: publish ${appId} v${version} to @team/Development ===`);
  try {
    const pubTeam = await client.call('rrext_deploy_app', { subcommand: 'publish', appId, version, target: '@team/Development' });
    console.log('Publish @team:', JSON.stringify(pubTeam, null, 2));
  } catch (e) {
    console.error('publish @team error:', e.message);
  }

  console.log(`\n=== 5. rrext_deploy_app: publish ${appId} v${version} to @team/Production ===`);
  try {
    const pubProd = await client.call('rrext_deploy_app', { subcommand: 'publish', appId, version, target: '@team/Production' });
    console.log('Publish @team/Production:', JSON.stringify(pubProd, null, 2));
  } catch (e) {
    console.error('publish @team/Production error:', e.message);
  }

  console.log(`\n=== 6. rrext_deploy_app: submit v${version} for store review ===`);
  try {
    const sub = await client.call('rrext_deploy_app', { subcommand: 'submit', appId, version });
    console.log('Submit result:', JSON.stringify(sub, null, 2));
  } catch (e) {
    console.error('submit error:', e.message);
  }

  console.log(`\n=== 7. rrext_deploy_app: publish ${appId} v${version} to @public ===`);
  try {
    const pubPublic = await client.call('rrext_deploy_app', { subcommand: 'publish', appId, version, target: '@public' });
    console.log('Publish @public result:', JSON.stringify(pubPublic, null, 2));
  } catch (e) {
    console.error('publish @public error:', e.message);
  }

  console.log('\n=== 8. FINAL rrext_deploy_app: where ===');
  try {
    const finalWhere = await client.call('rrext_deploy_app', { subcommand: 'where', appId });
    console.log('Final Where:', JSON.stringify(finalWhere, null, 2));
  } catch (e) {
    console.error('final where error:', e.message);
  }

  await client.disconnect();
}

run().catch(console.error);
