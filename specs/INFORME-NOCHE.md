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

### `020` · El alumno es el sitio — **completa** (28/28 requisitos, 40/41 tareas)

Los pasos de «Preparar» viven dentro del alumno y la puerta está retirada. Lo que hay
hecho: las dos ramas como iguales sin ninguna preseleccionada, el tipo de material como
paso propio y sin defecto, traer el material y comprobar la lectura dentro de la sección
con el raíl del alumno a la vista, «¿para quién más?» con el que entró ya en el lote, y
salirse a mitad sin que nadie te retenga.

**El estado de navegación se mudó a la ruta**, y eso es la corrección de fondo: los dos
defectos que este proyecto ha encontrado en su propia navegación —la puerta olvidando qué
niño era al pulsar «Volver», «Mis alumnos» sin efecto desde dentro de un perfil— eran los
dos estado sostenido en una pantalla que navegar destruye. `App.tsx` pierde el reductor
`intent` y la máquina de vistas; el reductor de ruta es ahora el único que sabe dónde
está.

**Y lo que encontró retirar la puerta.** El checkpoint de T028 dice «la puerta se ha ido y
nada de lo que hacía se ha perdido». Al borrar las pantallas era **falso**: el paso 2 trae
un fichero, así que el cuadro de pegar texto —que estaba en la pantalla a la que la puerta
llevaba directa— se había quedado sin ruta. Una maestra con el texto ya en la mano tenía
que fotografiar su propia pantalla. `IngestScreen` ofrece «Ya lo tengo en texto», que se
salta el paso 3 (de un texto que ella tiene delante no hay lectura que comprobar) y **no**
el paso 4, que se llevaría el lote entero por delante; apuntarlo a `review` tira tres
casos de `profile-gap`, así que la costura está observada.

Los 233 e2e son la especificación ejecutable de esta navegación y estaban centralizados en
`nav.ts` justo para esto: ocho ficheros que navegaban a mano se arreglaron arreglando el
helper. `door.spec.ts` pasa a `prepare.spec.ts` con sus seis casos reescritos y **ninguno
borrado** — un caso que se va con la pantalla que recorría es un requisito que se cae en
silencio. Dos aserciones cambian de forma y las dos lo dicen donde están escritas: el
`aria-pressed` de las ramas (ya no son una selección, son una salida) y FR-1408, donde el
alumno ya no se puede perder porque se está dentro de él. El caso «US1 no quita nada: la
puerta sigue ahí» se **invierte** en vez de borrarse.

**El coste del lote, dicho antes de pulsar** (T024). FR-515 —«tres hojas normales pueden
ser una factura anormal»— ya estaba; FR-514 no. La única cifra de la pantalla era la del
aviso de coste inusual, y ése por definición sólo habla cuando la respuesta es «más de lo
normal», así que el lote ordinario se tiraba sin cifra ninguna. La aritmética del lote se
salió del renderizador —estaba junto a un `20_000` mágico— a `batchPromptChars`, así que
la cifra que ella lee y la que juzga el aviso no pueden discrepar.

**El paso 5, y una barrida que parecía completa** (T025). Firmar ya era por alumno; lo
que faltaba era cobertura. «Ningún control firma más de un documento» recorría las
pantallas de nivel superior, y el nivel superior sólo llevaba a la puerta —que no ofrecía
firmar nada—, así que las pantallas donde un lote de tres existe de verdad no estaban en
la barrida. Ahora recorre el flujo, y la mutación la movió un paso más: un «Firmar todas»
plantado en la pantalla de pegar la tira, pero el mismo control en la de comprobar la
lectura **sobrevivió** — que es justo desde donde se tira el lote.

**El trabajo a medias encuentra a su dueño** (T006/T007/T026/T027). La premisa de toda la
aplicación es que la van a interrumpir, y hasta ahora una lectura a medias sólo aparecía
dentro de la pantalla de traer material, a la que se llega empezando algo nuevo. El
miércoles ella no se acuerda de para qué niño era la ficha del martes: la marca está en
su lista, con cuánto le falta. `for_learner` se estampa al crear el trabajo —el único
momento en que se sabe gratis— y una sola pasada de `material/` contesta quién y cuánto
(FR-1828). Lo que no es de nadie —**todo lo de cualquier vault de hoy**— sale en la
portada y pregunta de quién es; su respuesta se escribe para no preguntárselo dos veces, y
el estampado sólo **rellena un hueco**.

**La adaptación significativa sigue negándose desde su sitio nuevo** (T031/T032). Y esto
merece decirse: esa pantalla **no tenía ningún e2e**, así que «al mudarla sigue
negándose» era una suposición durante toda la mudanza. Sus dos cerraduras están ahora
afirmadas desde el menú del alumno y verificadas por mutación.

**Dos destinos, exactamente dos** (T033-T037). Era lo que `025` había aplazado con un
motivo escrito: las entradas no podían quitarse antes de que su contenido tuviera a dónde
irse. «Mis notas» se parte por su propio `scope` —el diario lo lleva desde `003` y la
pantalla lo ignoraba, así que lo que Rampa había aprendido de un niño no se podía leer
donde se habla de ese niño— y lo de ella es el apartado «Cómo trabajo yo». Las tres FRs
aplazadas pasan a cumplidas en el texto de la spec, con la nota de aplazamiento **sin
borrar**: es el registro de un requisito que se sostuvo.

**Mirarlo** (T038) encontró tres cosas: el `status` del diario saliendo en crudo como
«open» en una pantalla en español; `intoNamedLearner` filtrando por subcadena, así que
«Alumno 1» abría a «Alumno 19» —un helper que abre al niño equivocado en silencio, y van
dos sesiones de depuración a cuenta de ese valor por defecto de Playwright—; y el orden de
la portada con treinta alumnos, que no ordena por ejes pero cuesta barrer. Ese último es
decisión de producto: anotado en G54, no tomado.

**Queda T040**, abierta a propósito: un recorrido con clave de verdad. Necesita dinero y
una persona.

### Cola 3.13 · las tres menores, registradas

Las tres respuestas de Carlos eran «al BACKLOG» o «proyecto propio», así que lo entregable
era registrarlas con lo que hay que decidir antes de escribirlas: **G55** (nota para casa),
**G56** (CUR bidireccional y enriquecimiento) y **G57** (corpus core en español).

La mitad accionable de P28 ya estaba hecha —la regla dura 12 se corrigió en el Lote 1—, y
comprobar las cifras del hallazgo antes de copiarlas encontró algo peor de lo que decía:
contaba diez recetas core y hoy hay dieciocho, con **las tres últimas en español**. El
corpus core es bilingüe por acumulación y no por decisión, así que una PT que abra la
carpeta encuentra tres ficheros que puede corregir y quince que no — y cada spec nueva que
añada una receta ensancha la grieta.

### Fuera de la cola: `025`, `024` T022 y `012` FR-1010

La cola quedó a cero y eso no era «todo»: había 22 tareas y 9 requisitos abiertos en cinco
specs, y no todas eran de dueño humano. Cerrado lo construible.

**`025-pictogramas-tienen-su-sitio` — completa (15/15).** Cuatro requisitos se habían
quedado sin afirmar, y son justo los que se rompen sin ruido al mover algo. Lo que enseñó:

- **T009 tenía la nota obsoleta.** Decía «Not done» y era falso: `lastProgress` vive junto
  al `AbortController` y la pantalla lo pregunta al montarse. Su propia lección — una nota
  que registra un defecto hay que revisitarla cuando se arregla, o se convierte en una
  afirmación que el repositorio hace sobre sí mismo y nadie comprueba. Lo que **sí**
  faltaba era un lector: la derivación vivía dentro de un componente que esta suite **no
  puede montar** (el entorno es `node`, así que un render estático sólo ve el primer
  fotograma de un `useAsync` — exactamente el fotograma en el que la lectura al montar
  todavía no ha pasado).
- **El silencio se cuenta, no se supone.** Abrir Configuración tres veces con el contador
  de `035` en las dos pilas: una sola visita no distingue «no pide nada» de «lo pide una
  vez y lo cachea».
- **`axe` a tres anchos** va en `a11y.spec.ts` y no copiado, porque ese `scan()` inyecta
  axe-core por un motivo escrito (Electron contesta `Target.createTarget: Not supported`) y
  dos copias lo llevarían en una sola.
- **Mirarlo encontró una cosa:** el aviso de la licencia seguía diciendo «Necesita tu
  decisión» después de que ella decidiera. Segunda vez que aparece este defecto —`020` lo
  corrigió en la portada—, así que la regla merece decirse: `decide` es para una pregunta
  que la espera, no para un asunto que sea serio.

**`024` T022 — la mitad afilada, y una pregunta.** La tarea daba por bueno «por
construcción» que su vocabulario viaja y la aceptación de la licencia no. «Por
construcción» es lo que eran los doce campos que nadie leía, y las dos cosas están a un
refactor de intercambiarse. Si la aceptación viviera en el vault, una compañera que
recibiera su carpeta encontraría los términos de ARASAAC **ya aceptados por otra
persona**, y `023` FR-2104 hace de la aceptación la puerta previa a traer nada — una
puerta que llega abierta dentro de un zip no es una puerta. Afirmado por contenido sobre
todos los ficheros del vault. La otra mitad **no está construida** y queda como pregunta.

**`012` FR-1010 contaba como abierta y no lo estaba:** una sola casilla sobre dos
requisitos, y el aplazado arrastraba al otro. Partida. Y se puede afirmar *porque* FR-1009
está aplazada, en la forma más fuerte que hay: no es que el código elija no separar las
páginas, es que **no hay dónde ponerlas** — `jobIR(job)` no toma índice de parte.
Afirmado también sobre su **aridad**, que es lo que cambiaría el día que alguien implemente
las partes, para que ese día sea una decisión y no un parámetro que aparece.

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

### 3.3 · `026` implementada — «casi» cuesta un turno, no una re-ejecución

**Commits:** `026 · una sola mecánica de revisiones…` y `026 · el turno…`
**Decisión:** P24

**La garantía de todo el feature es el orden.** Las puertas corren sobre un candidato en
memoria; sólo cuando todas han pasado se archiva el fichero anterior y se escribe el
nuevo. Así que un fallo del proveedor, una negativa, una salida rechazada o un cierre a
mitad dejan el vault **byte a byte** como estaba. «Completa o ausente» es entonces una
propiedad del orden de operaciones y no de una ruta de limpieza — y una ruta de limpieza
es algo que tiene que ejecutarse.

**Lo que cambió lo dicen los dos ficheros, nunca el modelo.** A un modelo al que se le
pregunta qué cambió contesta con seguridad, incluido sobre cambios que no hizo — el
mismo fallo que `004` cerró para los informes y `014` para las fechas. Y aquí importa
más: «¿qué ha cambiado?» es la pregunta con la que ella decide si mirar la hoja, así que
un resumen equivocado a su favor es un resumen que hace que no mire. El diff habla en
ejercicios y enunciados, y **los cambios de cantidad llevan frase propia** porque tiene
la hoja de soluciones en la mano.

**Una firma no se mueve.** Vive en el front matter del documento, así que restaurar una
revisión firmada restaura un documento firmado sin que nadie tenga que mover nada —
mover una firma es precisamente la operación que la pondría encima de algo que nadie
leyó. Y restaurar **archiva** en vez de borrar: «volver a la uno» no le cuesta la tres.

**Una sola mecánica de revisiones.** `nextRevision` (para `adapted.rN.md`) y
`nextComposedRevision` (para `ir.rN.md`) eran la misma aritmética con otro nombre de
fichero — la deriva que la investigación de `021` avisó, una feature más tarde. Escribir
el turno contra cualquiera de las dos habría hecho la tercera; las dos convergen.

**Dos agujeros del detector de inyección, y son de este feature.** El fixture número once
no es material de fuera: es **un documento que escribió Rampa**, un turno antes, a partir
de la salida de un modelo. Si la salida de un turno pudiera colar una instrucción en el
siguiente, la conversación sería un canal para que un modelo se hable a sí mismo entre
turnos con el nombre de ella en los mensajes. Encontró dos cosas:

- **«Instrucción para el siguiente turno» no tenía destinatario.** No hay «ordenador» ni
  «sistema» en esa frase: `026` le dio al modelo una manera de nombrar al programa que
  antes no existía. Ahora «siguiente turno» es destinatario — **la frase y no la palabra
  suelta**, porque «es tu turno» y «por turnos» son castellano de aula, y un detector que
  marca fichas de juegos de mesa es un detector que se ignora en una semana.
- **«Puedes *dar* el documento por revisado» se colaba.** El patrón sólo conocía el
  imperativo («da», «marca»), y el castellano tira del infinitivo constantemente.

Los dos aislados con sus propios casos, después de que la mutación mostrara que un solo
fixture no podía fallar por una razón a la vez.

**Y mirar el panel encontró dos cosas más:** los turnos corrían juntos como lista de
viñetas — la línea de coste de uno pegada a las palabras de ella en el siguiente, así que
«lo que pedí» y «lo que pedí después» se leían como un bloque — y la fecha salía en ISO
donde el resto de la aplicación las escribe a la española. Lo que sí lee bien es la
negativa: dice qué ha entendido, qué cambiaría de lo que se evalúa, y **qué sí puede
hacer en su lugar**. Se lee como Rampa protegiendo su criterio y no como Rampa
desobedeciendo — aunque eso es mi lectura y no la de una PT, que es T032.

66 casos nuevos y 7 e2e; 10 costuras verificadas por mutación.

**Lo que queda de `026`, en manos de una persona:** T031 (el paseo con clave real: ningún
turno de este proyecto lo ha completado todavía un modelo) y T032 (que una PT diga si el
camino de vuelta se encuentra sin que se lo señalen).

### 3.7 · `031` implementada — el dato que no llegaba al disco, y el segundo eje

23 de 23 tareas, dos commits. Y el hallazgo no está donde lo buscaba la spec.

**`024` FR-2218 llevaba un año dicho y no hecho, pero el fallo era anterior.** El aviso
que faltaba («si cambias un dibujo, las hojas que ya hiciste quedan marcadas») no se podía
construir porque **el dato no existía en el disco**: `applyPictograms` marcaba
`data-picto` en el documento *parseado* y `adapt.ts` escribía `result.out`, la salida
cruda sin marcar. El documento marcado sólo alimentaba el informe, y el informe guarda
palabras sin ids.

Lo que lo convierte en defecto y no en función pendiente: `print.ts` **leía `data-picto`
de vuelta del fichero**, bajo el comentario «lo que va en la hoja se decidió al
adaptarla». Una lectura de un valor que nadie escribe — G36 con la escritura y la lectura
separadas por un fichero, que es exactamente por qué el compilador tampoco lo veía.
Ningún test lo cazaba porque ninguno hacía el viaje adaptar → disco → imprimir: el e2e se
paraba en el corpus y el test de shell afirmaba sobre la lista `used` en memoria.

**La lección no es «más tests»**: un test que afirma sobre el mismo valor en memoria que
el código acaba de calcular no puede saber si ese valor se escribió alguna vez. Cuando un
dato cruza un fichero, el test tiene que cruzarlo. Anotado como BACKLOG G45.

Con el dato en disco, el resto se deduce:

- **Un solo modelo con dos ejes** (`ir/freshness.ts`) y **una sola función que los
  deriva**. La fila del expediente y la pantalla de verificación llaman a
  `sheetFreshness`; nadie más. Hay un test que lo afirma **enumerando los llamantes**,
  porque un tercer llamante es donde se escribe la segunda definición de
  «desactualizada». Su primera versión buscaba «`data-picto` cerca de un `!==`» y señaló
  `render/attribution.ts`, que compara contra `''` para preguntar «¿lleva esta hoja algún
  pictograma?». Un patrón lo bastante laxo para cazar eso es un patrón que se silencia en
  vez de obedecerse: ahora es una lista de lectores con un motivo por entrada.
- **Dos frases, nunca una fundida.** «Se hizo con una lectura que cambiaste» y «lleva un
  dibujo que ya no usas: casa» son hechos distintos con remedios distintos —volver a
  verificar la lectura, o volver a preparar la hoja— y una sola palabra es donde uno
  esconde al otro. Así estuvo FR-2218 «satisfecho por un comentario» un año.
- **El número que se le enseña antes de decidir sale del mismo derivador**, con esa
  palabra puesta a lo que va a elegir. «2 hojas» es por construcción lo que el expediente
  enseñará después, no dos funciones que coinciden hoy.
- **Las hojas no se reescriben.** El e2e compara los **bytes** de una hoja firmada a
  través del cambio. Es la razón por la que `005`'s `stale_since` nunca se construyó, y
  ahora ese documento lo dice: cambiar de opinión sobre un dibujo no puede editar un
  documento que la PT ha firmado.
- **Un vault que nunca los registró contesta «no lo sé», jamás «al día».** La versión del
  vault (P50, hecho en 1.17) es lo que distingue «esta hoja no llevaba pictogramas» de
  «nadie lo apuntó».
- **Las tres frases falsas dicen ahora lo que pasa** —la pantalla, el fichero
  `vocabulario.md` de su vault y un comentario— con un test que prohíbe que las viejas
  vuelvan a `ui/` o `core/`. La del vault importaba más: ese fichero sobrevive a la
  aplicación.

**Dos defectos los encontró mirar, no los tests.** El recuento recorría cada entrada del
directorio de un trabajo como si fuera un código de alumno, `ir.md` incluido, y leía
`material/job-a/ir.md/adapted.md`: lo cazó el e2e con un `ENOTDIR`, y se arregla
recorriendo con `learnersOf`, el enumerador del propio expediente — dos enumeraciones de
«qué alumnos tiene este trabajo» es el mismo defecto que dos definiciones de «stale», un
directorio más arriba. Y al hacer las capturas (T022): el aviso salía **arriba de la
sección**, no en la fila donde ella acaba de pulsar. Con un vocabulario tan largo como su
curso, pulsar «dejar de elegir» en la palabra treinta ponía la respuesta fuera de
pantalla — un botón que no parece hacer nada. Ahora sale en la fila. También cayó un
`? 'usas' : 'usas'` en la fila del expediente: un ternario con la misma cadena en las dos
ramas, G36 en una línea.

`024` FR-2218 y BACKLOG G35 quedan cerrados con fecha y puntero; `005/data-model.md`
lleva su enmienda fechada.

38 casos nuevos y 5 e2e; 6 costuras verificadas por mutación.

**Lo que queda de `031`:** nada. Es la primera feature del Lote 3 que no deja tareas en
manos de una persona — no porque se haya recortado, sino porque ninguno de sus
requisitos necesita una clave real ni el juicio de una PT.

### 3.8 · `032` implementada — el desfase vive donde vive el desfase

21 de 22 tareas, cinco commits. La abierta es SC-3004 y necesita una maestra con un
cronómetro; está dicha como pendiente, no doblada dentro de otra.

**El caso de la revisión era irrepresentable.** La constitución justifica el Principio V
con «un alumno necesita cosas distintas en asignaturas distintas», y el perfil tenía un
solo nivel curricular: bien en Lengua y dos cursos por debajo en Mates o bloquea todo o no
dice nada. Ahora `cur_areas` va **al lado de `axes`, nunca dentro**, y eso no es estética:
anidado, el esquema de una versión anterior apartaría el objeto `axes` entero por
malformado, y un alumno sin ejes no selecciona ninguna receta — cada adaptación apagada,
en silencio, en el portátil de quien no haya actualizado. Hay un test que simula ese
lector.

**La baseline primero, y sin tocarla después.** Lo que hace hoy un perfil con un solo CUR
—la búsqueda, la selección de recetas sobre el corpus real, la línea del prompt, el mapa
del renderer y el fichero en disco— escrito verde contra código que no había oído hablar
de áreas. Sigue byte a byte igual (`git diff` vacío) y en verde: es la prueba de SC-3002,
y una baseline escrita cuando el campo ya existe se escribe para encajar con él.

Lo demás es pequeño a propósito:

- **Un solo `curFor`.** Un fallback derivado dos veces son dos fallbacks, y el que se
  escribiera `?? 0` afirmaría que un niño está al nivel de su curso en un área que nadie ha
  evaluado.
- **El valor no calcula ningún año.** Decide si el respaldo silencioso al curso matriculado
  es honesto. `matriculado − 2` sería un número inventado en la hoja de un niño, justo el
  que una maestra no puede comprobar de un vistazo.
- **Preguntar no bloquea.** A 2 o 3 se le pregunta con su propia nota devuelta; en blanco
  compone igual. Una parada obligatoria por CUR sería la parada anclada en el perfil que
  P12 retiró, renacida más fina — y hay un test que la mantiene desatada, en el código y en
  el corpus.
- **La ACNS cita el área de la que se habla.** Antes la de Lengua citaba dos cursos que su
  maestra había apuntado que ahí no existen, en un documento que ella firma. Y sigue sin
  redactar el desfase de la normativa, que sale de una evaluación psicopedagógica: lo que
  ordena es el apunte de ella, dicho como suyo (Principio III).

**Lo que encontró mirar, otra vez más que los tests.** El campo de área era un
`<input list>` con `<datalist>` y **la primera tecla real mataba el renderer** — su ventana
desaparece a media frase. La suite entera pasaba porque `fill()` de Playwright pone el
valor sin generar eventos de teclado: un test puede escribir en ese campo todo el día sin
abrir nunca el desplegable que revienta. Lo encontró pulsar una tecla a mano en la
aplicación construida. Regla anotada (G47): `fill()` prueba el **estado** en el que acaba
un control, nunca el **acto** de usarlo.

Y dos trampas más del editor, encontradas por el e2e: añadir un área la ponía a 0
—afirmar «al nivel de su curso» de una asignatura recién tecleada— y los botones de nivel
alternaban como los de un eje, así que pulsar 0 para confirmar «Lengua: 0» borraba el par.
El único valor que no podía fijar con su propio botón era justo el que US1 existe para
registrar.

**Y dos lectores que faltaban.** `vaultIsNewer` se escribió con el marcador de versión y no
lo llamaba nadie; ahora avisa cuando otra versión ha tocado la carpeta compartida, que es
el caso de OneDrive que motivó P50. Y `profiles.example/` no lo leía ningún test: los dos
ejemplos llevaban un `notes:` de primer nivel que `saveProfile` descarta, así que una
maestra siguiendo la documentación escribía sus notas ahí y el siguiente guardado se las
borraba (G46).

Dos frases del corpus corregidas de paso, las dos de un diseño anterior:
`instructions/axes.md` seguía poniendo la parada de adaptación significativa en el CUR del
niño, y la fila de CUR de `docs/profile-schema.md` decía «only relevant to significant
adaptation».

50 casos nuevos y 7 e2e; 11 costuras verificadas por mutación — dos de ellas escritas
**después** de comprobar que la mutación no fallaba nada.

**Lo que queda de `032`, en manos de una persona:** SC-3004 (sentar a una maestra ante la
pantalla de perfil, decirle sólo «apunta que va bien en Lengua y lleva dos cursos de
desfase en Mates», y cronometrarlo: menos de un minuto es el criterio). Es el eje que un
tutor actualiza tras una evaluación; si tiene ceremonia no se actualizará.

### 3.4 · `028` implementada — la agenda, la secuencia y la historia

29 de 29 tareas, cuatro commits. Ninguna queda en manos de una persona.

**Lo que faltaba era una puerta, no una capacidad.** Lo primero que monta una PT con un
alumno TEA nuevo no es una ficha adaptada: es el día en una tira, los pasos de una rutina
y a veces una historia sobre una situación concreta. El juego de pictogramas local, el
render determinista y el perfil ya estaban. Es una **tercera entrada dentro del alumno**,
no una opción dentro de «Preparar»: adaptar parte de un documento y componer parte de un
objetivo; una agenda parte de la forma de un día, y por cualquiera de las dos puertas
tendría que contestar «¿qué tipo de material?» y «¿qué tiene que aprender?» antes de
llegar a la única pregunta que importa.

- **El constructor no resuelve nada.** Cada dibujo sale de `matchWord` —override ▸
  vocabulario ▸ juego ▸ nada—, en ese fichero no hay ninguna búsqueda, y hay un test de
  fuente que lo afirma. Una segunda búsqueda es cómo la misma palabra acaba con dibujos
  distintos en una agenda y en una ficha, con las dos pareciendo correctas por separado.
- **Lo guardado es lo que se reimprime.** Reconstruir desde su vocabulario al imprimir
  suena a «mantenerlo al día» y significa reescribir en enero una tira que un niño lee
  cada día encima del lavabo. El fichero no se toca; el expediente sí avisa, que es el
  segundo eje de `031` haciendo su trabajo en el material donde más importa.
- **Negarse antes que adivinar**, y un nombre no recibe ni dibujo ni línea de informe:
  informarlo pondría el nombre de un niño en un informe.
- **La agenda y la secuencia no pueden gastar**, afirmado dos veces: un test de fuente
  sobre los imports y un e2e sobre el libro de gastos, arrancando sin claves. «Cero
  céntimos» también sería verdad de una llamada que falló, así que lo que se comprueba es
  que no entra ninguna entrada.
- **La historia social es la única que llega a un proveedor**, con el criterio en
  `instructions/social-story.md` —primera persona, frases cortas, descriptivas antes que
  directivas, y las cuatro cosas prohibidas— más un ejemplo y un antipatrón. La
  advertencia de detalles inventados se lee de ahí, no se copia.

**Un guardián mío saltó exactamente como estaba diseñado.** Escribí `runStory` en
`jobs/structure.ts`, que es donde lo ponían las tareas, y los dos tests de T010 se
pusieron rojos: un solo `import { sendRedacted }` en un fichero compartido hacía falsa la
frase «una agenda no puede gastar» para los tres tipos a la vez. Su propio comentario
había predicho el movimiento. La línea es ahora una frontera de fichero, y son dos
canales para que ella vea cuál gasta mirando el botón.

**Y salió un fallo de borrado anterior a esta spec** (G48). `planForget` preguntaba
«¿existe `material/<trabajo>/<código>/`?», que es correcto para una hoja adaptada y falso
para todo lo que Rampa escribió *para* un alumno sin adaptarlo: una agenda, y **una
composición que ella no ha adaptado todavía**, que es suya desde `016` T006. Ella pulsaba
«borrar todo lo suyo», la pantalla decía que no quedaba nada, y en su carpeta se quedaba
un fichero con el código de ese niño. Arreglado leyendo `startedFor(ir.md)`, con las dos
direcciones comprobadas. **Queda pendiente de validación de protección de datos**, como el
0.2 de esta misma noche.

Tres cosas más las encontró mirar: la tira imprimía la palabra dos veces (y el primer
arreglo fue un `display:none` que habría dejado el papel bien y a un lector de pantalla
diciéndola dos veces); el hueco declarado salía como un rectángulo vacío que se lee como
una imagen que no cargó; y la entradilla decía «no cuesta dinero y no hace falta internet»
con la historia social tres centímetros más abajo diciendo lo contrario.

75 casos nuevos y 14 e2e; 9 costuras verificadas por mutación. Suites de aislamiento e
inyección verdes.

### 3.12 · `035` implementada — la primera noche no depende de una clave

23 de 26 tareas y **11 de 11 requisitos**, cinco commits. Las tres abiertas están dichas
con su motivo, no dobladas dentro de otra: una necesita una clave real, otra está
bloqueada por `034`, y las dos últimas son veredictos de personas.

**El primer paso del producto era el más hostil**: crear una cuenta en un proveedor,
poner una tarjeta, pegar una clave — y hasta ahora no había forma de ver siquiera qué hace
Rampa sin eso. Ahora hay otra puerta **al lado**, ninguna preelegida (`016`): un ejemplo
inventado de principio a fin, sin conexión y sin gastar. La maestra que llega a las nueve y
media acordándose de un alumno tiene a dónde ir; la que llega con su clave en la mano no
pasa por ninguna ficción.

- **La separación es un directorio, no una bandera.** Un ensayo en su vault detrás de un
  `ensayo: true` estaría a una consulta de meter un niño inventado en un aula real, y «una
  consulta» es un camino que alguien escribe un martes. Todo lo que recibe un `Vault` corre
  sobre la raíz del ensayo sin cambiar, y lo único que decide qué vault es la capa de IPC.
  Por eso «su vault no cambia ni un byte» se comprueba con un **hash del árbol entero**
  antes y después — no «no aparecieron ficheros del ensayo», *nada cambió*.
- **Los dos pasos que costarían dinero se sirven, no se falsean.** Un proveedor de mentira
  es un objeto con forma de proveedor a un refactor de quedar registrado para trabajo real,
  y metería el «como si» dentro de la capa cuyo único trabajo es ser el sitio por donde
  sale una petición.
- **Cero peticiones, en las dos pilas.** Las llamadas a un proveedor salen del proceso
  principal por el `fetch` de Node, no por la sesión de Chromium: un contador sobre una
  sola marcaría cero durante un ensayo entero mientras algo se escapa por la otra. Sólo se
  instala bajo `RAMPA_TEST`, y fuera contesta `null` — un contador ausente y un contador a
  cero son hechos distintos, y el segundo es el reconfortante y falso.
- **La marca es una propiedad del árbol de componentes**, con un test que lee los imports.
  Lo que está en juego no es que se confunda: es que imprima el ejemplo y se lo dé a un
  niño. Por eso los documentos llevan «material de ejemplo» dentro y el papel lo dice
  aunque ninguna pantalla lo dijera.
- **El juego de ejemplo está escrito a mano** —es la única adaptación que verá todo el que
  abra Rampa por primera vez— con **un** fallo puesto a propósito en la lectura. Sin ese
  fallo, la pantalla de comprobar la lectura enseña que es un trámite. Y firma e imprime
  de verdad: un ensayo que se saltara la firma le enseñaría que la firma es un trámite
  también.
- **Dice qué está simulado y qué no**, que es la mitad que se olvida: no puede prometer más
  que el producto y tampoco menos. Dos pasos simulados; el resto —perfiles, expediente,
  comprobar la lectura, aviso de nombres, firmar, imprimir, agendas— funciona hoy sin
  clave.

**Tres guardianes existentes saltaron y los tres tenían razón**: el del corpus de sólo
lectura (leer y escribir son ahora dos módulos), el del tamaño de la superficie Electron
(dos extracciones antes de subirlo 25 puntos, con el motivo escrito) y el del **único
escritor de firmas** — llegué copiando `stampSignedOff` y ahora hay uno y dos que lo
llaman. Ese último es el que más importa: una segunda manera de quitar la marca de
borrador es la firma de una maestra dejando de significar nada, y un ensayo es justamente
donde alguien piensa que una copia es inofensiva.

**Y lo que encontró mirarlo es el hallazgo de la feature.** La primera pantalla de su
primera noche le enseñaba el IR crudo —`--- source: photos ---`, `::: {#b1 .instruction}`—
en la pantalla que existe para convencerla de que esto es una herramienta seria. Y los
`**` y los `#` salían impresos, la misma corrección que `031` hizo una pantalla antes.

52 casos nuevos y 6 e2e; 5 costuras verificadas por mutación, incluida la del contador de
red (una petición metida en el camino del ensayo lo pone rojo).

**Lo que queda de `035`, con su motivo:** T018 necesita una clave real (paseo de pago,
como T031 de `026`); T020 está bloqueada porque `034` no existe todavía; T026 son dos
veredictos que sólo pueden dar personas.

### 3.9 · `033` implementada — la marca de lengua vehicular

24 de 26 tareas y **10 de 10 requisitos**, tres commits. Las dos abiertas son una pregunta
de producto y un veredicto de una maestra, las dos dichas con su motivo.

**El apaño que muere aquí.** Un alumno que llega en marzo sin el idioma del aula no
encajaba en ningún eje, así que se le ponía `LIN: 2` «para que salga algo». Funcionaba
—activaba recetas— y a cambio escribía *dificultad de comprensión lingüística* en un
expediente que le acompaña años. En junio, cuando ya seguía la clase, el `LIN` seguía
puesto: una discapacidad anotada donde había una transición, y no la anotó nadie — la
anotó la falta de un sitio donde poner la verdad. La frontera está ahora escrita y fechada
en `instructions/axes.md`.

- **La marca vive al lado de los ejes, nunca dentro.** Los diez describen barreras que
  viajan con el niño entre asignaturas y años; ésta es un estado con una fecha en la que
  deja de ser verdad. Metida en `AXES` habría fluido a cada `AXES.map` de la aplicación
  —la línea del prompt, el mapa del renderer, la rejilla del editor— y cada uno estaría
  describiendo una transición como una barrera.
- **Ausente, cero, y la diferencia.** Ausente es que nadie miró. `0` es ella diciendo que
  se acabó, con la fecha. Hay un caso que lo prueba: una condición `vehicular<=0` encuentra
  el segundo y no el primero — si fueran el mismo valor, ninguna receta futura podría
  distinguirlos. Y en el editor, pulsar el nivel que ya tiene **borra** la marca, que es
  «no debí marcarlo» y no «se acabó».
- **Cierra la parada P1 en su forma más nítida.** Ese perfil seleccionaba **cero** recetas:
  «voy a hacerte 0 adaptaciones» era lo que se le decía sobre el niño para el que existe
  esta feature. Ahora son tres, y ninguna por un eje — comprobado por el propio
  `job:profileGap`, la pantalla que ella ve antes de gastar.
- **El puente lo resuelve el código o no se resuelve.** La unión es un id de pictograma:
  dos palabras que apuntan al mismo dibujo publicado. Una palabra con dos dibujos no
  recibe nada — «banco» es asiento y entidad, y el significado equivocado en un alfabeto
  que ella no lee es peor que ninguno, porque no puede mirarlo y ver que está mal.
- **Traducir la hoja entera se rechaza con el motivo**, y en `hard-rules.md` y no en las
  recetas: las recetas sólo llegan a quien tiene la marca, y esa pregunta se puede hacer
  de cualquier alumno.
- **Viaja en el traspaso con la fecha en que ella lo escribió**, no con la de hoy: una
  marca de febrero leída en junio habla de un niño con cuatro meses más de idioma.

**Tres guardianes saltaron y los tres tenían razón.** El de pictogramas en recetas: mi
receta los mencionaba para decir que **no** los activa, y el guardián tiene razón por
encima de mi prosa — el cuerpo de una receta es texto que el modelo recibe, así que
mencionarlos es activarlos. El de `028` sobre los lectores del índice del juego, que
ahora nombra `bridge.ts` como cuarto lector legítimo con su motivo. Y **mi propio
tripwire**, escrito vacío antes de que existiera nada, que saltó con el primer lector de
`vehicular.languages`.

**Dos mutaciones sobrevivieron y las dos eran fixtures míos**: el caso de ambigüedad
pasaba porque el árabe no tenía ninguno de los dos dibujos, y el de normalización pedía
«no hay glosa», que es lo que pasa con y sin normalizar. Y dos veces me equivoqué con el
mismo nombre accesible — primero dos botones «Añadir» idénticos en una pantalla, luego un
input y un botón compartiendo nombre.

52 casos nuevos y 6 e2e; 9 costuras verificadas por mutación.

### 3.5 · `029` implementada — Andalucía deja de ser el producto

`757d2be`, `27abe0b`, `157f0ae`, `3acc90d`, `4de4265`, `8680f57`, `9b6962c`, `18d7133`,
`5463fc0` · **28 de 29 tareas, 11 de 11 FRs** · vitest 2.324 · e2e 204

Durante un año Rampa le dijo «Séneca» a todo el mundo. Séneca es la plataforma de
Andalucía; la pareja ACNS/ACS y las Instrucciones de 8 de marzo de 2017 son el marco de
Andalucía. Una maestra de Vigo leía frases sobre una plataforma que no tiene y concluía
—con razón— que esto no estaba hecho para ella. Era además el fallo más difícil de ver
desde dentro: quien lo escribió trabaja bajo ese marco.

**El inventario primero.** Antes de mover un fichero, `no-territory-outside-corpus.test.ts`
fijó los **19 sitios** que nombraban un territorio: cinco de `instructions/` y catorce de
`src`. Escrito como «cero» habría estado rojo y no se habría podido commitear; escrito
como la lista exacta de hoy es el patrón de `selection-baseline.test.ts`, y además guarda
el futuro: un fichero número veinte lo rompe. Hoy la lista está en **uno**, y ese uno está
afirmado con su motivo (abajo).

**Lo que se movió.** `instructions/normative/es-an.md` es ahora Andalucía entera: sus dos
documentos con sus secciones, quién los coordina, qué hace falta antes, las frases que se
imprimen y las palabras clínicas de sus documentos. `guide.md` y `acs.md` son el genérico,
que es un producto y no una versión con los nombres borrados — tiene su propia lista de
secciones (sólo lo que Rampa puede armar de verdad, no la imitación de un formulario real)
y dice por escrito que el procedimiento lo verifica ella con su orientador.

**Lo que un corpus no puede hacer, por estructura y no por vigilancia.** No existe ningún
campo en el contrato que llegue a ninguna comprobación (FR-2709). Un fichero que declare
`exam_rules`, `draft_mark: off`, `redaction: disabled` o un `decline` propio aterriza
entero en `unknown` —que se conserva para que un corpus más nuevo corra en un build viejo,
y no se consulta jamás—. La marca de borrador tampoco: `BORRADOR`, su banner y su marca de
agua son el Principio VII, y una comprobación que un Markdown de un desconocido pudiera
redactar es una que puede vaciar. El corpus dice cómo se **llama** el documento; que es un
borrador lo dice el código.

**La maestra de Sevilla no nota nada.** `andalucia-unchanged.test.ts` fotografió su
borrador con el código de ayer y hoy sale **byte a byte el mismo** salvo la línea de
procedencia — y el test pasa esa línea y la resta, en vez de no pasarla, para que lo que
demuestre sea «la única diferencia es esa línea» y no «no hay diferencia si dejas fuera lo
nuevo».

**Tres cosas que encontró la disciplina y no el diseño:**

- *La mutación.* El test del título firmado pasaba por casualidad: en Andalucía el título
  firmado es el del borrador sin «de » y con mayúscula, así que ignorar `signed_title`
  daba el mismo resultado. Ahora hay un corpus gallego de prueba cuyos dos títulos no se
  derivan uno del otro. Lo mismo con la exclusión de `selection.md`: el parser lo tiraba
  igual por no tener `id`, y quitar la exclusión no rompía nada.
- *El e2e.* Los dos handlers IPC nuevos estaban escritos `(_e, id)` como si `ipcMain`
  pasara el evento, pero `handle()` ya lo quita — así que `select('es-an')` llegaba como
  deselección y **todo salía en genérico**. El test de shell montea `ipcMain.handle` a
  no-op, así que nunca ejerció la aridad. Se ve arrancando la aplicación.
- *Un defecto latente de FR-2710.* Firmar el martes un borrador hecho el lunes, después de
  cambiar de comunidad, lo habría titulado con el territorio nuevo mientras la nota de
  dentro seguía diciendo el viejo. Ahora el documento guarda `signed_title` en su front
  matter: lo que firma es lo que leyó.

**El único acrónimo que queda en el código, y por qué quitarlo sería el error.**
`acsInOverlay` lee la frase que `guideSection` escribe en el `adaptations.md` de un alumno
para saber si sus objetivos ya están modificados — lo que desbloquea componerle un examen
a ese nivel. `029` deja de **escribir** «es una **ACS**», pero los ficheros que ya están en
los vaults la llevan, y una puerta que dejara de reconocerlos empezaría a negar exámenes en
silencio. El inventario lo afirma con su motivo en vez de callarlo.

**El panel y la importación.** Configuración ▸ Normativa, con nada preseleccionado y
«Ninguna, y trabajo en general» como primera entrada y opción de verdad. Traer una que le
hayan pasado son **dos actos**: «Elegir el fichero» lee y enseña —el fichero entero, en un
`<pre>`; un resumen sería Rampa decidiendo qué partes de la política de otro necesita leer
ella—, y «Activarla» es otra pulsación. Con hallazgos el botón no se deshabilita: cambia
de texto a «Activarla de todas formas», porque un botón cuya etiqueta no cambia es un
botón que se pulsa por costumbre.

**El escaneo, y los dos falsos positivos que encontró en nuestro propio corpus.** Los
tiers de `007` y las formas de P18 salen de `detectInjection` —la tercera familia se ha
añadido ahí, así que el pipeline de adaptación también la gana—. La familia propia de
este fichero es «texto que dice autorizar lo que prohíben las reglas duras», y existe para
**contarlo**: FR-2709 ya es estructural. Escaneando `instructions/guide.md` saltaron dos
frases que **describen** la prohibición («un fichero que **dijera** que un examen puede
rebajarse»), que es justo lo que escribe un autor cuidadoso; los patrones afirmativos
llevan ahora un `unless` y los negativos paran en la coma.

**El test del corpus hostil corre con el fichero en vigor**, no sólo parseado: con
`exam_rules.allow_easier`, `draft_mark: off`, `redaction: disabled`, `clinical_terms: []`
y un `decline` propio activados a la fuerza, todas las comprobaciones devuelven
exactamente lo mismo que sin corpus.

**Lo único que falta de `029` es T028**, que no es código: una PT de un segundo
territorio escribiendo su corpus con el contrato delante, sin tocar código. Es la
afirmación que el Principio I se juega en esta capa, y «dónde se atascó» vale más que el
veredicto.

**Y una limitación honesta:** el diálogo nativo de fichero no lo puede abrir Playwright,
así que el e2e recorre todo **después** de que ella tenga el fichero —el rechazo, el
override, lo que el override escribe, y qué hacen las comprobaciones con lo activado— y
la mitad de «enseñar el fichero» está cubierta por su test de unidad y por mirarla. Es la
mitad correcta en la que gastar un e2e: «me ha enseñado el fichero» falla a la vista;
«ha activado una política sin preguntar» no.

### 3.6 · `030` implementada — dos vaults, un niño, y ninguna carpeta compartida

`8263331`, `c567b7c`, `1e265eb`, `4ccb5be`, `41ef001` · **28 de 29 tareas, 12 de 12
FRs** · vitest 2.384 · e2e 220

Lo primero fue un test sobre el nombre de un niño en un fichero que se manda por
correo, escrito contra un módulo que no existía todavía. El corpus del test está salado:
la alumna es «Lucía», sus notas mencionan a «Vega» y a «Marco» —otros dos niños de la
misma clase— y la maestra firma «Ana». La interesante es Vega: una nota sobre Lucía
puede nombrar a otro niño, y un mapa de nombres por ítem sería el emisor decidiendo
quién cuenta como tercero. Y se **redacta**, no se borra: «Con V02 al lado sí» sigue
siendo una observación real sobre cómo trabaja Lucía.

**La puerta es todo el modelo.** Abrir, parsear, escanear, enseñar, guardar y vincular
no escriben nada; `accept` es el único escritor, coge un ítem, y se llega a él pulsando
un botón que está al lado de ese ítem. Lo mejor que le puede pasar a un paquete hostil
es una frase que ella lee y rechaza. Un código que ella no tiene es sencillamente
desconocido —emparejar es un acto humano— y aceptar una afirmación no es cambiar el
perfil: son dos decisiones, y el caso del conflicto existe porque se separan.

**«¿Me lo miras antes de firmarlo?»**, que es la pregunta que la revisión de personas
encontró literal de una tutora. El borrador sale con su marca (derivada del documento,
nunca un parámetro), vuelven correcciones atadas a (trabajo, revisión, huella), y un
desajuste se **declara** nombrando las dos revisiones en vez de aplicarse en silencio.
La firma gana `second_look` como **hecho**: la firma sigue siendo de una persona, nada
lo lee para permitir o impedir firmar, y en el expediente sale como texto y no como
chapa — la diferencia entre «alguien más la miró» y «alguien más la aprobó» es el
requisito entero.

**El vault compartido no existe a propósito**, y es el único requisito que se cumple
porque algo **no** existe — o sea el que deja de ser verdad en silencio. Hay test sobre
el código, la frase está en el paso de onboarding donde alguien elegiría una carpeta de
OneDrive compartida (nombrando la alternativa, porque «no hagas eso» sin «haz esto» se
esquiva), y `docs/memory.md` dice por qué: no hay bloqueo, no hay fusión, y la pregunta
que un modo compartido tendría que contestar primero no tiene respuesta técnica — ¿qué
pasa cuando dos personas firman la misma hoja?

**Lo que arregla del borrado, y que va con la feature.** `planForget` recorría
`handover/` en plano mientras `verifyForgotten` recorre en profundidad, así que
`handover/received/` —que crea esta feature— habría sido un plan que se niega a recoger
lo que el verificador luego reporta como residuo. El hallazgo de P38 un directorio más
abajo, introducido por lo que crea el directorio.

**Cuatro cosas que encontraron las disciplinas y no el diseño:**

- *El e2e.* Los cinco handlers de la segunda mirada aterrizaron **después de un
  `return`**, dentro de otra función: código inalcanzable. `tsc` no dice nada, el test
  que comprueba preload↔handlers los encontró por análisis estático y pasó, y la
  aplicación respondía «No handler registered».
- *La mutación.* Cuatro en el módulo del paquete y tres en la puerta, todas rompen.
- *Mirar la pantalla.* «El traspaso de fin de curso» encima de «Traspaso de Lucía» —la
  misma frase dos veces, invisible mientras eso era lo único en la pantalla—; y luego
  «el 2026-09-11» en la misma tarjeta que decía «10/09/2026».
- *`props-are-read.test.ts`.* Al quitar ese `<h2>`, el prop `name` quedó declarado,
  tipado y leído por nadie. El defecto insignia de este repositorio, cazado **al
  crearse**.

Y un defecto latente que salió al escanear el paquete: `detectInjection` reconstruía
cada patrón como `new RegExp(source, 'i')`, tirando sus banderas propias — así que las
formas de sección que añadió `029`, ancladas con `^…$` y `m`, sólo coincidían en la
primera línea de un bloque. El escaneo de corpus de `029` no lo vio porque recorre línea
a línea; el pipeline de adaptación entrega bloques enteros.

**Lo que falta de `030` es T029**, que no es código: una tutora y una PT de verdad
haciendo la segunda mirada sobre un examen de verdad, por su transporte de verdad, para
ver si el bucle cabe en una semana de colegio.

### 3.11 · `034` implementada — el criterio se trae, y la firma se fue

`2e9ad44`, `f7e6a44`, `b57e352`, `34a32ca`, `74f525c` · **28 de 29 tareas, 11 de 11
FRs** · vitest 2.441 · e2e 225

El corpus viajaba dentro del instalador, así que corregir la tilde de «exámenes» en una
receta significaba publicar una versión de la aplicación y que cada maestra la
reinstalara. Una maestra varada en un fallo del corpus se quedaba varada hasta la
siguiente release.

**Escribí una firma Ed25519 y la retiraste, y tenías razón.** La mitad privada habría
vivido en un secreto de CI — así que cualquiera con acceso de escritura al repositorio
podría haber cambiado `/recipes` y hacer que CI lo firmara. La firma defendía sólo contra
un atacante capaz de alterar lo que sirve GitHub **sin** tener acceso al repositorio ni a
CI. Para esto es un modelo de amenaza inventado, y el coste era real. Y chocaba con el
resto de la arquitectura: `recipes-local/` gana por id, `instructions/` es juicio que se
invita a corregir, y `029` importa corpus normativos que nadie firma.

Fuera ~100 líneas y 14 casos de test. **Lo que quedó**: los hashes como integridad y no
autoría —cazan una descarga truncada—, la comprobación de rutas para que una lista hostil
no escriba fuera de su sitio, el escaneo de inyección antes de que nada gobierne (que pasa
de defensa en profundidad a **la** defensa, así que gana importancia), y que nada gobierna
hasta que ella lo lee y dice que sí.

**La descarga va en el paso de la carpeta**, no en un paso nuevo. Rampa ya lleva criterio
dentro, así que es «traerte lo más nuevo» y nunca «sin esto no funciono». En el arranque
se aplica; en Configuración es una oferta que se lee — ahí sí hay trabajo hecho debajo del
criterio que cambia, que es cuando leer antes importa.

**Configuración ▸ El criterio pedagógico**: con qué versión trabaja y de dónde salió, por
qué es ésa cuando algo se pasó por alto (incompleta, para una Rampa más nueva, superada
por la incluida), buscar correcciones, leer **entero** cualquier fichero que cambia,
aceptar o dejarlo, y volver a cualquier versión que aceptó.

**Tres cosas que encontró el trabajo y no el diseño:**

- *Un fallo real.* Una instantánea publicada no llevaba su propio `CORPUS-VERSION.json`,
  así que `activeCorpus` no podía leer su versión, la llamaba no soportada y caía al
  incluido: **publicaba bien y nunca gobernaba**. Sólo se ve en el test que pregunta qué
  gobierna después de aceptar.
- *El e2e llamaba a casa.* Pulsar «Buscar correcciones» en el suite salía de verdad a
  `api.github.com` — en CI una petición que nadie ha autorizado, en local una prueba que
  pasa según la red. Fuera; el comportamiento sin red se prueba con un transporte que
  **rompe el test si alguien lo llama**, que afirma que no hubo petición en vez de que no
  se notó.
- *Mirar la pantalla.* El botón del criterio estaba entre la ruta y los botones de la
  carpeta, así que se leía la pregunta, una ruta, un botón de otra cosa, y sólo entonces la
  respuesta.

Y la aserción que faltaba: **no hay ningún camino del almacén a `output/`**. Lo que ya
está firmado es lo que era, y no por cuidado — porque no hay nada que pudiera.

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

**Lo que necesito de ti, en orden de cuánto bloquea.**

### 1 · Publicar la primera release del corpus (no bloquea nada, pero hasta entonces el canal está vacío)

El canal funciona y no necesita ninguna decisión tuya — la firma se fue y con ella G53.
Lo que falta para que sirva de algo es que exista una release con el tag `corpus-v2` y un
`manifest.json` entre sus assets. Hasta entonces «Buscar correcciones» contesta «no hay
nada nuevo», que es correcto y es todo.

El manifiesto es una lista de ficheros con su hash, versión y un resumen en castellano de
qué cambia. Puede generarlo un script en CI en una tarde; no lo he escrito porque cuándo
y cómo publicáis es tu decisión, no mía.

Y no lo confundas con **P52**, que es firmar los **instaladores** de macOS y Windows. Esa
deuda sigue igual.

### 2 · ¿De dónde sale el vocabulario clave de una unidad? (`033` T023, sigue abierta)

Lo dejé anotado ayer y sigue igual: `bridgeWords` está construido, probado y enchufado al
prompt, y **nadie le da de comer**. Las opciones que veo siguen siendo (a) un campo donde
ella escriba las palabras de la unidad, (b) que el modelo declare cuáles de sus palabras
son clave y el código resuelva las glosas en una segunda vuelta, o (c) dejarlo sin glosas.

### 3 · El directorio `.agents/` (sin cambios, sigo sin tocarlo)

Sigue sin seguimiento en la raíz, con copias de las skills de Spec Kit. Una vez se me
coló en un `git add -A` y **lo saqué del commit**; sigue igual que estaba. Si debe
versionarse, dilo; si no, merece una línea en `.gitignore`.

### 4 · Lo que necesita personas, no decisiones

Se acumulan y ninguna la puedo hacer yo:

- **Protección de datos / legal** — los dos hallazgos de borrado (0.2 y G48) siguen
  esperando que los mire quien lleva RGPD antes de que esto se pueda presentar como
  cumplimiento.
- **Veredictos de maestras** — `032` SC-3004, `035` SC-3301/T026, `033` T026,
  **`029` T028** (una PT de un segundo territorio escribiendo su corpus con el contrato
  delante: es la afirmación que el Principio I se juega en esa capa) y **`030` T029** (una
  tutora y una PT haciendo la segunda mirada sobre un examen de verdad, por su transporte
  de verdad, para ver si el bucle cabe en una semana de colegio).
- **Paseos con clave real** — `026` T031, `022` T025, `035` T018.
- **Una fotocopiadora** — `022` SC-2005.
- **Los términos de ARASAAC** (P26) y la **firma de código** (P52).

### 5 · Dos cosas que decidí yo y conviene que confirmes

- **La cota de la superficie Electron subió cinco veces esta noche** (975 → 981 → 999 →
  1017 → 1035 → 1046), y cada subida está justificada por escrito en el propio test. Las
  cinco veces rechazó el primer intento y las cinco produjo la forma mejor — `ipc/pick.ts`
  con dos llamantes en vez de dos diálogos, y `corpus/active.ts`, `updates/notice.ts` y
  `updates/corpus.ts` sin importar Electron porque el directorio se inyecta al arrancar.
  Si te parece que la cota se está usando como permiso en vez de como medida, dilo y la
  congelo.
- **`instructions/coordination.md` es un fichero de corpus nuevo** con la frase que va en
  la cara de cada paquete («esto viene de otra aula») y la línea de procedencia de lo
  aceptado. Está ahí y no en TypeScript porque cómo debe leer una docente las
  observaciones de otra es exactamente el juicio del Principio I — pero es corpus nuevo,
  y el corpus nuevo lo revisa alguien.

### 6 · Las dos de las noches anteriores, que siguen abiertas

- **0.2 · Validación de protección de datos (P38, tu propia condición).** El código hace lo
  que pedía el hallazgo y está cubierto por tests, pero *si el resultado satisface el derecho
  de supresión de datos de un menor* es un juicio de protección de datos, no un resultado de
  test. Y esta noche se le ha sumado uno más: `030` mete `handover/received/` en el plan de
  borrado, que es otra carpeta con datos de un niño saliendo del alcance de «bórralo todo»
  en cuanto ella manda una copia. Anotado también en `validation.md`.
- **0.2 · Una decisión que tomé yo y conviene que confirmes.** Retiré `status: 'forgotten'`
  del enum del roster. Razón: nadie lo escribía nunca *y no se puede usar* — una fila con
  lápida sigue llevando el código, así que `verifyForgotten` la reportaría como residuo para
  siempre. Si querías que el roster guardara memoria de que hubo un alumno, eso vive en
  `.rampa/erasures.md` (fecha + código, nada suyo dentro). Dime si preferías otra cosa.

## Estado de la verificación

| | |
|---|---|
| `npx tsc --noEmit` | verde (línea base) |
| `npx vitest run` | verde — 2.458 casos |
| `npm run test:e2e` | verde — 252 casos |
| `scripts/check-fr-coverage.sh` | verde (línea base) |
| `scripts/check-spec-kit.sh` | verde (línea base) |
| `scripts/validate-recipes.sh` | verde — 19 recetas |
| `npm run test:isolation` | verde — 124 casos |

---

**La cola está a cero.** Lotes 0, 1 y 2 completos (5/5 · 17/17 · 12/12) y Lote 3 entero:
`027`, `022`, `026`, `031`, `032`, `028`, `035`, `033`, `029`, `030`, `034` y `020`
implementadas — las doce con sus requisitos al 100%, y 3.13 registrada.

Lo que queda tiene **dueño humano** y está listado abajo: la validación de protección de
datos, seis veredictos de maestra, cuatro recorridos con clave real (`020` T040 entre
ellos), una fotocopiadora, los términos de ARASAAC, la firma de código, el directorio
`.agents/` y la decisión de producto sobre el orden de la portada con treinta alumnos.

Una cosa que decir del conjunto y no de cada ítem: **las disciplinas encontraron lo que el
diseño no vio**, otra vez y en la misma proporción. El e2e cazó dos clases de defecto que
`tsc` no puede ver, la mutación cazó cuatro tests que pasaban por el motivo equivocado,
mirar las pantallas cazó ocho defectos de presentación, y la cota de superficie Electron
rechazó un intento más —el quinto— y volvió a producir la forma mejor sin subir el número.
Ninguna de las cuatro es una preferencia de estilo: cada una tiene un defecto concreto de
este repositorio detrás.
