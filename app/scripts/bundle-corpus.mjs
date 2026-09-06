#!/usr/bin/env node
// Copy the corpus into the app bundle. One source of truth: contributors edit
// recipes/ in the repository and the app cannot drift from it.
//
// Fails the build if either licence is missing. The app is Apache-2.0 and the
// corpus is CC BY-SA 4.0; shipping the content without its licence and
// attribution is non-compliant, and it would be a poor look for a project whose
// argument is that the commons should stay common.
import { cp, mkdir, rm, access, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(appDir, '..');
const out = join(appDir, 'corpus');

// Read at run time: recipes/ selects adaptations, instructions/ carries the
// judgement layer sent to the model, checklists/ is what the teacher reviews
// against, sample/ is the authored rehearsal set (`035`). Nothing is bundled
// that nothing reads.
//
// `sample/` ships under the same licence gate as the rest: it is content — an
// invented learner, a worksheet, an adaptation and its report, written by hand
// and reviewed like the corpus — and it travels with its attribution.
const DIRS = ['recipes', 'instructions', 'checklists', 'sample'];

/*
 * The corpus version, and the format it is written in (`034` T004, FR-3207/FR-3210).
 *
 * `version` is monotonic and is what a job report cites — «con el criterio pedagógico
 * versión N» — so a report from January still says which judgement produced it, six
 * corpus corrections later. It is read from `corpus.version` rather than computed,
 * because a number derived from a timestamp or a commit count is a number that goes
 * backwards the day somebody rebuilds an old tag.
 *
 * `formatVersion` is a **different** number with a different owner: it says which
 * contract the application's parsers must understand, so a corpus published for a newer
 * Rampa is refused whole rather than half-read. And neither of them is the vault's
 * schema version (P50) — that one versions *her data* against every app that opens it,
 * and nothing here reads or writes it.
 */
const versionFile = join(repoRoot, 'corpus.version');
let version = 1;
let formatVersion = 1;
try {
  const declared = JSON.parse(await readFile(versionFile, 'utf8'));
  if (Number.isInteger(declared.version) && declared.version > 0) version = declared.version;
  if (Number.isInteger(declared.formatVersion) && declared.formatVersion > 0) {
    formatVersion = declared.formatVersion;
  }
} catch {
  console.error(`\n  Build stopped: ${versionFile} is missing or unreadable.\n`
    + '  Every report cites the corpus version, so the corpus must have one.\n');
  process.exit(1);
}
const LICENCES = ['LICENSE', 'LICENSE-CONTENT.md', 'NOTICE'];

for (const f of LICENCES) {
  try { await access(join(repoRoot, f)); }
  catch { console.error(`\n  Build stopped: ${f} is missing.\n  The bundled corpus is CC BY-SA 4.0 and cannot ship without its licence.\n`); process.exit(1); }
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const d of DIRS) await cp(join(repoRoot, d), join(out, d), { recursive: true });
for (const f of LICENCES) await cp(join(repoRoot, f), join(out, f));

await writeFile(join(out, 'CORPUS-VERSION.json'), JSON.stringify({
  version,
  formatVersion,
  bundledAt: new Date().toISOString(),
  contents: DIRS,
  codeLicence: 'Apache-2.0',
  contentLicence: 'CC-BY-SA-4.0',
  attribution: 'Rampa contributors — https://github.com/cnebrera/curriculum-accommodation',
}, null, 2) + '\n');

console.log(`✓ corpus v${version} (formato ${formatVersion}) bundled into ${out} `
  + `(${DIRS.length} directories, ${LICENCES.length} licence files)`);
