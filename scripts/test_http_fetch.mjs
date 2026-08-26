import https from 'https';

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bodySnippet: data.slice(0, 500)
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function run() {
  console.log('Testing staging URL with clean HTTP GET...');
  const res1 = await checkUrl('https://staging.rocketride.ai/?appid=doodhroti_wins.patentplus&version=3');
  console.log('URL 1 Result:', JSON.stringify(res1, null, 2));

  const res2 = await checkUrl('https://staging.rocketride.ai/client/manifest');
  console.log('Manifest Result:', JSON.stringify(res2, null, 2));
}

run();
