---
id: openai
adapter: openai
label: ChatGPT (OpenAI)
vendor: OpenAI
model: gpt-4.1
requires_card: true
vision: true
key_url: https://platform.openai.com/api-keys
key_prefix: sk-proj-
cost_cents: 3
cost_measured: false
processed_in: EEUU
jurisdiction: us
trains_on_input: "no"
quality: unmeasured
provisional_rank: 3
suits: "Si ya trabajas con OpenAI en el centro. Ojo: la suscripción de ChatGPT NO sirve aquí."
signup_first: "Hay que meter una tarjeta y cargar saldo, aparte de cualquier suscripción de ChatGPT que ya pagues."
last_checked: 2026-08-28
---

## Qué es esto

**Lo primero, porque es lo que más confunde: si pagas ChatGPT Plus, eso no
sirve para esto.** Son dos productos distintos de la misma empresa. ChatGPT es
la web donde escribes y te contesta; esto es el acceso para programas como
Rampa, y se paga aparte. Mucha gente carga saldo aquí pensando que ya lo tenía
pagado, o al contrario.

Con eso claro: funciona bien, lee fotos, y se paga por uso.

## Pasos

1. Abre el enlace. Es **platform.openai.com**, no chat.openai.com. Si te lleva a
   la web de ChatGPT, te has equivocado de sitio.
2. Entra con tu cuenta. Puede ser la misma que usas para ChatGPT.
3. Busca **Billing** o **Facturación** en el menú y carga saldo (unos 5 dólares).
   Sin saldo la clave se crea pero no funciona.
4. Vuelve a **API keys** y pulsa **Create new secret key**.
5. Ponle nombre y confirma.
6. Copia la cadena que empieza por **sk-proj-**. Sólo se ve una vez.

## No encuentro eso

- **Ya pago ChatGPT Plus y me pide pagar otra vez.** Sí, es correcto y es lo
  peor de este servicio. Son dos cosas separadas.
- **La clave se crea pero Rampa dice que no hay saldo.** Falta cargar saldo en
  Billing. La clave es correcta.
- **Me sale "You've reached your usage limit".** Hay un tope mensual que puedes
  subir en Billing → Limits.
- **He perdido la clave.** No se recupera. Crea otra y borra la anterior.
