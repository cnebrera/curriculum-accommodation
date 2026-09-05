/**
 * @rampa/core — the deterministic layer.
 *
 * Constitution, Principle II (NON-NEGOTIABLE): this package extracts, chunks,
 * renders, converts and validates. It MUST NOT call a language model, require
 * an API key, or embed provider-specific behaviour, and it MUST run and be
 * testable offline.
 *
 * That is enforced, not requested: test/isolation.test.ts fails the build if
 * anything here can reach the network.
 */
export * from './errors.js';
export * from './contrast.js';
export * from './log.js';

export * from './vault/paths.js';
export * from './vault/parse.js';
export * from './vault/schema.js';
export * from './vault/codes.js';
export * from './vault/io.js';
export * from './vault/version.js';
export * from './vault/areas.js';
export * from './vault/document.js';
export * from './vault/profile.js';

export * from './ir/types.js';
export * from './ir/parse.js';
export * from './ir/provenance.js';
export * from './ir/injection.js';
export * from './ir/hidden.js';
export * from './ir/bounds.js';
export * from './ir/completeness.js';
export * from './ir/reading.js';

export * from './recipes/index.js';
export * from './recipes/kinds.js';
export * from './compose/objectives.js';
export * from './compose/generated.js';
export * from './compose/budget.js';
export * from './compose/loop.js';
export * from './compose/proposals.js';
export * from './compose/problems.js';
export * from './compose/exam-gate.js';
export * from './compose/kind.js';
export * from './render/figures/validate.js';
export * from './render/figures/draw.js';
export * from './compose/figures.js';
export * from './render/figures/render.js';
export * from './render/figures/corpus.js';
export * from './compose/anchor.js';
export * from './compose/level.js';
export * from './compose/sheet.js';
export * from './compose/unverifiable.js';
export * from './compose/verify/types.js';
export * from './compose/verify/arithmetic.js';
export * from './render/zip.js';
export * from './render/odt.js';
export * from './roster/filter.js';
export * from './record/entry.js';
export * from './record/scan.js';
export * from './record/markdown.js';
export * from './ingest/schema.js';
export * from './ingest/validate.js';
export * from './ingest/to-ir.js';
export * from './ingest/budget.js';
export * from './ingest/downscale.js';
export * from './ingest/pixels.js';

export * from './providers/catalogue.js';
export * from './providers/recommend.js';
export * from './providers/key.js';
export * from './axes/parse.js';
export * from './education/parse.js';
export * from './education/lookup.js';
export * from './redact/names.js';

export * from './guide/corpus.js';
export * from './guide/read.js';
export * from './guide/refuse.js';
export * from './guide/overlay.js';
export * from './guide/acns.js';
export * from './guide/acns-document.js';
export * from './vault/signature.js';
export * from './vault/revisions.js';
export * from './ir/diff.js';
export * from './ir/freshness.js';
export * from './pictograms/affected.js';
export * from './prompt/turn.js';
export * from './prompt/fence.js';
export * from './pictograms/set.js';
export * from './pictograms/lemma.js';
export * from './pictograms/match.js';
export * from './pictograms/apply.js';
export * from './pictograms/note.js';
export * from './pictograms/images.js';
export * from './pictograms/publisher.js';
export * from './pictograms/fetch.js';
export * from './pictograms/vocabulary.js';
export * from './render/draft.js';
export * from './render/attribution.js';
export * from './render/linear.js';
export * from './render/audio-corpus.js';
export * from './render/html.js';
export * from './render/check.js';
export * from './render/photocopy.js';

export * from './report/index.js';
export * from './report/compose.js';
export * from './report/notes.js';
export * from './prompt/adapt.js';
export * from './cost/index.js';

export * from './memory/index.js';
export * from './memory/consolidate.js';
export * from './memory/handover.js';
export * from './memory/forget.js';
