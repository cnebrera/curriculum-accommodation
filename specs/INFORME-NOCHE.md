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
| `npx vitest run` | verde — 1516 casos |
| `npm run test:e2e` | verde — 115 casos |
| `scripts/check-fr-coverage.sh` | verde (línea base) |
| `scripts/check-spec-kit.sh` | verde (línea base) |

---

**Lote 0 completo.** Quedan 19 ítems de la cola.
