# Thine Docs

Documentation site for [Thine](https://github.com/thine-ai/thine-runtime) — agentic coding with any LLM provider, Thine Runtime gateway, middleware, and telemetry dashboard.

## Local development

Uses [Mintlify](https://mintlify.com).

```bash
cd thine-docs
npm install
npm run dev
```

Open the URL Mintlify prints (usually `http://localhost:3000`).

## Structure

```
thine-docs/
├── docs.json          # Mintlify navigation
├── en/                # English pages (.mdx)
│   ├── overview.mdx
│   ├── runtime/       # Gateway, config, middleware, dashboard
│   └── agent-sdk/
├── llms.txt
└── logo/
```

## Deploy

### Cloud Run (stage)

```bash
npm run deploy:stage
# or: GCP_PROJECT=thinecode-500008 GCP_REGION=us-central1 bash scripts/deploy-cloud-run.sh
```

Builds a static export with `mintlify export`, serves it via `serve.js` in the container, and deploys to Cloud Run as `thine-docs-stage`.

### Mintlify hosting (production later)

1. Push to GitHub
2. Connect at [mintlify.com](https://mintlify.com)
3. Set custom domain e.g. `docs.robinailabs.com` or `docs.thine.ai`

## Contributing

1. Add or edit pages under `en/`
2. Register pages in `docs.json`
3. Update `llms.txt`
4. Run `npm run dev` to preview

## License

Documentation © Thine.
