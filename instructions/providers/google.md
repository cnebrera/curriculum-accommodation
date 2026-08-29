---
id: google
adapter: google
label: Gemini (Google)
vendor: Google
model: gemini-2.5-flash
requires_card: false
free_tier: "Un número limitado de fichas al día. Suficiente para un par de clases; si te pasas, hay que esperar al día siguiente."
vision: true
key_url: https://aistudio.google.com/apikey
# Two formats are live at once: the older `AIza…` and the newer `AQ.…`, which
# Google started issuing without announcing it. This list is used ONLY to
# recognise a key pasted from a different service — it is never a reason to
# reject one, because a provider can add a third format tomorrow and would not
# tell us either.
key_prefix: [AIza, "AQ."]
cost_cents: 0
cost_measured: false
processed_in: EEUU
jurisdiction: us
trains_on_input: opt-out
quality: unmeasured
provisional_rank: 2
suits: "Para empezar sin gastar nada. Lee fotos, que es como llega casi todo el material."
signup_first: "Necesitas una cuenta de Google. Si usas Gmail o Classroom, ya la tienes."
last_checked: 2026-08-28
---

## Qué es esto

El servicio de IA de Google. Tiene un plan gratuito de verdad —sin tarjeta— con
un tope de fichas al día. Lee fotos, así que puedes fotografiar la página del
libro y trabajar con eso.

Lo que va a doler: el plan gratuito significa que Google puede usar lo que
envíes para mejorar sus modelos, salvo que lo desactives en tu cuenta. Rampa
sustituye los nombres de tus alumnos antes de enviar nada, pero un nombre
escrito a mano en la foto de una ficha va dentro de la imagen. Si eso te
preocupa, habla con tu centro antes de usar el plan gratuito.

## Pasos

1. Abre el enlace. Verás una página que dice **Google AI Studio**. Si te pide
   entrar, entra con tu cuenta de Google.
2. Si es la primera vez, saldrá un aviso con las condiciones. Acéptalo para
   continuar.
3. Busca el botón azul que dice **Create API key** (crear clave). Está arriba a
   la derecha o en el centro de la página.
4. Si te pregunta en qué proyecto, elige el que te propone. No importa cuál sea.
5. Aparecerá una cadena larga de letras y números. Pulsa el icono de copiar que
   hay al lado. Da igual por dónde empiece: Google ha cambiado el formato más de
   una vez y Rampa no la juzga por su aspecto.
6. Vuelve aquí y pégala en la caja.

## No encuentro eso

- **La página está en inglés y no encuentro el botón.** Busca las palabras
  «Create API key» o «Get API key». Es el único botón azul de la página.
- **Me dice que tengo que elegir un proyecto y no tengo ninguno.** Pulsa
  «Create API key in new project». Google crea uno solo.
- **He cerrado la ventana y ya no veo la clave.** No se puede volver a ver: crea
  otra. Tener varias no rompe nada.
- **Me sale un aviso de facturación.** Estás en la página de Google Cloud, que
  no es esta. Vuelve al enlace de arriba: AI Studio no pide tarjeta.
