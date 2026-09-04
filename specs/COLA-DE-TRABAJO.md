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
G38–G41 en BACKLOG). **2026-09-04: ejecutados los 5 que tocaban código/i18n/corpus — Lote 1
completo.** 1.11 en dos commits (spec, luego i18n+test) porque el gate de Spec Kit separa
justamente eso.

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
- [x] **1.11** Copy de conexión → «por hoja adaptada» (spec + i18n + test) (P36).
      **Hecho 2026-09-04.** Spec enmendada en su propio commit (006 US1-2, 009 US4 y FR-724),
      i18n y test después. De paso: `onboarding.connectOk` era una **tercera** redacción de la
      misma frase («por documento»), escrita por nadie y leída por nadie desde que 009 se quedó
      con el asistente — retirada, con un test que cuenta cuántas redacciones de «✓ Conectado» hay.
- [x] **1.12** Recetas: declarar conflicts: one-task-per-page ↔ exam-access; escribir receta de
      conflicto DEC+ATE (P27). Corpus, no código.
      **Hecho 2026-09-04.** Las dos se declaran mutuamente (versión 2 ambas, porque cambia lo
      que hacen): en un examen gana la **guarda** —la regla 0 del resolutor no la descarta— y el
      conflicto queda **escrito** en el informe en vez de resolverse por lo que el modelo leyera
      primero. Receta nueva `conflict-decoding-vs-minimal-page` (DEC>=2 + ATE>=2): dislexia +
      TDAH es el par más común de un aula de apoyo y no tenía ninguna. Marcada en su propio
      texto como **no revisada por una PT**. `pictograms-not-automatic.test.ts` cazó su primer
      borrador nombrando pictogramas, que es lo que 018 prohíbe.
- [x] **1.13** Regla dura 12 → el informe habla siempre en el idioma de la docente (P28-parte).
      **Hecho 2026-09-04.** La regla se parte en dos hechos: el material conserva su idioma
      (traducirlo es un cambio que nadie pidió) y **lo que se le dice a la docente va en
      español**, sea cual sea el idioma de la hoja. El caso que la rompía es el más normal de un
      colegio español: una ficha de inglés producía notas en inglés dentro de un esqueleto que la
      aplicación escribe en español.
- [x] **1.14** Cooficiales: mensaje honesto al detectar la lengua + deuda registrada (P51).
- [x] **1.15** Firma de código: entrada BACKLOG con criterio «sin firma no hay release pública
      mac/Windows» (P52).
- [x] **1.16** Tilde «Válida→Valida» del texto impreso en exámenes (AGE, sin P — hallazgo directo).
      **Hecho 2026-09-04.** Y lo que importaba: **había un test que consagraba la errata** —
      pedía «válida» en el texto impreso. Un test que fija un error es peor que no tener test,
      porque arreglarlo parece romper algo. Reescrito con límite de palabra.
- [x] **1.17** Marcador de versión de esquema en el vault (P50). Pequeño código + test; va aquí
      porque debe existir ANTES de los cambios de forma de los lotes 2-3.
      **Hecho 2026-09-04 vía `032` T003**, que es donde vive la decisión (research R5): la
      032 lo declaró como prerequisito propio, así que se implementa su tarea en vez de
      duplicarla. `.rampa/vault.yaml` con `schema: <entero>`, **fichero ausente ⇒ versión
      1** (todo vault existente queda versionado sin tocarlo), subida **solo al escribir**
      una forma que los lectores viejos no conocen — nunca al leer, nunca al instalar,
      porque en una carpeta sincronizada una escritura al abrir la app es un generador de
      conflictos. Monotónico: el caso OneDrive (PT y tutor con builds distintos) es
      exactamente donde bajar el número corrompería el marcador. Nada se rechaza por
      versión: un vault del futuro se reporta, no se cierra.

## Lote 2 · Arreglos medianos con decisión cerrada (código, sin spec nueva)

- [x] **2.1** PDF escaneado: renderizado página→imagen (pdfjs en renderer) antes de ingest; de paso
      revisar downscale sin llamar y HEIC con mediaType inválido — misma zona (P39; COD-05/06).
      **Hecho 2026-09-04, y por un camino más simple del que dice la decisión — conviene saberlo.**
      No hace falta canvas ni renderer: pdf.js trae sus propios decodificadores, así que la imagen
      que pinta una página llega **ya decodificada** (`page.objs`/`commonObjs`), y una página
      escaneada es un bitmap que cubre la hoja. Hacerlo en el main es estrictamente mejor — sin
      ida y vuelta por IPC, sin depender de una ventana que puede no existir, funciona headless y
      todo el camino queda cubierto por la suite offline. El objetivo de P39 («nada de pagar
      llamadas sin imagen») se cumple igual.
      `packages/core/src/ingest/pixels.ts` nuevo: filtro de caja + codificador PNG, aritmética
      pura, 13 casos. `toSendablePng` es **el único sitio** donde se aplica el límite del corpus
      — que es el arreglo, porque `planDownscale` era política que nadie ejecutaba. HEIC deja de
      mandar `image/rgba` (que ninguna API acepta) y sale como PNG al límite. Y `runIngest` para
      **antes del proveedor** si una página no tiene ni texto ni imagen.
      De paso: `storeSource` solo guardaba la primera página de un PDF (se apoyaba en `paths[i]`),
      así que a partir de la 2 no había nada que enseñarle en la pantalla de verificación.
      **Lo que sigue sin hacerse, dicho en vez de descubierto:** una foto JPG/PNG/WEBP que ella
      trae se envía tal cual, porque redimensionarla exige un decodificador que no llevamos.
      **BACKLOG G43** con las tres salidas y su coste. Y en `008` tasks.md corregidos los dos
      ticks que afirmaban lo contrario (T012 «PDF page rendering» y T013 «downscale»).
- [x] **2.2** Guía: botón de traer propio en «Su adaptación curricular» + conectar la pantalla de
      preguntas muerta (P37).
      **Hecho 2026-09-04.** «Su adaptación curricular» abre la ingesta de `008` con el destino
      en la ruta (`then: 'guide'`), así que es la **misma** maquinaria y la misma puerta de
      verificación — sin tipo de material que contestar, que era el paso muerto (un DIAC no es
      «una ficha» ni «un examen»). Y la puerta dice ahora «Ver sus medidas» en vez de «Adaptar
      para un alumno», que era una frase sobre otro documento. La conversación (US3 de `017`)
      se conecta por fin: se renderizaba y **nadie despachaba nunca** `view: 'guide-ask'`;
      ahora hay control en los dos estados de la guía, ausente —no deshabilitado— mientras no
      haya documento, y volver de ella regresa al documento y no al listado.
      4 e2e nuevos; 3 costuras verificadas por mutación.
- [x] **2.3** Reimprimir: el expediente ofrece el PDF/render antiguo (`documents.rendered` gana su
      lector) (FLU-06, decisión implícita en el tema 7 — confirmada por el texto de offline).
      **Hecho 2026-09-04.** `documents.rendered` estaba declarado, tipado, poblado por
      `entryFor` desde `014` y **leído por nadie** (G36 otra vez): la fila ofrecía el markdown,
      el informe, el IR y la reutilización, y **no el PDF que se fotocopia**. La fila abre ahora
      el PDF que tiene y imprime uno donde no lo hay, las dos cosas **offline** — que es lo que
      `es.errors.offline` («puedes leer tus notas y volver a imprimir») venía prometiendo.
      3 e2e nuevos, incluida la escritura real del fichero sin red; costura verificada por
      mutación.
- [x] **2.4** Pictogramas: atribución derivada del set real + fuente por pictograma en el catálogo
      (P40); persistir popularity y ordenar el selector (P41); incrustar pictogramas+atribución en
      ODT (P47); pantalla del override por niño (P48, puede ir al final del lote).
      **Hecho 2026-09-04, las cuatro partes.**
      **(a) Atribución (P40).** `attributionFor(doc, attribution = ARASAAC_ATTRIBUTION)` aceptaba
      una atribución alternativa y **los dos call sites la llamaban sin segundo argumento**: el
      parámetro estaba muerto y la constante era lo único que se imprimía. Una docente con su
      propia carpeta y su propio LICENSE —que `readSet` lee y le muestra y nunca llegaba al
      render— imprimía «Autor pictogramas: Sergio Palao · Origen: ARASAAC» en cada hoja. Una
      atribución **falsa**, legalmente peor que ninguna. Ahora `data-picto` lleva
      `word=id@publisher`, la línea se **deriva** de las fuentes que el documento usó, y
      `attributionFor` **no tiene default**. Una fuente que nadie sabe describir se **dice**, no
      se adivina.
      **(b) Popularidad (P41).** `mergeSet` la tiraba al escribir el catálogo, así que
      «del más usado al menos» no podía ser verdad. Se persiste, y `mostUsedFirst` vive en core
      **porque la primera versión del arreglo estaba en el shell, donde nada offline la veía, y
      sobrevivió a que la borrase con la suite en verde** — el mismo defecto que arreglaba,
      llegando en el arreglo.
      **(c) ODT (P47).** `render/odt.ts` no tenía ni una referencia a `data-picto`: una hoja con
      pictogramas exportada a ODT salía sin ellos, sin hueco marcado y **sin decir nada**, en la
      modalidad que existe para que ella retoque y reimprima. Ahora `Pictures/` + entrada de
      manifest por imagen, la palabra al lado, y la misma atribución que el PDF.
      **(d) Override por niño (P48).** Era «carried rather than surfaced»: un MUST de `018`
      satisfacible solo editando YAML a mano, y G30 —que lo decía— se cerró «por 024», que
      construyó el selector del vocabulario y no este. Control plegado en la página del alumno,
      ofrecido solo si hay juego instalado (sin juego no hay a qué apuntar, y FR-2303 quiere
      **una** forma de arreglar eso).
      Y de paso: la cota de «seis frases» de `025` se mide ahora excluyendo lo que un `<details>`
      cerrado esconde, y la de «tres frases de la excepción» se mide sobre la excepción en vez de
      como resta —la resta funcionaba mientras el callout fuese la única diferencia entre los dos
      estados. 20 casos nuevos; 5 costuras verificadas por mutación.
- [x] **2.5** Figura esencial: regla unificada «visual imprime, no-visual bloquea» — código de
      print/export + render.md + 019 (P43).
      **Hecho 2026-09-04, en dos commits** (spec primero, corpus+código después). La regla
      estaba escrita de tres formas que no coincidían: `019` FR-1709 decía «anúnciala» para
      todas, `render.md` decía «bloquea» en su sección no visual, y el código no hacía ninguna
      de las dos para el ODT —que no tenía comprobación alguna— mientras el PDF de la misma
      hoja sí lanzaba. Ahora: el PDF y el ODT **salen** (aflojando el PDF a propósito: la
      imagen se ve en papel) con aviso en la pantalla de revisión, y el audio y el braille
      **se paran** nombrando la figura y diciendo que en papel sí sale. Solo para figuras
      **imprescindibles**: una informativa se anuncia y sigue.
      3 casos nuevos en `linear.test.ts` y `e2e/essential-figure.spec.ts` (5), que pregunta a
      **las cuatro salidas del mismo documento** y comprueba los dos comportamientos.
      2 costuras verificadas por mutación.
- [x] **2.6** Traspaso honesto: «apuntado en el perfil» sin fuerza inventada + fechas reales de
      anotación (P44). Reescribir el test que consagraba el 'observed'.
      **Hecho 2026-09-04, en dos commits** (spec primero). `buildPacket` estampaba
      `evidence: 'observed'` en el **100%** de las claims y los otros dos marcadores eran
      inalcanzables, así que el anti-anclaje por el que existe la spec entera estaba
      invertido: todo llegaba con confianza **máxima**, fabricada. Ahora la claim dice de
      **dónde viene** («apuntado en el perfil»), y los tres marcadores de fuerza se quedan
      para la revisión, donde los pone una persona. Y `works`/`avoid` estampaban
      `date: today()` **dos líneas por debajo** del comentario que explica por qué eso es una
      fabricación: ahora hay `noted_on`, sellado donde se escribe y **solo para lo nuevo** —
      una preferencia que ya estaba en el vault se queda sin fecha, porque «no consta» es un
      dato que la receptora necesita. El test que consagraba el 'observed' reescrito.
      2 costuras verificadas por mutación.
- [x] **2.7** Plan de borrado muestra QUÉ sobrevive y por qué (P45).
      **Hecho 2026-09-04.** `planForget` devolvía `sharedKept` con exactamente lo que pide
      FR-1211 desde `014`, y la interfaz `Plan` de la pantalla **omitía el campo**, así que
      ningún JSX podía renderizarlo: lo que le llegaba era la frase agregada de `survives`
      («N materiales se quedan…»). El cuánto, nunca el cuál — la mitad de un requisito
      viviendo solo en el tipo del proceso main, que es el defecto que el propio docblock de
      esa pantalla denuncia sobre su pasado. Ahora los lista por material y con el motivo,
      en su propio bloque (no dentro de «esto no se retira», que es sobre cosas que el
      borrado no alcanza; esto son ficheros que se quedan por una razón comprobable).
      **Cuentas, nunca códigos**, y el e2e comprueba que no aparece el código de ningún otro
      alumno. Costura verificada por mutación.
- [ ] **2.8** Borrador de ACNS: guardar en vault, imprimir con marca, firmar (P46).
- [x] **2.9** Lematización determinista mínima para pictogramas (P20).
      **Hecho 2026-09-04.** `lemmaCandidates` en core: plurales (`-s`, `-es`, `-ces`→`-z`) y
      **las dos formas verbales que aparecen en una hoja** —imperativo de 2ª y presente de
      3ª, que es lo que dice un enunciado («rodea», «salta»)— más la reflexiva. Se prueba
      **solo cuando la forma literal no encontró nada**, y eso es toda la seguridad: «casa»
      nunca llega al stemmer, así que no puede convertirse en «casar». La regla «exactamente
      uno o ninguno» intacta: un lema con cuatro candidatos sigue siendo omisión + línea de
      informe.
      Lo que de verdad importaba no era la cobertura sino la **inconsistencia**: «rana» casaba
      y «ranas» no, así que la misma palabra llevaba dibujo en una frase y no en la
      siguiente — que para quien lee por pictogramas es peor que una ausencia consistente,
      porque la ausencia se lee como una diferencia de significado. Y el scope `instructions`
      —el que existe para que entienda **qué se le pide**— era el peor servido: los enunciados
      son imperativos y los keywords infinitivos.
      **Y una lista de clase cerrada** (`NEVER_A_PICTOGRAM`): «para» deriva a «parar», y una
      señal de stop sobre la preposición *para* es exactamente el fallo de pictograma
      equivocado que este módulo existe para evitar. Se rechaza de entrada, antes incluso del
      override. La otra mitad de AGE-05 —keywords multi-palabra indexados e inalcanzables— no
      tenía decisión y toca el formato de `data-picto` que leen cinco sitios: **BACKLOG G44**
      con las dos cosas que habría que cambiar juntas. 17 casos nuevos; 2 costuras por mutación.
- [x] **2.10** Recetas mono-eje nuevas: DEC solo, PER-A, ATE solo, LIN solo (P1). Corpus; validar
      contenido pedagógico con una PT cuando se pueda (reviewed_by_teacher).
      **Hecho 2026-09-04.** Cuatro recetas: `decoding-load` (DEC>=2), `spoken-is-not-enough`
      (PER-A>=2 — **ninguna receta mencionaba ese eje**, así que un alumno sordo no activaba
      nada en absoluto), `how-much-at-once` (ATE>=2) y `one-idea-per-sentence` (LIN>=2). El
      `AND` de `axes:` se mantiene, como decidiste: la respuesta a «esto necesita dos ejes»
      son dos recetas. Las cuatro dicen **en su propio texto** que no las ha leído una PT —
      las escribí desde `instructions/axes.md` y el orden de resolución, no desde criterio
      clínico— y un test lo comprueba, porque una receta con autoridad no ganada es peor que
      una que falta: llega a la hoja de un niño.
      Los snapshots de `selection-baseline` actualizados **solo con adiciones, sin una sola
      retirada**, y la tabla del diff escrita en el docblock del fichero, que es para lo que
      existe. De paso, el e2e de la parada por selección vacía usaba `DEC:2` como caso
      canónico: ya no lo es, así que ahora usa `REG:2`, que es donde queda el hueco.
      7 casos nuevos. **Pendiente de validación pedagógica por una PT real** (ya estaba en
      «fuera de la cola, con dueño humano»).
- [x] **2.11** Parada por adaptación significativa: gatillo por lo que la petición cambiaría +
      ACS registrada desbloquea (P12). Toca adapt.md + enmienda 001 + código del gate.
      **Hecho 2026-09-04, en dos commits.** No había «código del gate»: la parada es del
      modelo, instruida por `adapt.md`, y ahí estaba el defecto — decía «si **el perfil** o
      la petición implican… típicamente un desfase de 2 o más», anclando la negativa en el
      niño en vez de en lo que se pide. Corregido: el gatillo es lo que la petición
      cambiaría, con ejemplos concretos («quita el ejercicio 5»), y un `CUR` alto es razón
      para adaptar la vía **con más cuidado**, no para negarse.
      Y la ACS registrada desbloquea, con la parte que impide que sea un agujero: seguir a
      nivel modificado no autoriza a decidir qué objetivos se modifican ni a tocar uno que la
      ACS no nombre.
      **El código que faltaba era otro**: `readGuide` calculaba el tipo de documento, la
      pantalla lo mostraba una vez y el overlay **no lo escribía nunca** — así que el único
      dato que desbloquea el nivel modificado no llegaba al fichero que lee el modelo. Ahora
      viaja hasta `adaptations.md`, y `unknown` no se registra como ninguno de los dos.
      12 casos nuevos; 3 costuras verificadas por mutación.
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
