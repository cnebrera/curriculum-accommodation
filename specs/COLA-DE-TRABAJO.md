# Cola de trabajo — salida de la revisión antagonista (2026-09-03)

Fuente: `specs/revision-antagonista-2026-09-03.md` (116 hallazgos, 52 decisiones de Carlos anotadas
bajo cada uno). Cada ítem cita su(s) P-número(s): ahí está el contexto completo, la evidencia
fichero:línea y la decisión literal. **Ejecutar en orden de lote.** Dentro de un lote, el orden es
orientativo.

Regla de trabajo heredada de la sesión: una suite de tests cada vez, esperándola; e2e siempre con
`RAMPA_HIDDEN=1`; ningún tick sin su test.

---

## Lote 0 · Arreglos que bloquean el uso o tocan datos de menores (antes que nada)

Sin spec nueva: son defectos contra specs vigentes, con decisión tomada. Cada uno con su test.

- [x] **0.1 · Ciclo de vida del estado de sesión de App.tsx** (P11, P14; FLU-01/03/04/05, exec-tema 2).
      `review`, `ingested`, `intent`, `reconnect`: definir cuándo se limpia cada uno.
      Incluye: «volver» desde ReviewScreen; pendientes-de-firma derivados del vault (no estado
      local) + «revisar y firmar» desde el expediente; `ingested` no precarga jobs viejos;
      `reconnect` cancelable y que no secuestre Configuración; intent reset al completar.
      Es UN refactor con cinco síntomas — hacerlo junto. e2e nuevo: firmar la 2ª hoja de una tanda.
      **Hecho 2026-09-03:** los tres `useState` sin dueño (`review`, `ingested`, `reconnect`) viven
      ahora en el route (`LegacyContext` en `ui/src/nav/route.ts`), así que lo que la navegación no
      lleva, no existe. `ReviewScreen` tiene «volver»; el expediente ofrece «Revisar y firmar» para
      cualquier borrador (derivado del vault); la tanda se re-deriva del disco al volver; el intent se
      limpia al llegar a «hecho»; reconectar es cancelable y no sobrevive a cambiar de sección.
      Tests: 12 nuevos en `ui/test/route.test.ts` (dos costuras verificadas por mutación), e2e nuevo
      en `group.spec.ts` (firmar las dos hojas de una tanda) y en `connect.spec.ts` (FLU-03).
- [x] **0.2 · Borrado completo, los cinco residuos** (P38; COD-03/04/07/08/18/19/20, exec-tema 1).
      `forget` borra: entrada de names.enc, paquetes handover/, fila del roster, .rampa/requests,
      memory/archive. `verifyForgotten` recorre los cinco sitios. Reescribir el e2e vacuo de
      erasure para que pueda fallar. **RGPD de menores: revisar la corrección con DPO/legal.**
      **Hecho 2026-09-03:** el plan recoge los cinco y **nombra los dos que son ediciones y no
      borrados** (`ForgetPlan.entries`, visibles en la pantalla antes de confirmar);
      `verifyForgotten` recorre seis directorios, exime `.rampa/erasures.md` por nombre y
      **pregunta** al mapa cifrado en vez de buscar dentro; el `NameStore` es parámetro
      **obligatorio** de `executeForget` y `verifyForgotten` (la omisión es como pasó);
      `status: 'forgotten'` retirado del enum porque nadie lo escribía y no se podía usar.
      7 casos nuevos en `memory-audit.test.ts`, e2e de erasure reescrito sembrando los cinco
      residuos y sin los tres `if (x) expect(…)` que hacían pasar requisitos por ausencia.
      `validation.md` corregido. **Sigue pendiente la validación con DPO/legal — no es un
      resultado de test.**
- [x] **0.3 · Endurecer los dos guardianes** (P31, P42).
      `check-fr-coverage.sh`: cada FR en tasks.md exige marcador done/deferred:razón/dropped:razón —
      la mención deja de contar. `check-spec-kit.sh`: toda spec citada por código o declarada
      shipped/built por otra spec debe tener plan.md y tasks.md. Hacerlo ANTES de escribir las
      specs nuevas: protege todo lo que viene.
      **Hecho 2026-09-04:** `check-fr-coverage.sh` reescrito — cada FR declarado (`- **FR-nnn**`)
      exige tarea / marcador `done:|deferred:|dropped:` / fila de cobertura, la mención en prosa
      deja de contar, una cita con prefijo de OTRA spec deja de contar (regla 8 desde el otro
      lado), y una spec que marca `**DEFERRED` no puede aparecer como cubierta en sus tasks.
      Imprime open/done/deferred/dropped por separado: **595 requisitos, 144 open, 443 done,
      8 deferred** — antes decía «596, todos contabilizados», que se lee como «todos hechos».
      Encontró 11 problemas reales al estrenarse (7 FRs solo mencionados en prosa o citados con
      el prefijo de otra spec, 4 aplazados en la spec y «cubiertos» en tasks); los 11 corregidos.
      `check-spec-kit.sh` gana la **regla 4**: spec citada por código o llamada «shipped» por otra
      spec ⇒ plan.md + tasks.md. Cuatro mutaciones verificadas. AGENTS.md regla 9 y la plantilla
      de tasks documentan la convención.
- [x] **0.4 · Fugas y honestidad del pipeline** (P17, P18, P19, P15, P1-parte2).
      Nombres: lista INE ampliada + marcar token inicial de frase. Prompt: fence+nonce alrededor
      del material + recordatorio de tarea posterior. Compose: llevadas+resta→borrows + corte de
      bucle con lote 100% unknown. Adaptar: stop con selección de recetas vacía + aviso de perfil
      insuficiente (ejes sin observar, recetas desactivadas).
      **Hecho 2026-09-04:** (1) **Nombres** — lista ampliada de ~60 a varios cientos (español,
      marroquí/árabe, rumano/Europa del Este, latinoamericano, chino, subsahariano) y el token
      inicial de cada **línea** es candidato aunque sea inicio de frase, que es el hueco real;
      el set de nombres gana al stop-list de aula (Abril, Rosa) porque es RGPD de menores.
      Deuda en BACKLOG G42: la lista debería ser corpus extensible. (2) **Prompt** — el material
      va entre fences con **nonce por llamada** (`<<<MATERIAL-…>>>`) y detrás va una reafirmación
      de tarea; eso cierra la suplantación de secciones, que el detector de inyección no cubre, y
      quita la ventaja de recencia al atacante sin perder la defensa posicional de 007.
      (3) **Compose** — «llevadas» resuelve según la operación (resta → `borrows`) y el bucle
      **aborta** cuando un lote entero sale `unknown`, con su propia frase («no lo sé comprobar
      en esta operación») en vez de la que se leía como un mal día del modelo. (4) **Adaptar** —
      selección vacía **para antes de llamar al proveedor** (`no-recipes-apply`, error por alumno
      y no del job, así que en una tanda los otros dos siguen), y aviso de perfil insuficiente
      **antes de gastar** vía `job:profileGap`: cuántas adaptaciones va a aplicar, qué ejes están
      sin observar, cuántas reglas no se activan por eso, y qué mirar en clase — con las palabras
      de `instructions/axes.md`, no de un componente.
      34 casos nuevos, 4 e2e nuevos, 8 costuras verificadas por mutación.
- [x] **0.5 · Test del control primario único** (P35). Escribirlo YA aunque falle; sus fallos son
      lista de trabajo. Protege las obras de navegación del Lote 3.
      **Hecho 2026-09-04:** `e2e/primary-control.spec.ts` cuenta `.btn-primary` visibles en
      `.main` en cada destino del raíl, cada sección del alumno, cada paso de preparar algo
      alcanzable sin proveedor, y las **dos** preguntas que hace la pantalla de adaptar — a
      1366px y a 900px con texto `xlarge`, que es donde 023 lo rompió. Encontró **un** fallo, y
      tenía veinte minutos: el aviso de perfil de 0.4 ponía «Seguir igual» fuerte al lado de
      «Está bien leído, sigue». Arreglado con la regla que además se lee bien — mientras te
      preguntan algo, la pregunta es la pantalla — en una expresión compartida por los dos
      gates. De paso, la lista de la tanda daba un botón sólido por alumno (tres alumnos, tres
      primarios): fuerte solo con una fila. G31 cerrado, con lo que no alcanza el test escrito.

## Lote 1 · Enmiendas documentales, de una pasada (baratas, todas decididas)

Un solo commit de specs/corpus puede llevarlas todas. Sin código salvo donde se indica.

**2026-09-03: ejecutados los 12 ítems puramente documentales** (guardianes en verde; entradas nuevas
G38–G41 en BACKLOG). Quedan los 5 que tocan código/i18n/corpus-con-front-matter: 1.11, 1.12, 1.13,
1.16, 1.17 — para la fase de implementación (1.17 lo construye la 032 como prerequisito propio).

- [x] **1.1** Prefijo de spec obligatorio al citar FRs → AGENTS.md + plantilla; corregir 021:201 (P22).
- [x] **1.2** 007 FR-511 → «destinos declarados en el corpus», nota fechada → 023 (P23).
- [x] **1.3** Punteros de la conversación: 021/022/023/024 → apuntan a 026 (P24).
- [x] **1.4** 020 FR-1802/1817/1819 anotados «aplazado por 025, sigue siendo el destino»; 025 anotada
      como paso intermedio (P25/P29).
- [x] **1.5** G28: actualizar con estado real + criterio de cierre «lectura humana de los términos de
      ARASAAC antes de la primera release pública» (P26).
- [x] **1.6** 023: corregir «022 shipped» y el tick hueco de T023; retirar la cita de código a
      FR-2008 como precedente; 022 al BACKLOG hasta tener plan/tasks; nota de proceso en 022 (P21, P42).
- [x] **1.7** 011 FR-918/920/921 marcados deferred con razón + entrada BACKLOG (P31).
- [x] **1.8** 024 FR-2218 anotado «aplazado, ver G35» hasta la spec del segundo eje (P34).
- [x] **1.9** FR-122/FR-129: escribir la lectura reconciliadora (curso→corpus = input de ella) (P32).
- [x] **1.10** FR-707a: «mejor medido entre elegibles y con soporte de fotos, ambas ramas» (P33).
- [ ] **1.11** Copy de conexión → «por hoja adaptada» (spec + i18n + test) (P36).
- [ ] **1.12** Recetas: declarar conflicts: one-task-per-page ↔ exam-access; escribir receta de
      conflicto DEC+ATE (P27). Corpus, no código.
- [ ] **1.13** Regla dura 12 → el informe habla siempre en el idioma de la docente (P28-parte).
- [x] **1.14** Cooficiales: mensaje honesto al detectar la lengua + deuda registrada (P51).
- [x] **1.15** Firma de código: entrada BACKLOG con criterio «sin firma no hay release pública
      mac/Windows» (P52).
- [ ] **1.16** Tilde «Válida→Valida» del texto impreso en exámenes (AGE, sin P — hallazgo directo).
- [ ] **1.17** Marcador de versión de esquema en el vault (P50). Pequeño código + test; va aquí
      porque debe existir ANTES de los cambios de forma de los lotes 2-3.

## Lote 2 · Arreglos medianos con decisión cerrada (código, sin spec nueva)

- [ ] **2.1** PDF escaneado: renderizado página→imagen (pdfjs en renderer) antes de ingest; de paso
      revisar downscale sin llamar y HEIC con mediaType inválido — misma zona (P39; COD-05/06).
- [ ] **2.2** Guía: botón de traer propio en «Su adaptación curricular» + conectar la pantalla de
      preguntas muerta (P37).
- [ ] **2.3** Reimprimir: el expediente ofrece el PDF/render antiguo (`documents.rendered` gana su
      lector) (FLU-06, decisión implícita en el tema 7 — confirmada por el texto de offline).
- [ ] **2.4** Pictogramas: atribución derivada del set real + fuente por pictograma en el catálogo
      (P40); persistir popularity y ordenar el selector (P41); incrustar pictogramas+atribución en
      ODT (P47); pantalla del override por niño (P48, puede ir al final del lote).
- [ ] **2.5** Figura esencial: regla unificada «visual imprime, no-visual bloquea» — código de
      print/export + render.md + 019 (P43).
- [ ] **2.6** Traspaso honesto: «apuntado en el perfil» sin fuerza inventada + fechas reales de
      anotación (P44). Reescribir el test que consagraba el 'observed'.
- [ ] **2.7** Plan de borrado muestra QUÉ sobrevive y por qué (P45).
- [ ] **2.8** Borrador de ACNS: guardar en vault, imprimir con marca, firmar (P46).
- [ ] **2.9** Lematización determinista mínima para pictogramas (P20).
- [ ] **2.10** Recetas mono-eje nuevas: DEC solo, PER-A, ATE solo, LIN solo (P1). Corpus; validar
      contenido pedagógico con una PT cuando se pueda (reviewed_by_teacher).
- [ ] **2.11** Parada por adaptación significativa: gatillo por lo que la petición cambiaría +
      ACS registrada desbloquea (P12). Toca adapt.md + enmienda 001 + código del gate.
- [ ] **2.12** Compose: system propio para el camino de contenido (sin OUTPUT_FORMAT contradictorio)
      + detectar corte por max_tokens (AGE-04/07, decisión implícita en P2: si vamos a construir
      generación nueva, el camino de contenido debe ser fiable).

## Lote 3 · Specs nuevas (flujo Spec Kit completo: specify → clarify → plan → tasks → implement)

Orden dicho por Carlos («construir ya»): 3.1–3.3 primero.

**2026-09-03 (tarde): las 11 features tienen plan.md + research.md + data-model.md + quickstart.md +
tasks.md** (026–035 y también 022, que carecía de ellos). Cobertura FR verificada: 596 requisitos, todos
contabilizados; cero tareas marcadas. **Todo listo para `/speckit-implement <feature>`.** 020 US2–US4
sigue siendo el único ítem del lote sin tasks propios (sus tareas viven en specs/020/tasks.md, abiertas).

- [x] **3.1 · Spec ESCRITA → `027-examenes-y-problemas`** (P2). Falta: clarify → plan → tasks → implement. Formato de salida
      propio, verificación adecuada por tipo, el tipo elegido gobierna lo producido de verdad.
- [x] **3.2 · 022 con plan + tasks ESCRITOS** (P21). Falta solo: implement.
- [x] **3.3 · Spec ESCRITA → `026-la-conversacion`** (P24). Falta: clarify → plan → tasks → implement.
- [x] **3.4 · Spec ESCRITA → `028-material-de-estructura`** (P4). Falta: clarify → plan → tasks → implement.
- [x] **3.5 · Spec ESCRITA → `029-la-normativa-es-un-corpus`** (P3, incluye P8). Falta: clarify → plan → tasks → implement.
- [x] **3.6 · Spec ESCRITA → `030-el-paquete-de-coordinacion`** (P5/P7/P13). Falta: clarify → plan → tasks → implement.
- [x] **3.7 · Spec ESCRITA → `031-el-segundo-eje-de-frescura`** (P34, G35). Falta: clarify → plan → tasks → implement.
- [x] **3.8 · Spec ESCRITA → `032-cur-por-area`** (P30). Requiere 1.17 (versión de vault). Falta: clarify → plan → tasks → implement.
- [x] **3.9 · Spec ESCRITA → `033-lengua-vehicular`** (P6). Falta: clarify → plan → tasks → implement.
- [ ] **3.10 · Spec: 020 completo** — US2-US4: Preparar dentro del alumno, retirar el door, partir
      Mis notas, Configuración completa (P25/P29). Grande; los e2e de navegación son la red.
- [x] **3.11 · Spec ESCRITA → `034-como-llegan-las-versiones`** (P49). Falta: clarify → plan → tasks → implement.
- [x] **3.12 · Spec ESCRITA → `035-modo-ensayo`** (P16). Falta: clarify → plan → tasks → implement.
- [ ] **3.13 · Menores/backlog:** nota para casa (P10) · CUR bidireccional/enriquecimiento (P9) ·
      traducción del corpus core al español como proyecto propio (P28).

## Fuera de la cola, con dueño humano

- **Lectura humana de los términos de ARASAAC** antes de la primera release (P26) — Carlos u otra
  persona; compliance/legal si procede.
- **Validación pedagógica** de recetas nuevas y del corpus en español por una PT real
  (reviewed_by_teacher) — el producto ya modela esto.
- **Firma de código** cuando toque release pública (P52).
