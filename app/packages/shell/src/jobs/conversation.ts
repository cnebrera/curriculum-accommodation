import { parseFrontMatter, type Vault, type RevisionSite } from '@rampa/core';

/**
 * The conversation file (026 T010, FR-2401, research R2).
 *
 * ## Where it lives, and why that is the whole answer to «is it his data?»
 *
 * Beside the document, in the directory `resolveDocument` answers with. So a conversation
 * about a child's sheet sits in the child's directory and the existing erasure walks it —
 * no list to add it to, no rule to remember. A conversation about a composition sits with
 * the composition. That is not filing tidiness: `003` says a conversation about a child's
 * sheet **is** the child's data, and this is what makes that true by construction.
 *
 * ## Prose, because she reads it
 *
 * The file is hers to open in Obsidian. So it is written as prose with dated headings,
 * not as a log format that needs this application to decode — the same argument the
 * vault itself rests on.
 *
 * ## Append-only, and it stores no document content
 *
 * A turn is history the moment it happened; nothing rewrites an earlier entry. And it
 * quotes no part of the sheet: a conversation that carried the document would be a second
 * copy of it, going stale line by line, in a file nobody thinks to check.
 */

export type TurnOutcome =
  | { kind: 'revision'; revision: number }
  | { kind: 'refusal'; because: string }
  | { kind: 'no-change' };

export interface Turn {
  /** From the process clock, never from the model. */
  at: string;
  /** Her words, verbatim. The only instruction the model received. */
  text: string;
  outcome: TurnOutcome;
  /** Derived by `revisionDiff`, never taken from the model (FR-2404). */
  changed: string[];
  costCents: number | null;
}

const pathFor = (site: RevisionSite): string => `${site.dir}/conversation.md`;

const money = (cents: number | null): string =>
  cents === null ? 'no lo sé' : cents === 0 ? 'nada' : `unos ${cents} céntimo${cents === 1 ? '' : 's'}`;

const said = (o: TurnOutcome): string =>
  o.kind === 'revision' ? `revisión ${o.revision}`
    : o.kind === 'refusal' ? 'no lo he hecho' : 'no he cambiado nada';

export async function appendTurn(
  vault: Vault, site: RevisionSite, turn: Turn,
): Promise<void> {
  const path = pathFor(site);
  const existing = await vault.readRaw(path);
  const head = existing ?? `# La conversación sobre este documento\n\n`
    + 'Lo que le has ido pidiendo, qué cambió cada vez y qué costó. Lo escribo yo; '
    + 'es tuyo para leerlo.\n';

  const lines = [
    '',
    `## ${turn.at} · ${said(turn.outcome)}`,
    '',
    `**Tú:** ${turn.text}`,
    '',
  ];
  if (turn.outcome.kind === 'refusal') {
    lines.push(`**No lo he hecho:** ${turn.outcome.because}`, '');
  } else if (turn.changed.length) {
    lines.push('**Qué ha cambiado:**', '', ...turn.changed.map((c) => `- ${c}`), '');
  } else if (turn.outcome.kind === 'no-change') {
    lines.push('**Qué ha cambiado:** nada. Lo he mirado y ya estaba como me pedías.', '');
  }
  lines.push(`**Coste:** ${money(turn.costCents)}`, '');

  await vault.writeRaw(path, head + lines.join('\n'));
}

/**
 * The turns, oldest first.
 *
 * Parsed back out of the prose rather than kept in a parallel structured file, because
 * two files describing one conversation is one file that goes stale — and the one that
 * would go stale is the one she does **not** read.
 */
export async function readTurns(vault: Vault, site: RevisionSite): Promise<Turn[]> {
  const raw = await vault.readRaw(pathFor(site));
  if (raw === null) return [];
  const body = parseFrontMatter(raw).body;

  const out: Turn[] = [];
  for (const chunk of body.split(/\n## /).slice(1)) {
    const [heading, ...rest] = chunk.split('\n');
    const at = (heading ?? '').split(' · ')[0]?.trim() ?? '';
    const text = /\*\*Tú:\*\* ([\s\S]*?)(?:\n\n|$)/.exec(rest.join('\n'))?.[1]?.trim() ?? '';
    const because = /\*\*No lo he hecho:\*\* ([\s\S]*?)(?:\n\n|$)/.exec(rest.join('\n'))?.[1]?.trim();
    const revision = /revisión (\d+)/.exec(heading ?? '')?.[1];
    const changed = [...rest.join('\n').matchAll(/^- (.+)$/gm)].map((m) => m[1]!);
    const cost = /\*\*Coste:\*\* (.+)$/m.exec(rest.join('\n'))?.[1]?.trim() ?? '';

    out.push({
      at,
      text,
      outcome: because !== undefined ? { kind: 'refusal', because }
        : revision ? { kind: 'revision', revision: Number(revision) }
          : { kind: 'no-change' },
      changed,
      costCents: cost === 'no lo sé' ? null : Number(/(\d+)/.exec(cost)?.[1] ?? 0),
    });
  }
  return out;
}
