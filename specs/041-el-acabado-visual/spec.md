# Feature Specification: El acabado visual — el sistema gobierna toda la pantalla

**Feature Branch**: `041-el-acabado-visual`

**Created**: 2026-09-11

**Status**: Implementada el 2026-09-11 (35/35 tareas); SC-3901 juzgado por Carlos el 2026-09-12

**Input**: «El producto funciona y la capa de contenido está cuidada, pero la interfaz es
visualmente pobre: parece una herramienta interna sin terminar, no un producto que
alguien elige usar. La maestra tiene que confiar en lo que firma, y una interfaz que
parece un formulario de administración resta credibilidad a un documento que acaba en un
expediente.» Dicho el 2026-09-11, con las capturas de `docs/screenshots/latest/` delante.

Esta spec sale de dos documentos que hay que leer antes que ella, porque ella no los
repite:

- [`docs/design/diagnostico-visual-2026-09-11.md`](../../docs/design/diagnostico-visual-2026-09-11.md)
  — qué falla, pantalla por pantalla, con la captura que lo muestra y la regla que lo causa.
- [`docs/design/sistema-2026-09-11.md`](../../docs/design/sistema-2026-09-11.md) — el
  sistema cerrado: qué se mantiene, qué cambia, por qué, y **cada ratio de contraste
  medido** en los cuatro modos de color.

## Por qué esto es la tercera vez, y qué la hace distinta

`010` produjo un sistema de tokens correcto y ninguna página. `013` produjo un shell
correcto (`Page`, `Section`, `Field`, `Actions`) y las reglas para usarlo. Las dos
veces la suite pasó sobre pantallas «correctly coloured, correctly labelled and ugly»
(ADR 0009). Esta vez el diagnóstico no dice que falte una capa: dice que **las dos capas
existen y no gobiernan la pantalla**, y nombra los tres sitios por donde se escapan:

1. **Cinco componentes con contenido de pantalla no pasan por el shell.** La ficha del
   alumno —la pantalla con más trabajo del producto— sale sin panel, con un selector de
   1040 px y un control de cuatro dígitos separados 250 px. Es el defecto de ADR 0009 en la
   pantalla que ADR 0009 debía arreglar.
2. **Dos tamaños para el mismo título.** Un `h2` fuera de `Section` mide 27 px y dentro
   21 px, todos en el mismo peso, y hay pantallas con los dos a la vez.
3. **Ciento cuarenta y tres estilos en línea** que ninguna prueba ve, y por donde ya se
   coló un token que no existe.

La regla de esta feature, dicha una vez: **el aspecto por defecto se diseña para gustar,
con AA como suelo; lo que hay por encima de AA vive en los modos de accesibilidad.** Es
lo que `tokens.css` v2 ya escribió («high contrast is where the plain version lives»)
y lo que Carlos confirmó el 11/09: «el look and feel normal tiene que ser atractivo; si
alguien no lo ve bien, para eso tiene las opciones de accesibilidad».

## Lo que esto no es

**No es una paleta nueva.** Ni un hex cambia. Cambia quién lleva cada color.

**No es un cambio de stack.** Ni Tailwind, ni shadcn, ni Radix, ni fuentes por CDN.
El portal de referencia se ha usado como vara de medir del acabado, no como plantilla;
lo que de él aplica y lo que no está en la tabla del §3 del diagnóstico.

**No toca la capa de contenido ni el copy.** `recipes/`, `instructions/`, la hoja y
`ui/src/i18n/` quedan como están. Dos cosas de contenido que el diagnóstico vio de paso
van al BACKLOG, no aquí.

## Clarifications

### Session 2026-09-11

Carlos delegó las seis decisiones: «creo que eres lo suficientemente inteligente para
aplicar criterio visual mejor que yo». Se resuelven con la recomendación del documento
del sistema, y aquí queda escrito que la elección es del agente y el mandato es suyo.

- Q: ¿Qué altura tienen los controles en el tamaño de texto por defecto? → A: 40 px que
  crecen con el texto (47 en «grande», 56 en «muy grande»); `010` FR-804 queda sustituido.
- Q: ¿Cómo entran los iconos? → A: conjunto cerrado vendorizado en un solo componente,
  sin dependencia de ejecución, con la licencia ISC de lucide junto a los trazos.
- Q: ¿Cómo se marca la sección activa del carril? → A: fondo suave, texto de acento y
  barra lateral; el relleno sólido de acento queda solo para el control primario.
- Q: ¿Panel centrado y a toda altura? → A: sí, ambas cosas.
- Q: ¿Qué hace el carril en la ventana más estrecha? → A: una sola fila con
  desplazamiento horizontal y la sección activa a la vista.
- Q: ¿Una spec o dos? → A: una, con las cinco historias en el orden de prioridad escrito.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ninguna pantalla se escapa del shell (Priority: P1)

Marta abre la ficha de Hugo y ve la misma aplicación que en «Mis alumnos»: un panel, un
título, sus preguntas una debajo de otra con el ancho de una pregunta, y un control 0–3
que cabe en la mano. En el primer arranque, los tres pasos del onboarding son esa misma
aplicación y no una página web centrada.

**Why this priority**: Es la fuga que produce la pantalla más fea del producto y la que
más usa. Cerrarla es también lo que hace que el resto de la feature no se vuelva a
deshacer: mientras un componente pueda salirse del shell, el sistema es opcional.

**Independent Test**: Fotografiar «Quién es», «Un alumno nuevo», los tres pasos del
onboarding y la puerta del paquete a 1366×768, y comprobar a ojo y por test que cada una
está dentro de un panel, con controles acotados por la medida y un solo tamaño de `h2`.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla de la aplicación, **When** se renderiza, **Then** su
   contenido está dentro del shell de página y ningún control de formulario excede la
   medida de campo salvo los declarados «canvas».
2. **Given** dos títulos de segundo nivel en la misma pantalla, **Then** miden lo mismo,
   estén o no dentro de una sección.
3. **Given** el código de la interfaz, **Then** no contiene estilos en línea salvo los
   que expresan un dato (el ancho de una barra de progreso, el tamaño del logotipo), y
   una prueba lo afirma con una lista de excepciones explícita.
4. **Given** el paso «conectar» del onboarding, **Then** el separador que hoy no se
   dibuja se dibuja, porque el token que lo pinta existe.

---

### User Story 2 - El sistema cerrado, aplicado (Priority: P1)

Marta mira «Mis alumnos» y lo primero que ve es la tarjeta de Hugo y el botón de añadir
otro, no el menú. Los títulos se distinguen por peso y no solo por tamaño. Las fechas y
los códigos van en la misma letra que el resto. Un aviso pesa lo que pesa un aviso. En
oscuro, en alto contraste y con la letra muy grande, todo eso sigue siendo verdad.

**Why this priority**: Es el acabado propiamente dicho, y depende de US1 solo en que
sin US1 se aplicaría a la mitad de las pantallas.

**Independent Test**: Comparar las capturas de antes y después de cada pantalla en los
ocho cruces tema × contraste × texto; correr la suite de contraste con las nueve parejas
nuevas; correr axe en los ocho cruces.

**Acceptance Scenarios**:

1. **Given** el carril, **When** una sección está activa, **Then** se marca con fondo
   suave, texto de acento y una barra lateral, y el único relleno sólido de acento en
   pantalla es el botón primario.
2. **Given** un título de página, uno de sección y una etiqueta de campo, **Then** se
   distinguen por tamaño **y** por peso, y la razón está escrita junto al token.
3. **Given** cualquier texto de la interfaz que no sea una clave, una ruta o un registro,
   **Then** va en la letra de la interfaz, no en monoespaciada.
4. **Given** una tarjeta que se abre (un alumno, un servicio) y un bloque que agrupa
   campos, **Then** se distinguen: la primera es blanca y elevada, el segundo es gris y
   plano.
5. **Given** un aviso, **Then** su cuerpo va en el tamaño pequeño, sin sombra, y su
   franja de color es decoración en el modo por defecto y color profundo en alto
   contraste.
6. **Given** un botón deshabilitado, **Then** se lee (texto y borde con colores propios,
   no transparencia) y no parece un tercer estilo de botón.
7. **Given** cada pareja de color que el sistema declara, **Then** su ratio medido supera
   el suelo en las cuatro paletas, y la pareja está en la lista que la prueba de
   contraste recorre.

---

### User Story 3 - La aplicación tiene iconos y los iconos tienen palabras (Priority: P2)

Marta ve un icono junto a «Preparar», otro junto a «Borrar todo lo suyo», una impresora
junto a «Imprimir». Ninguno sustituye a la palabra. Ninguno es un emoji ni un símbolo que
cambia de forma según el ordenador.

**Why this priority**: Es la señal de «software terminado» más barata por línea después
del carril, pero sin US1 y US2 sería decorar una interfaz rota.

**Independent Test**: Recorrer las pantallas y comprobar que cada icono tiene texto
visible al lado, que el conjunto es cerrado y está listado, y que no hay glifos de
fuente haciendo de icono.

**Acceptance Scenarios**:

1. **Given** cualquier icono en pantalla, **Then** tiene texto visible junto a él y
   está oculto para el lector de pantalla.
2. **Given** el conjunto de iconos, **Then** es una lista cerrada en un solo sitio, con
   su licencia, y añadir uno es una decisión escrita.
3. **Given** un estado «seleccionado», «correcto» o «error», **Then** su marca es un
   icono del conjunto, no un carácter de fuente.
4. **Given** la aplicación instalada sin red, **Then** todos los iconos se ven.

---

### User Story 4 - El registro ve lo que hay que ver (Priority: P2)

Quien revisa un cambio visual abre `docs/screenshots/latest/` y encuentra la pantalla de
revisión con la marca de borrador, un error, una carga, un control con foco, otro con el
puntero encima, y la misma pantalla en los ocho cruces de modo. No tiene que imaginarse
nada.

**Why this priority**: La pantalla del Principio VII no está en ninguna captura del
registro, ni los estados, ni seis de los ocho cruces. Sin esto, US2 y US3 se «verifican»
por afirmación, que es la forma en que `010` y `013` pasaron.

**Independent Test**: Correr `npm run shots` y contar lo que produce.

**Acceptance Scenarios**:

1. **Given** el registro, **Then** contiene la pantalla de revisión con la marca de
   borrador visible y la misma pantalla firmada.
2. **Given** el registro, **Then** contiene un estado de error, uno de carga, un control
   con foco visible y una tarjeta con el puntero encima.
3. **Given** el registro, **Then** contiene una pantalla de referencia en los ocho cruces
   tema × contraste × tamaño de texto.
4. **Given** la puerta de accesibilidad, **Then** recorre los ocho cruces y no cuatro.

---

### User Story 5 - El panel y la ventana (Priority: P3)

Marta acopla Rampa junto al registro de notas y el carril cabe en una fila. Amplía la
ventana en el monitor de la sala de profesores y la aplicación no se queda pegada a la
izquierda. Abre una sección corta y el panel sigue siendo el panel, no una tarjeta
flotando.

**Why this priority**: Es composición pura, sin dependencias, y la que menos se nota si
se hace bien.

**Independent Test**: Fotografiar a 560, 880, 1024, 1366 y 1920 y mirar.

**Acceptance Scenarios**:

1. **Given** una ventana más ancha que el panel, **Then** el panel está centrado.
2. **Given** una pantalla con poco contenido, **Then** el panel llega al pie del área de
   contenido.
3. **Given** la ventana a su ancho mínimo, **Then** el carril ocupa una fila y la sección
   activa está a la vista.

---

### Edge Cases

- **La pantalla de verificación** (`008`), dos columnas por diseño: sigue siendo la
  variante `wide` del shell y no un caso aparte.
- **El paso «traer el material»** con su botón a todo el ancho: el botón deja de ser
  «block»; si la pantalla necesita un área de arrastre grande, eso es una zona de
  soltar, no un botón.
- **Alto contraste con Atkinson**, que solo trae 400 y 700: el peso 600 se resuelve a
  700 y el modo pierde el matiz de peso. Es aceptable y se documenta: ese modo quiere
  menos matices.
- **`xlarge` a 560 px**: cinco etiquetas de carril no caben en una fila. La franja se
  desplaza horizontalmente en vez de crecer, y el ítem activo se lleva a la vista.
- **Un icono sin palabra**: no existe en esta feature. Si una pantalla futura lo
  necesita, pide su propio caso.
- **La marca de borrador**: el contrato del shell dice que sigue siendo lo más ruidoso
  de la pantalla de revisión. Esta feature le quita ruido a todo lo demás, no a ella.

## Requirements *(mandatory)*

### Functional Requirements

#### El shell gobierna

- **FR-3901**: Todo componente que renderice contenido de pantalla MUST componerse con
  `Page`, `Section`, `Field` y `Actions`. Los cinco que hoy no lo hacen (el editor de
  perfil, el editor de ejes, los dos pasos del onboarding y la puerta del paquete) MUST
  pasar a hacerlo, y el onboarding MUST tener el mismo panel que el resto.
- **FR-3902**: Un título de segundo nivel MUST tener un solo tamaño y un solo peso en
  toda la aplicación, dentro o fuera de una sección.
- **FR-3903**: La interfaz MUST NOT contener estilos en línea salvo los que expresen un
  valor de datos, y una prueba MUST mantener la lista de excepciones. Lo que hoy se
  resuelve en línea MUST resolverse con clases del sistema; si falta una clase, es una
  clase nueva del shell.
- **FR-3904**: Ningún token referenciado desde la interfaz MAY no existir. La prueba de
  clases MUST cubrir también las referencias a variables.

#### El sistema cerrado

- **FR-3905**: La jerarquía tipográfica MUST usar el peso como segundo eje: título de
  página en negrita, títulos de sección y de tercer nivel en seminegrita, etiquetas en
  seminegrita, cuerpo en regular. La escala de tamaños y las familias no cambian.
- **FR-3906**: La monoespaciada MUST reservarse para lo que es máquina: código, claves
  pegadas, rutas, licencia y registro. Fechas, códigos de alumno, contadores de paso y
  marcas de estado MUST ir en la letra de la interfaz con cifras tabulares.
- **FR-3907**: La altura de los controles MUST crecer con el tamaño de texto elegido, y
  MUST NOT bajar de 24×24 px en ningún cruce. En el tamaño por defecto MUST medir 40 px, y
  47 y 56 px en «grande» y «muy grande». Sustituye a `010` FR-804.
- **FR-3908**: El ítem activo del carril MUST distinguirse por fondo suave, texto de
  acento y barra lateral, sin relleno sólido; el único relleno sólido de acento en una
  pantalla MUST ser el control primario (`013` FR-1105 sigue en pie).
- **FR-3909**: Las tarjetas MUST ser de dos clases distinguibles: objeto (blanca, borde,
  elevada, con estado de puntero) y agrupadora (gris, borde, plana).
- **FR-3910**: Los avisos MUST ir sin sombra, con cuerpo en tamaño pequeño; su franja de
  color MUST ser color brillante en el modo por defecto y color profundo en alto
  contraste, que MUST redefinir los tokens brillantes.
- **FR-3911**: El botón secundario MUST ir sin sombra; el deshabilitado MUST tener
  colores propios de fondo, texto y borde en vez de transparencia.
- **FR-3912**: La barra de progreso MUST ser un relleno sólido del color de trabajo en
  todas las paletas.
- **FR-3913**: Todo par de color que el sistema use para texto MUST superar 4.5:1, y
  todo par para un objeto gráfico o borde de control MUST superar 3:1, en las cuatro
  paletas, medido y no estimado; las nueve parejas nuevas MUST entrar en la lista que la
  prueba de contraste recorre.
- **FR-3914**: Cada cambio de color, peso o medida MUST llevar su razón escrita junto al
  token o a la regla, en el estilo que ya usan esos ficheros.
- **FR-3915**: Un token definido en una paleta MUST estar definido en las cuatro. El tema
  claro explícito y el claro del sistema MUST producir el mismo blanco de panel.

#### Iconografía

- **FR-3916**: La aplicación MUST tener un conjunto cerrado de iconos, listado en un
  solo sitio con su licencia, empaquetado con la aplicación y sin dependencia de
  ejecución: los trazos se vendorizan en un componente propio con la licencia ISC al lado.
- **FR-3917**: Todo icono MUST ir acompañado de texto visible y oculto al lector de
  pantalla. MUST NOT haber botones solo-icono.
- **FR-3918**: MUST NOT usarse caracteres de fuente ni emojis como iconos de estado.

#### El registro y las puertas

- **FR-3919**: `npm run shots` MUST fotografiar la pantalla de revisión con la marca de
  borrador y firmada, un estado de error, uno de carga, un control con foco y uno con el
  puntero encima, y una pantalla de referencia en los ocho cruces tema × contraste ×
  texto.
- **FR-3920**: La puerta de accesibilidad MUST recorrer los ocho cruces.
- **FR-3921**: Ningún test existente MAY debilitarse para que un cambio pase. Si un test
  estorba, su cabecera dice por qué existe y esa razón decide.

#### El panel y la ventana

- **FR-3922**: El panel MUST centrarse en ventanas más anchas que él y MUST llegar al pie
  del área de contenido en pantallas cortas.
- **FR-3923**: En el ancho mínimo de la ventana el carril MUST ocupar una sola fila con la
  sección activa a la vista, desplazándose horizontalmente dentro de sí mismo si no cabe;
  `013` FR-1115 sigue en pie: nada desplaza la página de lado.

### Decisiones que eran de Carlos *(resueltas en Clarifications, 2026-09-11)*

Las seis (altura de control, forma de traer los iconos, marca del carril activo, panel
centrado y a toda altura, carril en ventana estrecha, una spec) se tomaron con la
recomendación del documento del sistema por delegación expresa. Ninguna queda abierta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-3901**: Las capturas de después, puestas junto a las de `docs/screenshots/latest/`
  de antes, muestran una diferencia que una persona identifica sin explicación. Juzgado
  por Carlos, una vez.
- **SC-3902**: Cero componentes con contenido de pantalla fuera del shell; cero estilos en
  línea fuera de la lista de excepciones; cero referencias a tokens inexistentes.
  Afirmado por test.
- **SC-3903**: Cero regresiones de contraste en las cuatro paletas, con nueve parejas más
  que hoy. Afirmado por test.
- **SC-3904**: La puerta de accesibilidad pasa en los ocho cruces en todas las pantallas
  que recorre.
- **SC-3905**: Todo estado interactivo que el sistema declara (reposo, puntero, foco,
  activo, deshabilitado, cargando, vacío, error, seleccionado) tiene representación
  visible y está fotografiado en el registro.
- **SC-3906**: `npm test` y `npm run test:e2e` en verde, con los tests existentes
  intactos en lo que afirman.
- **SC-3907**: Ningún control interactivo mide menos de 24×24 px en ningún cruce; ningún
  texto de la interfaz cambia; ningún fichero de `recipes/`, `instructions/` ni del
  renderizador de la hoja cambia.

## Assumptions

- Los tokens de color son correctos y no se retocan; si la composición expone uno mal,
  es un hallazgo y un cambio pequeño.
- El cuerpo a 17 px se mantiene. Cambiarlo no está en esta feature.
- Las seis decisiones de producto se tomaron con el criterio del agente por delegación
  expresa de Carlos (Clarifications). Si alguna se revierte, cambia un requisito y no una
  historia.
- El portal de referencia no se copia en stack ni en fuentes: es una vara de medir del
  acabado.
- Las lecciones del diagnóstico que son de contenido (las recetas con acentos graves en
  el informe del ensayo; el salto de línea duro en el aviso de la hoja de ejemplo) van al
  BACKLOG y no aquí.
