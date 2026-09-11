# Material de captación — Fundación VASS

*Outreach material. Not part of the product, and not under the content licence.*

Deck para presentar Rampa a fundaciones, obra social y convocatorias públicas, y
pedir financiación para cerrar lo que falta y correr el piloto con maestras de PT.
Lo mueve la Fundación VASS.

| Fichero | Qué es |
|---|---|
| [`deck.html`](deck.html) | El deck. Un solo fichero autocontenido: se abre en cualquier navegador, se navega con teclado y con scroll, y se imprime a PDF con una lámina por página |
| [`guion-deck.md`](guion-deck.md) | El contenido lámina a lámina, con notas de ponente, los supuestos que hay que validar y lo que falta para que el deck esté completo |
| [`deck.pdf`](deck.pdf) | El mismo deck en PDF, 26 páginas 16:9, para adjuntar en un correo. **Derivado de `deck.html`**: si cambias el deck, regenéralo |
| `PROMPT-DECK-FUNDACION*.md` | El encargo con el que se generó, conservado para poder regenerarlo o discutirlo |

## Regenerar el PDF

El PDF no se construye solo. Sale de la hoja de impresión del propio deck, donde
cada página es exactamente una lámina 16:9 sin márgenes:

```bash
cd outreach/fundacion
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=20000 \
  --print-to-pdf=deck.pdf "file://$PWD/deck.html"
```

Comprueba que salen 26 páginas y que el logotipo aparece en su versión positiva
(negro y azul, no blanco), que es lo que la hoja de impresión cambia.

## Por qué está aquí y no fuera

El encargo original decía expresamente que no entrara en el repositorio, «porque
el repositorio tiene sus propias reglas de contenido y de licencia». Esa decisión
se revisó el 2026-09-11 y se cambió, a condición de dejar las dos reglas escritas:

1. **No es contenido pedagógico.** No va bajo CC BY-SA 4.0. Vive bajo la licencia
   por defecto del repositorio; ver [`LICENSE-CONTENT.md`](../../LICENSE-CONTENT.md).
2. **La marca no es nuestra.** El logotipo de la Fundación VASS que el deck lleva
   dentro es obra gráfica de Grupo VASS, no se licencia con este repositorio y no
   se puede reutilizar sin su permiso. Está dicho en [`NOTICE`](../../NOTICE).

## Estado

Borrador. **Todas las cifras del piloto son estimaciones propuestas por quien
redactó el deck, no cifras acordadas por el proyecto**, y llevan su base de cálculo
en el anexo A. Antes de enviarlo a nadie hay que resolver lo que el guion lista al
final, empezando por las tres marcas `[PENDIENTE: …]` que quedan en el deck.

Nada de lo que afirma sobre el producto va más allá de lo que
[`specs/006-desktop-app/validation.md`](../../specs/006-desktop-app/validation.md)
y [`specs/BACKLOG.md`](../../specs/BACKLOG.md) sostienen. Si algo de ahí cambia y
el deck deja de ser cierto, el deck es lo que está mal.
