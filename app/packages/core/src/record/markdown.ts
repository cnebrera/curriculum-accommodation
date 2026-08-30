import { learnerDir } from '../vault/paths.js';
import type { Vault } from '../vault/io.js';
import type { RecordEntry } from './entry.js';

/**
 * The record, as a file she can read without Rampa (014 T009, FR-1212).
 *
 * Written for her. **Never read back** — FR-1213, and asserted by
 * `packages/core/test/record-file.test.ts`. An application that parsed this
 * would have made it a second source of truth, which is the defect this whole
 * feature is designed against.
 *
 * That also means a stale one is harmless: it is regenerated, and nothing
 * downstream believes it.
 *
 * ## No name in it
 *
 * The file lives at `profiles/<code>/` and is keyed by the code. A plaintext file
 * in the vault carrying learners' names would be a second copy of the encrypted
 * name map without its encryption, which is the one thing the whole substitution
 * design exists to prevent (FR-1207).
 */

const es = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** dd/mm/yyyy, because that is how she writes a date. */
function human(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

const KIND: Record<string, string> = {
  worksheet: 'Ficha', exam: 'Examen', study: 'Texto de estudio',
  problems: 'Problemas', material: 'Material',
};

/**
 * A relative link from `profiles/<code>/` to somewhere else in the vault.
 *
 * Two levels up, always — `profiles/E38/record.md` to `material/…`. Computed
 * rather than hardcoded so a change to `learnerDir` cannot silently produce a
 * file full of links that resolve to nothing in Obsidian.
 */
const up = (target: string): string =>
  `${'../'.repeat(learnerDir('X').split('/').length)}${target}`;

export function renderRecord(learner: string, entries: readonly RecordEntry[]): string {
  const lines: string[] = [
    `# Lo que he preparado para ${learner}`,
    '',
    '*Lo escribe Rampa. Si lo borras, se vuelve a escribir solo — y si lo cambias,',
    'Rampa no lo lee: el que manda es lo que hay en las carpetas.*',
    '',
  ];

  if (entries.length === 0) {
    lines.push('Todavía no hay nada.', '');
    return lines.join('\n');
  }

  let year = '';
  for (const e of entries) {
    if (e.schoolYear !== year) {
      year = e.schoolYear;
      lines.push(`## ${year || 'Sin curso escolar'}`, '');
    }

    const what = KIND[e.kind] ?? 'Material';
    lines.push(`### ${human(e.date)} · ${what}${e.subject ? ` · ${e.subject}` : ''}`, '');
    lines.push(`- [Lo adaptado](${up(e.documents.adapted)})`
      + (e.signedOff ? ' — firmado' : ' — **sin firmar**'));

    // What she gave it, which is not always a file (see `entry.ts`).
    if (e.source.of === 'file') {
      lines.push(`- [Lo que traje](${up(e.source.paths[0] ?? '')})`);
      lines.push(`- [Lo que leyó Rampa](${up(e.documents.ir)})`);
    } else if (e.source.of === 'pasted') {
      lines.push(`- [El texto que pegué](${up(e.documents.ir)}) — es también lo que leyó Rampa`);
    } else {
      lines.push(`- Lo pedí así: ${e.source.objectives.join('; ')}`
        + (e.source.anchor ? ` (${e.source.anchor})` : ''));
      lines.push(`- [Lo que salió](${up(e.documents.ir)})`);
    }

    if (e.documents.report) lines.push(`- [El informe](${up(e.documents.report)})`);
    if (e.documents.revisions.length) {
      lines.push(`- ${e.documents.revisions.length} `
        + es(e.documents.revisions.length, 'versión anterior', 'versiones anteriores'));
    }
    if (e.missing.length) {
      lines.push(`- ⚠️ ${e.missing.length} `
        + es(e.missing.length, 'documento que ya no está', 'documentos que ya no están')
        + `: ${e.missing.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Write it. The only writer in this feature (FR-1215). */
export async function writeRecord(
  vault: Vault, learner: string, entries: readonly RecordEntry[],
): Promise<string> {
  const path = `${learnerDir(learner)}/record.md`;
  await vault.writeRaw(path, renderRecord(learner, entries));
  return path;
}
