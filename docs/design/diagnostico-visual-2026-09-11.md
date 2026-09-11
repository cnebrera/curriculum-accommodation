# Diagnóstico visual de la interfaz — 2026-09-11

> **Qué es.** Fase 1 del trabajo de acabado visual: análisis sin código. Sale de mirar
> las 25 capturas de `docs/screenshots/latest/` y 25 más tomadas para este diagnóstico
> (`docs/screenshots/diagnostico-2026-09-11/`: onboarding paso 2, ensayo, puerta de
> Preparar, estados de foco y hover, «Cómo se ve» abierto, texto «muy grande» a 1366 y
> 560, oscuro + alto contraste, y las secciones de Configuración que el registro no
> fotografía). La vara de medir es `Global AI Framework/repos/portal`; de él se ha
> caracterizado el acabado, no el stack.
>
> Cada punto dice qué se ve, dónde, por qué pasa (fichero y regla) y si la solución del
> portal aplica aquí. Lo que no está verificado se dice.

## 0 · El diagnóstico en una frase, y por qué es más profundo de lo descrito

El sistema de tokens está bien razonado y el shell (`Page`/`Section`/`Field`/`Actions`)
está bien diseñado; **lo que se ve pobre es que ninguno de los dos gobierna la pantalla
entera**. Hay tres fugas estructurales, y arreglar colores o sombras sin cerrarlas
produciría la misma interfaz con otro maquillaje:

1. **Pantallas que se salen del shell.** Cinco componentes con contenido de pantalla no
   usan `Page`: `learners/ProfileEditor.tsx` y `learners/AxisEditor.tsx` (la ficha del
   alumno, «Quién es», la pantalla con más trabajo del producto), `onboarding/VaultStep.tsx`,
   `onboarding/ConnectStep.tsx` y `coordination/PacketDoor.tsx`. Se ve en
   `6-alumno-quien-es.png`: sin panel blanco, contenido de 1040 px de ancho, un `select`
   de curso de 1040 px y un control 0–3 con los dígitos a 250 px unos de otros. Es
   exactamente el defecto que ADR 0009 describe («form controls 1000 px wide») en la
   pantalla que ADR 0009 debía arreglar.

2. **Dos sistemas de título compitiendo.** `tokens.css` define `h2 { font-size: var(--text-xl) }`
   (27 px) y `composition.css` define `.section > h2 { font-size: var(--text-lg) }` (21 px).
   Cualquier pantalla que escriba un `<h2>` fuera de `Section` obtiene un título mayor que
   el de las secciones vecinas. Ocurre en `4-servicio.png` («Conectar otro» a 27 px,
   «Enseñárselo a alguien» a 21 px, en la misma columna), en `5-acerca.png` (los dos h2 a
   27 px, a un paso del h1 de 34 px, todo en el mismo peso 700) y en `6-alumno-quien-es.png`
   («Qué le cuesta» a 27 px pegado a un label de 15 px sin aire).

3. **143 `style={{…}}` en 25 ficheros.** Cada uno es una decisión de composición tomada
   fuera del shell y fuera del alcance de `ui/test/styles.test.tsx`, que solo cruza
   `className`. Ya ha colado un defecto: `App.tsx:196` usa `var(--rule)`, un token que
   **no existe** en ningún CSS, así que el separador sobre «¿Prefieres verlo antes de
   decidir?» no se dibuja (`x-onb-2-conectar.png`). El shell se rodea por inline style
   porque le faltan piezas: un `row` con espacio entre extremos, una cabecera de tarjeta,
   un margen «alineado al inicio».

Lo demás —iconografía, monoespaciada, peso del carril, densidad— es real y va abajo, pero
es capa de acabado. Si la Fase 3 no empieza por estas tres, la Fase 4 pinta encima.

## 1 · Transversal: lo que falla en todas las pantallas

### 1.1 Tipografía y jerarquía

- **Un solo peso para toda la jerarquía.** h1 (34 px), h2 raw (27 px), h2 de sección
  (21 px), `.svc-name` (21,6 px), `.door strong` (21 px) y los labels de campo (15 px)
  son todos `700`. La jerarquía se lee solo por tamaño; entre 21 y 27 px la diferencia
  óptica es pequeña y el resultado es «tres títulos del mismo peso» en
  `6c-alumno-curricular.png`. El portal separa peso y tamaño: h1 `bold`, sección
  `semibold`, cabecera de tarjeta `text-sm semibold`. **Aplica.** El sistema de Rampa ya
  tiene `600` en botones y `.field > label`; falta asignarlo a los títulos de sección.
- **Monoespaciada como voz de la interfaz.** `--font-mono` se usa para siete cosas que no
  son código: `.meta` («comprobada el 11/09/2026», «Paso 1 de 3»), `.badge` (los códigos
  «Y95», «✓ En uso»), `.eyebrow`, `.tag`, `.rail-who span`, los números de `.steps` y
  `.field .msg .ic`. En `4-servicio.png` una tarjeta de producto lleva su fecha en
  Courier. Es la señal más fuerte de «herramienta interna» de toda la interfaz y no la
  produce ningún color. El portal usa mono solo para código. **Aplica**: mono para la
  clave pegada (`.input-key`), rutas y el log; el resto pasa a sans con
  `font-variant-numeric: tabular-nums` donde haya cifras.
- **El lede parte la frase donde no toca.** `--measure-prose: 62ch` sobre un lede de 17 px
  deja «hecho.» y «nada.» solos en segunda línea (`6c`, `x-alumno-borrar`,
  `x-alumno-traspaso`). No es un bug de medida: es que el lede está a 17 px con 62ch y
  el párrafo de sección a 15 px con la misma medida, así que el lede corta antes. Se
  arregla con `text-wrap: pretty` (Chromium 117+, Electron 33 lo tiene) y una medida
  propia para el lede.
- **Tamaño base 17 px y `leading-body: 1.62`.** Es una decisión de accesibilidad
  correcta para la maestra y el portátil de 1366 (`tokens.css`, «school laptop, teacher in
  a hurry»). **No aplica** copiar los 14 px / 20 px del portal; la densidad se gana con
  agrupación y jerarquía, no encogiendo el cuerpo.

### 1.2 Densidad y ritmo vertical

- **Todo el contenido está a la misma distancia de todo.** `--rhythm-section: 32 px` y
  `--rhythm-field: 16 px` existen, pero dentro de las pantallas el ritmo real viene de
  `stack`, `gap2…gap5` y `card stack` elegidos a mano (`ProfileEditor.tsx:231-236`,
  `RecordScreen.tsx`). Resultado en `6-alumno-quien-es.png`: «Sale sola del curso…» (ayuda
  del campo anterior) y «Sigue la clase en el idioma del aula» (título del siguiente)
  están a 8 px; el select de curso y su label a 12 px; nada dice dónde acaba una pregunta.
- **Los controles marcan el ritmo, no el texto.** Botones, inputs y selects son de 44 px;
  con un cuerpo de 17 px la página es una pila de barras de 44 px separadas por 16 px.
  El portal usa `h-9` (36 px), que **no aplica** aquí por SC 2.5.8 y por decisión del
  proyecto (FR-804). Lo que sí aplica: que un botón secundario dentro de una tarjeta o
  una fila use `.btn-sm` (34 px, ya existe) y que los grupos de acciones tengan un solo
  control de 44 px.
- **El panel abraza su contenido.** `.page` mide lo que mide su contenido, así que
  `6b-alumno-preparado.png` (vacío) y `x-alumno-borrar.png` son una tarjeta de 350–430 px
  flotando sobre 340 px de suelo gris. Se lee como una tarjeta web, no como el panel de
  una aplicación de escritorio. Un mínimo de altura o un panel que llegue al pie de
  `.main` (como el portal, cuyo `main` tiene scroll propio) resuelve las dos cosas.

### 1.3 Uso del ancho

- **La medida está donde no se lee y no está donde se lee.** El panel es `max-width: 60rem`
  (1020 px). A 1366 mide 960 px y el texto se corta a 62ch (≈600 px), así que **todas**
  las pantallas de prosa dejan una tercera columna vacía dentro del panel
  (`2-mis-alumnos.png`, `6c`, `x-alumno-borrar`). En cambio inputs, selects y tarjetas
  fuera de `Field` toman los 900 px (`x-alumno-traspaso.png`: input de curso «2026-2027»
  de 860 px; `x-alumno-nuevo.png`: select de 860 px).
- **A 1920 el panel se pega a la izquierda** y quedan 680 px de suelo a la derecha
  (`w-1920.png`). `composition.css:872-887` centra explícitamente **solo** el ensayo y
  deja escrito que centrar todo «es un cambio de aspecto de la aplicación entera». Ese
  cambio es este trabajo. El portal centra con `mx-auto max-w-7xl`. **Aplica.**
- **A 560 y 880 el carril se come la ventana.** El carril del alumno colapsa a franja y
  envuelve en 4 filas (`alumno-w-560.png`: 220 px de cromo, el 28 % de una ventana de 800;
  `alumno-w-880.png`: 3 filas). La suite de layout lo aprueba porque nada desborda. El
  portal colapsa a un menú lateral deslizante con backdrop; para Electron con
  `minWidth: 560` una franja de una sola fila con desbordamiento horizontal desplazable,
  o un botón de menú, son las dos salidas. **Aplica en principio; decidir en clarify.**

### 1.4 Profundidad y superficies

- **El panel sobre el suelo funciona** (`--ground` #e8e9ec, panel `--paper` blanco, borde
  `--line`, `--shadow-md`): son las tres señales que el portal también combina (tono,
  borde, sombra). Es lo mejor que tiene la interfaz hoy y hay que conservarlo.
- **Las tarjetas contradicen al panel.** `.card` es `--surface` (#f5f5f7, **más oscuro** que
  el panel) con borde **y** `--shadow-sm`. Un tono hundido con una sombra que lo eleva
  es un objeto que no está ni dentro ni fuera. En `2-mis-alumnos.png` la tarjeta de Lucía,
  el único objeto clicable importante de la pantalla, se lee como un `fieldset`
  deshabilitado; en `4-servicio.png` la tarjeta del servicio conectado parece un aviso.
  El portal usa tarjeta blanca sobre página tintada, borde y `shadow-card`; aquí el panel
  ya es blanco, así que la tarjeta tiene que elegir: tono más claro que el panel no hay,
  luego **borde sin sombra** (plana, dentro) o **blanca con sombra sobre `--surface`** si
  el panel pasa a ser gris. Es la decisión de superficies de la Fase 2.
- **Los callouts pesan más que el contenido.** `.callout` tiene fondo tintado, borde de
  color, borde izquierdo de 5 px y sombra; y su cuerpo va en un `<div>` (`Callout.tsx:57`),
  así que la regla `.callout p { font-size: var(--text-sm) }` no le alcanza y el texto
  sale a 17 px. En `3-configuracion.png` el callout magenta mide 460 px, ocupa el 60 %
  de la ventana y contiene el botón primario. En `x-alumno-traspaso.png` el callout está
  entre el lede y el primer campo y es el elemento más grande de la pantalla. El portal
  no tiene callouts así: sus avisos son `border + soft bg + text-sm`, sin sombra y sin
  franja. **Aplica**: quitar la sombra, bajar el cuerpo a `text-sm`, y que la franja de
  5 px sea el único énfasis.

### 1.5 Peso visual del control primario y del carril

- **El elemento más ruidoso de casi todas las pantallas es el menú, no la acción.**
  `.rail button[aria-current]` es un bloque sólido `--accent` con texto blanco 700 y
  sombra: el mismo tratamiento que `.btn-primary`. En `2-mis-alumnos.png` hay dos slabs
  azules idénticos y solo uno es una acción. En oscuro (`m-oscuro.png`) el carril activo
  y el primario son ambos cian #4bbcee, el color más saturado de la paleta, en 235×44 px.
  El portal marca el activo con `bg-primary-soft` + texto `primary` + barra de 4 px a la
  izquierda. **Aplica y es la corrección de más impacto por línea de CSS.**
- **El primario compite con el secundario en alto contraste.** En `m-alto-contraste.png`
  las sombras desaparecen (correcto) y el secundario queda como borde negro de 1 px sobre
  blanco frente a un relleno navy: bien. Pero a tamaño normal (`6c`) el secundario lleva
  `--shadow-sm` y borde `--line-strong`, un peso muy cercano al primario cuando están
  juntos. El portal da al `outline` solo borde y `shadow-sm` muy tenue. **Aplica**: quitar
  la sombra del `.btn` base.
- **Los ghost son texto azul sin afordancia.** «Dejarlo», «Mejor no», «Ver todos y
  comparar» (`x-preparar-2b`, `x-alumno-borrar`, `x-onb-2c`) son texto sin borde ni fondo
  ni subrayado; junto a un primario leen como un enlace de pie. Aceptable como tercer
  nivel; no como el único secundario de la pantalla (en «Borrar» lo es).
- **Cinco botones que parecen etiquetas.** «Conectar otro» en `4-servicio.png` son cinco
  `.btn` en fila con el peso de un chip; son la acción principal de la sección.
- **Botón de 860 px.** `x-preparar-3-traer.png`: «Elegir la ficha» es `.btn-block`
  dentro de una `Field` `canvas`. Un botón del ancho de la página no es más fácil de
  pulsar; es un banner.

### 1.6 Iconografía

- **No hay.** La aplicación entera usa el logotipo y seis glifos Unicode: `✓ ▲ ● ◐ ✕ ←`
  (`Badge.tsx`, `Field.tsx`, `DraftMark.tsx`, «← Mis alumnos», «Aa»). Ningún botón, ningún
  ítem del carril, ningún estado vacío, ningún callout lleva icono. Los glifos Unicode
  además cambian de dibujo según la fuente del sistema (el `✓` de `.door-on::after` es el
  de SF Pro en macOS y el de Segoe UI Symbol en Windows).
- El portal usa lucide a 16 px, `stroke 2`, `aria-hidden`, siempre con texto, en botones,
  navegación, títulos de sección y badges. **Aplica**, con dos condiciones del proyecto:
  empaquetado (nunca CDN) y con texto siempre (FR-812 ya lo exige para el color; para
  el icono es la misma regla). Es una dependencia nueva y va justificada en la spec:
  `lucide-react` es MIT, se tree-shakea a ~0,5 KB por icono; la alternativa sin
  dependencia es vendorizar los SVG que se usen como componentes.

### 1.7 Estados

Verificados con capturas propias:

| Estado | Visto en | Veredicto |
|---|---|---|
| Foco visible | `x-estado-focus-tab3.png` | Anillo 3 px `--accent` + halo: **bien**, claramente visible. |
| Hover en tarjeta | `x-estado-hover-card.png` | Borde `--accent-line` + `translateY(-2px)` + `--shadow-lg`: casi imperceptible. El borde pasa de #d9d9de a #a9cfef, la sombra apenas se ve sobre blanco. |
| Hover en primario | `x-estado-hover-primario.png` | Oscurece a `--blue-700` y sube 1 px: **bien**. |
| Deshabilitado | `x-conf-normativa.png` («Es lo que tienes») | `opacity: .45`: se lee, pero un botón gris al 45 % junto a uno negro parece un tercer estilo, no un estado. El portal usa `opacity-50` y funciona porque sus botones no llevan sombra: aquí la sombra también se atenúa y queda un fantasma. |
| Cargando | no capturado | `.btn[aria-busy]` existe en CSS; no se pudo provocar sin proveedor real. **Sin verificar.** |
| Vacío | `6b-alumno-preparado.png` | Borde discontinuo + logo a `--line-strong` + título 21 px 700 + texto 15 px. Correcto y designado, pero el borde discontinuo lee como «placeholder de maqueta». El portal también usa dashed; ambos se beneficiarían de un CTA dentro (aquí `EmptyState` acepta `action`, y en esta pantalla nadie lo pasa). |
| Error | no capturado | `.field[data-state="error"]` y `.callout-danger` existen; no hay captura de error real. **Sin verificar.** |
| Seleccionado (door/pick/levels) | `x-preparar-2b-tipo-elegido.png`, `x-alumno-rutinas.png` | Borde `--accent` 2 px + fondo `--accent-soft` + `✓`: **bien**. |
| Activo en carril | todas | Ver 1.5. |

### 1.8 Coherencia entre pantallas

- **Dos idiomas de composición.** Las pantallas que pasan por `Page` (`Mis alumnos`,
  `Preparar`, `Su día`, `Configuración/*`) tienen panel, título, lede y secciones. Las
  que no (`Quién es`, `Un alumno nuevo`, onboarding) tienen otro fondo, otra medida y otro
  ritmo. Una maestra que entra en la ficha del alumno desde «Mis alumnos» cambia de
  aplicación.
- **El logotipo aparece tres veces con tres tamaños y dos posiciones**: 19 px en el carril,
  ~26 px centrado en onboarding, ~30 px dentro del panel en «Acerca de».
- **Dos «volver».** En `x-alumno-nuevo.png` hay «← Mis alumnos» en el carril **y** un
  botón «← Mis alumnos» dentro del panel, 90 px más abajo del lede.
- **Título repetido.** `x-alumno-borrar.png`: h1 «Borrar todo lo de Lucía» y, 130 px más
  abajo, h2 «Borrar todo lo de Lucía».

## 2 · Pantalla por pantalla

### `1-onboarding.png` · `x-onb-2-conectar.png` · `x-onb-2c-recomendado.png`

- Fuera del shell: `<main>` propio, sin panel; a los 685 px el fondo cambia de blanco a
  `--n-25` porque el `<main>` acaba y se ve el `body` (`1-onboarding.png`, banda inferior).
- Cuatro niveles de texto en 140 px: h1 34 px, lede 15 px, h2 27 px, lede de paso 17 px,
  ayuda 15 px. El lede del paso («Aquí se quedan tus alumnos…») va **más grande** que el
  lede de la pantalla.
- Tres botones en dos filas, dos de ellos del mismo peso (`Elegir otra carpeta`, `Traer el
  criterio más nuevo`); el tercero es una acción de otra categoría y no debería estar en
  la misma fila.
- La caja de la ruta (`/Users/…/Rampa`) es `.card` gris con mono: es el único sitio donde
  el mono está bien.
- Paso 2: el `fieldset` con marco y `legend` sobre el borde (`.fieldset`) es el que
  `composition.css` ya declara «wrong here: the legend sits on the border and reads as
  broken» — y sigue en uso en `ConnectStep.tsx:194`.
- El separador sobre «¿Prefieres verlo antes…?» no existe (`var(--rule)`, ver §0).
- Paso 2c: la tarjeta recomendada es blanca con sombra (`card-plain`) — la tarjeta que
  mejor se ve de toda la aplicación, y es la excepción, no la regla.
- Progreso: barras ámbar con degradado; correcto, aunque el «Paso 2 de 3» en mono lee
  como consola.

### `2-mis-alumnos.png` (y `m-oscuro`, `m-alto-contraste`, `w-*`)

- Ver §1.4 (tarjeta gris) y §1.5 (dos slabs azules). La tarjeta del alumno no tiene
  chevron ni ninguna señal de que se pulsa; el `hover` es imperceptible.
- El primario «Añadir un alumno» está a 40 px bajo la tarjeta, solo, sin relación con
  nada; después una sección de otro tema («Un paquete…») con h2 de 21 px y un secundario.
  Dos acciones de peso distinto en la misma columna sin agrupar.
- El carril tiene dos entradas y 248 px; un 18 % de la ventana para dos palabras.
- Oscuro: paleta bien resuelta salvo el cian del carril (§1.5). Alto contraste: correcto.
- 560: la franja de carril cabe en dos filas y el panel se ajusta; **es la mejor de las
  vistas estrechas** porque solo hay dos entradas.

### `3-configuracion.png` (Pictogramas)

- El callout magenta domina (460 px, 60 % de la ventana) y aloja el primario. El cuerpo
  del callout está a 17 px por el `<div>` (§1.4). El enlace de la licencia en mono.
- El carril de Configuración: «← Mis alumnos» (15 px, `--accent-ink`), «Configuración»
  (17 px 700) y seis entradas: correcto en estructura, sin icono, activo como slab.

### `4-servicio.png` · `x-conf-servicio-full.png`

- Tres tamaños de h2 en la misma columna: «Claude (Anthropic)» 21 px (h3), «Conectar
  otro» 27 px, «Enseñárselo a alguien» 21 px. «Conectar otro» parece un título de página.
- Tarjeta gris con «✓ En uso» verde en mono, fecha en mono, definición en dos columnas
  con `dt` en 15 px gris: cuatro estilos de texto en 120 px.
- «Cambiar la clave» (`.btn`) y «Quitar» (`.btn-danger`): dos alturas distintas visibles
  (44 vs. 34) porque uno es `.btn-sm`; no hay razón para que una acción destructiva sea
  más pequeña.

### `5-acerca.png`

- Logotipo dentro del panel a un tamaño distinto del carril. h1 34 px, dos h2 a 27 px:
  el h2 casi tan grande como el h1 y en el mismo peso.
- Lista de viñetas a 17 px con `•` nativo; correcta, pero sin ritmo con los h2.
- Callout info azul, mismo problema de peso que §1.4.

### `6-alumno-quien-es.png` · `x-alumno-nuevo.png` · `x-quien-es-xlarge-*.png`

La pantalla con más defectos, y la que más usa la maestra.

- Sin `Page`: sin panel, sin título de pantalla (el carril dice «Quién es», el contenido
  empieza con una tarjeta gris de aviso), sin lede, contenido a 1040 px.
- La primera cosa que se ve es una `.card` gris con un párrafo de 17 px, un badge mono
  «Y95» y el campo del nombre de 990 px de ancho.
- «Qué le cuesta» (h2 raw, 27 px) a 8 px del borde de la tarjeta y a 8 px del label
  «¿En qué curso está?» (label 17 px 700, porque `.field > label` de `components.css`
  y de `composition.css` no coinciden: uno 700, otro 600).
- Select de curso de 1040 × 46 px. Input de edad de 112 px con un texto de ayuda de 900 px
  a su derecha, en una sola línea, que en `xlarge` (`x-quien-es-xlarge-1366.png`) salta a
  dos líneas debajo y deja el input huérfano.
- El control 0–3 de la lengua vehicular ocupa 1000 px: cuatro dígitos separados por
  250 px en un `segmented` que fue diseñado para 158 px (`components.css:344-375`).
- Las tarjetas de ejes (`.axis-grid`) están bien resueltas en sí mismas (`minmax(190px)`,
  título 700, «sin observar» gris), pero pegadas al texto de ayuda de arriba sin ritmo.
- `x-alumno-nuevo.png`: sí pasa por `Page` (h1 «Un alumno nuevo», lede), pero mete dentro
  el mismo `ProfileEditor` sin `Field`, así que a partir del lede vuelve el otro idioma:
  select de 860 px, «Qué le cuesta» raw.
- `x-quien-es-xlarge-560.png`: la franja de carril ocupa 270 px (34 % de la ventana) y la
  tarjeta gris vuelve a ir sin panel. Nada desborda; nada se lee como una aplicación.
- Oscuro + alto contraste (`x-quien-es-oscuro-alto-contraste.png`): los tokens aguantan
  el cruce (bordes visibles, texto blanco puro, carril activo en `--blue-200`). Los ocho
  cruces no se han fotografiado todos; solo cuatro combinaciones (claro, oscuro, alto
  contraste claro, oscuro+alto contraste) y dos tamaños de texto. **Pendiente.**

### `6b-alumno-preparado.png`

- Correcto en estructura. El estado vacío no ofrece acción («Preparar algo» está a un
  clic en el carril y `EmptyState` acepta `action`); el panel de 430 px flota (§1.2).

### `6c-alumno-curricular.png` (y `alumno-w-*`)

- La mejor pantalla de la aplicación: `Page`, dos `Section`, un primario, un secundario,
  prosa con medida. Defectos que quedan: lede partido en «hecho.», tres títulos 700
  (34/21/21), cuatro párrafos de 15 px gris seguidos sin distinguir ayuda de contenido, y
  el secundario «Borrador de su adaptación» con sombra al lado del primario.
- 1024 (`alumno-w-1024.png`): panel de 680 px, bien. 880: franja de 3 filas. 560: 4 filas.

### `x-alumno-preparar.png` · `x-preparar-2b-tipo-elegido.png` · `x-preparar-3-traer.png`

- La puerta (`.door`) es de lo mejor resuelto: dos tarjetas blancas, borde 2 px, título
  21 px, seleccionada con tinte y `✓`. Falta icono y el `✓` es glifo de fuente.
- Paso 2: indicador de pasos «1. ¿Qué es? 2. Tráelo…» como texto 15 px inline; el paso
  activo en 700. Funciona; no se ve como un componente. En el paso 3 el mismo indicador
  **sale del panel** y va sobre el suelo gris, con «Dejarlo por ahora» a la derecha:
  dos posiciones para el mismo elemento en dos pasos consecutivos.
- Paso 3: botón primario de 860 px (§1.5).

### `x-alumno-rutinas.png` · `x-alumno-traspaso.png` · `x-alumno-borrar.png`

- Rutinas: buena. Callout info antes de la pregunta (debería ir después o al lado del
  campo que afecta). Input «Cómo se llama» a 400 px porque sí está en `Field`: es el
  contraste con «Traspaso», donde el input de curso va a 860 px porque no lo está.
- Traspaso: lede + párrafo de 17 px que repite el lede + callout magenta antes del primer
  campo. Tres bloques de texto antes de la primera pregunta.
- Borrar: título repetido; «Mejor no» como ghost es el único secundario; el panel de
  350 px flota.

### `x-ensayo-1.png` · `x-ensayo-2.png`

- La marca de ensayo (`.ensayo-mark`, franja azul con borde de 3 px) funciona como marca.
  La página es un `Page` con callouts y `.material`; el informe se muestra en un
  `.material` con `pre-wrap`, así que las recetas salen como `` `explicit-steps@1` ``
  con acentos graves: **jerga del repositorio en pantalla** (AGENTS.md regla 7). Es capa
  de contenido, fuera de este alcance, y hay que anotarlo en el BACKLOG.
- El estado «firmado» tras «Firmar la hoja» no se ha capturado (el ensayo se detuvo en el
  segundo primario). La `DraftMark` de la pantalla de revisión real (`review/ReviewScreen.tsx`,
  la más importante del producto por Principio VII) **no aparece en ninguna captura del
  registro ni en las de este diagnóstico**: requiere una adaptación en el vault y la
  ruta `legacy/review`. Es un hueco del registro que la Fase 4 debe cerrar antes de
  tocar `.draftbar`.

### `x-rail-como-se-ve-abierto.png`

- El desplegable cae dentro de un carril de 200 px: el `segmented` de tres opciones no
  cabe («Como el sistema / Claro / O…» cortado), las etiquetas «Más contraste» y «Menos
  movimiento» se partan en dos líneas y la ayuda en cinco. Está bien que viva en el
  carril (decisión de `020`), pero necesita salir de él como popover o ensancharse.

### Las hojas (`hoja--*.png`)

Fuera de alcance (capa de contenido), dos observaciones de paso: la franja «BORRADOR» roja
es clara y sobrevive en blanco y negro; el callout «Material de ejemplo» tiene un salto de
línea duro a mitad de frase («…trae Rampa para / que veas…»), que viene del Markdown de
`corpus/sample/ensayo`, no del CSS.

## 3 · Qué del portal aplica y qué no

| Del portal | ¿Aplica? | Por qué |
|---|---|---|
| Tres señales de superficie (tono + borde + sombra) | Sí, ya está en el panel | Extenderlo a tarjetas, resolviendo la contradicción gris+sombra |
| Nav activo: fondo suave + texto acento + barra lateral | Sí | Baja el ruido del carril y devuelve el énfasis al primario |
| lucide 16 px con texto, `aria-hidden` | Sí, empaquetado | Requiere decisión de dependencia y ADR corto |
| Ritmo único `space-y-6` y `max-w` por tipo de vista | Sí | Ya existe como `--rhythm-*`; falta que ninguna pantalla lo esquive |
| Título de sección `semibold`, h1 `bold` | Sí | Peso como segundo eje de jerarquía |
| Empty state dashed con CTA dentro | Sí | `EmptyState` ya acepta `action` |
| Badge «soft fill + ring-inset» sin mono | Sí | Quita mono, mantiene el color semántico |
| Botón sin sombra, `outline` solo con borde | Sí | Devuelve peso al primario |
| Body 14 px, controles 36 px | **No** | 17 px y 44 px son decisiones de accesibilidad del proyecto |
| Fuentes por Google Fonts | **No** | Offline y bundle firmado; el sistema ya tiene Atkinson empaquetada y usa la fuente del sistema para la UI |
| Tailwind + shadcn + CVA | **No recomendado** | El sistema actual son ~1600 líneas de CSS con tokens probados por `styles.test.tsx` y `contrast.test.ts`; migrar es reescribir las pruebas y el contrato de `013` sin ganar nada que no se pueda hacer con las clases existentes. Si se quisiera, es ADR, no fase 2 |
| Carril navy permanente en tema claro | Decisión de marca | Multiplica los cruces de modo; no lo recomiendo, pero es tuya |
| Popover/Dialog de Radix | Parcial | Solo hace falta un popover para «Cómo se ve»; un `<details>`/`popover` nativo (Chromium 114+) cubre el caso sin dependencia |

## 4 · Huecos de evidencia que la Fase 4 tiene que cerrar

1. La pantalla de revisión con `DraftMark` no está fotografiada. Es la pantalla del
   Principio VII y el contrato del shell la nombra explícitamente.
2. Ningún estado de error ni de carga está fotografiado.
3. Solo 4 de los 8 cruces tema × contraste × texto están capturados, y solo en una pantalla.
4. `npm run shots` fotografía 6 de las ~20 pantallas; las de Configuración (4 de 6), el
   flujo de Preparar, el traspaso, el borrado y el nuevo alumno solo están en las capturas
   de este diagnóstico. Extender `app/scripts/screenshot.mjs` es una tarea de la spec.

## 5 · Decisiones que son tuyas (para `/speckit-clarify`)

1. Iconografía: `lucide-react` como dependencia, SVG vendorizados, o seguir sin iconos.
2. Superficies: panel blanco con tarjetas planas de borde, o panel gris con tarjetas
   blancas elevadas.
3. Carril: activo como fondo suave + barra lateral (recomendado) o mantener el bloque sólido.
4. Panel: centrado y a toda la altura de `.main` (recomendado), o mantener el panel que
   abraza su contenido pegado a la izquierda.
5. Ventana estrecha: franja de una fila con scroll horizontal, o botón de menú.
6. Monoespaciada: restringirla a clave, rutas y log (recomendado), o mantenerla en fechas y códigos.
7. Alcance: una feature con historias priorizadas o dos (sistema y
   shell primero; pantallas después). Recomiendo dos, porque la primera es la que corre el
   Constitution Check sobre tokens y la segunda toca pantallas con tests propios.
