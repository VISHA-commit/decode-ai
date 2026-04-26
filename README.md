# decode.ai

Simple landing page plus a Netlify serverless function for AI text decoding.

## Project structure

- `index.html`: frontend
- `netlify/functions/decode.js`: serverless AI proxy
- `netlify.toml`: Netlify config

## Run locally

1. Copy `.env.example` to `.env`
2. Set `GEMINI_API_KEY`
3. Run `npx netlify dev`
4. Open the local URL from Netlify Dev

## Notes

- Opening `index.html` directly with `file://` uses the frontend fallback demo.
- Real AI responses require the Netlify function and an API key.
