# Sistemas educativos

Un fichero por sistema. Dicen qué cursos y etapas existen, qué edad suele tener un
alumno en cada uno, y **a grandes rasgos** qué se da y qué suele poder hacer.

**El contrato está en
[`specs/011-quien-alumno-edad/contracts/education-model.md`](../../specs/011-quien-alumno-edad/contracts/education-model.md).**
Léelo antes de añadir el británico o el americano.

## Para qué sirve esto, y para qué no

**Sirve** para que la adaptación no diga una barbaridad para la edad cuando la
maestra no ha dicho nada. Un texto sobre hipotecas para un niño de nueve años.
Contar ositos para uno de dieciséis.

**No sirve** como currículo. En España son los mínimos del Estado y cada comunidad
desarrolla el suyo encima; en cualquier otro país habrá una versión de esa misma
frase, y el fichero tendrá que decirla.

**Lo que diga la maestra manda sobre esto, siempre.** No es una advertencia al pie:
es el diseño, y cualquier cambio futuro que deje a la orientación pisar lo que ella
ha escrito es un fallo, no una mejora.

## Lo primero que hay que entender

Un campo importa más que los demás: **`can`**, lo que un alumno de ese curso suele
*poder hacer*. Aguanta una reforma curricular, es igual de verdad en septiembre y
en junio, y es lo que la adaptación necesita de verdad. `studies` es un boceto y
envejece.

Escribe `can` primero y escríbelo mejor.

## `reviewed_by_teacher`

Empieza en `false` y **sigue en `false` hasta que alguien que da clase en ese
sistema esté en desacuerdo con algo concreto.**

No hasta que lo lea. Hasta que discrepe. Alguien asintiendo por educación no es una
revisión, y este proyecto ya se llevó esa lección con `docs/axis-calibration.md`
(gap G2). Un fichero con pinta de autoridad escrito por un modelo de lenguaje es
justo el fallo contra el que está montada toda la arquitectura de esto.

## Añadir uno

1. Copia `es.md`, conserva la estructura, cambia el contenido.
2. Etapas, y cursos dentro. Los `id` son estables; las `label` son lo que ella lee.
3. `typical_age: null` donde el curso no diga nada de la edad. La aplicación no
   rellenará nada, que es lo correcto.
4. `last_checked` = el día que leíste las páginas de la autoridad educativa. No el
   día que editaste el fichero.
5. Busca a alguien que dé clase en ese sistema y consigue que te discuta algo.
