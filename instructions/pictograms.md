---
id: pictograms
label: Pictogramas
last_checked: "2026-08-31"

# Igual que el resto del corpus: falso hasta que una PT en ejercicio esté en
# DESACUERDO con algo concreto de aquí. No hasta que lo lea.
#
# Lo que más falta revisar es el tamaño mínimo y los tres alcances. El tamaño sale
# de un razonamiento sobre fotocopias, no de una fotocopia.
reviewed_by_teacher: false

# El tamaño mínimo al que se imprime un pictograma, en milímetros.
#
# Aquí y no en el código porque va a moverse con fotocopiadoras reales. A 12 mm y
# 200 DPI un pictograma en escala de grises es una mancha, y el contraste no lo
# arregla: el dibujo tiene detalle interior. 20 mm es un punto de partida
# razonado, no medido.
min_print_mm: 20

# Los tres alcances que ella puede elegir, con sus palabras.
scopes:
  - id: all
    label: En todo
    when: >
      Para un alumno que usa pictogramas como vía principal de lectura. Es el
      caso menos frecuente y el más claro.
  - id: instructions
    label: Sólo en lo que hay que hacer
    when: >
      El enunciado y las órdenes llevan pictograma; el contenido no. Sirve cuando
      el problema es entender qué se le pide, no leer el texto.
  - id: vocabulary
    label: Sólo en el vocabulario clave
    when: >
      Las palabras nuevas de la unidad, una vez cada una. Sirve para fijar
      términos, y es lo que menos carga añade a la página.
---

# Pictogramas

## Lo primero: esto añade cosas a la hoja

Todas las demás familias de recetas quitan. Esta pone. Y por eso es la única que
**nunca se activa sola**.

Un pictograma al lado de cada sustantivo no es accesibilidad. Para un alumno que
lee, es una cosa más en la página compitiendo por la atención que `ATE` y `COG`
intentan proteger. Si lee, el dibujo estorba.

## Lo segundo, que es más importante

Es la diferencia **más visible** que existe.

Un niño en un aula ordinaria con una hoja llena de pictogramas, rodeado de treinta
compañeros con la hoja normal, está siendo señalado por la herramienta que existía
para incluirlo. Y un chico de quince años con dislexia no quiere una ficha que
parece de un niño de cinco. Tendría razón.

Por eso esta decisión no la toma un eje del perfil. La toma quien conoce la clase.

## Cuándo sí

- **Usa pictogramas como sistema.** Ya los usa en clase, en su agenda, en su
  panel. La hoja tiene que hablar el mismo idioma que el resto de su día.
- **No lee todavía, o lee muy poco**, y el pictograma es lo que le permite empezar
  la tarea sin que alguien se la lea.
- **Vocabulario nuevo de una unidad**, una vez cada palabra, para fijarla. Esto
  sirve a bastantes alumnos y es lo que menos carga añade.

## Cuándo no

- **Si lee.** Aunque lea despacio. Hay otras familias para eso.
- **Si nadie lo ha decidido.** Un perfil con `COG: 3` no pide pictogramas: pide que
  se reduzca la carga, y añadir dibujos hace lo contrario.
- **En una hoja que ya va cargada de imágenes.** El problema entonces es la carga,
  y esta familia lo empeora.
- **Por si acaso.** Es la única familia donde «por si acaso» tiene un coste social
  para el alumno.

## En un examen

Sólo donde no cambie lo que se pregunta, y **nunca en una pregunta cuyo tema es la
palabra misma**.

Un pictograma junto a «rana» en una prueba de vocabulario **da la respuesta**. Eso
no es cambiar la presentación: es cambiar el examen, y quien lo firma se está
jugando la nota de un alumno (ver `instructions/material-kinds.md`).

## Lo que hace el programa y lo que no

**El programa no elige dibujos.** Busca la palabra en la lista que trae el juego de
pictogramas y, si hay exactamente uno, lo pone. Si hay varios, **no pone ninguno** y
te dice cuáles había para que elijas tú. Un pictograma equivocado es peor que
ninguno: el alumno lee el dibujo, tú lees el texto, y puede que no lo notes.

**El programa no descarga nada.** El juego de pictogramas es tuyo, lo traes tú, y
la licencia la aceptas tú directamente. Rampa lo lee de donde lo hayas puesto.

**La atribución no se puede quitar.** Cualquier hoja que lleve un pictograma lleva
también quién lo hizo, de dónde sale y con qué licencia. Es una condición de la
licencia, no una preferencia — y si se cae, la hoja infractora es la tuya.

## Nunca

- Activar esta familia desde un eje del perfil.
- Proponerla cuando ella la ha dejado apagada.
- Poner un pictograma cuando hay más de un candidato.
- Poner un pictograma en un nombre propio.
- Poner un pictograma en una pregunta que pregunta por esa palabra.
- Imprimir un pictograma sin la palabra al lado.
