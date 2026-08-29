---
id: es
label: España
last_checked: "2026-08-29"

# FALSO, y tiene que seguir falso hasta que una PT en ejercicio no esté en
# DESACUERDO con algo de este fichero. No hasta que lo lea: hasta que discrepe.
# Alguien siendo amable no es una revisión, y este proyecto ya aprendió eso con
# docs/axis-calibration.md (gap G2 del backlog).
#
# Lo escribió un modelo de lenguaje a partir de conocimiento general. Parte va a
# estar mal.
reviewed_by_teacher: false

stages:
  - id: infantil
    label: Educación Infantil
    note: >
      Sólo el segundo ciclo (3-6). El primer ciclo (0-3) no está: nadie adapta una
      ficha para un niño de dos años, y ponerlo llenaría el desplegable de
      opciones que nadie va a elegir.
    years:
      - id: infantil-1
        label: 1.º de Infantil
        typical_age: 3
        can: >
          No lee. Todo entra por imagen, por lo que se le dice y por lo que
          manipula. Atiende a una cosa cada vez y por poco rato.
        studies: "Lenguaje oral, reconocimiento de formas y colores, primeras cantidades."
      - id: infantil-2
        label: 2.º de Infantil
        typical_age: 4
        can: >
          Reconoce su nombre escrito y algunas letras. Sigue una instrucción de un
          paso si va acompañada de gesto o imagen.
        studies: "Prelectura y preescritura, conteo hasta 10, secuencias sencillas."
      - id: infantil-3
        label: 3.º de Infantil
        typical_age: 5
        can: >
          Empieza a descifrar palabras cortas. Copia. Sostiene una instrucción de
          dos pasos si es rutinaria.
        studies: "Iniciación a la lectoescritura, cantidades hasta 20, series."

  - id: primaria
    label: Primaria
    years:
      - id: primaria-1
        label: 1.º de Primaria
        typical_age: 6
        can: >
          Descifra, pero leer todavía le cuesta esfuerzo: entender lo que lee es
          otra tarea encima. Frases cortas. Una instrucción cada vez. Todo
          concreto.
        studies: "Lectoescritura, números hasta el 100, sumas y restas sin llevadas."
      - id: primaria-2
        label: 2.º de Primaria
        typical_age: 7
        can: >
          Lee párrafos de dos o tres frases. Sostiene dos pasos. Sigue necesitando
          apoyo visual para lo que no es rutina.
        studies: "Sumas y restas con llevadas, iniciación a la multiplicación, textos narrativos breves."
      - id: primaria-3
        label: 3.º de Primaria
        typical_age: 8
        can: >
          Lee para enterarse, no sólo para descifrar. Aguanta un texto de media
          página. Dos o tres pasos.
        studies: "Multiplicación, iniciación a la división, medida, textos narrativos y descriptivos."
      - id: primaria-4
        label: 4.º de Primaria
        typical_age: 9
        can: >
          Textos de una página. Empieza a manejar lo que no tiene delante, aunque
          se apoya en lo concreto en cuanto se complica.
        studies: "División por dos cifras, iniciación a las fracciones, textos expositivos sencillos."
      - id: primaria-5
        label: 5.º de Primaria
        typical_age: 10
        can: >
          Lee párrafos de tres o cuatro frases sin cansarse. Sostiene instrucciones
          de dos o tres pasos. La abstracción ya está ahí y todavía se apoya en
          ejemplos.
        studies: "Fracciones y decimales, proporcionalidad sencilla, textos expositivos."
      - id: primaria-6
        label: 6.º de Primaria
        typical_age: 11
        can: >
          Textos largos si están bien estructurados. Trabaja solo un rato. Maneja
          lo abstracto si se le ancla en algo.
        studies: "Porcentajes, proporcionalidad, geometría, textos argumentativos sencillos."

  - id: eso
    label: ESO
    years:
      - id: eso-1
        label: 1.º de ESO
        typical_age: 12
        can: >
          Textos académicos de varias páginas. Maneja lo abstracto sin apoyo
          concreto, aunque agradece el ejemplo.
        studies: "Iniciación al álgebra, proporcionalidad, textos expositivos y argumentativos."
      - id: eso-2
        label: 2.º de ESO
        typical_age: 13
        can: "Sostiene una tarea larga. Relaciona lo que lee con lo que ya sabía."
        studies: "Álgebra, ecuaciones de primer grado, geometría, comentario de texto."
      - id: eso-3
        label: 3.º de ESO
        typical_age: 14
        can: "Argumenta por escrito. Maneja varias fuentes."
        studies: "Ecuaciones, funciones, física y química, textos argumentativos."
      - id: eso-4
        label: 4.º de ESO
        typical_age: 15
        can: "Trabaja de forma autónoma. Prepara una prueba por su cuenta."
        studies: "Funciones, estadística, y contenidos que varían según la opción elegida."

  - id: bachillerato
    label: Bachillerato
    # La modalidad cambia el contenido de verdad: un chaval de 16 no tiene UN
    # temario. Es la única etapa que hoy usa esto.
    modalities: [ciencias, humanidades, artes, general]
    years:
      - id: bach-1
        label: 1.º de Bachillerato
        typical_age: 16
        can: "Trabaja solo, con textos densos y con un nivel de exigencia alto."
        studies_by_modality:
          ciencias: "Matemáticas I, Física y Química, Biología o Dibujo Técnico."
          humanidades: "Latín o Matemáticas Aplicadas a las CCSS, Historia del Mundo Contemporáneo, Griego o Economía."
          artes: "Dibujo Artístico, Análisis Musical o Artes Escénicas, según la vía."
          general: "Matemáticas Generales, Economía, y materias de varias ramas."
      - id: bach-2
        label: 2.º de Bachillerato
        typical_age: 17
        can: "Como 1.º, con la EBAU delante — el margen para adaptar la forma existe; el contenido lo fija la prueba."
        studies_by_modality:
          ciencias: "Matemáticas II, Física, Química, Biología, Geología."
          humanidades: "Latín II, Historia de España, Historia del Arte, Economía de la Empresa."
          artes: "Fundamentos Artísticos, Dibujo Artístico II, Artes Escénicas."
          general: "Ciencias Generales, Movimientos Culturales, Historia de España."

  - id: fp-basica
    label: FP Grado Básico
    note: >
      Aquí el curso predice poco: se entra con desfase curricular y con más edad
      que el nivel, que es justo el caso para el que existe la edad en el perfil.
      Y el contenido va por módulos profesionales, no por temario común, así que
      `studies` se queda vacío a propósito.
    years:
      - id: fp-basica-1
        label: 1.º de FP Básica
        typical_age: 15
        can: >
          Muy variable. Suele venir con la lectura y el cálculo por debajo de su
          edad, y con años de haberse sentido torpe encima. El registro va por su
          edad, nunca por su nivel de lectura.
      - id: fp-basica-2
        label: 2.º de FP Básica
        typical_age: 16
        can: "Igual que 1.º. La distancia entre edad y nivel suele ser mayor, no menor."

  - id: fp-medio
    label: FP Grado Medio
    years:
      - id: fp-medio-1
        label: 1.º de Grado Medio
        typical_age: 16
        can: "Adulto joven o casi. Contenido profesional y aplicado. Con frecuencia mayor de la edad típica."
      - id: fp-medio-2
        label: 2.º de Grado Medio
        typical_age: 17
        can: "Igual, con formación en centro de trabajo."

  - id: especial
    label: Educación especial y aulas específicas
    note: >
      El curso administrativo y el nivel real se separan del todo, y a veces no
      hay curso ordinario. Por eso `typical_age` es null: rellenar un número
      plausible sería peor que no rellenar nada, porque una edad equivocada se usa
      y una edad ausente se pregunta.
    years:
      - id: especial
        label: Educación especial
        typical_age: null
        can: >
          No lo dice el curso. Lo dicen los ejes del perfil y lo que la maestra
          haya escrito. Aquí este fichero no ayuda y no debe fingir que sí.

  - id: adultos
    label: Educación de personas adultas
    note: >
      Personas adultas con material de nivel de ESO. Si esto no estuviera, el
      modelo daría por hecho que un alumno de ESO tiene 13 años y saldría un
      registro infantilizado — dirigido justo a quien menos se lo puede quitar de
      encima.
    years:
      - id: espa-1
        label: ESPA Nivel I
        typical_age: null
        can: "Persona adulta. El contenido es de ESO; el registro, de adulto. Nunca al revés."
      - id: espa-2
        label: ESPA Nivel II
        typical_age: null
        can: "Igual que Nivel I, con contenidos de 3.º y 4.º de ESO."
---

# El sistema educativo español

Esto es **orientación, no currículo**. Sirve para que la adaptación no diga una
barbaridad para la edad cuando la maestra no ha dicho nada — un texto sobre
hipotecas para un niño de nueve años, o contar ositos para uno de dieciséis.

## Lo que hay que saber antes de fiarse de este fichero

**Son los mínimos del Estado.** Las diecisiete comunidades autónomas desarrollan
su propio currículo encima. Lo que se da en 5.º de Primaria en Extremadura y en el
País Vasco no es exactamente lo mismo, y este fichero no lo sabe.

**Lo escribió un modelo de lenguaje**, a partir de conocimiento general, y **parte
va a estar mal**. Por eso `reviewed_by_teacher` está en `false` y sigue en `false`
hasta que alguien que da clase esté en desacuerdo con algo concreto. No hasta que
lo lea de arriba abajo asintiendo: hasta que diga «esto no es así».

**Lo que tú digas manda sobre esto, siempre.** No es cortesía, es el diseño. Tú
estás en el aula con el niño; esto es una tabla que alguien escribió mirando un
real decreto.

## Qué es cada campo

- **`can`** — lo que un alumno de ese curso suele *poder hacer*: qué longitud de
  texto lee cómodo, cuántos pasos de instrucción sostiene, si ya maneja lo
  abstracto. **Es la parte importante.** Aguanta una reforma curricular y es lo
  que la adaptación necesita de verdad.
- **`studies`** — un boceto de por dónde va el contenido. Nunca criterios de
  evaluación, nunca competencias. Ausente donde el curso no predice el contenido.
- **`typical_age`** — la edad al empezar el curso. `null` donde el curso no dice
  nada de la edad, y entonces la aplicación **no rellena nada**.

## Dónde este fichero no ayuda

Y conviene decirlo en vez de que se descubra: **FP Básica, educación especial y
personas adultas**. En los tres, el curso no predice el contenido y a veces
tampoco la edad. Están aquí para que la aplicación no dé por hecho que todo
alumno es un niño — no para decirte qué se da.

## Corregirlo

Es un fichero de texto en tu carpeta. Ábrelo y cámbialo. Si el cambio vale para
todo el mundo y no sólo para tu aula, mándalo al proyecto.

Y si cambias algo, sube `last_checked` — es la fecha en la que alguien comprobó
esto, no la fecha en la que se editó.
