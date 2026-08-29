# Qué falla aquí, y por qué se eligió así

**La foto está torcida y el margen derecho en penumbra.** Es el caso base: una
profesora fotografiando una hoja sobre la mesa del aula con la luz del techo a un
lado. No es un caso extremo; es lo normal.

## Qué se mide con este fixture

- **La numeración sobrevive** (SC-601). Cuatro ejercicios numerados 1-4, seguidos.
  Si la extracción los renumera, se ve inmediatamente comparando con
  `ground-truth.md` — y es el error que en una hoja terminada no se nota, porque
  la hoja se lee perfectamente.
- **El aside enmarcado no se convierte en párrafo.** El «Recuerda» es un `note`,
  no una `explanation`: distinguirlos decide qué se simplifica y qué se adapta.
- **La imagen lleva rol y las dos descripciones.** `informative`, no `essential`:
  la pregunta 3 se puede responder desde el texto. Un fixture donde fuese
  `essential` es un cuarto fixture que hace falta.
- **El pie de página es `reference`, no contenido.** Si acaba en el material que
  se adapta, la hoja del alumno lleva metadatos del libro.

## Error sembrado, para SC-602

Cambiar en la extracción **«3.»** por **«5.»** y pedirle a alguien que no haya
visto el original que lo encuentre desde la pantalla de verificación. Si no lo
encuentra, la pantalla no sirve.

## Lo que falta

**La foto.** Este directorio tiene la hoja y la verdad de referencia, que es la
parte que se puede escribir. Falta imprimirla y fotografiarla mal a propósito, y
eso necesita una impresora y un móvil. Está dicho en
`specs/006-desktop-app/validation.md`, no olvidado.
