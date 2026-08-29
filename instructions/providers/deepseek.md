---
id: deepseek
adapter: compatible
label: DeepSeek
vendor: DeepSeek
endpoint: https://api.deepseek.com/chat/completions
model: deepseek-chat
requires_card: true
vision: false
key_url: https://platform.deepseek.com/api_keys
key_prefix: sk-
cost_cents: 1
cost_measured: false
processed_in: China
jurisdiction: other
trains_on_input: unclear
quality: unmeasured
provisional_rank: 6
suits: "El más barato con diferencia. Pero se procesa en China, así que consúltalo en tu centro antes."
signup_first: "Hay que cargar saldo por adelantado. No hay plan gratuito."
last_checked: 2026-08-28
---

## Qué es esto

Muy barato: una ficha cuesta una fracción de lo que cuesta en los demás.

Lo que va a doler, y es importante: **las peticiones se procesan en China**, y
sus condiciones no dicen con claridad si usan lo que envías para entrenar. Rampa
sustituye los nombres de tus alumnos antes de enviar nada, pero eso no convierte
la decisión en trivial: **habla con la dirección de tu centro o con quien lleve
protección de datos antes de usarlo con material de alumnos reales.** Por eso
Rampa nunca te lo va a recomendar por su cuenta, aunque sea el más barato.

## Pasos

1. Abre el enlace y regístrate con el correo.
2. Busca **Top up** o **Recargar** y carga saldo. Sin saldo la clave no funciona.
3. Ve a **API keys** en el menú.
4. Pulsa **Create new API key**.
5. Copia la cadena que empieza por **sk-**. Sólo se ve una vez.

## No encuentro eso

- **La clave empieza por «sk-» igual que la de OpenAI.** Sí, y por eso es fácil
  confundirlas. Si pegas una donde va la otra, Rampa te lo dice.
- **No me deja usar la clave.** Casi siempre falta cargar saldo.
- **Mi centro me ha dicho que no.** Es una respuesta razonable. Usa Mistral, que
  procesa en la Unión Europea, o Gemini si necesitas leer fotos.
