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

async function publish() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();

  const appId = 'doodhroti_wins.patentplus';
  const version = 2;

  console.log(`Publishing ${appId} v${version} to audiences...`);

  // Publish to Development team (116c0691-0fe3-455d-abff-b5d62e434e71)
  try {
    const resDev = await client.call('rrext_deploy', {
      subcommand: 'publish',
      projectId: appId,
      version: version,
      target: '@team/Development',
      teamId: '116c0691-0fe3-455d-abff-b5d62e434e71'
    });
    console.log('✓ Published to @team/Development:', JSON.stringify(resDev, null, 2));
  } catch (e) {
    console.error('Dev team publish error:', e.message);
  }

  // Publish to Production team (50237d4f-01ad-4abc-b020-6cedc56a4510)
  try {
    const resProd = await client.call('rrext_deploy', {
      subcommand: 'publish',
      projectId: appId,
      version: version,
      target: '@team/Production',
      teamId: '50237d4f-01ad-4abc-b020-6cedc56a4510'
    });
    console.log('✓ Published to @team/Production:', JSON.stringify(resProd, null, 2));
  } catch (e) {
    console.error('Prod team publish error:', e.message);
  }

  // Publish to Personal @me
  try {
    const resMe = await client.call('rrext_deploy', {
      subcommand: 'publish',
      projectId: appId,
      version: version,
      target: '@me'
    });
    console.log('✓ Published to @me:', JSON.stringify(resMe, null, 2));
  } catch (e) {
    console.error('@me publish error:', e.message);
  }

  // Submit for Store Review
  try {
    const resSubmit = await client.call('rrext_deploy', {
      subcommand: 'submit',
      projectId: appId,
      version: version
    });
    console.log('✓ Submitted for Store Review:', JSON.stringify(resSubmit, null, 2));
  } catch (e) {
    console.log('Store review submit note:', e.message);
  }

  await client.disconnect();
}

publish().catch(console.error);
