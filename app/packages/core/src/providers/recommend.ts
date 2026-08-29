import { freshness, type Jurisdiction, type ServiceEntry } from './catalogue.js';

/**
 * One question, then one recommendation (009 T007, FR-707a/707b/713).
 *
 * The rule is the seven steps in data-model.md and nothing else. It is here
 * rather than in the screen because a rule that quietly recommends the cheapest
 * service for a child's data would look completely fine in a screenshot, and
 * because the reason she reads must be assembled from *why the winner survived*
 * — a reason written per service can drift from the decision that produced it,
 * and then the interface is lying while every individual string is true.
 */
export interface Answers {
  /** The one required question (FR-704). */
  canUseCard: boolean;
  /**
   * Optional, and "no lo sé" is first-class: `undefined` leaves the
   * recommendation unchanged (FR-708). A teacher who does not know what her
   * school requires must not be worse off than one who does.
   */
  locationConstraint?: Jurisdiction;
}

export interface Recommendation {
  service: ServiceEntry;
  /** Assembled from the rule, never written per service. */
  reason: string;
  /** Everything that survived, best first, so "why not another" is answerable. */
  alternatives: ServiceEntry[];
}

export interface Conflict {
  /** What she asked for that nothing satisfies, in her words. */
  message: string;
  /** Which step of the rule emptied the list. */
  because: 'no-services' | 'card' | 'location' | 'jurisdiction' | 'vision';
  /**
   * What would change it, so a dead end is never the last thing she reads
   * (FR-713).
   */
  suggestion: string;
}

export type Outcome =
  | ({ ok: true } & Recommendation)
  | ({ ok: false } & Conflict);

const LOCATION_LABEL: Record<Jurisdiction, string> = {
  eu: 'en la Unión Europea',
  us: 'en Estados Unidos',
  other: 'fuera de la UE y de EEUU',
  varies: 'en sitios que cambian según la petición',
};

/**
 * The rule, in the order data-model.md states it. Each step records why it
 * dropped things, because that record is what the reason string is built from.
 */
export function recommend(
  catalogue: readonly ServiceEntry[],
  answers: Answers,
  today: Date,
): Outcome {
  // 1 · Stale beyond a year. `loadCatalogue` already drops these, but a caller
  //     may pass an unfiltered list and the rule must not depend on that.
  let pool = catalogue.filter((s) => freshness(s.lastChecked, today) !== 'stale');
  if (pool.length === 0) {
    return {
      ok: false, because: 'no-services',
      message: 'Ahora mismo no puedo ofrecerte ningún servicio.',
      suggestion: 'Es un problema del programa, no tuyo. Actualiza Rampa y vuelve a probar.',
    };
  }

  // 2 · Her one answer. A card she does not have is not a preference.
  const beforeCard = pool;
  pool = pool.filter((s) => (answers.canUseCard ? true : !s.requiresCard));
  if (pool.length === 0) {
    return {
      ok: false, because: 'card',
      message: 'Todos los servicios que puedo ofrecerte piden una tarjeta.',
      suggestion: `Puedes verlos todos y decidir tú, o pedir en tu centro que lo contraten ellos. `
        + `Había ${beforeCard.length} servicios y todos piden tarjeta.`,
    };
  }

  // 3 · A constraint she actually stated. Absent means absent, not "eu".
  const beforeLocation = pool;
  if (answers.locationConstraint) {
    pool = pool.filter((s) => s.jurisdiction === answers.locationConstraint);
    if (pool.length === 0) {
      return {
        ok: false, because: 'location',
        message: `Ninguno de los servicios que puedes usar procesa los datos `
          + `${LOCATION_LABEL[answers.locationConstraint]}.`,
        suggestion: beforeLocation.some((s) => !s.requiresCard || answers.canUseCard)
          ? 'Puedes ver la lista completa con dónde procesa cada uno, y hablarlo en tu centro '
            + 'antes de decidir. Lee también «Protección de datos» ahí abajo.'
          : 'Puedes ver la lista completa y hablarlo en tu centro antes de decidir.',
      };
    }
  }

  /**
   * 4 · Never recommend `other` or `varies`, whatever remains.
   *
   * Not a judgement about those services: they stay in the comparison and she
   * can pick one. But an application cannot recommend, to a teacher acting for
   * a child, a destination it cannot name — and `varies` means the request may
   * be forwarded again, so "where is it processed" answers *depende*, and a
   * school cannot act on *depende*.
   */
  const namedOnly = pool.filter((s) => s.jurisdiction === 'eu' || s.jurisdiction === 'us');
  if (namedOnly.length === 0) {
    return {
      ok: false, because: 'jurisdiction',
      message: 'De los que puedes usar, no sé decirte con seguridad dónde se procesan los datos.',
      suggestion: 'No te recomiendo ninguno a ciegas. Mira la lista completa: ahí está lo que dice '
        + 'cada uno, con la fecha en que lo comprobamos.',
    };
  }
  pool = namedOnly;

  /**
   * 5 · No card means it must read photographs.
   *
   * Spec 008 makes this load-bearing: her material arrives as two photos from
   * the textbook she cannot export. A no-card recommendation that cannot read a
   * photograph is a dead end she would only discover on Tuesday, mid-lesson-gap.
   */
  const beforeVision = pool;
  if (!answers.canUseCard) {
    pool = pool.filter((s) => s.vision);
    if (pool.length === 0) {
      return {
        ok: false, because: 'vision',
        message: 'Los servicios gratuitos que puedo ofrecerte no leen fotos, y casi todo tu '
          + 'material llega en foto.',
        suggestion: `Hay ${beforeVision.length} servicio(s) sin tarjeta, pero ninguno lee fotos. `
          + 'Mira la lista completa, o considera uno con tarjeta si tu centro puede contratarlo.',
      };
    }
  }

  // 6 · Best known quality, then cheaper.
  const ranked = [...pool].sort((a, b) => {
    const rank = (s: ServiceEntry) => (s.quality === 'unmeasured' ? 100 + s.provisionalRank : s.quality);
    return rank(a) - rank(b) || a.costCents - b.costCents || a.id.localeCompare(b.id);
  });
  const winner = ranked[0]!;

  return {
    ok: true,
    service: winner,
    reason: reasonFor(winner, answers, ranked),
    alternatives: ranked.slice(1),
  };
}

/**
 * Why this one and not another (FR-707a).
 *
 * Built from the properties that actually decided it, in the order they
 * decided it. She should be able to repeat this sentence to her head teacher,
 * which is the real test — not whether it reads well.
 */
function reasonFor(s: ServiceEntry, answers: Answers, ranked: readonly ServiceEntry[]): string {
  const parts: string[] = [];
  const measured = s.quality !== 'unmeasured';

  if (!answers.canUseCard) {
    parts.push(s.costCents === 0 ? 'no pide tarjeta y es gratis' : 'no pide tarjeta');
    if (s.vision) parts.push('lee fotos, que es como te llega casi todo');
  } else if (measured && !ranked.some((o) => o.quality !== 'unmeasured' && o.quality < (s.quality as number))) {
    parts.push('es el que mejor ha salido en nuestras pruebas');
  } else if (!measured) {
    // Said plainly rather than dressed up: we have not measured this one.
    parts.push('es el mejor de los que aún no hemos medido a fondo');
  }

  if (answers.locationConstraint) {
    parts.push(`procesa los datos ${LOCATION_LABEL[answers.locationConstraint]}, como pediste`);
  } else if (s.jurisdiction === 'eu') {
    parts.push('procesa los datos en la Unión Europea');
  }

  if (s.trainsOnInput === 'no') parts.push('sus condiciones dicen que no entrena con lo que envíes');

  /**
   * "There are cheaper ones, but they scored worse" — only when something was
   * actually scored.
   *
   * This clause shipped unconditionally in the first draft and the tests passed:
   * every entry is `unmeasured`, so the sentence a teacher would have read
   * claimed a comparison that has never been run. Exactly the drift FR-707a
   * exists to prevent, produced by the one function written to prevent it.
   */
  const cheaper = ranked.filter((o) => o.id !== s.id && o.costCents < s.costCents);
  if (cheaper.length && answers.canUseCard) {
    parts.push(measured
      ? 'hay más baratos, pero salieron peor en las pruebas'
      : 'hay más baratos, pero todavía no los hemos comparado a fondo');
  }

  if (parts.length === 0) parts.push('es el que mejor encaja con lo que me has dicho');

  return joinClauses(parts);
}

/**
 * Join clauses without producing "a y b y c".
 *
 * A clause may already contain its own "y" ("no pide tarjeta y es gratis"), so
 * the last joiner becomes a comma when either side already carries one. Small,
 * but this sentence is the thing she repeats to her head teacher.
 */
function joinClauses(parts: readonly string[]): string {
  let sentence: string;
  if (parts.length === 1) {
    sentence = parts[0]!;
  } else {
    const head = parts.slice(0, -1);
    const tail = parts[parts.length - 1]!;
    const joiner = / y /.test(head[head.length - 1] ?? '') || / y /.test(tail) ? ', y ' : ' y ';
    sentence = head.join(', ') + joiner + tail;
  }
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}
