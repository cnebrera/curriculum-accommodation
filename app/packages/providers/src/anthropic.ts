import { costCents, type Usage } from '@rampa/core';
import { ProviderError, type Capabilities, type Chunk, type KeyStatus, type Provider, type Request } from './types.js';

const API = 'https://api.anthropic.com/v1/messages';
const VERSION = '2023-06-01';

/** Quality default. Requires an account with a payment method. */
export const anthropic: Provider = {
  id: 'anthropic',
  label: 'Claude (Anthropic)',
  keyUrl: 'https://console.anthropic.com/settings/keys',
  requiresPaymentCard: true,
  defaultModel: 'claude-sonnet-5',

  async validateKey(key: string): Promise<KeyStatus> {
    if (!key.trim()) return { ok: false, reason: 'malformed', message: 'No has pegado nada.' };
    const trimmed = key.trim();
    if (trimmed.startsWith('AIza')) {
      return { ok: false, reason: 'wrong-provider',
        message: 'Esa clave es de Google, no de Anthropic. Elige Google arriba o pega la clave de Anthropic.' };
    }
    if (!trimmed.startsWith('sk-ant-')) {
      return { ok: false, reason: 'malformed',
        message: 'Las claves de Anthropic empiezan por "sk-ant-". Comprueba que la has copiado entera.' };
    }
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': trimmed, 'anthropic-version': VERSION },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      });
      if (res.ok) return { ok: true };
      if (res.status === 401) return { ok: false, reason: 'expired', message: 'La clave no es válida o ha caducado.' };
      if (res.status === 429) return { ok: true };  // it works; it is just busy
      if (res.status === 400) {
        const body = await res.text();
        if (/credit|balance/i.test(body)) {
          return { ok: false, reason: 'no-credit', message: 'La clave es correcta pero la cuenta no tiene saldo.' };
        }
      }
      return { ok: false, reason: 'unknown', message: 'No he podido comprobar la clave. Inténtalo otra vez.' };
    } catch {
      return { ok: false, reason: 'network', message: 'No hay conexión, así que no he podido comprobar la clave.' };
    }
  },

  async capabilities(): Promise<Capabilities> {
    return { vision: true, maxInputTokens: 200_000 };
  },

  async *send(req: Request, key: string): AsyncIterable<Chunk> {
    const model = req.model ?? this.defaultModel;
    const content: unknown[] = [];
    for (const img of req.images ?? []) {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } });
    }
    for (const m of req.messages) content.push({ type: 'text', text: m.content });

    /**
     * Cache the stable prefix (T092).
     *
     * ADR 0005's cost table — the one the onboarding quotes as "unos 3 céntimos
     * por ficha" — assumes prompt caching: *"the corpus is a stable prefix, so
     * most of the input caches."* Nothing marked it, so the promise was
     * optimistic by 2-3x. The instructions plus the recipes are identical across
     * every job for a given corpus version, which is exactly what a cache
     * breakpoint is for.
     */
    const system = [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }];

    let res: Response;
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': VERSION },
        body: JSON.stringify({
          model, max_tokens: req.maxTokens ?? 16_000, system,
          messages: [{ role: 'user', content }], stream: true,
        }),
      });
    } catch {
      throw new ProviderError('offline', 'No hay conexión con el servicio.');
    }

    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') ?? 30);
      throw new ProviderError('rate-limited', 'El servicio está ocupado.', wait);
    }
    if (res.status === 401) throw new ProviderError('key-invalid', 'La clave ya no es válida.');
    if (!res.ok || !res.body) throw new ProviderError('provider-failed', `El servicio devolvió un error (${res.status}).`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const usage: Usage = { model, inputTokens: 0, outputTokens: 0 };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const ev = JSON.parse(payload) as Record<string, any>;
          if (ev['type'] === 'content_block_delta' && ev['delta']?.['text']) yield { text: ev['delta']['text'] };
          if (ev['message']?.['usage']) {
            usage.inputTokens = ev['message']['usage']['input_tokens'] ?? usage.inputTokens;
            usage.cachedInputTokens = ev['message']['usage']['cache_read_input_tokens'] ?? undefined;
            // Cache writes cost more than fresh input on the first job of a
            // corpus version; counting them keeps the displayed cost honest.
            usage.cacheWriteTokens = ev['message']['usage']['cache_creation_input_tokens'] ?? undefined;
          }
          if (ev['usage']?.['output_tokens']) usage.outputTokens = ev['usage']['output_tokens'];
        } catch { /* a partial frame; the next read completes it */ }
      }
    }
    yield { usage };
  },

  price(usage: Usage) { return costCents(usage); },
};
