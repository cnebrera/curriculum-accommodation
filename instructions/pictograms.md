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

# De dónde se pueden traer pictogramas (023 T001, FR-2116, 018 FR-1604).
#
# Aquí y no en el código por dos razones. La primera es el Principio I: una URL que
# cambia es una edición de Markdown, no una release. La segunda es que `018` FR-1604
# exige que el juego de pictogramas sea sustituible, y una lista de proveedores en
# el código es exactamente la dependencia que esa regla prohíbe.
#
# `attribution` es lo que la licencia obliga a poner en cada hoja. No es cortesía y
# no se puede quitar: si se cae, la hoja infractora es la de la profesora.
#
publishers:
  - id: arasaac
    label: ARASAAC
    # Comprobado el 2026-09-02: pública, sin clave, sin registro.
    # El catálogo entero en una sola petición: 8,1 MB, 13.802 pictogramas con todas
    # sus palabras, su popularidad y su fecha. Comprobado el 2026-09-02.
    index: "https://api.arasaac.org/v1/pictograms/all/{lang}"
    image: "https://static.arasaac.org/pictograms/{id}/{id}_{size}.png"
    site: "https://arasaac.org"
    licence: CC BY-NC-SA 4.0
    licence_url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es"
    languages: [es, en, ca, gl, eu, fr, pt]
    attribution:
      author: Sergio Palao
      owner: Gobierno de Aragón
      source: "ARASAAC (https://arasaac.org)"

# Cómo se trae el juego entero (024 T001, FR-2204/2207).
#
# `image_size` sale de `min_print_mm` de más abajo, no de una intuición: 20 mm a 300 dpi
# son 236 píxeles, así que 300 px imprime a ese tamaño con holgura. A 500 px cada dibujo
# pesa cuatro veces más (15 KB contra 4 KB) para un detalle que no se ve en una
# fotocopia. Está aquí y no en el código porque **es la misma decisión** que el tamaño
# mínimo, y partirla en dos sitios es cómo dejan de coincidir — hay un test que
# comprueba que este número sigue dando para imprimir a `min_print_mm`.
#
# Si una PT dice que los pictogramas salen borrosos, esto es una edición y volver a
# bajarlos — no una release.
image_size: 300

# Cuántas imágenes se piden a la vez. `static.arasaac.org` es un CDN y servir ficheros
# es su función, pero educado no es lo mismo que ilimitado.
fetch_concurrency: 6

# Cuántos pictogramas tiene el catálogo, para poder decirle «3.140 de 13.802» y para
# comprobar el disco antes de empezar. Aproximado a propósito: el número real sale del
# índice que se descarga, esto es sólo para hablar antes de tenerlo.
expected_total: 13802

# Cuánto ocupa el juego entero, en megas, para avisar si no cabe (FR-2208).
#
# **Medido, no estimado.** Puse 60 a partir de un solo pictograma que pesaba 4 KB, y la
# descarga real de las 13.802 son **157 MB** — o sea unos 11 KB de media, porque hay
# dibujos con mucho más detalle que una casa. Es el mismo error que llevó a `023` a
# hacer que la profesora escribiera las palabras a mano: generalizar desde una muestra.
# Ahora sale de una descarga completa del 2026-09-02, que tardó 2 min 45 s.
#
# Con margen, porque el catálogo crece.
expected_megabytes: 180


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

**El programa descarga los pictogramas si tú se lo pides, y nunca por su cuenta.**
Antes de la primera descarga te enseña la licencia y tienes que aceptarla: la
relación con quien los publica es tuya, igual que la de tu clave de IA. Ni se
descargan al abrir el programa, ni al adaptar una ficha, ni «de fondo».

**Lo que sale de tu ordenador son palabras y nada más.** Una palabra por consulta.
Nunca el nombre de un alumno, ni su código, ni su perfil, ni nada que identifique a
tu ordenador. Los nombres que Rampa conoce se quitan de la lista antes de salir.

**Y el programa no reparte pictogramas.** No vienen dentro de Rampa, no están en el
instalador y no se copian de una profesora a otra desde aquí: viajan del servidor de
quien los publica a tu disco. Si ya tienes una carpeta con un juego montado, sigue
funcionando igual y sin internet.

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
