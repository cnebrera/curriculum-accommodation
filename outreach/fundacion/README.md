# Material de captación — Fundación VASS

*Outreach material. Not part of the product, and not under the content licence.*

Deck para presentar Rampa a fundaciones, obra social y convocatorias públicas, y
pedir financiación para cerrar lo que falta y correr el piloto con maestras de PT.
Lo mueve la Fundación VASS.

| Fichero | Qué es |
|---|---|
| [`deck.html`](deck.html) | El deck. Un solo fichero autocontenido: se abre en cualquier navegador, se navega con teclado y con scroll, y se imprime a PDF con una lámina por página |
| [`guion-deck.md`](guion-deck.md) | El contenido lámina a lámina, con notas de ponente, los supuestos que hay que validar y lo que falta para que el deck esté completo |
| [`deck.pdf`](deck.pdf) | El deck en PDF, 26 páginas 16:9, **igual que en pantalla**: fondo negro. Es el que se adjunta en un correo |
| [`deck-impresion.pdf`](deck-impresion.pdf) | El mismo deck con la paleta clara del manual, para quien lo imprima de verdad en papel |
| `PROMPT-DECK-FUNDACION*.md` | El encargo con el que se generó, conservado para poder regenerarlo o discutirlo |

## Regenerar los PDF

Los dos son derivados de `deck.html` y no se construyen solos. Si tocas el deck,
regenéralos y míralos, que es donde se ven los defectos que ningún test detecta.

```bash
cd outreach/fundacion
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# El que se envía: negro, igual que en pantalla
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=20000 --print-to-pdf=deck.pdf "file://$PWD/deck.html"

# El de papel: paleta clara, que la activa la clase `papel` en <html>
sed 's|<html lang="es">|<html lang="es" class="papel">|' deck.html > /tmp/deck-papel.html
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=20000 --print-to-pdf="$PWD/deck-impresion.pdf" /tmp/deck-papel.html
```

Comprueba que cada uno sale con 26 páginas y que el logotipo va en la versión que
toca: negativo (blanco y azul) en `deck.pdf`, positivo (negro y azul) en
`deck-impresion.pdf`.

## Estado

Borrador. **Todas las cifras del piloto son estimaciones propuestas por quien
redactó el deck, no cifras acordadas por el proyecto**, y llevan su base de cálculo
en el anexo A. Antes de enviarlo a nadie hay que resolver lo que el guion lista al
final, empezando por las tres marcas `[PENDIENTE: …]` que quedan en el deck.

Nada de lo que afirma sobre el producto va más allá de lo que
[`specs/006-desktop-app/validation.md`](../../specs/006-desktop-app/validation.md)
y [`specs/BACKLOG.md`](../../specs/BACKLOG.md) sostienen. Si algo de ahí cambia y
el deck deja de ser cierto, el deck es lo que está mal.
