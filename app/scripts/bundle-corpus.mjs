#!/usr/bin/env node
// Copy the corpus into the app bundle. One source of truth: contributors edit
// recipes/ in the repository and the app cannot drift from it.
//
// Fails the build if either licence is missing. The app is Apache-2.0 and the
// corpus is CC BY-SA 4.0; shipping the content without its licence and
// attribution is non-compliant, and it would be a poor look for a project whose
// argument is that the commons should stay common.
import { cp, mkdir, rm, access, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(appDir, '..');
const out = join(appDir, 'corpus');

// Read at run time: recipes/ selects adaptations, instructions/ carries the
// judgement layer sent to the model, checklists/ is what the teacher reviews
// against. Nothing is bundled that nothing reads.
const DIRS = ['recipes', 'instructions', 'checklists'];
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
  bundledAt: new Date().toISOString(),
  contents: DIRS,
  codeLicence: 'Apache-2.0',
  contentLicence: 'CC-BY-SA-4.0',
  attribution: 'Rampa contributors — https://github.com/cnebrera/curriculum-accommodation',
}, null, 2) + '\n');

console.log(`✓ corpus bundled into ${out} (${DIRS.length} directories, ${LICENCES.length} licence files)`);
