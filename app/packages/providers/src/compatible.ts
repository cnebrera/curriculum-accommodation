import { costCents, type Usage } from '@rampa/core';
import { ProviderError, type Capabilities, type Chunk, type KeyStatus, type Provider, type Request } from './types.js';

/**
 * One adapter for every OpenAI-compatible service (009 T025/T026, research R1).
 *
 * Groq, Mistral, DeepSeek and most of what will be added next speak the same
 * `/chat/completions` dialect. Writing one file each would be four copies of one
 * stream parser, and the fourth would be the one with the bug.
 *
 * **There is no branching on service id in here.** That is the rule the format
 * exists to protect: `if (id === 'groq')` is how one generic adapter rots into
 * eight specific ones, and once it has, adding a service is a code change again
 * and Principle I is gone. Differences that are not the endpoint are declared as
 * named quirks in the catalogue entry, and handled by name.
 *
 * The endpoint comes from a reviewed file that ships with the release. A teacher
 * cannot type one — that is what keeps 007 FR-511 true while still offering a
 * dozen services.
 */
export type CompatibleQuirk = 'no-usage' | 'no-stream-options';

export interface CompatibleSpec {
  id: string;
  label: string;
  endpoint: string;
  model: string;
  keyUrl: string;
  requiresPaymentCard: boolean;
  keyPrefix?: string;
  vision: boolean;
  quirks: readonly CompatibleQuirk[];
  /** For the wrong-service message. Prefix → the service it belongs to. */
  otherServices?: ReadonlyArray<{ prefix: string; label: string }>;
}

/** Build a `Provider` from a catalogue entry. No code per service. */
export function compatibleProvider(spec: CompatibleSpec): Provider {
  const has = (q: CompatibleQuirk) => spec.quirks.includes(q);

  return {
    id: spec.id,
    label: spec.label,
    keyUrl: spec.keyUrl,
    requiresPaymentCard: spec.requiresPaymentCard,
    defaultModel: spec.model,

    async validateKey(key: string): Promise<KeyStatus> {
      const trimmed = key.trim();
      if (!trimmed) return { ok: false, reason: 'malformed', message: 'No has pegado nada.' };

      /*
       * A key from another service, named. Longest prefix wins, for the same
       * reason it does in core: `sk-ant-` and `sk-` are prefixes of each other,
       * and a shortest-match search sends her to the wrong provider's page with
       * a confident sentence.
       */
      const owner = [...(spec.otherServices ?? [])]
        .filter((o) => trimmed.startsWith(o.prefix))
        .sort((a, b) => b.prefix.length - a.prefix.length)[0];
      if (owner && (!spec.keyPrefix || !trimmed.startsWith(spec.keyPrefix)
                    || owner.prefix.length > spec.keyPrefix.length)) {
        return {
          ok: false, reason: 'wrong-provider',
          message: `Esa clave es de ${owner.label}, no de ${spec.label}. `
            + `Cambia de servicio arriba o pega la clave de ${spec.label}.`,
        };
      }

      if (spec.keyPrefix && !trimmed.startsWith(spec.keyPrefix)) {
        return {
          ok: false, reason: 'malformed',
          message: `Las claves de ${spec.label} empiezan por "${spec.keyPrefix}". `
            + 'Comprueba que la has copiado entera.',
        };
      }

      try {
        // The cheapest real call the dialect allows: one token, no streaming.
        const res = await fetch(spec.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${trimmed}` },
          body: JSON.stringify({
            model: spec.model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (res.ok) return { ok: true };
        if (res.status === 401 || res.status === 403) {
          return { ok: false, reason: 'expired', message: 'La clave no es válida o ha caducado.' };
        }
        // Busy is not broken: the key worked well enough to be rate-limited.
        if (res.status === 429) return { ok: true };
        if (res.status === 402) {
          return { ok: false, reason: 'no-credit', message: 'La clave es correcta pero la cuenta no tiene saldo.' };
        }
        if (res.status === 400) {
          const body = await res.text();
          if (/credit|balance|insufficient|saldo/i.test(body)) {
            return { ok: false, reason: 'no-credit', message: 'La clave es correcta pero la cuenta no tiene saldo.' };
          }
        }
        return { ok: false, reason: 'unknown', message: 'No he podido comprobar la clave. Inténtalo otra vez.' };
      } catch {
        return { ok: false, reason: 'network', message: 'No hay conexión, así que no he podido comprobar la clave.' };
      }
    },

    async capabilities(): Promise<Capabilities> {
      // Not read from the catalogue's `model`: a context size is exactly the
      // sort of number that goes stale silently. A conservative floor that
      // every service in the catalogue clears is safer than a stale ceiling.
      return { vision: spec.vision, maxInputTokens: 120_000 };
    },

    async *send(req: Request, key: string): AsyncIterable<Chunk> {
      const model = req.model ?? spec.model;

      const content: unknown[] = [];
      for (const img of req.images ?? []) {
        if (!spec.vision) {
          // Silently dropping the image would produce an adaptation of nothing,
          // which reads as a bad adaptation rather than as a wrong service.
          throw new ProviderError('provider-failed',
            `${spec.label} no puede leer fotos. Cambia de servicio para este material.`);
        }
        content.push({
          type: 'image_url',
          image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
        });
      }
      for (const m of req.messages) content.push({ type: 'text', text: m.content });

      /*
       * Text-only requests send a plain string, not a one-element content array.
       *
       * Both are legal in the dialect, but several services in this catalogue
       * accept only the string form for text — and the first version of this
       * line tried to choose between them with `req.images?.length === 0`, which
       * is `undefined === 0` when there are no images, so the string branch was
       * unreachable. It would have failed on the services it was written for,
       * and only on those, which is the hardest kind of bug to attribute.
       */
      const hasImages = (req.images?.length ?? 0) > 0;
      const userContent: unknown = hasImages
        ? content
        : req.messages.map((m) => m.content).join('\n\n');

      const body: Record<string, unknown> = {
        model,
        max_tokens: req.maxTokens ?? 16_000,
        stream: true,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: userContent },
        ],
      };
      /*
       * `stream_options.include_usage` is how this dialect returns token counts
       * on a streamed call. Some services reject the field outright rather than
       * ignoring it, which fails the whole request — hence the quirk.
       */
      if (!has('no-stream-options')) body['stream_options'] = { include_usage: true };

      let res: Response;
      try {
        res = await fetch(spec.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
        });
      } catch {
        throw new ProviderError('offline', 'No hay conexión con el servicio.');
      }

      if (res.status === 429) {
        const wait = Number(res.headers.get('retry-after') ?? 30);
        throw new ProviderError('rate-limited', 'El servicio está ocupado.', wait);
      }
      if (res.status === 401 || res.status === 403) {
        throw new ProviderError('key-invalid', 'La clave ya no es válida.');
      }
      if (res.status === 402) throw new ProviderError('key-no-credit', 'La cuenta no tiene saldo.');
      if (!res.ok || !res.body) {
        throw new ProviderError('provider-failed', `El servicio devolvió un error (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const usage: Usage = { model, inputTokens: 0, outputTokens: 0 };
      let sawUsage = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // The last element may be half a frame; the next read completes it.
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const ev = JSON.parse(payload) as Record<string, any>;
            const delta = ev['choices']?.[0]?.['delta']?.['content'];
            if (typeof delta === 'string' && delta) yield { text: delta };
            if (ev['usage']) {
              usage.inputTokens = ev['usage']['prompt_tokens'] ?? usage.inputTokens;
              usage.outputTokens = ev['usage']['completion_tokens'] ?? usage.outputTokens;
              const cached = ev['usage']['prompt_tokens_details']?.['cached_tokens'];
              if (typeof cached === 'number') usage.cachedInputTokens = cached;
              sawUsage = true;
            }
          } catch { /* a partial frame; the next read completes it */ }
        }
      }

      /*
       * A service that never reports usage (the `no-usage` quirk) must not throw
       * and must not silently report a cost of zero — "gratis" for a paid call is
       * the one wrong number a teacher would never question. Zero tokens with a
       * `cost_measured: false` entry is what the interface already shows as an
       * estimate, so the honest reading is to yield nothing rather than a lie.
       */
      if (!sawUsage && !has('no-usage')) {
        // Declared usage support but sent none: worth a log, not a failure.
        yield { usage };
        return;
      }
      if (has('no-usage')) return;
      yield { usage };
    },

    price(usage: Usage) { return costCents(usage); },
  };
}
