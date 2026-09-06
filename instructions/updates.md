---
id: updates
label: A dónde se conecta Rampa para mirar si hay algo nuevo
last_checked: "2026-09-06"

# Esto no es juicio pedagógico: es una declaración. Está en el corpus por la misma
# razón que `instructions/pictograms.md` declara de dónde salen los dibujos — porque
# «a dónde se conecta esto» tiene que poder leerlo quien lo audita sin abrir el
# código, y porque una pantalla que lo enseñe y una lista que lo permita tienen que
# ser la misma lista o acaban siendo dos.
reviewed_by_teacher: false

# Los ÚNICOS destinos a los que Rampa se conecta para esto, y sólo cuando ella lo
# pide o cuando ha dicho expresamente que puede mirar al abrir (034 FR-3204).
#
# Nada de esto sale sin que ella lo pida: no hay comprobación en segundo plano, no hay
# telemetría, y no se manda nada más que la petición — ni identificador de máquina, ni
# de instalación, ni cuántos alumnos tienes.
destinations:
  - id: release-check
    what: "Si hay una versión nueva de Rampa"
    host: api.github.com
    url: "https://api.github.com/repos/cnebrera/curriculum-accommodation/releases/latest"
    when: "Cuando pulsas «Comprobar si hay una versión nueva», o al abrir si lo has activado"
    sends: "Nada más que la petición"

  - id: releases-page
    what: "La página de descargas, para abrirla en tu navegador"
    host: github.com
    url: "https://github.com/cnebrera/curriculum-accommodation/releases"
    when: "Cuando pulsas el enlace del aviso"
    sends: "Nada: lo abre tu navegador, no Rampa"

  - id: corpus-manifest
    what: "Si hay una corrección del criterio pedagógico, y qué dice que trae"
    host: api.github.com
    url: "https://api.github.com/repos/cnebrera/curriculum-accommodation/releases"
    when: "Cuando pulsas «Buscar correcciones del criterio», o al abrir si lo has activado"
    sends: "Nada más que la petición"

  - id: corpus-files
    what: "Los ficheros de esa corrección, después de que la aceptes"
    host: raw.githubusercontent.com
    url: "https://raw.githubusercontent.com/cnebrera/curriculum-accommodation/"
    when: "Sólo después de que aceptes una corrección concreta"
    sends: "Nada más que la petición"
---

# A dónde se conecta Rampa

## Para qué existe esta lista

Para que puedas contestar «¿esto manda datos a algún sitio?» sin fiarte de mi palabra.
Los cuatro destinos de arriba son **todos** los que hay para las actualizaciones, y una
petición a cualquier otro sitio es un fallo, no una función.

Lo que Rampa hace con tu servicio de IA es otra cosa y está declarado en su propio
sitio: `instructions/providers/` dice a qué proveedor se manda qué, y la pantalla de
«Mi servicio de IA» te lo enseña antes de mandar nada.

## Lo que nunca pasa

- **No se descarga ni se instala ninguna aplicación.** El aviso de versión nueva es
  una frase y un enlace; la descarga la haces tú, en tu navegador, mirando lo que
  descargas. No hay actualizador automático y no lo va a haber: una herramienta que se
  actualiza sola en el ordenador de un colegio es una herramienta que cambia sin que
  nadie lo haya decidido.
- **No se manda nada tuyo.** Ni el nombre de un alumno, ni cuántos tienes, ni qué has
  adaptado, ni un identificador de tu instalación. Una petición HTTP lleva tu dirección
  IP porque cualquier petición la lleva; eso es todo lo que GitHub ve, y lo ve de forma
  anónima.
- **No se comprueba nada en segundo plano** salvo que tú lo actives, y activado es como
  mucho una vez por semana, al abrir, nunca en mitad de un trabajo, y en silencio si
  falla.

## Y la corrección del criterio se lee antes de aplicarse

Una corrección del corpus —una receta arreglada, una regla más clara, la tilde de
«exámenes»— llega firmada por el proyecto y **no se aplica sola**: se te enseña entera,
la aceptas tú, y sólo entonces gobierna. Lo que ya está firmado no se toca nunca.
