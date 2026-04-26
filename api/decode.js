const API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  "AIzaSyCcCKBQ2_ko3MHhVJP-Ty1hUhaMjphsZ3E";

const MODEL_CANDIDATES = (
  process.env.DECODE_MODELS || "gemini-2.0-flash,gemma-3-4b-it"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

async function generateWithFallback(body) {
  let lastResult = null;

  for (const model of MODEL_CANDIDATES) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();
    lastResult = { status: response.status, text, model };

    if (response.ok || response.status !== 429) {
      return lastResult;
    }
  }

  return lastResult;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "Missing Gemini API key" });
  }

  try {
    const result = await generateWithFallback(req.body);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Decode-Model", result.model || "unknown");
    return res.status(result.status).send(result.text);
  } catch (error) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: error.message });
  }
}
