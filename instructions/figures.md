---
# Los diagramas: qué tipo sirve para qué, hasta dónde, y cómo se cuentan (022).
#
# Esto es corpus porque cada línea es un juicio que una PT puede corregir: qué enseña
# una rejilla, cuándo un diagrama deja de ser un diagrama, y con qué palabras se le
# cuenta a quien no lo ve. **Lo que NO está aquí es la lista blanca de marcado**: una
# frontera de seguridad que se puede editar no es una frontera (Principio IX), así que
# vive en `packages/core/src/render/figures/validate.ts` y sólo ahí.

# Qué tipo sirve para qué operación. El código hace cumplir lo que esto declare, y un
# tipo que no le sirva a la operación se **rechaza y se dice** — nunca se cambia por
# otro: cambiarlo sería sanear una decisión pedagógica.
kinds:
  - id: grid
    # Como ella lo escribe en la línea de petición.
    says: rejilla
    for: ['×']
    # Con qué palabras se cuenta a quien no ve el dibujo (FR-2012). `{}` las rellena
    # el código con las cantidades del ejercicio ya comprobado.
    describe: >
      Una rejilla de {rows} filas por {cols} columnas: {total} casillas{theme}.
  - id: groups
    says: grupos
    for: ['×', '÷']
    describe: >
      {groups} grupos de {perGroup}{theme}: {total} en total.
  - id: number-line
    says: recta
    for: ['+', '−']
    describe: >
      Una recta numérica del 0 al {end}. Se empieza en {start} y se dan {jumps} saltos
      de uno hasta {end}.
  - id: part-whole
    says: barra
    for: ['+', '−']
    describe: >
      Una barra de {whole} partida en {parts}{theme}.

# Dónde un diagrama deja de ser un diagrama.
#
# Una rejilla de treinta por treinta no es una imagen: es una mancha. Pasado el límite
# **no se dibuja nada** y el informe lo dice con el número — nunca se recorta, porque
# una rejilla recortada es un diagrama cuyas cantidades ya no son las del ejercicio, y
# eso cambiaría FR-2015 por una violación de SC-2001.
bounds:
  max_cells: 60
  max_line_span: 30
  max_parts: 8

# La sección que va en el prompt, tal cual. Va aquí y no en el código porque es lo que
# se le pide al modelo, y lo que se le pide es criterio (Principio I).
request_format: >
  Si un ejercicio se entiende mejor con un dibujo, pídelo con **una línea por dibujo**,
  después de los ejercicios, con este formato exacto:

  `figura: <la expresión del ejercicio> | tipo: rejilla|grupos|recta|barra | tema: <dos o tres palabras> | glifo: <un fragmento de SVG en una línea>`

  Tres cosas que conviene que sepas, porque el programa las comprueba:

  1. **No pongas cantidades.** Ni filas, ni columnas, ni cuántos. Las saco yo del
     ejercicio que ya he comprobado. Si las pones, las tiro.
  2. **El tema son palabras, no dibujos de nadie.** «Cartas», «autobuses», «canicas».
     El glifo es una forma sencilla que dibujas tú: un rectángulo, un círculo, una
     silueta. Nada de personajes, marcas, logos ni nombres de nadie — ni «Pikachu», ni
     el escudo de un equipo. Una marca registrada en la hoja de un niño es un problema
     más grande que el dibujo que resuelve.
  3. **El glifo no puede llevar nada que se ejecute ni nada de fuera**: ni scripts, ni
     `href`, ni imágenes, ni `url(...)`. Si lo lleva, rechazo el dibujo entero y se lo
     digo a la maestra.

# Cómo se invita al tema cuando ella ha apuntado intereses, y qué se hace cuando no.
theme_when_known: >
  Le interesan estas cosas: {interests}. Puedes usarlas como **tema** del dibujo — la
  forma de una casilla, la palabra de una etiqueta — y nunca para cambiar las
  cantidades ni la dificultad.
theme_when_unknown: >
  No tengo apuntado nada que le interese. Haz los dibujos **sencillos**: cuadrados,
  círculos, líneas. No te inventes un tema.
---

# Diagramas

Un diagrama no es un adorno al lado del ejercicio: es el ejercicio dicho de otra
manera. Para un alumno que se pierde en el enunciado, la rejilla **es** la
multiplicación — y si la rejilla tiene once casillas cuando la cuenta dice doce, le has
enseñado que las matemáticas no cuadran.

De ahí el reparto que hay debajo de todo esto:

- **Las cantidades las decide el código**, a partir de un ejercicio ya comprobado. No
  hay ninguna manera de que una cantidad venga de un modelo.
- **El tema lo decide el modelo**, y son palabras y formas sencillas. Que las casillas
  sean cartas es una decisión sobre este niño, y ahí el modelo aporta.
- **El dibujo lo hace el código**, siempre igual: el mismo documento da el mismo
  dibujo, sin llamar a nadie.

## Por qué el tipo lo pide el modelo y no lo elige el código

Entre una rejilla y unos grupos para la misma multiplicación hay una decisión
pedagógica, y depende de cómo se lo esté explicando. La rejilla enseña el área y
prepara la propiedad distributiva; los grupos enseñan «tantas veces» y se parecen a lo
que hace con las manos. El código no sabe cuál toca hoy. Lo que sí sabe es que una
recta numérica no es una multiplicación, y eso lo hace cumplir.

## Y lo que un dibujo no arregla

Un diagrama correcto al lado de un ejercicio que nadie ha comprobado es peor que no
tener dibujo: la imagen da confianza y la cuenta no la merece. Por eso un ejercicio sin
verificar no lleva dibujo, y no es una regla que se pueda relajar — es la misma rama
que mantiene su respuesta fuera de la hoja de soluciones.
