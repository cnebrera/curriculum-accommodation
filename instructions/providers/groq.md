---
id: groq
adapter: compatible
label: Groq
vendor: Groq
endpoint: https://api.groq.com/openai/v1/chat/completions
model: llama-3.3-70b-versatile
requires_card: false
free_tier: "Un límite de fichas seguidas. Si lo alcanzas, hay que esperar un rato y sigue."
vision: false
key_url: https://console.groq.com/keys
key_prefix: gsk_
cost_cents: 0
cost_measured: false
processed_in: EEUU
jurisdiction: us
trains_on_input: "no"
quality: unmeasured
provisional_rank: 5
quirks: [no-stream-options]
suits: "La alternativa gratis si Google cambia su plan. Muy rápido, pero no lee fotos."
signup_first: "Sólo el correo. No pide tarjeta."
last_checked: 2026-08-28
---

## Qué es esto

Un servicio gratuito y muy rápido. Se registra con el correo y nada más.

Lo que va a doler: **no lee fotos.** Si tu material llega fotografiado del
libro, este servicio no te sirve para eso; sólo para texto que ya tengas
escrito o en PDF con texto. Si trabajas casi siempre con fotos, usa Gemini.

## Pasos

1. Abre el enlace. Verás la consola de Groq. Entra con tu correo o con Google.
2. Si es la primera vez, te llegará un enlace al correo para confirmar.
3. En la página de claves, pulsa **Create API Key**.
4. Ponle el nombre que quieras y confirma.
5. Copia la cadena que empieza por **gsk_**. Sólo se ve una vez.

## No encuentro eso

- **No veo el botón de crear clave.** Busca «API Keys» en el menú de la
  izquierda; la consola abre en otra pantalla.
- **Rampa me dice que no puede leer la foto.** Es correcto: este servicio no lee
  imágenes. Cambia a Gemini o Claude para el material fotografiado.
- **Me dice que espere.** Has llegado al límite de fichas seguidas. Espera unos
  minutos y continúa.
