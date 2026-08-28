import { costCents, type Usage } from '@rampa/core';
import { ProviderError, type Capabilities, type Chunk, type KeyStatus, type Provider, type Request } from './types.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * The no-payment-card path (006 FR-404).
 *
 * The barrier to a teacher using this was never the money — a worksheet costs a
 * few cents — it was being asked for a credit card before anything worked. A
 * free-tier key removes that, so this provider exists to make the first run
 * possible, not because it is better.
 */
export const google: Provider = {
  id: 'google',
  label: 'Gemini (Google) · sin tarjeta',
  keyUrl: 'https://aistudio.google.com/apikey',
  requiresPaymentCard: false,
  defaultModel: 'gemini-2.0-flash',

  async validateKey(key: string): Promise<KeyStatus> {
    const trimmed = key.trim();
    if (!trimmed) return { ok: false, reason: 'malformed', message: 'No has pegado nada.' };
    if (trimmed.startsWith('sk-ant-')) {
      return { ok: false, reason: 'wrong-provider',
        message: 'Esa clave es de Anthropic, no de Google. Elige Claude arriba o pega la clave de Google.' };
    }
    if (!trimmed.startsWith('AIza')) {
      return { ok: false, reason: 'malformed',
        message: 'Las claves de Google empiezan por "AIza". Comprueba que la has copiado entera.' };
    }
    try {
      const res = await fetch(`${BASE}?key=${encodeURIComponent(trimmed)}`);
      if (res.ok) return { ok: true };
      if (res.status === 400 || res.status === 403) {
        return { ok: false, reason: 'expired', message: 'La clave no es válida o no tiene permiso.' };
      }
      if (res.status === 429) return { ok: true };
      return { ok: false, reason: 'unknown', message: 'No he podido comprobar la clave. Inténtalo otra vez.' };
    } catch {
      return { ok: false, reason: 'network', message: 'No hay conexión, así que no he podido comprobar la clave.' };
    }
  },

  async capabilities(): Promise<Capabilities> {
    return { vision: true, maxInputTokens: 1_000_000 };
  },

  async *send(req: Request, key: string): AsyncIterable<Chunk> {
    const model = req.model ?? this.defaultModel;
    const parts: unknown[] = [];
    for (const img of req.images ?? []) parts.push({ inline_data: { mime_type: img.mediaType, data: img.base64 } });
    for (const m of req.messages) parts.push({ text: m.content });

    let res: Response;
    try {
      res = await fetch(`${BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { maxOutputTokens: req.maxTokens ?? 16_000 },
        }),
      });
    } catch {
      throw new ProviderError('offline', 'No hay conexión con el servicio.');
    }

    if (res.status === 429) {
      throw new ProviderError('rate-limited',
        'Has llegado al límite del plan gratuito. No es un error tuyo: hay que esperar un poco.', 60);
    }
    if (res.status === 400 || res.status === 403) throw new ProviderError('key-invalid', 'La clave ya no es válida.');
    if (!res.ok) throw new ProviderError('provider-failed', `El servicio devolvió un error (${res.status}).`);

    const json = (await res.json()) as Record<string, any>;
    const text = (json['candidates']?.[0]?.['content']?.['parts'] ?? [])
      .map((p: Record<string, unknown>) => p['text'] ?? '').join('');
    if (text) yield { text };

    const um = json['usageMetadata'] ?? {};
    yield { usage: { model: 'gemini-free', inputTokens: um['promptTokenCount'] ?? 0, outputTokens: um['candidatesTokenCount'] ?? 0 } };
  },

  price(usage: Usage) { return costCents(usage); },
};
