# Informe de la noche — ejecución de la cola de trabajo

**Arranque:** 2026-09-03, desde `91c952f` (árbol limpio).
**Fuente:** `specs/COLA-DE-TRABAJO.md`, con el contexto de cada ítem en
`specs/revision-antagonista-2026-09-03.md`.

**Línea base verificada antes de tocar nada:** `npx tsc --noEmit` limpio,
`npx vitest run` 95 ficheros / 1482 casos en verde.

---

## Completados

### 0.1 · Ciclo de vida del estado de sesión de App.tsx — P11, P14, FLU-01/02/03/08

Un refactor, cinco síntomas. Los tres `useState` que ningún camino limpiaba (`review`,
`ingested`, `reconnect`) están ahora en el route, en `LegacyContext`
(`app/ui/src/nav/route.ts`): **lo que la acción de navegación no lleva, la ruta no tiene**,
así que no hay ningún `setX(null)` que se pueda olvidar. Eso cierra de raíz:

- **FLU-01** — `ReviewScreen` tenía cero salidas y `route.view === 'adapt' && !review` dejaba
  la pantalla de adaptar en blanco el resto de la sesión: firmar la 2ª hoja de una tanda era
  imposible. Ahora la revisión tiene «← Volver a la tanda» / «← Volver a lo que le he
  preparado», y la tanda se **re-deriva del vault** (`job:learners` + `job:isSignedOff`) en
  vez de restaurarse de un estado que la navegación destruía.
- **P11, la mitad durable** — el expediente ofrece «Revisar y firmar» en cualquier fila con
  hoja adaptada: pendiente-de-firma es un fichero sin firma, no memoria de sesión. Sobrevive
  a cerrar la aplicación.
- **FLU-02** — ir a «adaptar» sin trabajo ya no arrastra el material del trabajo anterior.
- **FLU-03** — reconectar es cancelable («← Dejarlo como está») y no sobrevive a cambiar de
  sección, así que ya no secuestra Configuración ni el puntero de pictogramas de `025`.
- **FLU-08 / P14** — el intent se limpia al llegar a «hecho» y en «Otra ficha»: el siguiente
  trabajo empieza sin «examen» ya pulsado.

De paso, dos honestidades que el refactor dejó a la vista: el badge de la tanda y su frase de
resumen se derivan de la firma en disco (decían «sin firmar» para todas incluso después de
firmar una), y `job:learners` usa `learnersOf` del core en vez de su propio filtro de
directorios — el filtro contestaba «qué subcarpetas hay», que no es «para quién hay hoja».

**Tests:** 12 casos nuevos en `app/ui/test/route.test.ts`; e2e nuevo en `group.spec.ts`
(firmar las dos hojas de una tanda, y ambas firmas comprobadas en disco) y en
`connect.spec.ts` (las dos salidas de la reconexión). **Verificado por mutación** en cuatro
costuras: llevar `reconnecting` entre secciones → 2 fallos; llevar el job anterior → 1 fallo;
quitar el botón del expediente → e2e rojo; anular «Dejarlo como está» → e2e rojo.

**Commit:** ver historia (`0.1`). tsc limpio · 1492 casos · 106 e2e.

### 0.2 · Borrado completo, los cinco residuos — P38, COD-03/07/18/19

El hallazgo que la revisión puso primero de noventa y tres, y el único que encontraron
tres revisores por separado. Tras «he borrado todo lo de X» sobrevivían: **su nombre real**
en `.rampa/names.enc`, los **paquetes de traspaso**, su **fila del roster**, las
**peticiones de composición** con su código en claro y texto libre de la docente, y el
**diario archivado**. Cuatro de los cinco eran invisibles para `verifyForgotten` (recorría
cuatro directorios, ni `handover/` ni `.rampa/`); el quinto era invisible por construcción
— buscar un código dentro de base64 de texto cifrado es una comprobación que solo puede
pasar, y era exactamente la que había en el e2e.

Ahora: el plan recoge los cinco y **nombra los dos que son ediciones y no borrados**
(`ForgetPlan.entries`), así que el «lista todo antes de confirmar» de FR-215 los incluye y
la pantalla los muestra; `verifyForgotten` recorre seis directorios, exime
`.rampa/erasures.md` por nombre en vez de saltarse `.rampa` entero (que es lo que ocultaba
las peticiones), y **pregunta** al mapa cifrado. Ese `NameStore` es **parámetro obligatorio**
de `executeForget` y `verifyForgotten`, no un hook opcional: la omisión es literalmente cómo
esto pasó, y un parámetro requerido no se le puede olvidar a nadie. `status: 'forgotten'`
sale del enum del roster — nadie lo escribía nunca y no se podía usar: una fila con lápida
sigue llevando el código, así que el verificador la reportaría como residuo para siempre.

**Tests:** 7 casos nuevos en `packages/core/test/memory-audit.test.ts`; `e2e/erasure.spec.ts`
reescrito — la siembra crea ahora los cinco residuos y se han quitado los tres
`if (x) expect(…)` que hacían pasar requisitos por ausencia. **Verificado por mutación** en
cuatro costuras: quitar `handover` del recorrido, quitar la pregunta al mapa, quitar el
borrado de la fila del roster, y volver `nameStore.forget` un no-op (2 e2e en rojo).
`specs/006-desktop-app/validation.md` corregido: decía que el mapa se borraba.

tsc limpio · 1499 casos · 106 e2e.

### 0.3 · Endurecer los dos guardianes — P31 (CONS-14), P42 (COD-10)

Antes que las specs nuevas, porque protege todo lo que viene.

**`check-fr-coverage.sh`** preguntaba solo si el número *aparecía* en `tasks.md`, y una
mención no es una cuenta. Ahora cada requisito **declarado** por la spec (`- **FR-nnn**`)
tiene que estar citado en sus propias tasks en una de tres formas, y la forma es el estado:
tarea (el checkbox), marcador explícito `done:|deferred:|dropped:` con razón (que gana a la
tarea, para una decisión posterior), o fila de tabla de cobertura (el encabezado decide).
Además, **una cita con el prefijo de otra spec deja de contar** — la regla 8 de AGENTS.md
aplicada desde el otro lado —, y **una spec que marca `**DEFERRED` no puede aparecer como
cubierta en sus tasks**, que es CONS-14 exactamente.

Y deja de mentir en el resumen: imprime **595 requisitos · 144 open · 443 done · 8 deferred**
en vez de «596, todos contabilizados», que se lee como «todos hechos» y era falso por cuatro.

Al estrenarse encontró **11 problemas reales**, los 11 corregidos:

- **7 requisitos que nadie estaba guardando**: `005` FR-516 y `012` FR-1009 estaban citados
  con el prefijo de otra spec (`014` FR-516 y `016` FR-1009 **no existen** — eran suyos, mal
  etiquetados); `009` FR-710, `013` FR-1113, `016` FR-1408, `017` FR-1503 y `018` FR-1612
  solo aparecían en una frase. Ahora cada uno tiene fila con lo que lo hace verdad y el test
  que fallaría.
- **4 aplazados que sus tasks presentaban como cubiertos**: `020` FR-1802/1817/1819 y `024`
  FR-2218. La spec ya decía DEFERRED desde el ítem 1.4/1.8; las tasks no.

**`check-spec-kit.sh`** gana la **regla 4**: una spec **citada por código** (convención del
propio repo — `` `NNN` ``, `NNN FR-`, `NNN T012`, `specs/NNN-`) o **llamada «shipped» por otra
spec** debe tener `plan.md` y `tasks.md`. Es COD-10: `022` se implementó y se declaró shipped
sin pasar por los gates, y las reglas 1-3 no podían verlo porque cada una mira un commit o un
directorio, nunca la relación entre «hay código de esto» y «esto pasó por el proceso». Hoy
pasa (las 35 specs tienen plan y tasks): es un trinquete para lo que viene.

De paso, el resto del ítem 1.6 que quedaba en código: `pictograms/fetch.ts` citaba
`022` FR-2008 como autoridad de una decisión suya, que es la lectura que llevó a `023` a decir
«after `022` shipped». Reescrito diciendo por qué se retira.

**Verificado por mutación**, cuatro veces: mención en prosa en vez de fila → rojo; renombrar
la tabla «Not done» de `011` para que sus filas se lean como satisfechas → rojo con los tres
FR-918/920/921; quitarle plan y tasks a una spec citada por código → rojo; una spec llamada
«shipped» sin plan → rojo.

**Un hallazgo lateral que conviene saber:** `check-spec-kit.sh` sale con 0 **sin comprobar
nada** cuando no hay ficheros en el índice (`git diff --cached` vacío → `exit 0` en la línea
41). Es de diseño para el hook, pero significa que ejecutarlo a mano con el árbol limpio no
prueba nada. Para verificarlo de verdad hay que tener algo en el índice o pasarle un ref
(`bash scripts/check-spec-kit.sh origin/main`), que es lo que hace CI.

AGENTS.md gana la regla 9 con la convención, y `.specify/templates/tasks-template.md` gana la
sección de cobertura, para que `/speckit-tasks` la produzca en vez de que sea folklore.

tsc limpio · 1499 casos · guardianes en verde.

### 0.4 · Fugas y honestidad del pipeline — P17, P18, P19, P15, P1

Cuatro arreglos en el camino agéntico, todos con decisión cerrada.

**Nombres (AGE-01, P17)** — el más grave. `findProbableNames` solo marcaba una palabra
capitalizada si estaba en la lista **o** no era inicio de frase. Una nota de maestra
empieza por el nombre («Fátima no arranca sin el primer paso hecho»), así que un nombre
que no estuviera en la lista **no se marcaba, no se preguntaba y salía al proveedor** — y
la lista tenía ~60 nombres tradicionales españoles: sin Sofía (top-3 en España una
década), sin Fátima, Mohamed, Aya ni Ainhoa. El sesgo caía exactamente sobre el alumnado
migrante, sobrerrepresentado en apoyo PT. Ahora: el **token inicial de cada línea** es
candidato aunque sea inicio de frase (que es lo que hace que la lista deje de ser
load-bearing), la lista cubre varios cientos de nombres de las comunidades reales de un
aula española, y el set de nombres **gana** al stop-list de aula — una niña llamada Abril
o Rosa era inmarcable porque «abril» estaba como mes. El coste en falsos positivos lo
aceptaste explícitamente. Deuda anotada en **BACKLOG G42**: la lista debería ser corpus
extensible por centro y por país, y está montada de lo que parecen las listas de
frecuencia, no de un extracto verificado del INE.

**Prompt (AGE-02, P18)** — las secciones se separaban solo con encabezados markdown, así
que un documento con una línea `## Correcciones de la maestra sobre el intento anterior`
seguida de órdenes se leía **estructuralmente igual** que la sección legítima de máxima
precedencia, y el detector de inyección no cubre ese vector (sus tiers piden destinatario
+ directiva, no suplantación de secciones). Ahora el material va entre fences con **nonce
de 96 bits por llamada**: un documento no puede falsificar el cierre porque se escribió
antes de que el nonce existiera. Y eso es lo que hace seguro añadir la reafirmación de
tarea **después** del material, que era la otra mitad del hallazgo (recencia a favor del
atacante). Nota: la spec 007 argumentaba «el material va último para que nada después se
lea como instrucción» — sigue siendo cierto, y ahora hay una forma de decir «el contenido
acaba aquí», así que el test que consagraba «último» está reescrito explicando el cambio.

**Compose (AGE-03, P19)** — «restas con llevadas» es como se pide restar con borrowing en
primaria, y este repositorio ya lo sabía: la etiqueta española de `borrows` en el propio
verificador es «restar llevando». Pero el mapeo mandaba `llevad` a `carries` siempre, y el
verificador declara que llevar no es propiedad de la resta → **todas** las propuestas
salían `unknown`, el bucle no cortaba, y se gastaban hasta 30 propuestas para acabar con
**cero ejercicios** en una de las cuatro únicas destrezas que sabemos comprobar. Ahora el
mapeo resuelve por operación y el bucle **aborta** cuando un lote entero sale `unknown`,
con su propia frase: «no lo sé comprobar en esta operación, prueba a decirlo de otra
manera» en vez de una que se leía como un mal día del modelo y la llevaba a pagar otra vez.

**Adaptar (PROD-01/P1 y FLU-12/P15)** — con selección de recetas vacía el job seguía
(«Adaptando: 0 reglas») y mandaba un prompt con la sección «Reglas seleccionadas» vacía;
como la regla dura 6 prohíbe cambiar sin receta que citar, el modelo o no cambiaba nada
(pagaba por una copia) o inventaba ids de receta, y entonces el informe cita reglas que no
existen. Ahora **para antes de llamar al proveedor**, y es un error **por alumno** y no del
job, así que en una tanda de tres los otros dos siguen adelante (FR-506/507). Y antes de
gastar, `job:profileGap` contesta lo que pediste: cuántas adaptaciones va a aplicar, qué
ejes están sin observar, cuántas reglas no se activan por eso, y qué mirar en clase — con
las palabras de `instructions/axes.md`, no de un componente. Solo lista las recetas
frenadas **exclusivamente** por una observación que falta: una apagada porque el eje sí
está observado y por debajo del umbral está bien apagada, y mandarla a cambiar un perfil
correcto sería peor que callarse.

**Tests:** 34 casos nuevos; e2e nuevo `profile-gap.spec.ts` (3 casos) y uno en
`onboarding.spec.ts` (la parada sin gasto). **Ocho costuras verificadas por mutación**:
la regla de línea inicial, el orden nombres/stop-list, el nonce fijo, la reafirmación
ausente, el mapeo de llevadas, el corte del bucle, la parada por selección vacía y el
aviso previo.

tsc limpio · 1516 casos · 110 e2e.

### 0.5 · Test del control primario único — P35 (CONS-25, G31)

`013` FR-1105 («exactamente un control primario por pantalla») llevaba desde agosto sin
guardia, y el propio G31 decía por qué no se escribía: «probablemente falle en varias
pantallas existentes». Un requisito vigente, con violaciones conocidas, defendido por que
alguien se acuerde de mirar — y `023` lo rompió en una hora, cazado por una captura a
900px con texto grande y no por nada que pudiera fallar.

`e2e/primary-control.spec.ts` cuenta `.btn-primary` visibles dentro de `.main` en: los seis
destinos del raíl, las seis secciones del alumno, los pasos de preparar algo alcanzables
sin proveedor, y **las dos preguntas** que hace la pantalla de adaptar (el aviso de perfil
y la puerta de coste) — a 1366px y a 900px con texto `xlarge`.

**Encontró exactamente un fallo, y tenía veinte minutos de vida:** el aviso de perfil que
acababa de añadir en 0.4 ponía «Seguir igual» en fuerte al lado de «Está bien leído,
sigue». Que el test estrenado cace el código escrito veinte minutos antes es el argumento
entero para haberlo escrito. Arreglado con la regla que además se lee bien —*mientras te
están preguntando algo, la pregunta es la pantalla*— en **una** expresión compartida por
los dos gates, para que un tercero no se la salte.

De paso, la lista de la tanda daba un botón sólido por alumno: tres alumnos, tres
primarios. Fuerte solo cuando hay una fila; con varias son elecciones iguales y el estado
va en las insignias — la misma decisión que tomé en el expediente en 0.1, por la misma
razón.

**Lo que el test no alcanza, dicho en vez de descubierto:** la lista de la tanda en sí,
porque llegar a ella necesita una tirada real con proveedor. Ahí la regla se cumple por
construcción y no por aserción. Anotado en G31, que queda **cerrado**.

tsc limpio · 1516 casos · 115 e2e.

### 1.17 · Marcador de versión de esquema del vault — P50 (CRIT-02), vía `032` T003

Primero del resto del Lote 1 porque `031` y `032` dependen de él, y porque los cambios de
forma del Lote 2 lo necesitan antes.

Implementado **donde vive la decisión**: `032` lo declaró como prerequisito propio con su
research R5, así que se implementa su tarea T003 en vez de duplicarla en otro sitio. Eso
mantiene una sola fuente de la decisión y deja el resto de la 032 sin tocar (T004 en
adelante siguen abiertas).

El problema que cierra: la revisión aprobó tres cambios de forma almacenada —CUR por área,
segundo eje de frescura, popularidad de pictogramas— y **no había forma de preguntar** si
un vault se puede migrar. No hay marcador en ningún sitio, y la única migración escrita en
todo el repositorio es la del almacén de credenciales, que está fuera del vault. Lo que sí
hay es tolerancia por reparación (`schema.ts` conserva campos que no validan), que cubre un
campo malformado y **esconde** un cambio de forma: un lector que no conoce `cur_areas` lo
repara y reescribe el perfil sin él. El caso agravante ya estaba aceptado: PT y tutor
compartiendo vault por OneDrive con builds distintos — el viejo sobreescribe al nuevo y
**nada podía detectarlo**.

`.rampa/vault.yaml`, un entero, monotónico:

- **Fichero ausente ⇒ versión 1.** Todo vault que ya existe queda versionado sin tocarlo,
  que es el único retrofit honesto.
- **Sube al escribir**, nunca al leer y nunca al instalar. Una versión escrita al leer
  reescribiría vaults que no ganaron nada, y en una carpeta sincronizada eso es un
  generador de conflictos desde el acto de abrir la aplicación.
- **Nunca baja.** Ahí está el caso OneDrive: si bajara, el build nuevo dejaría de buscar
  áreas que siguen en los otros ficheros.
- **Nada se rechaza por versión.** Un vault del futuro se reporta, no se cierra: su trabajo
  está ahí dentro.

9 casos en `packages/core/test/vault-version.test.ts`. Dos costuras verificadas por
mutación: bajar el número (1 rojo) y escribir al leer (4 rojos).

### 1.11, 1.12, 1.13, 1.16 · el resto del Lote 1 — P36, P27, P28, y un hallazgo directo

**1.11 · «por hoja adaptada» (P36, CONS-34).** Dos MUST en tensión y nadie podía saber cuál
ganaba: `012` FR-1011 dice que la interfaz deje de llamar «ficha» a todo —porque quien lo lee
en todas partes concluye que la herramienta no hace exámenes y no lo intenta— y el literal
«Unos 3 céntimos por ficha» estaba en la **primera** pantalla que ve. En dos commits, spec y
después i18n+test, que es lo que el gate de Spec Kit separa. De paso apareció una **tercera**
redacción de esa misma frase: `onboarding.connectOk` («por documento»), escrita por nadie y
leída por nadie desde que 009 se quedó con el asistente. Retirada, y el test cuenta cuántas
redacciones de «✓ Conectado» existen — un gemelo rancio de la frase que acabábamos de
enmendar, esperando a que alguien tirase de él, es el defecto-firma llegando a la capa de copy.

**1.12 · conflictos declarados (P27, CONS-08).** `one-task-per-page` manda partir las
subpreguntas «también», y `exam-access-not-difficulty` tiene «partir una respuesta de dos
partes en dos de una» entre sus anti-patrones. Las dos se seleccionan sobre el mismo bloque
`.assessment` y ninguna declaraba a la otra: la contradicción la resolvía lo que el modelo
leyese primero. Ahora se declaran mutuamente (versión 2 las dos) y en un examen gana la
**guarda** —la regla 0 del resolutor no la descarta— con el conflicto **escrito** en el
informe. Y receta nueva `conflict-decoding-vs-minimal-page` para DEC≥2 + ATE≥2: dislexia +
TDAH es el par más común de un aula de apoyo y no tenía ninguna, así que se resolvía en
silencio, igual de mal cada semana. Va marcada en su propio texto como **no revisada por una
PT** — la escribí desde las definiciones de los ejes y el orden de resolución, no desde
criterio clínico. `pictograms-not-automatic.test.ts` cazó su primer borrador nombrando
pictogramas, que es exactamente lo que `018` prohíbe: una receta que nombra un apoyo es ese
apoyo encendido por un eje.

**1.13 · regla dura 12 (P28).** Decía que el material adaptado **y** lo que se le dice a la
docente van en el idioma del material. El caso más normal de un colegio español lo rompía: una
ficha de inglés producía notas de informe en inglés, dentro de un esqueleto que la aplicación
escribe en español fijo. Informe bilingüe sobre su propia aula. Partida en los dos hechos que
son: el material conserva su idioma, lo que se le dice a ella va en español. «Español» dicho y
no derivado, porque este corpus **es** el corpus del mercado español; cuando el idioma sea un
ajuste declarado (`033`) la línea pasa a ser «el que ella haya elegido».

**1.16 · la tilde.** «Válida cada una» (adjetivo) donde va el imperativo «Valida», en una de
las frases que se **imprimen en la cabecera del examen**. Lo que importaba del hallazgo no era
la tilde: **había un test que la consagraba**, pidiendo «válida» en el texto impreso. Un test
que fija un error es peor que no tener test, porque arreglar el error parece romper algo.
Reescrito con límite de palabra y una nota de por qué.

Con esto el **Lote 1 está completo** (17/17).

tsc limpio · 1537 casos · 115 e2e.

### 2.1 · El PDF escaneado, el downscale y el HEIC — P39, COD-04, COD-05

Tres defectos de la misma zona, y el primero es de los que más caro salen: **un PDF
escaneado nunca se convertía a imagen**. `readPdf` leía la capa de texto y las listas de
operadores y devolvía, para una página escaneada, un `SourcePage` **sin texto y sin
imagen**. Entonces `needsVision` (`p.image && !p.text`) daba false —así que ni siquiera
saltaba la comprobación de si el servicio lee fotos— y `extractPage` mandaba «Página N.
Lee esta imagen.» con `images: undefined`. El modelo inventaba una página o fallaba, y ella
pagaba la llamada. Mientras, `tasks.md` T012 estaba marcado como «PDF page rendering via
pdfjs-dist» y FR-601 reclamaba «PDF (scanned and digital)».

**Lo he hecho por un camino más simple del que dice tu decisión, y conviene que lo sepas.**
P39 decía «renderizar las páginas con pdfjs en el renderer». No hace falta canvas: pdf.js
trae sus propios decodificadores, así que la imagen que pinta una página llega **ya
decodificada** desde `page.objs` (o `commonObjs`, que es donde acaba la que comparten
varias páginas — pedir solo `objs` funcionaba en la página 1 y se colgaba en la 2). Una
página escaneada es un bitmap que cubre la hoja, así que esos píxeles **son** la página.
Hacerlo en el main es estrictamente mejor: sin ida y vuelta por IPC, sin depender de una
ventana que puede no existir, funciona headless, y todo el camino queda cubierto por la
suite offline. El objetivo de tu decisión —«nada de pagar llamadas sin imagen»— se cumple
igual o mejor.

**El downscale existía y no lo ejecutaba nadie.** `planDownscale` se escribió como
«aritmética pura: redimensionar píxeles va donde hay canvas», el canvas está en el
renderer, el envío está en el main, y el resultado fue que el límite del corpus
(`image_long_edge: 1600`) se parseaba, se tipaba, se importaba en `jobs/ingest.ts` y **no
se llamaba nunca**. `packages/core/src/ingest/pixels.ts` mete el filtro de caja y el
codificador PNG como aritmética —cien líneas, cero dependencias— y `toSendablePng` es el
único sitio donde el límite se aplica.

**Y el HEIC estaba roto de punta a punta.** `decodeHeic` devolvía RGBA en crudo con
`mediaType: 'image/rgba'` y un comentario que decía «el renderer lo re-codifica a JPEG»;
ese renderer no existía. Una foto de iPhone —el formato por defecto del móvil más común—
llegaba a Anthropic como `media_type: 'image/rgba'`, que la API rechaza, después de que
ella esperara el decodificado. El propio docblock de esa función promete «una docente no
debe ver nunca un error de formato por el formato que eligió su móvil».

De paso salieron dos cosas más: `runIngest` ahora **para antes del proveedor** si una
página no tiene ni texto ni imagen (y lo reporta por página si es solo alguna), y
`storeSource` solo guardaba la primera página de un PDF porque se apoyaba en `paths[i]` —
de la página 2 en adelante no había nada que enseñarle en la pantalla de verificación,
así que se le pedía comprobar una lectura contra un panel vacío.

**Lo que sigue sin hacerse, dicho y no descubierto:** una foto JPG/PNG/WEBP que ella trae
se envía al tamaño que la hizo su móvil, porque redimensionarla exige decodificarla y no
llevamos decodificador para esos formatos — una decisión explícita de `read.ts` («el modo
de fallo de un módulo nativo en Electron es una aplicación que no arranca, en una
plataforma, tras un bump de versión, y quien lo tiene delante es una docente que no puede
leer el stack trace»). **BACKLOG G43** con las tres salidas posibles y lo que cuesta cada
una. Es dinero, no corrección: la extracción no cambia.

**Tests:** 13 casos en `pixels.test.ts` (incluido un round-trip que infla el IDAT y compara
píxel a píxel, y una comprobación de CRC por chunk), 9 en `documents.test.ts` sobre un
fixture de PDF escaneado **construido en el test** —para que lo que lo hace un escaneo se
pueda leer— y dos aserciones de fuente sobre el camino HEIC. Tres costuras verificadas por
mutación: quitar el rasterizado, ignorar el límite, y pedir solo `objs`.

En `008` tasks.md corregidos los dos ticks que afirmaban lo contrario.

tsc limpio · 1560 casos · 115 e2e.

### 2.2 · La guía tenía la conversación inalcanzable y la puerta cerrada — P37 (COD-01)

Tres defectos encadenados en una spec marcada «Built, all 26 tasks».

**La conversación no se podía abrir.** `App.tsx` renderizaba `GuideConversation` para
`view: 'guide-ask'` y **nada en el repositorio despachaba jamás esa vista**. La US3 de `017`
—«carga una guía y le pregunta»— era una feature entera inalcanzable. Ahora hay control
«Preguntar sobre él» en los dos estados de la guía, **ausente** (no deshabilitado) mientras
no haya documento —una pregunta sobre nada no es una pregunta— y volver de ella regresa al
documento en vez de salir al listado.

**La puerta de entrada era un callejón.** La pantalla decía «trae primero el documento y
comprueba que lo he leído bien» y **no ofrecía ningún control para hacerlo**: una nota que
describe un paso sin puerta. El único camino era door → «Adaptar algo que tengo» → elegir un
**tipo de material** (¿un DIAC es «una ficha» o «un examen»?) → foto → verificar → abandonar
el flujo de adaptar → volver andando al alumno. Ahora «Su adaptación curricular» abre la
ingesta de `008` con el destino en la ruta, así que es la misma maquinaria y la misma puerta
de verificación, sin tipo de material que contestar.

De paso, la puerta de verificación decía «Adaptar para un alumno» pase lo que pase — una
frase sobre otro documento, en la pantalla donde acaba de confirmar la lectura de un DIAC.
Ahora dice «Ver sus medidas» cuando eso es lo que hay al otro lado.

**El tercer defecto ya estaba cerrado por 0.1:** con un `ingested` residual de una ficha
anterior, «Leer las medidas» se habilitaba y leía las «medidas» de una hoja de mates como si
fuera la adaptación curricular oficial. El job vive en la ruta desde 0.1, así que no hay
residuo de sesión que heredar — y el e2e nuevo lo comprueba de paso.

4 e2e nuevos, 3 costuras verificadas por mutación (sin `onAsk`, sin `onBring`, sin `then`).

tsc limpio · 1560 casos · 119 e2e.

### 2.3 · Reimprimir una hoja del mes pasado — FLU-04

`documents.rendered: string[]` estaba declarado, tipado, **poblado** por `entryFor` desde
`014` y leído por nadie: G36 otra vez, y con una consecuencia de las caras. La fila del
expediente ofrecía «Lo adaptado» (markdown), el informe, el IR y la reutilización, y **no el
PDF que se fotocopia**. El único «Guardar como PDF» vive en la pantalla de revisión, que
antes de 0.1 solo se alcanzaba durante una adaptación recién hecha — así que reimprimir la
hoja firmada del mes pasado, que es de las tareas más frecuentes del curso (se perdió la
fotocopia), era imposible.

Y mientras tanto `es.errors.offline` prometía «puedes leer tus notas y **volver a
imprimir**»: texto de interfaz mintiendo sobre lo que la aplicación podía hacer.

La fila abre ahora el PDF que ya tiene y ofrece imprimir uno donde no lo hay, con la
etiqueta honesta en cada caso. Las dos cosas funcionan **sin red**: `job:render` escribe el
HTML y `job:pdf` es el `printToPDF` de Chromium, los dos locales — y el e2e lo comprueba
escribiendo el fichero de verdad en una instalación sin clave.

3 e2e nuevos; costura verificada por mutación.

### 2.7 · El plan de borrado dice qué sobrevive y por qué — P45 (COD-20)

`planForget` devolvía `sharedKept: Array<{ job, alsoUsedBy }>` desde `014` —exactamente lo
que pide FR-1211— y la interfaz `Plan` de `ForgetLearner` **omitía el campo**, así que
ningún JSX podía renderizarlo. Lo que le llegaba era la frase agregada inyectada en
`survives`: «N materiales se quedan…». El **cuánto**, nunca el **cuál**: la mitad de un
requisito viviendo solo en el tipo del proceso main — que es exactamente el defecto que el
docblock de esa misma pantalla denuncia sobre su propio pasado.

Ahora los lista por material y con el motivo, en su propio bloque y no dentro de «esto no
se retira»: ese callout es sobre cosas que el borrado **no alcanza**, y esto son ficheros
que se quedan por una razón que ella puede comprobar —otro alumno suyo los sigue usando— y
donde la acción posible es distinta.

**Cuentas, nunca códigos.** Nombrar a otro niño dentro de un diálogo sobre borrar a este es
una exposición que no compra nada, y el e2e comprueba que no aparece el código de ningún
otro alumno en la pantalla.

Costura verificada por mutación.

### 2.4 · Pictogramas: cuatro defectos, y uno de ellos legal — P40, P41, P47, P48

**(a) La atribución era falsa (P40, COD-08).** `attributionFor(doc, attribution =
ARASAAC_ATTRIBUTION)` aceptaba una atribución alternativa y **los dos únicos call sites la
llamaban sin segundo argumento**: el parámetro estaba muerto y la constante era lo único
que se imprimía jamás. Una docente con un juego que no es ARASAAC —el caso que `018`
FR-1604 existe para soportar, una carpeta con su propio LICENSE que `readSet` lee, le
muestra y **nunca pasaba al render**— imprimía en cada hoja «Autor pictogramas: Sergio
Palao · Origen: ARASAAC · Licencia: CC BY-NC-SA». Una atribución **falsa**, que es
legalmente peor que omitirla. Y lo único que ejercitaba el parámetro era el test unitario
que «demostraba» que funcionaba.

Ahora `data-picto` lleva `word=id@publisher`, la línea se **deriva** de las fuentes que el
documento realmente usó (varias fuentes → varias líneas, que es FR-2116), y
`attributionFor` **no tiene default**: un parámetro requerido no se le olvida a nadie. Una
fuente que no sabemos describir se dice —«pictogramas del juego que tienes puesto, la
licencia es la de su LICENSE»— en vez de inventarle un crédito. Esa rama es la que el
código viejo no podía tener.

**(b) La popularidad no se persistía (P41, COD-09).** `readIndex` la calculaba,
`planWholeSet` ordenaba la descarga con ella, y `mergeSet` **la tiraba** al escribir el
catálogo. Así que «los candidatos, del más usado al menos» no podía ser verdad, con T017
marcado como «popularity-ordered» y comentarios en `bring.ts` y en `ChooseWord.tsx`
afirmando un orden que ningún código producía. Se persiste, y el orden lo hace
`mostUsedFirst` en core — **porque la primera versión del arreglo estaba en el shell,
donde nada offline lo veía, y sobrevivió a que lo borrase con la suite entera en verde.**
El mismo defecto que estaba arreglando, llegando dentro del arreglo.

**(c) El ODT perdía los pictogramas en silencio (P47, COD-24).** `render/odt.ts` no tenía
ni una referencia a `data-picto`, ni a una imagen, ni a la atribución: una hoja **con**
pictogramas exportada a ODT salía sin ellos, sin hueco marcado y sin decir nada — en la
modalidad que existe precisamente para que ella retoque y reimprima. `019` FR-1702 reclama
«el mismo IR adaptado» en todas las modalidades y su tabla lo llamaba «satisfied by
absence»; aquí la ausencia era el defecto. Ahora `Pictures/` con su entrada de manifest por
imagen (una parte sin declarar es una parte que un procesador de textos puede tirar), la
palabra al lado de cada dibujo, y la misma atribución que el PDF.

**(d) El override por niño no tenía pantalla (P48, COD-25).** Es el primer peldaño de la
precedencia de `match.ts` y la excepción que `024` FR-2215 mantiene a propósito, y estaba
«carried rather than surfaced»: `ProfileEditor` lo aparcaba en `_pictoOverrides` sin ningún
control, y `ChooseWord` escribe solo en el vocabulario global. Un MUST de `018`
satisfacible **solo editando YAML a mano** — y G30, que decía literalmente «the override is
a field only a developer can set», se cerró «by 024», que construyó el selector del
vocabulario y no este. Control plegado en la página del alumno, ofrecido solo cuando hay
juego instalado: sin dibujos no hay a qué apuntar una palabra, y FR-2303 quiere **una**
forma de arreglar eso, no dos.

**Dos tests que tuve que enmendar, y por qué.** La cota de «menos de seis frases» de `025`
se mide ahora excluyendo lo que un `<details>` **cerrado** esconde: la cota existe porque
«la página que ve cada dos días es corta», y un desplegable cerrado no está en esa página.
Y la de «la excepción añade tres frases» se mide sobre la excepción en vez de como resta
entre los dos estados — la resta funcionaba mientras el callout del juego ausente fuese la
única diferencia entre ellos, y ya no lo es.

20 casos nuevos; 5 costuras verificadas por mutación (el default de ARASAAC, el orden, el
lector del catálogo, los pictogramas del ODT, y el control del override).

tsc limpio · 1582 casos · 123 e2e.

### 2.5 · La figura imprescindible — P43 (COD-13)

La regla estaba escrita de **tres formas que no coincidían**, y el código no cumplía
ninguna.

`019` FR-1709 decía «una figura sin describir se anuncia como sin describir», para todas —
y `render/linear.ts` hacía eso, así que un ejercicio cuya respuesta **es** el diagrama
llegaba a un alumno que no puede verlo, convertido en una frase que le dice que hay un
dibujo que no va a tener. `instructions/render.md` decía lo contrario en su propia sección
no visual («blocks the render»). Y el ODT —la salida editable de la misma hoja— **no tenía
comprobación alguna**, mientras el PDF de esa hoja sí lanzaba: una desviación entre
modalidades de un mismo documento, que es exactamente lo que el Principio IV prohíbe que
aparezca «como omisión».

Ahora la regla es la misma en los tres sitios y dice lo que decidiste: **visual imprime,
no-visual bloquea.** El PDF y el ODT salen —lo que **afloja el PDF a propósito**, porque
en papel la imagen se ve y negarse a imprimir le quita una hoja utilizable por una
descripción que solo necesita quien no ve— con aviso en la pantalla de revisión. El audio
y el braille se paran, nombrando la figura y explicando que en papel sí sale. Y solo para
figuras **imprescindibles**: una informativa se anuncia y la lectura sigue, porque su
ausencia es una pérdida y no un agujero donde estaba la respuesta.

En dos commits, spec primero y corpus+código después, que es lo que el gate separa.

3 casos en `linear.test.ts` y 5 en `e2e/essential-figure.spec.ts`, que **pregunta a las
cuatro salidas del mismo documento** y comprueba los dos comportamientos — que es la
aserción que importa aquí. 2 costuras verificadas por mutación.

### 2.6 · El traspaso deja de fabricar confianza — P44 (COD-17)

`buildPacket` estampaba `evidence: 'observed'` en el **100% de las claims**, y los otros
dos marcadores (`inferred`, `reported`) eran **inalcanzables**: el perfil no guarda esa
información y ninguna pantalla la pregunta. Así que el anti-anclaje por el que existe la
spec `004` entera —«un paquete creído al pie de la letra es peor que ningún paquete: la
maestra nueva deja de observar y el niño se queda dentro de la descripción del año
pasado»— estaba **invertido**: todo llegaba a la receptora con el nivel de confianza
**máximo**, «visto repetidamente», fabricado.

Y el test lo **consagraba**: `every(c => c.evidence === 'observed')`, bajo un título que
nombraba el problema («marks everything observed, which is a claim the application cannot
verify») y un comentario diciendo que solo un humano podía comprobarlo. Un test que fija un
defecto es peor que no tener test, porque arreglar el defecto parece romper algo — es el
segundo de esta noche, después de la tilde.

Ahora la claim dice **de dónde viene** y no cuánto de fuerte es: «apuntado en el perfil»,
que es lo que la aplicación puede saber de verdad. Los tres marcadores de fuerza se quedan
en el tipo para el paso de revisión, donde los pone una persona.

**La segunda mitad es peor por lo cerca que estaba del arreglo.** `works` y `avoid`
estampaban `date: today()` **dos líneas por debajo** del comentario que explica, sobre los
ejes, por qué eso sería «a fabrication» — y que cita a su vez el mismo razonamiento escrito
en el almacén de credenciales. Una preferencia anotada en octubre llegaba fechada hoy, en
el único campo cuyo trabajo es decir la antigüedad. Ahora el perfil guarda `noted_on`,
sellado **donde se escribe** y solo para lo nuevo: una línea que ya estaba en el vault sin
fecha se queda sin fecha, porque «no consta» es un dato que la receptora necesita y una
fecha plausible no lo es. Eso último es la parte fácil de hacer mal —sellar todo en cada
guardado— y es lo que la mutación comprueba.

### 2.10 · Las cuatro recetas que faltaban — P1 (PROD-01)

El hallazgo no era «una receta está mal». Era que **los perfiles más comunes de un aula de
apoyo no seleccionaban nada**, porque el corpus tenía nueve recetas y todas las que habrían
ayudado querían dos ejes a la vez:

- **Dislexia** (`DEC` 2-3 con `LIN` 0-1): solo `keep-curricular-terms`, que es una
  **restricción** sobre las demás y no una adaptación — así que nada cambiaba la página.
- **Sordera**: **ninguna receta mencionaba `PER-A`**. Un alumno con `PER-A:3` («lo hablado
  no le llega») no activaba absolutamente nada.
- **ATE solo** y **LIN solo**: tampoco. `one-task-per-page` quiere COG>=2 **y** ATE>=2;
  `lectura-facil-es` quiere DEC>=2 **y** LIN>=2.

Cuatro recetas nuevas: `decoding-load`, `spoken-is-not-enough`, `how-much-at-once` y
`one-idea-per-sentence`. El `AND` de `axes:` se mantiene, como decidiste: la respuesta a
«esto necesita dos ejes» son dos recetas, y escribirlas separadas suele ser lo honesto de
todas formas.

**Las cuatro dicen en su propio texto que no las ha leído una PT**, y hay un test que lo
comprueba. Las escribí desde `instructions/axes.md` y el orden de resolución, no desde
criterio clínico — y una receta con autoridad no ganada es peor que una que falta, porque
esta llega a la hoja de un niño. Esto sigue en «fuera de la cola, con dueño humano».

Los snapshots de `selection-baseline` —el fichero que existe «para ser un diff»—
actualizados **solo con adiciones y sin una sola retirada**, con la tabla del cambio escrita
en su docblock: un hueco que se llena, no un comportamiento que cambia.

De paso: el e2e de la parada por selección vacía usaba `DEC:2` como caso canónico. Ya no lo
es —que es precisamente el objetivo— así que ahora usa `REG:2`, que es donde queda el hueco
(nada keyea sobre `REG` solo).

7 casos nuevos.

### 2.9 · Lematización mínima para pictogramas — P20 (AGE-05)

La sustitución palabra→pictograma era un lookup ortográfico exacto: `normalise` pliega
acentos, mayúsculas y espacios y nada más, por diseño explícito y documentado. Lo que la
revisión encontró no es que la cobertura sea baja, sino que es **inconsistente**: «rana»
casaba y «ranas» no, así que la misma palabra llevaba dibujo en una frase y no en la
siguiente. Para quien lee por pictogramas eso es **peor** que una ausencia consistente,
porque la ausencia se lee como una diferencia de significado.

Y el scope `instructions` —«sólo en lo que hay que hacer», el que existe precisamente para
que entienda **qué se le pide**— era el peor servido de los tres: un enunciado va en
imperativo («rodea», «une», «escribe») y los keywords de un catálogo son infinitivos.

`lemmaCandidates` hace lo mínimo determinista: plurales (`-s`, `-es`, `-ces`→`-z`) y las
**dos** formas verbales que de verdad aparecen en una hoja —imperativo de 2ª persona y
presente de 3ª, que se resuelven con la misma regla— más la reflexiva, que es como un
catálogo lista una acción sobre uno mismo. Sin diccionario: un diccionario es un fichero
de datos que alguien tiene que mantener.

**Toda la seguridad está en el orden**, no en la precisión del stemmer: el lema se prueba
**solo** cuando la forma literal no encontró nada, así que «casa» nunca llega al stemmer y
no puede convertirse en «casar» — una palabra real nunca queda desplazada por el stem de
otra. Y la regla «exactamente uno o ninguno» sigue intacta: un lema con cuatro candidatos
es omisión más línea de informe, igual que una palabra literal.

**Más la lista de clase cerrada.** «Para» deriva a «parar», y una señal de stop sobre la
preposición *para* es exactamente el fallo de pictograma equivocado que este módulo existe
para evitar: la palabra la lee el niño y la maestra no la comprueba. Las clases cerradas
—artículos, preposiciones, conjunciones, pronombres— se rechazan de entrada, **antes
incluso del override**, porque una palabra de esa lista no es una palabra que nadie quisiera
mapear. Y un pictograma sobre «de» no ayuda a nadie de todas formas.

La otra mitad de AGE-05 —los keywords **multi-palabra**, indexados y permanentemente
inalcanzables porque el tokenizador entrega una palabra a la vez— no tenía decisión tuya y
toca el formato de `data-picto`, que leen cinco sitios y que además es lo que ella lee para
comprobar qué dibujo fue con qué palabra. **BACKLOG G44**, con las dos cosas que habría que
cambiar juntas y lo que cuesta no hacerlo.

17 casos nuevos; 2 costuras verificadas por mutación.

### 2.11 · La parada se dispara por la petición — P12 (FLU-05)

**No había «código del gate»**: la parada es del modelo, instruida por
`instructions/adapt.md`. Y ahí estaba el defecto, escrito: «si **el perfil** o la petición
implican cambiar objetivos o criterios — típicamente un desfase curricular de 2 o más —
para». Eso ancla la negativa en el niño en vez de en lo que se pide.

La consecuencia es la que encontró el revisor con lente de PT: la mayor parte de un
caseload real lleva uno o dos cursos de desfase, y esos alumnos hacen los exámenes de su
grupo con adaptaciones **de acceso** —letra grande, enunciados de una instrucción, más
espacio, contestar hablando— que no tocan ni un objetivo. Es la ACNS de libro que describe
`guide.md`. Una herramienta que se niega a adaptar el acceso de un examen porque el perfil
dice `CUR: 2` se niega al trabajo legal y diario de su usuaria principal en la primera
semana.

Ahora el gatillo es lo que la petición cambiaría, con ejemplos concretos («quita el
ejercicio 5», «pon opciones en vez de que lo explique»), y se dice explícitamente que un
`CUR` alto es razón para adaptar la vía **con más cuidado** y no para negarse.

**Y la ACS registrada desbloquea.** Nada decía qué pasa *después* de una ACS aprobada:
`017` la ingiere y `adapt.md` da precedencia al overlay, pero la parada por CUR≥2 no tenía
excepción escrita para el alumno cuyos objetivos modificados ya están decididos y en
ficha — el único caso en que adaptar a nivel modificado es exactamente lo correcto. Con la
parte que impide que sea un agujero: seguir a ese nivel no autoriza a decidir qué objetivos
se modifican, ni a tocar uno que la ACS no nombre, ni a abaratar un examen cuyo criterio no
esté modificado ahí.

**El código que faltaba era otro del que decía el ítem.** `readGuide` calculaba el tipo de
documento —la pantalla renderiza «esto parece una adaptación significativa» con ese mismo
valor— y **se quedaba ahí**: el overlay guardaba el documento en sus palabras («el DIAC de
marzo») y no lo que era. Así que el único dato que desbloquea el nivel modificado no
llegaba al fichero que lee el modelo, y un alumno con su ACS **ya aprobada por su equipo
docente** recibía la misma negativa que uno sin evaluación ninguna. Ahora viaja hasta
`adaptations.md`, escrito para el modelo y para ella — y `unknown` no se registra como
ninguno de los dos, porque registrar una ACS por si acaso desbloquearía un nivel modificado
sin evidencia, que es la peor dirección para equivocarse en este campo.

12 casos nuevos; 3 costuras verificadas por mutación.

### 2.12 · Un texto de estudio cortado por el techo de tokens se publicaba como completo

**Commit:** `compose: system propio para el contenido y un corte que no se entrega`
**Hallazgos:** AGE-04 (🔴 alta) y AGE-07 (🟠 media)

Dos defectos, y los dos vivían en la misma llamada.

**El system era el de aritmética.** `composeContent` recibía `systemPrompt()`, que acaba en
«Devuelve únicamente una línea por ejercicio… sin numerar, sin explicaciones, sin texto
alrededor», mientras su propio mensaje de usuario pedía bloques IR con `data-objective` y
`data-anchor`. Un modelo que obedeciera el system devolvía algo que `parseIR` no entiende: los
dos intentos fallaban, ella pagaba dos llamadas de 4.000 tokens y recibía un error que
diagnosticaba mal el fallo — «se apoyaba en cosas que no me diste. Prueba a darme un poco
más» — y la mandaba a arreglar su ancla cuando la culpa era nuestra.

El arreglo separa las dos cosas que estaban pegadas: `judgementLayer()` (hard-rules +
`compose.md`) llega **idéntica** a los dos caminos, porque es el criterio pedagógico y el
Principio I dice dónde vive; el formato de salida ya no. `contentSystemPrompt()` dice además
qué es la llamada — «material de estudio, no una lista de ejercicios» — para que el modelo no
tenga que deducirlo de un mensaje que sólo describe marcado. Y el error final distingue el
corte del anclaje, porque un diagnóstico equivocado le cuesta también el intento siguiente.

**Y un truncado pasaba los dos checks.** Ningún adaptador leía `stop_reason`, así que un texto
cortado a los 4.000 tokens llegaba con la misma pinta que uno terminado. La red es más fina de
lo que parece: un corte *dentro* del desarrollo de un objetivo deja bloques con su
`data-objective` y su `data-anchor` válidos, y `checkObjectives` no comprueba que cada objetivo
pedido tenga bloques — sólo que no haya objetivos inventados y que haya *algún* bloque. Es
exactamente el fallo que `material-kinds.md` atribuye al tipo `study`, «enseñar menos sin que
se note», generado por nosotros y sin nada que lo vea.

Los tres adaptadores emiten ahora `truncated` — `stop_reason: max_tokens` en Anthropic,
`finish_reason: length` dentro de `choices` en los compatibles, `finishReason: MAX_TOKENS` en
el candidato de Google — el camino de contenido lo trata como un problema más (reintenta una
vez con el problema dicho, y si vuelve a cortarse **no escribe nada**) y le pide que pida menos
de una vez o que lo divida en dos.

En el camino de aritmética el corte se queda sin red **a propósito**: una línea perdida es una
propuesta menos, el bucle vuelve a pedir y `budgetExhausted` ya se lo cuenta. Añadir ahí una
negativa costaría intentos y no evitaría nada.

**Un lateral que conviene decir:** exporté `judgementLayer`, `systemPrompt` y
`contentSystemPrompt` para poder probarlas. Es la lección de `mostUsedFirst` de esta misma
noche — una función que no se puede llamar desde un test es una función que sobrevive a que la
borres.

15 casos nuevos (7 de proveedores contra `fetch` simulado, 8 del camino de contenido); 5
costuras verificadas por mutación: los tres `yield { truncated: true }`, el system del sitio de
llamada y el lector de `chunk.truncated`.

## Saltados y por qué

_(nada todavía)_

### 2.8 · La ACNS ya es un documento, y la firma es lo único que le quita la marca

**Commit:** `la ACNS es un documento: se guarda, se imprime y la firma la desmarca`
**Hallazgo:** COD-22 (🟠 media) · **Decisión:** P46

FR-1516 dice que el borrador «MUST carry the draft mark, removable only by sign-off». Lo
que había: un encabezado dentro de una cadena, volcado en un `div` **sin renderizar el
Markdown**. Nada lo guardaba, no había impresión, y `job:signOff` firma lo que resuelve
`resolveDocument` — por (trabajo × alumno) — así que una ACNS no era resoluble y **no
existía firma capaz de quitar la marca**.

Lo que me parece que hay que decir de este hallazgo es que su mitad «conservadora» no
era la segura. Una marca que no se puede quitar es una marca que se sortea, y sortearla
aquí es exactamente lo que pasaba: el flujo real era copiar el texto a mano a Séneca, con
la marca perdida en el copy-paste y sin que nadie hubiera revisado nada. La dirección
prudente producía el peor resultado posible.

**Ahora es un documento.** `profiles/<code>/acns.md`, con front matter `kind: acns` —
deliberadamente **no** `generated: true`, que es lo que decide si algo es material
compuesto y ofrecería una ACNS para imprimirla como una hoja de un niño.

**La marca va en el cuerpo, y eso es distinto de una hoja.** En una ficha el banner es
cosa del renderizador y `ir.md` no lo lleva, porque nadie reparte `ir.md`. Aquí **el
fichero es lo que viaja**: es el que ella abre y del que copia. Una marca añadida al
imprimir estaría ausente del único artefacto que llega a Séneca.

**Y la firma es lo único que la quita.** `signAcns` cambia el encabezado y borra el
bloque «Sin firmar», y deja en pie lo que la firma no cambia — «el registro es Séneca» y
«la coordina el tutor» siguen siendo verdad con firma o sin ella, porque Rampa no puede
presentar nada. Si el fichero ya no tiene la marca (lo ha editado a mano en Obsidian y
se la ha llevado) **se niega** en vez de estampar una firma sobre algo cuyo estado no
puede establecer: la dirección de `resolveInVault`, negarse antes que sanear.

**Una firmada no se sobreescribe nunca.** Va a pulsar «guardarla otra vez» — el
trimestre avanza y el borrador se arma con trabajo que ha crecido — y machacarla
destruiría el único registro de que alguien la revisó. Pasa a `acns.r<n>.md`.

**Dos cosas que encontró de paso, y las dos son del tipo que este proyecto ya conoce:**

- **El PDF sobrevivía a un borrado.** Lo escribí primero en `output/acns/<code>/acns.pdf`
  siguiendo «los renderizados van en `output/`». `planForget` borra
  `output/<job>/<code>` por cada trabajo de `material/`, y «acns» no es un trabajo, así
  que nada llegaba a ese directorio; y `verifyForgotten` busca el código **dentro** de
  los ficheros, así que un código que sólo está en la ruta le es invisible. La
  adaptación curricular de un niño, impresa, quedándose en su carpeta después de
  «bórralo todo». Ahora vive dentro de `profiles/<code>/`, que el borrado elimina
  entero — cubierto por construcción y no por acordarse, que es exactamente cómo
  `handover/` llegó a sobrevivir un borrado hasta la revisión pasada.
- **Un campo sin etiqueta accesible**, «¿De qué documento es?», en la misma pantalla.
  Lo encontré porque el `getByLabel` de mi propio e2e no encontraba el campo de la firma
  — que tenía el mismo agujero por el mismo motivo: el `label` de `Field` es opcional,
  así que olvidarlo compila y se ve bien. Los dos etiquetados.

**Y una costura que reforcé en vez de duplicar.** El guardián de FR-509 enumera los
ficheros que pueden firmar, y mi cambio lo puso en rojo — que es la conversación que esa
lista existe para forzar. No lo he metido por `job:signOff` (haría que un documento
administrativo se hiciera pasar por una hoja preparada para un niño, y entonces sería
imprimible como tal), pero sí he sacado el bloque de la firma a `stampSignedOff` en el
núcleo: **un solo autor** de `signed_off: true`, dos llamadores, y un test nuevo que lo
comprueba sobre todo el código. Dos ortografías de esa clave serían una que se desvía, y
lo que depende de ella es si un documento anuncia que nadie lo ha revisado — se
desviaría **abriendo** la puerta.

30 casos nuevos (24 unitarios + 6 e2e que pulsan los botones, porque el defecto era el
cableado y ningún test unitario puede fallar por eso); 8 costuras verificadas por
mutación.

### 3.1 · `027` implementada — el examen y los problemas dejan de ser un escaparate

**Commits:** `027 · el núcleo determinista…` y `027 · el tipo elige el pipeline…`
**Decisión:** P2 («construir la generación ya, no atenuar las puertas»)

Dos de los cuatro tipos de material se ofrecían en pantalla, se cobraban y **no se
podían producir**: el pipeline sólo sabía hacer listas de operaciones y texto de
estudio, y la nota de discrepancia saltaba siempre como una disculpa automática. 25 de
las 27 tareas hechas; las dos que quedan necesitan una persona.

**Las cantidades salen del enunciado que lee el niño.** La implementación barata pide
al modelo que declare sus cantidades y las verifica — que es verificar al mentiroso con
su propia declaración: uno que se equivoca en la cuenta puede declarar cantidades
coherentes con su resultado equivocado y pasar todas las pruebas. Así que
`extractQuantities` las saca del texto, la operación se admite **sólo si todos** sus
operandos están ahí, y la respuesta la calcula el verificador aritmético de `002`. Se
rechaza, nunca se repara: un enunciado reescrito por código no es la historia de nadie.

Lo que esto **no** verifica está dicho en voz alta: que la historia implique la
operación. «Tres melones a 40 €» cuadra perfectamente. Lo tapan capas, no un truco: la
operación tiene que ser la que ella pidió, el informe dice qué se comprobó, la marca de
borrador se queda, y SC-2505 pone a una PT delante. Verificar pedagogía de forma
determinista no está en oferta, y fingir que sí es el fallo que este proyecto existe
para evitar.

**El examen es un examen.** Su propio formato de bloques, preguntas numeradas, hueco
para contestar, y **cero respuestas en ninguna modalidad** — asertado sobre la salida
renderizada (HTML, ODT, lineal) y no sobre el IR, porque el IR ya no las escribía desde
`002` y lo nuevo son tres renderizadores y una capa de apoyo. Las preguntas que nada
puede comprobar se llevan **declaradas**, por ítem, en la página y junto a la marca:
una hoja que dice «hay preguntas sin comprobar» le enseña a desconfiar de las diez, y
entonces no revisa ninguna.

**Y un examen de otro curso para antes de gastar.** Componerlo por debajo de su curso
no cambia CÓMO se evalúa: cambia QUÉ se evalúa, y eso lo decide el equipo docente sobre
una evaluación psicopedagógica. Una ACS registrada es lo único que lo desbloquea — ni
una ACNS, ni una medida que *mencione* una ACS, que es el caso que encontró una
mutación. El gate **no recibe el perfil**, que es la única garantía que vale: un CUR
alto es razón para componer con más cuidado, nunca para negarse.

**Tres defectos encontrados de paso, ninguno del alcance:**

- **La pregunta de «cuántos» no se mostraba nunca, para ningún tipo.**
  `corpus:materialKinds` no enviaba el bloque `quantity` por el IPC. El corpus lo
  declara, el parser lo lee, el tipo lo tipa, la pantalla lo lee — y llegaba
  `undefined` siempre, así que `countsSomething` era **siempre falso**. `perObjective`
  no llegaba nunca y toda composición usaba el default del corpus: **«examen, 10
  preguntas» no era algo que ella pudiera pedir**. Doceava vez de un campo escrito,
  parseado, tipado y leído por nadie (G36) — y la peor colocada hasta ahora, porque es
  justo el requisito del que cuelga FR-2505. Lo encontró un e2e que afirmaba que la
  etiqueta cambia con el tipo y no encontró el campo.
- **«Ojo: 4, 5 no las ha comprobado nadie»** empieza diciendo *cuatro coma cinco*. En la
  única hoja cuyo trabajo es que se le crea sobre qué se comprobó. Ahora «la 4 y la 5».
- **La hoja de problemas no tenía sitio para hacerlos.** Tres historias apiladas arriba
  y dos tercios de folio en blanco debajo. El hueco para contestar era sólo del examen
  porque eso decía la tarea; mirar la página es lo que demostró que la decisión estaba
  mal.

Los tres los encontró **mirar la página impresa** — construida con un fixture, exportada
a ODT y convertida con LibreOffice, sin proveedor. Lo que **no** he mirado: el HTML en
pantalla a 480px y en `xlarge`. Rasterizarlo necesita un navegador que el Playwright de
esta máquina no ha descargado, y `npm run shots` fotografía la aplicación, que no puede
componer sin proveedor. Queda dicho como hueco, no dado por cubierto.

**Dos desviaciones de plan.md, argumentadas y no coladas:** no hay clases `problem` ni
`question` en el IR. `BlockClass` es cerrado y las recetas seleccionan sobre él, así que
una clase a la que nada apunta dejaría cada hoja de problemas y cada examen compuesto
**fuera del alcance de toda receta** — adaptarlos no aplicaría nada, que es este mismo
defecto una capa más abajo. Un problema es un `exercise`; una pregunta de examen es un
`assessment`, la clase a la que `exam-access-not-difficulty` ya apunta.

66 casos nuevos y 5 e2e; 13 costuras verificadas por mutación — una de ellas encontró
que una aserción mía la satisfacía una regla de CSS, y otra que mi patrón de la ACS
habría desbloqueado el gate con una ACNS que la mencionara.

**Lo que queda de `027`, en manos de una persona:** T025 (correr el paseo con clave real
— cuesta dinero) y T026 (SC-2505: que una PT diga si pondría ese examen delante de su
grupo con su nombre encima).

### 3.2 · `022` implementada — el diagrama que cuenta lo que dice el ejercicio

**Commits:** `022 · la lista blanca y el dibujante` y `022 · el diagrama que cuenta…`
**Decisión:** P21 · **Cierra:** BACKLOG G38

El defecto que este feature evita es concreto: **once casillas al lado de `4 × 3 =`**. Un
niño que se pierde en el enunciado y cuenta el dibujo acaba de aprender que las
matemáticas no cuadran.

**Las cantidades salen del ejercicio ya comprobado y de ningún otro sitio.** No «ignoramos
los números que manda el modelo»: `DiagramRequest` **no tiene campo numérico**, así que
uno que escriba filas y columnas las escribe en nada. Donde los números que dijo no
coinciden con lo dibujado, se dice — «lo he dibujado con las cantidades del ejercicio» —
en vez de corregirlo en silencio, porque una corrección callada es un modelo cuyos
errores ella no llega a conocer.

**El tema lo decide el modelo, y la geometría no lo ve.** Que las casillas sean cartas es
una decisión sobre este niño y ahí el modelo aporta. Que sean doce lo decide el código: no
hay una sola expresión en el dibujante donde el tema o el glifo lleguen a una cuenta o a
una coordenada. Y sin intereses apuntados los dibujos son **sencillos** — un tema al azar
es inventarse un dato de un niño, la misma negativa que `011` hace con la edad.

**El muro es código y no corpus.** Todo el criterio de `022` vive en
`instructions/figures.md` porque cada línea es un juicio que una PT puede corregir. La
lista blanca de marcado no: una frontera de seguridad que se puede editar no es una
frontera (Principio IX). Rechaza **entero** y no limpia — no hay tipo de salida saneada, a
propósito, porque reescribir una entrada con forma de ataque esconde el evento que
interesa ver. Y se revalida en cada renderizado, porque el vault se edita a mano y un
bloque leído del disco es contenido, lo escribiera quien lo escribiera.

**Cuatro defectos encontrados de paso, ninguno del alcance:**

- **`Number('')` es 0**, que es finito. El camino sin verificar pone `answer: ''` — la
  misma rama que mantiene su resultado fuera de la clave —, así que un ejercicio que nadie
  pudo comprobar habría llevado una rejilla al lado. Es literalmente lo que FR-2003 dice:
  la imagen da una confianza que la cuenta no ha ganado. Lo cazó el test antes de que nada
  estampara un diagrama.
- **El tema aterrizaba en `data-theme`**, un atributo. `checkOutput` quita las etiquetas
  porque modela lo que lee el niño, así que un nombre llegado como tema **se quedaba en el
  fichero renderizado, ni cazado ni ausente**, en un documento que ella manda por correo.
  Ahora el renderizador emite sólo los dos atributos que escribió el código; el tema sigue
  llegando a la página por el dibujo y por el pie, que son los dos sitios donde el chequeo
  sí mira.
- **Las cajas de los grupos se leían como una sola.** A cuatro unidades, los trazos
  discontinuos de dos grupos apilados formaban un churro: «cuatro grupos de tres» se
  convertía en «doce en una caja», que es justo la distinción que las cajas existen para
  dibujar.
- **Cada diagrama reservaba 9×6cm.** Una recta ancha y baja y una barra pequeña se
  llevaban el mismo trozo de papel, así que una hoja con cuatro diagramas se iba a dos
  páginas con dos tercios de cada una en blanco. El marco se dimensiona ahora desde el
  `viewBox` del propio dibujo.

Los dos últimos los encontró **mirar la página impresa**. Lo que no he mirado: el HTML en
pantalla a 480px y en `xlarge` — rasterizarlo necesita un navegador que el Playwright de
esta máquina no tiene, y `npm run shots` fotografía la aplicación, que no puede componer
sin proveedor. Queda dicho en `validation.md` como no hecho.

**Y se cierra G38**, que era la deuda de haber citado `022` como «shipped» cuando sólo
tenía spec: `023` T023 vuelve a afirmar su mitad aplazada contra diagramas que ahora
existen — con los dos casos degradados, que es donde una superficie se come a la otra — y
la cita de `022` FR-2008 en `pictograms/fetch.ts` nombra otra vez una regla implementada.

124 casos nuevos y 7 e2e; 12 costuras verificadas por mutación, dos de las cuales
encontraron huecos en mis propios tests (cada caso de atributo malo lo cazaba también una
regla de valor, y la guarda de grupo-sin-verificar de `buildSheet` no tenía test).

**Lo que queda de `022`, en manos de una persona:** T023 (una fotocopiadora de verdad),
T024 (que una PT diga cuál de las dos hojas pondría delante del niño) y T025 (el paseo con
clave real: ningún diagrama de este proyecto lo ha producido todavía un modelo).

## Notas de proceso

- **La instancia que me pediste, y por qué la he reiniciado.** La levanté con `npm run dev`
  y la estuviste usando. El problema: `electron-vite dev` recarga el *renderer* en caliente
  pero **no** reconstruye el proceso principal, así que en cuanto empecé 2.8 tu ventana tenía
  la pantalla nueva llamando a canales IPC que aún no existían en el main — botones que dan
  error. La paré para correr el e2e (que empieza por `npm run build` y escribe en el mismo
  `out/`) y la he vuelto a levantar entera con 2.12 y 2.8 dentro. Si la vuelves a necesitar
  después de un cambio mío, avísame y la reinicio: mientras yo esté tocando el main, una
  instancia en caliente se queda a medias.
  **Y al final la he levantado de otra manera, porque en modo dev no sobrevive a mi
  trabajo.** `npm run test:e2e` empieza por `npm run build`, que escribe en el mismo `out/`
  que vigila `electron-vite dev` — y a las 12:18 el dev server se murió por eso, en medio de
  `027`. Ahora está levantada como **aplicación construida** (`npx electron .` desde `app/`,
  tras `npm run build`): sin watcher, así que un build posterior no la toca — el proceso ya
  tiene su JS cargado y nada lo recarga. No hay recarga en caliente, que para enseñarla es
  lo que se quiere.
  Un detalle que me costó dos intentos: hay que lanzarla con `npx electron .` y **no** con
  `npx electron out/main/main.js`. Con la ruta al fichero, Electron no encuentra el
  `package.json` de la app, `app.getName()` cae a «Electron», `userData` pasa a ser
  `~/Library/Application Support/Electron` — y la aplicación arranca sin recordar ningún
  vault, así que te pide elegir carpeta como si fuera la primera vez. **No es un defecto del
  producto**: la app empaquetada lleva su propio nombre. Es una trampa de cómo se lanza, y la
  dejo escrita porque el síntoma («no recuerda mi carpeta») parece grave y no lo es.
  Y otro que ya conocía: matar `electron-vite dev` **no**
  mata el Electron que lanzó. Se queda vivo con el candado de instancia única
  (`requestSingleInstanceLock`, `main.ts:142`), así que el `npm run dev` siguiente arranca,
  dice «start electron app…» y **sale con código 0** sin abrir nada. Hay que matar los dos.
- **e2e de 2.12: sí ejecutado**, en la vuelta completa de 2.8 (135 casos verdes).
- **`.agents/skills/` apareció sin pedirlo** (10 ficheros, espejos de `.claude/skills/` para
  otros agentes). No los he comiteado: no son de ningún ítem de la cola y meterlos con 2.12
  sería mezclar. Están sin trackear, decides tú.

## Preguntas para Carlos

- **0.2 · Validación de protección de datos (P38, tu propia condición).** El código hace lo
  que pedía el hallazgo y está cubierto por tests, pero *si el resultado satisface el derecho
  de supresión de datos de un menor* es un juicio de protección de datos, no un resultado de
  test. Queda pendiente que lo revise quien lleve protección de datos / legal antes de que
  esto se pueda presentar como cumplimiento. Anotado también en `validation.md`.
- **0.2 · Una decisión que tomé yo y conviene que confirmes.** Retiré `status: 'forgotten'`
  del enum del roster. Razón: nadie lo escribía nunca *y no se puede usar* — una fila con
  lápida sigue llevando el código, así que `verifyForgotten` la reportaría como residuo para
  siempre. Si querías que el roster guardara memoria de que hubo un alumno, eso vive en
  `.rampa/erasures.md` (fecha + código, nada suyo dentro). Dime si preferías otra cosa.

## Estado de la verificación

| | |
|---|---|
| `npx tsc --noEmit` | verde (línea base) |
| `npx vitest run` | verde — 1.926 casos |
| `npm run test:e2e` | verde — 147 casos |
| `scripts/check-fr-coverage.sh` | verde (línea base) |
| `scripts/check-spec-kit.sh` | verde (línea base) |

---

**Lotes 0, 1 y 2 completos (5/5 · 17/17 · 12/12); Lote 3 con `027` y `022` implementadas.**
Quedan **3.10** (`020` US2-US4), **3.13** (notas de BACKLOG) y **9 features** por
`/speckit-implement` en el orden 026→031→032→028→035→033→029→030→034.
