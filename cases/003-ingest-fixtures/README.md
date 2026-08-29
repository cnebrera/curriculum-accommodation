# Fixtures — reading real material badly photographed

Este directorio es **un entregable de la spec 008**, no material de apoyo. Sin él,
SC-601 y SC-602 no se pueden medir, y un criterio de éxito que no se puede medir
es decoración.

## Qué es un fixture

Tres cosas, y las tres son obligatorias:

1. **La hoja.** Una ficha escrita *para esto* — no fotografiada de un libro. Ver
   «Por qué no hay material de editorial» abajo.
2. **La imagen.** La hoja impresa y fotografiada **mal a propósito**: torcida, con
   sombra, media página en penumbra, con el flash reflejando, con el móvil en la
   mano y no en un trípode. Es la vía común, no el caso degradado.
3. **La verdad de referencia.** El IR escrito a mano, `ground-truth.md`, con lo
   que de verdad dice el papel. Incluidos los `[UNREADABLE: …]` donde una persona
   tampoco puede leerlo.

**Un fixture sin verdad de referencia no es un fixture.** Es una foto. Lo que
convierte esto en una medida es que exista algo con lo que comparar, escrito por
una persona antes de ver lo que extrajo el modelo.

## Estructura

```
cases/003-ingest-fixtures/
  01-ecosistemas-torcida/
    source.md          la hoja, tal como se escribió e imprimió
    page-1.jpg         la foto (mala a propósito)
    ground-truth.md    el IR correcto, a mano
    notes.md           qué se fotografió mal y por qué se eligió así
```

## Qué mide cada cosa

| Criterio | Cómo lo mide este directorio |
|---|---|
| **SC-601** · la numeración sobrevive en el 100% de las páginas, y ningún `[UNREADABLE]` de la verdad de referencia se sustituye por contenido inventado | Comparando la extracción con `ground-truth.md`. Necesita clave |
| **SC-602** · un error sembrado se encuentra desde la pantalla de verificación | Se cambia un número en la extracción y se le pide a otra persona que lo encuentre sin abrir un fichero. Necesita una segunda persona |
| **SC-605** · el texto oculto en un PDF digital levanta el aviso siempre | Un fixture de PDF con texto blanco sobre blanco |

`packages/core/test/fixtures.test.ts` comprueba **la verdad de referencia**, no la
extracción: que cada fixture tiene sus tres partes, que el IR está bien formado, y
que los `[UNREADABLE]` están donde dice `notes.md`. Eso sí corre sin clave, y es lo
que evita que el arnés se podra mientras nadie lo usa.

## Por qué no hay material de editorial

Ni una página de libro de texto, ni un escaneo, ni una foto de un cuaderno de
clase. Dos razones y las dos son suficientes por sí solas:

- **Derechos.** El material de editorial está protegido, y este repositorio es
  público y con licencia abierta.
- **Datos personales.** Una ficha de clase real puede llevar el nombre de un
  alumno escrito a mano, y ese es exactamente el residuo que la spec 008 US4
  documenta. Meterlo en un repositorio git sería el mismo fallo, cometido por
  nosotros y de forma permanente.

Las hojas se escriben aquí, se imprimen y se fotografían. Salen igual de difíciles
de leer, que es lo que hace falta.

## Añadir uno

Lo que hace falta que aporte un fixture nuevo es **una forma de fallar que
ninguno de los que ya están cubre**. Un séptimo folio bien iluminado no aporta
nada. Sí aportan:

- Dos columnas con un aside enmarcado en medio.
- Numeración que empieza otra vez en cada sección (el caso que la validación
  marca pero no rechaza).
- Una captura de pantalla con el menú de la plataforma alrededor.
- Una fórmula legible al lado de una que no lo es.
- Un HEIC directo de un iPhone, sin convertir.
- Un PDF digital con texto oculto.
- Una hoja con el nombre escrito a mano en la línea de arriba.

Escribe en `notes.md` **qué falla y por qué se eligió**, porque dentro de un año
nadie se acordará de para qué estaba esa foto torcida.

## Cuándo se queda viejo un fixture

Un fixture no caduca por fecha: caduca cuando **la forma de fallar que cubría deja
de ser real**, o cuando su verdad de referencia deja de corresponderse con lo que
dice `docs/ir.md`.

`packages/core/test/fixtures.test.ts` avisa de lo segundo: si el IR cambia de
formato, las verdades de referencia dejan de parsear y el test falla. Eso es
deliberado — un arnés que sigue en verde mientras mide el formato de antes es peor
que no tener arnés.

Lo primero no lo puede detectar ningún test. Si una plataforma cambia y la captura
del fixture 03 ya no se parece a lo que ve una profesora, ese fixture está muerto y
hay que decirlo en su `notes.md` en vez de dejarlo ahí dando confianza.

## Licencia

Contenido, como todo el corpus: **CC BY-SA 4.0** (`LICENSE-CONTENT.md`). Las hojas
se escribieron para este proyecto y se comparten en esos términos.
