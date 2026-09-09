# Sentence generation

The vocabulary API now supports a general AI fallback through Groq Chat Completions (`openai/gpt-oss-20b`). The Android model `llama-3.3-70b-versatile` returned `model_not_found`; the replacement was selected from the credential's available-model list and tested successfully. See https://console.groq.com/docs/text-chat.

Shared and bundled examples take precedence. For catalog words without examples, the server generates a short English sentence, validates that it contains the target word, then translates it into the selected language. Successful English sentences are cached in memory (up to 2,000 words); concurrent requests for the same word share one generation call. Responses are labeled `generatedExample: true` in the API and AI-generated in the interface. No invented placeholder sentence is returned on failure.

Configuration: a server-only `GROQ_API_KEY` binding, or environment variable in a non-worker server. For local Cloudflare development use ignored `.dev.vars`. Never put the key in browser code or a public environment variable.

The user explicitly authorized reuse of Android's existing Groq credential for website sentence generation. It is configured in ignored `.dev.vars` for local development. Live local API verification generated a new English sentence for `locket` and its Russian translation, returning `generatedExample: true`. TypeScript and all 15 vocabulary tests passed. In-app browser verification was blocked by `ERR_NETWORK_IO_SUSPENDED`; API verification succeeded independently.

Before publishing, configure the authorized credential on the hosting service and add deployment-appropriate request limits. Generation is restricted to catalog words, but the public endpoint is not a per-user quota system. Generated examples still require language-quality review.
