exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: ""
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const modelCandidates = (
      process.env.DECODE_MODELS || "gemini-2.0-flash,gemma-3-4b-it"
    )
      .split(",")
      .map(model => model.trim())
      .filter(Boolean);

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          error: "Missing GEMINI_API_KEY or GOOGLE_API_KEY environment variable"
        })
      };
    }

    const body = JSON.parse(event.body);
    let lastResult = null;

    for (const model of modelCandidates) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }
      );

      const text = await resp.text();
      lastResult = { status: resp.status, text, model };

      if (resp.ok || resp.status !== 429) {
        break;
      }
    }

    return {
      statusCode: lastResult.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Decode-Model": lastResult.model || "unknown"
      },
      body: lastResult.text
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message })
    };
  }
};
