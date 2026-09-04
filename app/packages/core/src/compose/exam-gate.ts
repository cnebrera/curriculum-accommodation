import type { Target } from './level.js';

/**
 * Composing an exam below his course changes **what** is evaluated
 * (027 T016, FR-2509, decision P12).
 *
 * ## Why composing needs its own gate at all
 *
 * The adaptation side of this stop is the model's, instructed by `adapt.md`: it looks at
 * a request against a document and refuses to change what is asked. Composition has no
 * document to compare against — she is asking for material that does not exist yet — so
 * there is nothing for that instruction to fire on. An exam at a lower course is not a
 * changed exam; it is a **different set of objectives**, decided in advance.
 *
 * And deciding which objectives a learner is evaluated on is the teaching team's, on a
 * psychopedagogical assessment, recorded as an ACS. That recording is exactly what
 * unlocks this (`017` writes it into his overlay). Without it, the answer is not «Rampa
 * cannot»: it is «this is not Rampa's to decide».
 *
 * ## The trigger is the request, never the profile
 *
 * P12, and it is the correction 2.11 had to make to `adapt.md`: the stop keyed on «the
 * **profile** or the request», which anchored a refusal in the child. A high CUR is a
 * reason to compose more carefully, never a reason to refuse. So this function is not
 * given the profile at all — it cannot key on it, which is the only kind of guarantee
 * worth having (Principle V).
 *
 * ## And only for an exam
 *
 * Support material at a lower level is precisely what a worksheet, a problems page and a
 * study text are *for*. An exam is the one whose whole purpose is to measure against the
 * course's criteria — «quien lo firma se está jugando la nota de un alumno».
 */
export function examBelowCourse(args: {
  /** Every year id in school order, from the education corpus. */
  order: readonly string[];
  /** Where the material is aimed, and who decided (`002` FR-129). */
  target: Target;
  /** The course he is enrolled in, from his profile. */
  enrolled?: string;
  /**
   * True when his overlay records an **ACS** (`017`, decision P12).
   *
   * Not «an overlay exists» and not «a year appears in it»: an ACNS modifies no
   * objective, so an ACNS-derived year unlocks nothing here. Only the document that
   * says the objectives were already modified does.
   */
  acsRegistered: boolean;
}): boolean {
  if (args.acsRegistered) return false;
  if (!args.enrolled || !args.target.yearId) return false;
  if (args.target.yearId === args.enrolled) return false;

  const at = (id: string): number => args.order.indexOf(id);
  const target = at(args.target.yearId);
  const enrolled = at(args.enrolled);
  /*
   * A year the corpus does not contain stops nothing.
   *
   * Refusing on an unknown year would refuse on a typo in a corpus file, and the
   * refusal would be about a comparison nobody could make. `explainLevel` already tells
   * her the year is unrecognised.
   */
  if (target < 0 || enrolled < 0) return false;

  return target < enrolled;
}

/**
 * Does his overlay record an ACS?
 *
 * Reads the sentence `guideSection` writes — «Este documento es una **ACS**» — because
 * that is where the fact lives (`017`, and the defect 2.11 fixed was that it lived
 * nowhere at all). Deliberately not a second store: a boolean in the profile would be a
 * copy of what the overlay already says, and the copy is what goes stale.
 */
export const acsInOverlay = (overlay: string | null): boolean =>
  overlay !== null && /es una \*\*ACS\*\*/.test(overlay);
