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
export * from './vault/profile.js';

export * from './ir/types.js';
export * from './ir/parse.js';
export * from './ir/provenance.js';
export * from './ir/injection.js';
export * from './ir/hidden.js';
export * from './ir/bounds.js';
export * from './ir/completeness.js';

export * from './recipes/index.js';
export * from './ingest/schema.js';
export * from './ingest/validate.js';
export * from './ingest/to-ir.js';
export * from './ingest/budget.js';
export * from './ingest/downscale.js';

export * from './providers/catalogue.js';
export * from './providers/recommend.js';
export * from './providers/key.js';
export * from './axes/parse.js';
export * from './education/parse.js';
export * from './education/lookup.js';
export * from './redact/names.js';

export * from './render/html.js';
export * from './render/check.js';
export * from './render/photocopy.js';

export * from './report/index.js';
export * from './report/notes.js';
export * from './prompt/adapt.js';
export * from './cost/index.js';

export * from './memory/index.js';
export * from './memory/consolidate.js';
export * from './memory/handover.js';
export * from './memory/forget.js';
