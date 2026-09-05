---
id: material-kinds
label: Qué es el material
last_checked: "2026-08-31"

# Igual que instructions/education/es.md: falso hasta que una PT en ejercicio
# esté en DESACUERDO con algo concreto de aquí. No hasta que lo lea.
#
# Lo que más falta revisar es el orden de la lista. Se le pregunta antes de
# empezar, así que si el que más usa está tercero, la pregunta es fricción cuatro
# veces al día.
reviewed_by_teacher: false

kinds:
  - id: worksheet
    # Qué le pregunto para saber cuánto material hacer (021 FR-1925).
    quantity:
      of: exercises
      label: Cuántos ejercicios de cada cosa
      default: 10
      help: >
        Por objetivo. Si pides tres cosas y pones diez, salen treinta.
    label: Una ficha o unos ejercicios
    before: >
      Voy a cambiar cómo se ve y cuánto hay por página. Lo que se pide y la
      numeración se quedan igual.
    forbids: [curricular-demand, numbering]
    rule: >
      Es material de trabajo de clase. Puedes cambiar la presentación, la
      secuencia, la carga por página y la vía de respuesta. No cambies la
      exigencia curricular ni la numeración original: la clase trabaja en voz
      alta sobre «el ejercicio cinco».

  - id: exam
    # Qué le pregunto para saber cuánto material hacer (021 FR-1925).
    quantity:
      of: questions
      label: Cuántas preguntas de cada cosa
      default: 6
      help: >
        Por objetivo. Tú validas cada una: yo no sé qué se ha dado en clase.
    label: Un examen o una prueba
    before: >
      Es un examen: voy a cambiar cómo se lee y cómo contesta, y nada de lo que
      se pregunta. Si sale más fácil, es otro examen.
    # Lo que pasa cuando el examen lo escribo yo desde cero (021 US2).
    #
    # Adaptar un examen que ya existe y escribirlo yo son dos cosas distintas: en el
    # primero hay una exigencia que respetar, en el segundo la estoy proponiendo. Estas
    # frases van IMPRESAS en el documento, no sólo en la pantalla, porque el papel
    # sobrevive a la pantalla en la que se hizo.
    composing:
      before: >
        Te voy a proponer las preguntas de una prueba con nota. Yo no sé qué habéis
        dado en clase ni qué pesa cada cosa: tú validas cada pregunta antes de que
        esto sea un examen.
      on_document:
        - >
          Estas preguntas las he propuesto yo. Valida cada una antes de usarlas: yo no
          sé qué se ha dado en clase.
        - >
          Poner a un alumno una prueba distinta de la del grupo lo decide el equipo
          docente, no yo. Aquí no lo he decidido.
      # La negativa cuando se pide el examen por debajo de su curso (027 FR-2509, P12).
      #
      # Componer un examen a un curso inferior no es cambiar CÓMO se evalúa: es cambiar
      # QUÉ se evalúa, y eso es una adaptación significativa. La decide el equipo docente
      # sobre una evaluación psicopedagógica, y queda registrada en el documento que su
      # normativa llame — que es exactamente lo que desbloquea esto. Sin esa adaptación
      # registrada no es que Rampa no sepa: es que no le corresponde.
      #
      # El gatillo es LA PETICIÓN, no el perfil (P12): un CUR alto es razón para adaptar
      # con más cuidado, nunca para negarse. Esta frase sólo se dice cuando lo que se
      # pide es un examen de otro curso.
      below_level: >
        Un examen de un curso distinto al suyo evalúa otras cosas, y eso lo decide el
        equipo docente con una evaluación psicopedagógica, no yo. Si ya está decidido y
        hay una adaptación que lo recoja, tráela con «Su adaptación curricular» y compongo a ese
        nivel. Si no, dime a qué curso y te preparo material de apoyo, no un examen.
    forbids: [question-demand, item-count, curricular-demand, numbering]
    rule: >
      Es una prueba de evaluación. Cambia SÓLO la vía de acceso y la vía de
      respuesta: tipografía, espacio, orden de lectura, cómo contesta. No cambies
      lo que se pregunta en ninguna pregunta, no simplifiques el enunciado hasta
      que pida menos, y no reduzcas el número de preguntas evaluadas sin decirlo
      explícitamente en el informe. Un examen adaptado que además es más fácil es
      otro examen, y quien lo firma se está jugando la nota de un alumno.

  - id: study
    # Un texto no tiene nada que contar (021 FR-1927). `of: none` es explícito a
    # propósito: la ausencia del bloque significaría «nadie lo ha decidido», y esto
    # es una decisión. Lo que se pregunta en su lugar son las sesiones y su duración,
    # que se preguntan para todos los tipos.
    quantity:
      of: none
    label: Apuntes o un texto para estudiar
    before: >
      Son apuntes para estudiar solo: puedo cambiarlo todo salvo lo que dice. No
      voy a resumir ni a dejar fuera ningún apartado.
    forbids: [content, coverage]
    rule: >
      Es el material con el que va a estudiar solo, probablemente en casa y sin
      nadie al lado. Puedes cambiarlo todo salvo lo que dice: no resumas, no
      quites apartados, no dejes fuera un concepto porque sea difícil. Su fallo
      propio es enseñar menos sin que se note — el texto queda más claro y ya no
      cubre lo que había que cubrir.

  - id: problems
    # Qué le pregunto para saber cuánto material hacer (021 FR-1925).
    quantity:
      of: problems
      label: Cuántos problemas de cada cosa
      default: 6
      help: >
        Por objetivo. Un problema es más largo de resolver que una cuenta suelta.
    label: Una hoja de problemas
    before: >
      Son problemas: voy a cambiar el enunciado y el formato. Las cantidades y
      las operaciones que practica se quedan igual.
    forbids: [quantities, operations, curricular-demand, numbering]
    rule: >
      Son problemas que practican una operación concreta. Puedes cambiar el
      enunciado, el contexto, el formato y cuántos hay por página. No cambies las
      cantidades ni las operaciones que se practican: si el problema practica
      multiplicar con llevadas, tiene que seguir habiendo llevadas.
---

# Qué es el material

Se le pregunta a ella, antes de empezar, y **no hay opción por defecto**. El
mismo razonamiento que la pregunta de alcance de `003`: adivinar es el fallo, y un
valor por defecto es adivinar con mejores modales.

Esto es corpus y no código porque un tipo se define **por lo que prohíbe**, y una
prohibición sobre cómo adaptar es juicio pedagógico. «No cambies las cantidades ni
las operaciones que se practican» tiene que poder leerlo y corregirlo una PT sin
tocar TypeScript (Principio I). Añadir el quinto tipo es este fichero, y ninguna
línea de código.

Ver [`specs/012-que-material-examen/contracts/material-kinds.md`](../specs/012-que-material-examen/contracts/material-kinds.md)
para lo que promete quien añade uno.

## `before:` — lo que se le dice antes de empezar

`rule` es para el modelo; `before` es para ella, **antes** de pulsar el botón
(`016` FR-1405). El informe ya dice después bajo qué regla se hizo (`012`
FR-1006), y eso es lo que lee al firmar. Esto es lo que lee al decidir si gasta.

Está aquí y no en la interfaz por la misma razón que `rule`: es una promesa sobre
lo que se va a tocar y lo que no, y eso es juicio. Un tipo nuevo trae su frase sin
que cambie ni una línea de código.

## Cómo se usa

`rule` se envía al modelo **literalmente**, junto a `hard-rules.md`, que sigue
mandando por encima. `forbids` es la parte legible por la máquina: el informe la
usa para decir bajo qué regla se adaptó, antes de que ella firme.

## Por qué `problems` no es `worksheet`

Porque su fallo es el menos visible de todo este sistema.

Una profesora que lee una hoja de mates adaptada ve problemas plausibles y no
tiene ningún motivo para comprobar si los números siguen practicando las
llevadas. Y un modelo al que le pides que algo sea «más fácil» va a por los
números primero, porque eso es lo que significa «más fácil» en todos los demás
contextos.

Cambiar 47 × 8 por 10 × 2 no es una adaptación. Es otro ejercicio, entregado
justo al niño que más necesitaba el original.

## Por qué `study` está separado

Porque es el único que se usa **sin nadie delante**. Una ficha mal adaptada la ve
la profesora en clase; unos apuntes a los que les falta un apartado los descubre
el alumno el día del examen.

Por eso su prohibición es la cobertura, y por eso la comprobación de integridad
no se relaja para este tipo aunque el resultado quede más legible.
