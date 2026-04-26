const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const indexPath = path.join(root, 'index.html');
const envPath = path.join(root, '.env');
const modelCandidates = (
  process.env.DECODE_MODELS || 'gemini-2.0-flash,gemma-3-4b-it'
)
  .split(',')
  .map(model => model.trim())
  .filter(Boolean);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(envPath);

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const port = Number(process.env.PORT || 3001);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

async function generateWithFallback(rawBody) {
  let lastError = null;

  for (const model of modelCandidates) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody
      }
    );

    const text = await response.text();
    if (response.ok) {
      return { status: response.status, text, model };
    }

    lastError = { status: response.status, text, model };

    if (response.status !== 429) {
      return { status: response.status, text, model };
    }
  }

  return lastError;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(indexPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (
    req.method === 'POST' &&
    (req.url === '/.netlify/functions/decode' || req.url === '/api/decode')
  ) {
    if (!apiKey) {
      sendJson(res, 500, { error: 'Missing GEMINI_API_KEY or GOOGLE_API_KEY' });
      return;
    }

    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk;
    });

    req.on('end', async () => {
      try {
        const result = await generateWithFallback(rawBody);
        res.writeHead(result.status, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Decode-Model': result.model || 'unknown'
        });
        res.end(result.text);
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, () => {
  console.log(`decode.ai running at http://localhost:${port}`);
});
