# Thine Code Docs

Documentation site for [Thine Code](https://github.com/thine-ai/thine-code) — a multi-provider fork of Claude Code (Gemini, OpenAI, DeepSeek, Qwen, Kimi, GLM, and more).

Modeled after the official [Claude Code docs](https://code.claude.com/docs/en/overview) layout and navigation.

## Local development

Uses [Mintlify](https://mintlify.com) (same doc platform family as Claude Code docs).

```bash
cd thine-docs
npm install
npm run dev
```

Open the URL Mintlify prints (usually `http://localhost:3000`).

## Structure

```
thine-docs/
├── docs.json          # Mintlify navigation (tabs, sidebar, theme)
├── en/                # English pages (.mdx)
│   ├── overview.mdx
│   ├── quickstart.mdx
│   ├── providers.mdx
│   ├── cli-reference.mdx
│   ├── whats-new/
│   └── agent-sdk/
├── llms.txt           # AI-friendly doc index (like upstream)
└── logo/
```

## Deploy

### Mintlify (recommended)

1. Push this repo to GitHub
2. Connect at [mintlify.com](https://mintlify.com)
3. Set custom domain e.g. `docs.thine.ai` or `code.thine.ai`

### Static preview

```bash
npm run build
```

## Create GitHub repo

```bash
cd thine-docs
git init
git add .
git commit -m "Initial Thine Code docs site (Mintlify)"
gh repo create thine-docs --public --source=. --push
```

Update `docs.json` navbar links with your real org/repo URLs.

## Relationship to upstream

| Thine docs | Claude Code docs |
| --- | --- |
| Multi-provider setup | Anthropic auth & cloud |
| Feature parity matrix | Weekly what's new |
| Thine CLI branding | Official CLI reference |

Link to upstream for IDE/desktop/web features Thine does not ship.

## Contributing

1. Add or edit pages under `en/`
2. Register pages in `docs.json` navigation
3. Add a line to `llms.txt` for AI discoverability
4. Run `npm run dev` to preview

## License

Documentation © Thine. Claude Code upstream is © Anthropic. Thine Code fork terms follow the main `thine-code` repository.
