#!/usr/bin/env node
/**
 * Sync public Mac download metadata from GCS into DOC_RELEASE.json and doc pins.
 *
 * Usage:
 *   node scripts/sync-downloader.mjs
 *   THINE_CODE_ROOT=../Thine-code node scripts/sync-downloader.mjs
 *   npm run sync:downloader
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = path.join(__dirname, '..');
const RELEASE_PATH = path.join(DOCS_ROOT, 'DOC_RELEASE.json');

const DEFAULT_MANIFEST_URL =
  'https://storage.googleapis.com/robinailabs-dist/desktop/stable/latest-darwin-x64.json';

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function gitShortRef(repoRoot) {
  try {
    return execFileSync('git', ['-C', repoRoot, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return undefined;
  }
}

async function readJsonFile(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function readAgentVersion(codeRoot) {
  try {
    const pkg = await readJsonFile(path.join(codeRoot, 'packages/thine-agent/package.json'));
    return pkg.version;
  } catch {
    return undefined;
  }
}

async function fetchManifest(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`manifest fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json();
}

function formatPublishedDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  return iso.slice(0, 10);
}

function patchPlatformsManifestLine(content, desktop) {
  const commit = desktop.gitCommit ?? 'unknown';
  const date = formatPublishedDate(desktop.publishedAt);
  const notes = desktop.notes ? desktop.notes.replace(/\s+/g, ' ').trim() : '';
  const suffix = notes ? ` — ${notes}` : '';
  const line = `- **Manifest:** [latest-darwin-x64.json](${desktop.manifestUrl}) — build **${commit}** (${date})${suffix}`;

  const re =
    /^- \*\*Manifest:\*\* \[latest-darwin-x64\.json\]\([^)]+\) — build \*\*[^*]+\*\* \([^)]+\).*$/m;
  if (re.test(content)) {
    return content.replace(re, line);
  }
  return content;
}

function patchOverviewNote(content, release) {
  const block = `<Note>
  **Docs release:** \`${release.docsRelease}\` · **thine-agent:** \`${release.thineAgentVersion}\` · **Thine-code:** \`${release.thineCodeRef}\`${
    release.desktop?.gitCommit
      ? ` · **Mac zip build:** \`${release.desktop.gitCommit}\``
      : ''
  }  
  Source pin: \`DOC_RELEASE.json\` in the [thine-docs](https://github.com/thine-ai/thine-docs) repo. Redeploy with \`./scripts/deploy-cloud-run.sh\` to refresh [stage](https://thine-docs-stage-2svmvg356a-uc.a.run.app/en/agent-sdk/overview).
</Note>`;

  const re = /<Note>[\s\S]*?<\/Note>/;
  if (!re.test(content)) {
    throw new Error('overview.mdx: expected <Note> block');
  }
  return content.replace(re, block);
}

function patchChangelogPin(content, release) {
  const line = `Pinned to Thine-code \`${release.thineCodeRef}\`, thine-agent \`${release.thineAgentVersion}\` — Mac desktop zip \`${release.desktop?.gitCommit ?? '—'}\` — see \`DOC_RELEASE.json\`.`;
  const re = /^Pinned to Thine-code `[^`]+`, thine-agent `[^`]+`.*$/m;
  if (re.test(content)) {
    return content.replace(re, line);
  }
  return content;
}

function patchLlmsHeader(content, release) {
  const header = `> Docs release ${release.docsRelease} · Thine-code ${release.thineCodeRef} · thine-agent ${release.thineAgentVersion} · Mac zip ${release.desktop?.gitCommit ?? '—'} (\`DOC_RELEASE.json\`)`;
  const re = /^> Docs release .*$/m;
  if (re.test(content)) {
    return content.replace(re, header);
  }
  return content;
}

async function main() {
  const manifestUrl = process.env.THINE_DESKTOP_MANIFEST_URL ?? DEFAULT_MANIFEST_URL;
  const codeRoot = path.resolve(
    process.env.THINE_CODE_ROOT ?? path.join(DOCS_ROOT, '..', 'Thine-code')
  );

  const manifest = await fetchManifest(manifestUrl);
  const thineCodeRef =
    process.env.THINE_CODE_REF?.trim() || gitShortRef(codeRoot) || manifest.gitCommit;
  const thineAgentVersion =
    process.env.THINE_AGENT_VERSION?.trim() || (await readAgentVersion(codeRoot)) || '0.1.0';

  let prior = {};
  try {
    prior = await readJsonFile(RELEASE_PATH);
  } catch {
    /* first run */
  }

  const release = {
    docsRelease: process.env.DOCS_RELEASE?.trim() || prior.docsRelease || todayUtcDate(),
    thineCodeRef,
    thineAgentVersion,
    stageService: prior.stageService ?? 'thine-docs-stage',
    cloudRunRevision: prior.cloudRunRevision,
    deployedAt: prior.deployedAt,
    notes:
      process.env.DOC_RELEASE_NOTES?.trim() ||
      prior.notes ||
      'Synced from GCS desktop manifest via scripts/sync-downloader.mjs',
    desktop: {
      channel: manifest.channel ?? 'stable',
      platform: manifest.platform ?? 'darwin-x64',
      gitCommit: manifest.gitCommit,
      publishedAt: manifest.publishedAt,
      artifact: manifest.artifact,
      url: manifest.url,
      sha256: manifest.sha256,
      unsigned: manifest.unsigned ?? true,
      manifestUrl,
      notes: manifest.notes,
    },
    downloaderSyncedAt: new Date().toISOString(),
  };

  await fs.writeFile(RELEASE_PATH, `${JSON.stringify(release, null, 2)}\n`);

  const overviewPath = path.join(DOCS_ROOT, 'en/agent-sdk/overview.mdx');
  const changelogPath = path.join(DOCS_ROOT, 'en/changelog.mdx');
  const platformsPath = path.join(DOCS_ROOT, 'en/platforms.mdx');
  const llmsPath = path.join(DOCS_ROOT, 'llms.txt');

  const [overview, changelog, platforms, llms] = await Promise.all([
    fs.readFile(overviewPath, 'utf8'),
    fs.readFile(changelogPath, 'utf8'),
    fs.readFile(platformsPath, 'utf8'),
    fs.readFile(llmsPath, 'utf8'),
  ]);

  await Promise.all([
    fs.writeFile(overviewPath, patchOverviewNote(overview, release)),
    fs.writeFile(changelogPath, patchChangelogPin(changelog, release)),
    fs.writeFile(platformsPath, patchPlatformsManifestLine(platforms, release.desktop)),
    fs.writeFile(llmsPath, patchLlmsHeader(llms, release)),
  ]);

  console.log('DOC_RELEASE.json updated');
  console.log(`  thineCodeRef:      ${release.thineCodeRef}`);
  console.log(`  thineAgentVersion: ${release.thineAgentVersion}`);
  console.log(`  desktop.gitCommit: ${release.desktop.gitCommit}`);
  console.log(`  desktop.sha256:    ${release.desktop.sha256?.slice(0, 16)}…`);
  console.log('Patched: overview.mdx, changelog.mdx, platforms.mdx, llms.txt');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});