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

async function pointPipeline() {
  const client = new RocketRideClient({
    uri: deployUri,
    auth: deployApiKey
  });

  await client.connect();

  const projectId = '7f8b9e12-4c3a-4a89-9e52-bd6198f12a34';
  const version = 3;

  console.log(`Pointing team deployments for ${projectId} v${version}...`);

  try {
    const prod = await client.deploy.deploy(projectId, version, '50237d4f-01ad-4abc-b020-6cedc56a4510');
    console.log('✓ Pointed Production team deployment:', JSON.stringify(prod, null, 2));
  } catch (e) {
    console.error('Production deployment pointer error:', e.message);
  }

  try {
    const dev = await client.deploy.deploy(projectId, version, '116c0691-0fe3-455d-abff-b5d62e434e71');
    console.log('✓ Pointed Development team deployment:', JSON.stringify(dev, null, 2));
  } catch (e) {
    console.error('Development deployment pointer error:', e.message);
  }

  const list = await client.deploy.list();
  console.log('✓ All Active Deployments:', JSON.stringify(list, null, 2));

  await client.disconnect();
}

pointPipeline().catch(console.error);
