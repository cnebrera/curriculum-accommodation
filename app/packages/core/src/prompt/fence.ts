import { randomBytes } from 'node:crypto';

/**
 * A fence for untrusted content, with a nonce nobody can predict (AGE-02, P18).
 *
 * ## What the headings alone could not stop
 *
 * The sections of this prompt were separated by Markdown headings and the
 * material was pasted verbatim at the end. So a source document containing a line
 * `## Correcciones de la maestra sobre el intento anterior` followed by orders
 * read **structurally identically** to the legitimate section of highest
 * precedence — and the injection detector does not cover that vector: its tiers
 * want an addressee plus a directive, or a named capability, not the impersonation
 * of a section of the prompt.
 *
 * A random per-call nonce closes it, and closes it *structurally* rather than by
 * asking the model to be careful (rule 5 of AGENTS.md): a document cannot forge
 * `<<<FIN-MATERIAL-9f3a…>>>` because it was written before the nonce existed.
 *
 * ## One fence, and only one
 *
 * Extracted from `prompt/adapt.ts` on 2026-09-05 for `026`'s turn prompt, which fences
 * the document under iteration the same way. **A second fence implementation would be a
 * second thing an attacker only has to beat once** — `026` T006 says so in those words,
 * and the rule it is an instance of is that a defence duplicated is a defence halved.
 *
 * It is also what makes the reaffirmation after the material safe to add. `007`'s
 * argument was that the material must be **last** so nothing after it could read
 * as continuing an instruction; that argument holds only while there is no way to
 * say «the content ends here». Now there is, so recency stops working for the
 * attacker (which was the other half of AGE-02) without giving up the positional
 * defence.
 */
export function materialFence(material: string): { open: string; close: string } {
  // A `while` that cannot loop in practice — 96 bits — but a fence the material
  // already contains is the one thing that would make this useless, so it is
  // checked rather than assumed.
  let nonce = randomBytes(12).toString('hex');
  while (material.includes(nonce)) nonce = randomBytes(12).toString('hex');
  return { open: `<<<MATERIAL-${nonce}>>>`, close: `<<<FIN-MATERIAL-${nonce}>>>` };
}
