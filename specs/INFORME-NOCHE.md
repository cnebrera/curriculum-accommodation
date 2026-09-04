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

## Saltados y por qué

_(nada todavía)_

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
| `npx vitest run` | verde — 1560 casos |
| `npm run test:e2e` | verde — 122 casos |
| `scripts/check-fr-coverage.sh` | verde (línea base) |
| `scripts/check-spec-kit.sh` | verde (línea base) |

---

**Lotes 0 y 1 completos; Lote 2 en 3/12.** Quedan 11 ítems de la cola (Lote 2: 9 · Lote 3: 2 abiertos + 11 features por implementar).
