# Revisión antagonista completa — Rampa

**Fecha:** 2026-09-03 · **Método:** 23 agentes independientes en tres fases — 10 revisores antagonistas
(una PT veterana, un tutor no especialista, flujos de uso de punta a punta, los dos pipelines agénticos,
dos auditores de consistencia sobre las 25 specs, y tres verificadores spec↔código por rangos), 12
refutadores que abrieron la evidencia citada de cada hallazgo factual con la consigna de tumbarlo, y un
crítico de completitud sobre la revisión entera. ~2,6M tokens de lectura.

**Resultado:** **93 hallazgos factuales confirmados** (solo 2 refutados de 95 — tasa de supervivencia
del 98%, señal de que los revisores citaron evidencia real), **17 propuestas de producto** (gaps que no
se refutan: se deciden), y **6 dimensiones que esta revisión no cubrió** señaladas por el crítico.
**52 preguntas** necesitan decisión de Carlos — consolidadas y numeradas al final (P1–P52).

Cada hallazgo lleva su evidencia (fichero:línea o FR); los confirmados pasaron además por un refutador
independiente que abrió esa evidencia. Donde el refutador matizó, el matiz está en el propio hallazgo.

---

## Resumen ejecutivo — los nueve temas transversales

Los 116 hallazgos no son 116 problemas independientes. Se agrupan en nueve temas; arreglar el tema
arregla la familia.

### 1 · «He borrado todo lo de X» es mentira, cinco veces (RGPD)

El hallazgo más grave de la revisión, encontrado independientemente por **tres revisores distintos**.
Tras el borrado de un alumno sobreviven: **(a)** su nombre real en el mapa cifrado `.rampa/names.enc`
— el dato más personal del sistema; **(b)** los paquetes de traspaso `handover/<code>-<año>.md`, con el
código en el nombre del fichero y sus barreras dentro; **(c)** la fila del roster; **(d)** los requests
de composición `.rampa/requests/<job>.json` con código en claro y texto libre de la docente; **(e)** el
diario archivado `memory/archive` con `learner: <code>`. `verifyForgotten` está construido de forma que
no puede ver tres de los cinco, y el e2e de borrado justifica su excepción con una afirmación falsa
(«el mapa se borra») y una aserción que pasa en vacío sobre texto cifrado. La verificación especificada
en 003 (búsqueda de texto) es estructuralmente incapaz de detectar el residuo cifrado.
→ CONS-03, COD-04, COD-07, COD-08, COD-18, COD-19, COD-20. **Esto toca supresión de datos de menores:
la corrección debería validarse con quien lleve protección de datos.**

### 2 · El estado de sesión de App.tsx no tiene ciclo de vida

Cuatro `useState` que quedaron fuera del route reducer — `review`, `ingested`, `intent`, `reconnect` —
se escriben y **nadie los limpia jamás**. Consecuencias reales, no teóricas: firmar la segunda hoja de
una tanda es **imposible** (la pantalla de adaptar queda en blanco el resto de la sesión); la segunda
adaptación de la sesión **precarga el material de la primera** y puede acabar adaptando y cobrando el
documento equivocado sin que se note; «cambiar de servicio» **secuestra Configuración entera** sin
cancelar posible; y el door del siguiente trabajo llega con el tipo y los alumnos del anterior ya
marcados. Un solo arreglo estructural (ciclo de vida del estado de sesión, o meterlo en el route) cierra
FLU-03, FLU-04, FLU-05, FLU-10, FLU-11 y la mitad de COD-01.

### 3 · Andalucía presentada como España

`guide.md`, `acs.md` y la spec 017 cablean Séneca, la pareja ACNS/ACS y las Instrucciones de 8-3-2017
— y esas frases van **impresas en documentos**. En Cataluña es el PI, en Madrid es Raíces, en Canarias
AC/ACUS. Una PT de fuera de Andalucía queda descalificada en su primera ACNS. La arquitectura ya tiene
el patrón para esto (`instructions/education/`, un fichero por sistema); la capa normativa no lo
replica. Encontrado por los dos revisores-persona por separado. → PROD-01, PROD-11.

### 4 · Las recetas no cubren los casos insignia, y la parada por CUR≥2 bloquea el aula de apoyo

Un perfil de **dislexia pura no activa ninguna adaptación** (solo una restricción); **ningún** fichero
del corpus menciona PER-A (sordera); TDAH puro y LIN puro tampoco activan nada; y una selección vacía
**no detiene el job** — la maestra paga por una copia sin cambios. Encima, la parada por adaptación
significativa se dispara **por el perfil** (CUR≥2), no por la petición: al alumnado típico del aula de
apoyo (desfase de 1-2 cursos que hace los exámenes de su grupo con adaptaciones *de acceso*) la
herramienta le niega exactamente el trabajo legal y diario de su usuaria principal, y no hay excepción
escrita para el alumno cuya ACS ya está aprobada. → FLU-01, PROD-04.

### 5 · Puertas que se ofrecen, se cobran y no pueden producir

«Examen» y «problemas» se eligen en pantalla y se pagan, pero el pipeline **no puede componer ni
preguntas de examen ni problemas con enunciado** (el parser solo acepta `expresión = resultado`).
«Restas con llevadas» — el fraseo estándar de primaria — quema el presupuesto entero y devuelve **cero
ejercicios** por un desajuste entre el mapeo lingüístico y el verificador. Y el camino de contenido
envía dos formatos contradictorios en la misma llamada (falla siempre, dos veces, y el error culpa a
la maestra de otra cosa). → PROD-05, AGE-03, AGE-04, AGE-08.

### 6 · La trazabilidad — el argumento central del proyecto — se está erosionando

**005 y 007 comparten el rango FR-501…FR-517 con significados distintos** y ya hay citas rotas aguas
abajo. La «conversación» que Carlos pidió no tiene spec y **cuatro specs apuntan en cadena al número
equivocado** (021→022→024→025→nada). **022 se implementó… no: 022 directamente no existe** — ni plan,
ni tasks, ni código — pero 023 la da por «shipped», tiene un tick que afirma haberla comprobado, y el
código la cita como precedente. El BACKLOG conserva un BLOCKER en negrita sobre la descarga de ARASAAC
que se envió por encima. Y 025 contradice tres MUST de 020 sin anotarlo en 020, cuando el proyecto sí
sabe hacerlo bien (020 retiró FR-1401 tachándolo en 016). → CONS-01, CONS-02, CONS-04..07, COD-02.

### 7 · El defecto-firma («construido, correcto, inalcanzable») sigue vivo donde las tablas dicen lo contrario

`evidence:` — el requisito escrito **para cerrar ese mismo patrón** — sigue sin llegar al informe, con
la tabla de cobertura afirmando que llega. Un **PDF escaneado nunca se convierte a imagen** (el modelo
recibe «Lee esta imagen» sin imagen, y ella paga). El **downscale no lo llama nadie** y la ruta HEIC
envía un mediaType inválido que la API rechaza — la foto de iPhone está rota de punta a punta.
La **conversación de la guía es una pantalla muerta** (nada la despacha) con las 26 tareas «Built».
**Reimprimir un PDF antiguo es imposible** (`documents.rendered`: tipado, leído por nadie) mientras el
texto de offline promete «volver a imprimir». La atribución imprime **ARASAAC en sets que no son
ARASAAC** (atribución falsa, legalmente peor que omitirla). Y FR-2217 («biggest-used first») es
imposible porque la popularidad no se persiste — con su tick puesto. → COD-01, COD-03, COD-05, COD-06,
COD-09, COD-10, FLU-06.

### 8 · No hay modelo de colaboración PT↔tutor

El producto se declara «copilot para el PT y el Tutor», pero no existe ni el flujo «que lo valide el
PT antes de firmarlo yo», ni coordinación semanal (el traspaso de 004 es de junio a septiembre), ni un
vault compartido viable (el mapa de nombres cifrado hace el vault del otro ilegible por diseño, y los
conflictos de escritura concurrente por OneDrive no están especificados). → FLU-02, PROD-03, PROD-09.

### 9 · El corpus es política pedagógica y no tiene vehículo de entrega

No hay mecanismo de actualización — ni electron-updater, ni spec que lo posea — así que cada corrección
del corpus (la tilde que se imprime en exámenes, las recetas `reviewed_by_teacher: false`, la cobertura
de dislexia que falta) solo llega reinstalando la app a mano. El vault no tiene versión de esquema ni
árbitro para dos versiones escribiendo por OneDrive. Y los instaladores se publicarían **sin firmar**,
decisión documentada pero sin dueño ni criterio de cierre. → CRIT-01..CRIT-06.

---

## A · Gaps de producto — lo que un PT o un tutor va a pedir y no está

> **Lente `pt-gaps`:** El corpus de specs es inusualmente coherente y autocrítico (el BACKLOG ya registra muchos de sus propios huecos), y la arquitectura ética —adaptar el cómo, escalar la ACS, borrador firmado— refleja bien cómo debe comportarse una herramienta en este terreno. Visto desde el aula, los tres problemas gordos son: la parada por CUR≥2 keyed en el perfil bloquea exactamente al alumnado que llena un aula de apoyo; la capa normativa es Andalucía presentada como España (Séneca impreso en documentos); y falta el material de semana uno para TEA (agendas, secuencias, historias sociales) pese a que la infraestructura de pictogramas ya existe. Por debajo, el patrón repetido es que el producto modela a la PT como adaptadora de fichas y aún no como lo que es el resto de su semana: seguimiento, coordinación con tutor y familia, Infantil, y la corrección de lo evaluado.

> **Lente `tutor-gaps`:** Visto desde un tutor de primaria con 25 alumnos y 2 NEAE, el sistema individual es notablemente sólido: el corpus habla en lenguaje de aula, los tiempos objetivo son realistas (30 min la primera hoja, 15 después), y las salvaguardas (examen que no se abarata, borrador que se anuncia, perfil sin adivinar) protegen justo al usuario sin criterio PT. El agujero grande es que el producto se declara «copilot para el PT y el Tutor» pero no tiene ningún modelo de colaboración entre ambos dentro del mismo curso: ni vault compartido viable (el mapa de nombres cifrado y los conflictos de OneDrive lo rompen), ni flujo de validación por el PT antes de firmar. Lo segundo en peso es la dependencia normativa exclusiva de Andalucía presentada sin aviso, y el riesgo de que un perfil pobre —lo normal en un tutor— produzca adaptaciones anémicas sin que nadie se lo explique.

Estos hallazgos no se refutan: son **propuestas** sobre lo que falta, para decidir. Severidad alta = lo pedirían la primera semana de uso.

#### PROD-01 · Huecos graves de cobertura de recetas: dislexia pura, sordera (PER-A), TDAH puro y LIN puro no activan ninguna adaptación, y una selección vacía no detiene el job

**Severidad:** 🔴 Alta · **Revisor:** `agentico-adapt`

Las condiciones multi-eje de las recetas son AND (`applies` exige `every`), y el corpus solo trae 9 recetas + 2 de conflicto. Consecuencias concretas: (1) un perfil de dislexia típico (DEC:2-3, LIN:0-1) solo selecciona `keep-curricular-terms` (LIN>=1 Y DEC>=1) — que es una restricción, no una adaptación: ninguna receta justifica cambiar tipografía, espaciado, troceo o vía de audio por DEC solo, y `lectura-facil-es` exige DEC>=2 Y LIN>=2 a la vez; (2) NINGUNA receta menciona PER-A: un alumno sordo (PER-A:3, «lo hablado no le llega») no activa nada; (3) ATE solo, REG solo o LIN solo tampoco activan nada (`one-task-per-page` exige COG>=2 Y ATE>=2). Encima, si la selección queda vacía el job sigue («Adaptando: 0 reglas»): el prompt lleva una sección «Reglas seleccionadas» vacía y, como la regla dura 6 prohíbe cambios sin receta que citar, el modelo o no cambia nada (la maestra paga por una copia) o inventa ids de receta. El comentario de `assertCorpus` («No recipes means no guards… worse than not adapting») solo cubre corpus ausente, no selección vacía. Además el código afirma que `keep-curricular-terms` es una guarda sin ejes («a guard names no axis», recipes/index.ts:68) pero el fichero del corpus le pone ejes — así que `isGuard` no la protege en resolución de conflictos, contradiciendo el propio comentario.

**Evidencia:** `app/packages/core/src/recipes/index.ts:62-63 (applies = every → AND)` · `app/corpus/recipes/core/keep-curricular-terms.md (axes: [LIN>=1, DEC>=1] vs comentario recipes/index.ts:66-75 que la llama guarda sin ejes)` · `app/corpus/recipes/lang/es/lectura-facil.md (axes: [DEC>=2, LIN>=2])` · `app/corpus/recipes/core/*.md (ninguna receta referencia PER-A)` · `app/packages/shell/src/jobs/adapt.ts:192 (procede con selección vacía)` · `instructions/axes.md (DEC:3 «necesita audio», PER-A:3 «lo hablado no le llega»)`

> ❓ **P1:** ¿La lista `axes:` de una receta debería ser OR en vez de AND, y qué recetas faltan para DEC solo (dislexia) y PER-A (acceso auditivo)? ¿Debe el job pararse o avisar cuando la selección queda vacía?
> ✅ **Respuesta de Carlos (2026-09-03):** Mantener el AND y escribir las **recetas mono-eje que faltan** (DEC solo, PER-A, ATE solo, LIN solo) — trabajo de corpus, no de código. Y con selección vacía el job **se para antes de llamar** («con lo que sé de este alumno no tengo ninguna adaptación que aplicar»), sin gastar.

#### PROD-02 · Dos de las cuatro puertas de material («examen» y «problemas») se ofrecen y se cobran, pero el pipeline no puede producirlas

**Severidad:** 🔴 Alta · **Revisor:** `agentico-compose`

021 FR-1908/1909 exigen ofrecer los cuatro tipos «including exams» y que el tipo elegido «MUST govern what is produced». En el código, el kind elegido solo afecta a kindNotes impresas y a las reglas de adaptación posterior — la composición en sí es idéntica para todos los tipos. (a) `exam`: material-kinds.md promete en pantalla «Te voy a proponer las preguntas de una prueba con nota» y pregunta «cuántas preguntas» (quantity.of: questions), pero no existe ningún camino que componga preguntas: el ramal skill produce expresiones aritméticas y composeContent pide «Escribe material sobre esto» (bloques .explanation, un texto de estudio); el número de preguntas que ella teclea solo alimenta el bucle aritmético. (b) `problems`: parseProposals solo acepta líneas `expresión = resultado` y OUTPUT_FORMAT prohíbe «texto alrededor», así que un problema con enunciado es imparseable por construcción. Además `derived` nunca puede valer 'problems' ni 'exam' (el test `/\bproblema/i.test(g.instruction)` es código muerto: instructionFor devuelve frases fijas sin esa palabra), de modo que elegir esos tipos garantiza siempre la nota de discrepancia «lo que ha salido se parece más a...». La docente elige la puerta, paga, y recibe otra cosa con una disculpa.

**Evidencia:** `app/packages/shell/src/jobs/compose.ts (OUTPUT_FORMAT; derived: /\bproblema/i sobre instructionFor; kindEntry solo para label/onDocument)` · `app/packages/core/src/compose/proposals.ts (parseProposals: solo `expr = resultado`)` · `instructions/material-kinds.md (exam.composing.before «te voy a proponer las preguntas»; exam.quantity of questions; problems)` · `specs/021-material-de-primera/spec.md FR-1908, FR-1909, FR-1925`

> ❓ **P2:** ¿Cuál es la intención a corto plazo: retirar/atenuar las puertas exam y problems en compose hasta que exista su camino de generación, o priorizar ese camino (y en qué orden respecto a 022)?
> ✅ **Respuesta de Carlos (2026-09-03):** **Construir la generación ya.** Priorizar la spec y el pipeline de componer problemas con enunciado y exámenes de verdad (formato de salida propio, verificación adecuada), en lugar de atenuar o retirar las puertas.

#### PROD-03 · El corpus normativo es Andalucía en exclusiva (Séneca, Instrucciones 8-3-2017), presentado como si fuera España

**Severidad:** 🔴 Alta · **Revisor:** `pt-gaps`

guide.md, acs.md y la spec 017 hardcodean el modelo andaluz: Séneca como registro, la tabla ACNS/ACS con «desfase de al menos un curso», las acns_sections sacadas de las Instrucciones de 8 de marzo de 2017, y frases que van IMPRESAS en documentos («no está presentado hasta que esté en Séneca»). En Cataluña es el PI y no existe la pareja ACNS/ACS con esos nombres; en Madrid el registro es Raíces; en Canarias son AC/ACUS; los procedimientos y quién firma varían. Una PT de fuera de Andalucía recibiría documentos que citan una plataforma y una normativa que no son las suyas — eso descalifica la herramienta en la primera ACNS que redacte. 017 solo contempla «a DIAC from another comunidad autónoma» como edge case de EXTRACCIÓN (degradar a «measures found»), nunca de redacción. La arquitectura ya tiene el patrón correcto para esto (instructions/education/ es un fichero por sistema con contrato en 011), pero la normativa no lo replica.

**Evidencia:** `instructions/guide.md (frontmatter acns_sections, tabla ACNS/ACS, «Séneca es el registro»)` · `instructions/acs.md («no está presentado hasta que esté en Séneca»)` · `specs/017-la-guia/spec.md:29-33, 55-59, 290-292` · `specs/011-quien-alumno-edad/spec.md FR-906 (el patrón per-sistema que la normativa no tiene)`

> ❓ **P3:** ¿Corpus normativo por comunidad (instructions/normativa/<cc>.md, mismo patrón que education/) o declarar honestamente en la UI que la v1 de guías es solo Andalucía?
> ✅ **Respuesta de Carlos (2026-09-03):** **Corpus normativo seleccionable y aportable, genérico para cualquier país.** La normativa se organiza como corpus por territorio (patrón `education/`): se selecciona en configuración de la app y es **reescribible por alumno**. Si no hay corpus para tu territorio, la app funciona en **modo genérico** (guide/acs reescritos en términos neutros, remitiendo al orientador). Y se puede **subir o modificar** el corpus normativo propio — cada docente/comunidad aporta el suyo. Salvaguardas acordadas: (1) el documento e informe generados imprimen el origen del corpus («Madrid, subido por ti, sin revisar» — patrón reviewed_by_teacher); (2) un corpus importado se muestra antes de activarse y pasa por el detector de inyección (Principio IX: corpus compartido en un foro = vector real); (3) el modo genérico se escribe como producto propio, no como Andalucía con nombres borrados.

#### PROD-04 · No existe el material de estructura y anticipación: agenda visual, secuencia de pasos, historia social, panel de comunicación

**Severidad:** 🔴 Alta · **Revisor:** `pt-gaps`

Con un alumno TEA nuevo, lo primero que monta una PT no es una ficha adaptada: es la agenda visual del día, la secuencia de pasos de una rutina (baño, fila, cambio de aula) y a menudo una historia social para una situación concreta. Rampa tiene toda la infraestructura para esto (pictogramas ARASAAC descargados en local vía 023/024, render determinista, perfil con REG/EJE/COG) y sin embargo los pictogramas solo existen como capa SOBRE material curricular (scopes: all/instructions/vocabulary en pictograms.md) y material-kinds.md solo tiene cuatro tipos curriculares. Una agenda no es adaptación de una fuente ni composición desde objetivos de aprendizaje, así que no cabe por ninguna de las dos puertas de 016/020. material-kinds.md presume que añadir un tipo es «solo corpus, ninguna línea de código», pero este tipo necesita un flujo de entrada distinto — es una decisión de producto, no una edición de Markdown.

**Evidencia:** `instructions/material-kinds.md (kinds: worksheet/exam/study/problems)` · `instructions/pictograms.md (scopes; «Nunca: activar esta familia desde un eje del perfil»)` · `specs/016-una-puerta/spec.md FR-1401 (dos puertas: adaptar/componer)` · `specs/023-los-pictogramas-los-trae-rampa/spec.md, specs/024-el-juego-entero/spec.md (la infraestructura ya existe)`

> ❓ **P4:** ¿Entra el material de estructura (agendas, secuencias, historias sociales) como quinto tipo con su propio flujo, o se registra como no-goal deliberado tipo G17?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, entra con su propia spec.** Nueva feature con flujo de entrada propio (rutina/situación → pasos → pictogramas → PDF), aprovechando la infraestructura ya construida (set ARASAAC local, render determinista, perfil). Cubre agendas visuales, secuencias de pasos e historias sociales. Prioridad a ordenar junto con P2 (generación de examen/problemas).

#### PROD-05 · La colaboración tutor–PT sobre el mismo alumno durante el curso no está especificada en ninguna parte, y el vault compartido por OneDrive la rompe estructuralmente

**Severidad:** 🔴 Alta · **Revisor:** `tutor-gaps`

El producto se autodenomina «copilot para el PT y el Tutor» (017), pero las 25 specs solo contemplan la transición ANUAL (004-handover: paquete de junio a septiembre, ítems 'unconfirmed', paquete de más de un año marcado como 'stale'). El caso real de un tutor con 2 NEAE es el contrario: el PT y yo trabajamos con el mismo niño LA MISMA SEMANA, cada uno en su ordenador. Si compartimos vault por OneDrive —caso que 006 declara soportado con un simple «warn once about conflicted copies»— pasan dos cosas no resueltas: (1) el mapa de nombres está cifrado y «MUST NOT appear in any file a share, backup or handover export produces» (FR-417), así que en mi máquina el vault del PT muestra solo códigos opacos para toda la clase, y la búsqueda por nombre de 015 (FR-1301/1302, que resuelve nombres en memoria desde el mapa cifrado local) no funciona; (2) no hay ninguna especificación de resolución de conflictos de escritura concurrente sobre profile.yaml/notes.md — 014 solo mitiga la FRECUENCIA de escritura (FR-1215), no el conflicto. El único merge mencionado en todo el repo es el edge case «Two senders (a PT and a tutor both hold notes) — merge is not automatic» de 004, que aplica solo al momento del handover. Resultado: la semana uno intento coordinarme con la PT y la herramienta no tiene ningún camino para ello salvo mandarle un paquete de traspaso diseñado para septiembre.

**Evidencia:** `specs/006-desktop-app/spec.md:154 (edge case synced folder), FR-417, escenario 5 de nombres` · `specs/004-handover/spec.md:123 (edge case «Two senders»), FR-311, FR-312` · `specs/014-expediente-del-alumno/spec.md:190, FR-1215` · `specs/015-navegar-la-clase/spec.md FR-1301, FR-1302`

> ❓ **P5:** ¿La colaboración intra-curso tutor↔PT (mismo alumno, dos máquinas, mismo trimestre) está en el alcance de Fase 0/1? Y si lo está, ¿el modelo es vault compartido con merge especificado o intercambio de paquetes ligeros derivado de 004?
> ✅ **Respuesta de Carlos (2026-09-03):** **Un vault = una docente, siempre.** El vault compartido multi-escritor queda fuera por diseño (se desaconseja explícitamente el vault en carpetas sincronizadas compartidas). La colaboración intra-curso se resuelve con **paquetes ligeros de coordinación** derivados de 004: exportar/importar notas nuevas y material reciente de un alumno, que la otra parte revisa e incorpora. Compatible con el cifrado de nombres por máquina (el paquete viaja con código) y sin merge: cada vault mantiene un solo escritor.

#### PROD-06 · No hay seguimiento del progreso ni informe trimestral/final de apoyo, teniendo ya todos los datos

**Severidad:** 🟠 Media · **Revisor:** `pt-gaps`

La normativa (la andaluza que el propio corpus cita) exige seguimiento trimestral de las adaptaciones, y el informe trimestral/final de apoyo es el papeleo recurrente más pesado de una PT: qué se trabajó, con qué medidas, cómo respondió, propuesta para el siguiente trimestre. Rampa ya registra casi todo lo necesario — 014 reconstruye el expediente completo, 003 captura cada corrección, 017 FR-1513 demuestra que sabe ensamblar un documento oficial desde lo registrado — pero no existe el artefacto «informe de seguimiento» ni ninguna forma de registrar valoración de progreso en el tiempo (el perfil se actualiza en sitio; no hay serie temporal de «qué funcionó este trimestre»). Es la extensión natural de 017: mismo mecanismo, sourceable desde 014, con las mismas guardas (lo que no consta, se marca como que falta).

**Evidencia:** `specs/014-expediente-del-alumno/spec.md FR-1202/FR-1203` · `specs/017-la-guia/spec.md FR-1513/FR-1514 (el patrón de ensamblado que faltaría replicar)` · `instructions/guide.md (sección temporalizacion: «No dicen qué tiene planificado para el trimestre»)`

#### PROD-07 · El alumnado de incorporación tardía sin español no cabe en los ejes ni en el corpus

**Severidad:** 🟠 Media · **Revisor:** `pt-gaps`

Uno de los perfiles más frecuentes que aterriza en el aula de apoyo (o en ATAL/aula de enlace, con la que la PT coordina) es el alumno que se incorpora en marzo sin la lengua vehicular. LIN mide comprensión lectora como barrera funcional estable; no distingue «no entiende frases complejas» de «no habla español todavía», que evoluciona en meses y pide adaptaciones distintas (vocabulario básico ilustrado, apoyo bilingüe, quizá traducción — que hard-rules 12 prohíbe salvo petición explícita). education/es.md asume lector nativo. La constitución delimita «a learner with a disability», así que puede ser fuera de alcance a propósito — pero a diferencia de G17 (grupo mixto), esta exclusión no está registrada en ningún sitio como decisión, y la PT lo va a intentar con la herramienta igualmente.

**Evidencia:** `instructions/axes.md (LIN)` · `instructions/hard-rules.md regla 12` · `.specify/memory/constitution.md:3 («a learner with a disability»)` · `specs/BACKLOG.md G17 (el precedente de registrar un no-goal)`

> ❓ **P6:** ¿Está el alumnado sin lengua vehicular dentro del alcance? Si no, ¿se registra como no-goal explícito en el BACKLOG para que su reaparición sea una decisión?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, entra: eje o marca propia + recetas.** Se modela como barrera transitoria de lengua vehicular — distinta de LIN — con recetas propias (apoyo visual, vocabulario clave con traducción, español simplificado transitorio). Coherente con el producto multi-país decidido en P3. Necesita spec (toca axes.md y el perfil).

#### PROD-08 · Nada ayuda con la corrección adaptada: ni criterios de corrección documentados ni guía de correspondencia del examen adaptado

**Severidad:** 🟠 Media · **Revisor:** `pt-gaps`

Dos huecos relacionados. (1) Una medida de acceso estándar en cualquier ACNS es cómo se corrige: «no penalizar ortografía» para disortografía, «valorar contenido sobre presentación». guide.md la reconoce como sección (evaluacion, sourceable: partial) pero ningún flujo ayuda a documentar los criterios de corrección acordados. FR-1913/FR-1914 prohíben con razón baremar o corregir a un alumno, pero documentar un criterio decidido por el equipo no es puntuar a un niño — es la misma distinción que acs.md ya hace entre decidir y ayudar a escribir lo decidido. (2) Cuando Rampa adapta un examen y parte el ítem 4 en 4a/4b (hard-rules 7), quien corrige — normalmente el tutor, con el examen original delante — no recibe ninguna guía de correspondencia; el informe de adaptación es para la firma de la PT, no para la corrección del tutor.

**Evidencia:** `specs/021-material-de-primera/spec.md FR-1913/FR-1914` · `instructions/guide.md (acns_sections: evaluacion, sourceable: partial)` · `instructions/hard-rules.md reglas 5 y 7` · `instructions/adapt.md (Assessment: «access route and response route only»)`

#### PROD-09 · La coordinación viva PT↔tutor no existe: el traspaso (004) es para cambio de año, no para el trabajo semanal compartido

**Severidad:** 🟠 Media · **Revisor:** `pt-gaps`

En un colegio real las medidas las aplica el tutor en su aula cada día y los exámenes los pone el tutor; la PT y el tutor comparten al mismo alumno durante todo el curso. Rampa es un vault monopuesto: el handover de 004 está diseñado para «changes year, teacher or school» con toda la maquinaria de unconfirmed/stale, y el export shareable de memory.md excluye precisamente el learner scope. No hay una forma especificada de que la PT entregue al tutor «lo que necesitas para este niño en tu área» a mitad de curso, ni de que dos docentes trabajen sobre el mismo perfil sin pisarse. El PDF adaptado viaja, pero el conocimiento (perfil, medidas confirmadas, qué funciona) no tiene canal intra-curso.

**Evidencia:** `specs/004-handover/spec.md (Input: «A learner changes year, teacher or school»; FR-301..FR-314)` · `instructions/memory.md (Export: full=handover, shareable=sin learner scope)`

> ❓ **P7:** ¿Contempla el modelo dos docentes activos sobre el mismo alumno (PT+tutor), aunque sea vía un paquete de coordinación más ligero que el handover de 004?
> ✅ **Respuesta de Carlos (2026-09-03):** Resuelto por P5: sí hay dos docentes activos sobre el mismo alumno, coordinados por **paquete ligero** (no vault compartido).

#### PROD-10 · Infantil está en el desplegable pero el pipeline es de texto: los no-lectores no tienen material que Rampa sepa hacer

**Severidad:** 🟠 Media · **Revisor:** `pt-gaps`

education/es.md incluye Infantil (con razón: la PT de un colegio atiende Infantil desde el minuto uno — estimulación, prerrequisitos, grafomotricidad, conteo) y su propio texto dice «No lee. Todo entra por imagen». Pero todo el producto es un pipeline de texto: los cuatro material-kinds son textuales, compose exige anclaje textual, los skills de es.md empiezan en aritmética de 2.º de Primaria, y 022 limita los diagramas a cantidades verificadas de ejercicios de 002. Ofrecer «1.º de Infantil» en el selector promete algo que ningún flujo puede cumplir. O el pipeline gana un camino imagen-primero para no-lectores (022/018 son la semilla) o el selector debería decir honestamente qué puede y qué no a esas edades.

**Evidencia:** `instructions/education/es.md (stage infantil; skills solo primaria-2..6)` · `specs/011-quien-alumno-edad/spec.md FR-908 (España cubre Infantil)` · `specs/022-material-que-se-ve/spec.md FR-2001 (diagramas atados a 002)` · `instructions/material-kinds.md (cuatro tipos textuales)`

#### PROD-11 · La normativa está hard-codeada a Andalucía (Séneca, Instrucciones de 8/3/2017) y se presenta como «la normativa» a un tutor de cualquier comunidad

**Severidad:** 🟠 Media · **Revisor:** `tutor-gaps`

instructions/guide.md deriva sus secciones de ACNS «de las Instrucciones de 8 de marzo de 2017 y de cómo se rellena en Séneca», y 017 repite «Séneca es el registro» en requisitos y en texto que llega al documento. Para un tutor de Madrid, Cataluña o Valencia, el reparto de autoría (quién coordina la ACNS, el requisito de desfase de un curso), la lista de secciones y hasta el nombre del sistema de registro son distintos — y precisamente el tutor no especialista no tiene el criterio para detectar que le están dando la normativa de otra comunidad con tono de autoridad. Las specs lo saben: 017 tiene el edge case «A DIAC from another comunidad autónoma. The section names differ» y promete que «a second comunidad is a Markdown file», y el comentario de guide.md admite que «un DIAC de otra comunidad usará palabras que aquí no están» en la lista de términos clínicos (lo que además debilita el filtro de material clínico fuera de Andalucía). Pero no existe ni un segundo fichero, ni un selector de comunidad, ni siquiera un aviso en la interfaz de que la guía cargada es andaluza. Una orientación normativa equivocada es peor que ninguna.

**Evidencia:** `instructions/guide.md (front matter: comentario sobre Instrucciones 8-3-2017 y Séneca; lista clinical_terms)` · `specs/017-la-guia/spec.md:29-33, :290 (edge case otra comunidad), :398 (una comunidad = un fichero Markdown)`

> ❓ **P8:** Mientras solo exista el corpus andaluz, ¿debería la UI declarar explícitamente «esto sigue la normativa de Andalucía» antes de redactar una ACNS, o prefieres bloquear la ayuda normativa fuera de esa comunidad?
> ✅ **Respuesta de Carlos (2026-09-03):** Resuelto por la decisión de P3: selección de corpus + modo genérico + subida del propio. No hace falta bloquear ni avisar de Andalucía como caso especial — Andalucía pasa a ser un corpus más entre los seleccionables.

#### PROD-12 · Todo el criterio pedagógico que me pide fiarme lleva reviewed_by_teacher: false, y la interfaz no distingue lo validado de lo razonado en el aire

**Severidad:** 🟠 Media · **Revisor:** `tutor-gaps`

Como no especialista, mi relación con Rampa es de confianza delegada: no puedo juzgar si «20 mm es un punto de partida razonado, no medido» o si la lista de secciones de la ACNS está completa. Pues bien: material-kinds.md, guide.md, acs.md, audio.md y pictograms.md declaran todos en su front matter reviewed_by_teacher: false, G16 registra que el fichero de educación española está sin revisar y G2 que la calibración de ejes espera revisión. Es honesto dentro del repo — cada fichero dice qué es lo que más falta revisar — pero esa honestidad no llega al usuario: nada en las specs de interfaz muestra al docente que la política que está firmando encima se apoya en criterio sin validar por ninguna PT en ejercicio. Para el objetivo de Fase 0 («¿una PT real encuentra el output usable?») es coherente; para un tutor que adopte antes de esa validación, la herramienta habla con una autoridad que aún no ha ganado, justo con el usuario menos capaz de contradecirla.

**Evidencia:** `instructions/material-kinds.md, instructions/guide.md, instructions/acs.md, instructions/audio.md, instructions/pictograms.md (front matter reviewed_by_teacher: false)` · `specs/BACKLOG.md G16, G2` · `.specify/memory/constitution.md (Phase discipline, líneas 202-205)`

#### PROD-13 · 022 sin implementar: nada ya prometido depende de él, pero deja la mejor historia de compose (enseñar aritmética) en texto puro

**Severidad:** 🟡 Baja · **Revisor:** `agentico-compose`

specs/022 es solo spec.md (Draft, sin plan.md ni tasks.md — el gate del flujo lo lista como no planificado, que es su estado real). Revisado el resto: ningún FR ya implementado ni ningún texto del corpus promete diagramas, así que su ausencia no rompe promesas formales. Lo que sí deja cojo es material: para el único dominio donde los verificadores son fuertes (aritmética), el material compuesto de contenido es un texto — el propio spec lo admite («everything Rampa makes is text... that is the wrong medium»). Combinado con las puertas exam/problems huecas (hallazgo 3), el compose pipeline hoy solo entrega con solvencia una cosa: hojas de operaciones sueltas verificadas. Conviene que la comunicación del producto (y el orden del backlog) refleje eso.

**Evidencia:** `specs/022-material-que-se-ve/spec.md (Status: Draft; sin plan.md/tasks.md en specs/022-material-que-se-ve/)` · `specs/022-material-que-se-ve/spec.md («The gap»)`

#### PROD-14 · Faltan ejes para la comunicación expresiva oral y la interacción, justo donde FR-920 invoca a los especialistas AL

**Severidad:** 🟡 Baja · **Revisor:** `pt-gaps`

Los diez ejes cubren bien el acceso al papel, pero MOT está formulado alrededor de escribir («Poder contestar»: escribe lento, a mano no es viable) y REG es saturación ambiental. No hay eje donde anclar la barrera expresiva oral (el territorio de AL: habla, conciencia fonológica, SAAC como sistema de comunicación y no solo como capa de pictogramas) ni la comprensión social/pragmática más allá del «literal» de LIN:3. La spec 011 FR-920 introduce el corpus de objetivos PT/AL, así que el producto ya asume que la AL es usuaria — pero sus barreras no tienen representación en el perfil, y sin eje no hay recetas seleccionables (el mismo mecanismo que G19 documenta para MOT). No está en el BACKLOG como decisión.

**Evidencia:** `instructions/axes.md (MOT, REG, LIN)` · `specs/011-quien-alumno-edad/spec.md FR-920` · `specs/BACKLOG.md G19 (el precedente: eje sin recetas = el modelo improvisa)`

#### PROD-15 · Altas capacidades: CUR solo mira hacia abajo y el enriquecimiento no existe

**Severidad:** 🟡 Baja · **Revisor:** `pt-gaps`

El alumnado NEAE incluye altas capacidades, y sus medidas (enriquecimiento, ampliación, condensación) son formalmente ACNS — el terreno donde Rampa dice moverse con soltura. Pero CUR va de 0 («al nivel de su curso») a 3 («muy alejado», hacia abajo): no hay forma de describir «por encima de su curso», y ningún flujo contempla ampliar en vez de facilitar el acceso. La constitución delimita discapacidad, así que probablemente es fuera de alcance a propósito, pero como con la incorporación tardía, la exclusión no está registrada como decisión y una PT con un AACC en su caseload lo intentará.

**Evidencia:** `instructions/axes.md (CUR, niveles 0-3)` · `.specify/memory/constitution.md:3`

> ❓ **P9:** ¿AACC fuera de alcance deliberadamente? Si sí, registrarlo como no-goal en el BACKLOG.
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, más adelante con spec.** CUR pasa a ser bidireccional y compose gana el modo enriquecimiento. Entra al BACKLOG como feature futura priorizable — no se hace ahora.

#### PROD-16 · Ningún material contempla a la familia como destinataria

**Severidad:** 🟡 Baja · **Revisor:** `pt-gaps`

El tipo study reconoce que el material vive «probablemente en casa y sin nadie al lado», pero nada contempla a la familia como lectora: la nota que explica a los padres cómo acompañar la tarea, la circular del centro adaptada a lectura fácil para una familia con barreras lectoras propias, o el resumen del trimestre en lenguaje llano. Es trabajo real de una PT (la coordinación con la familia es preceptiva en el seguimiento de cualquier adaptación) y encajaría en la maquinaria existente de lectura fácil sin tocar la línea del qué. No es de primera semana; por eso baja.

**Evidencia:** `instructions/material-kinds.md (study: «probablemente en casa»)` · `specs/012-que-material-examen/spec.md FR-1001 (los cuatro kinds, ninguno familia)`

#### PROD-17 · La familia existe como fuente de información pero nunca como destinataria

**Severidad:** 🟡 Baja · **Revisor:** `tutor-gaps`

El tipo 'study' está pensado explícitamente para casa («va a estudiar solo, probablemente en casa y sin nadie al lado») y el handover admite claims 'reported' por la familia (FR-302). Pero en la otra dirección no hay nada: ni una nota en lenguaje llano para los padres que acompañe al material adaptado («así está pensada esta hoja, así conviene usarla»), ni nada sobre deberes. Para un tutor, la familia es la mitad del trabajo con un alumno NEAE — los apuntes adaptados que mando a casa los administra un padre que no sabe que la numeración original se conserva a propósito o que el pictograma va siempre con la palabra al lado. Es razonable que esté fuera del alcance actual, pero no está registrado ni como no-objetivo (al estilo de G17), así que hoy es un hueco sin decisión, no una decisión.

**Evidencia:** `instructions/material-kinds.md (kind study: «probablemente en casa y sin nadie al lado»)` · `specs/004-handover/spec.md FR-302 (marker 'reported')` · `specs/BACKLOG.md G17 (ejemplo del patrón «no-objetivo registrado» que aquí falta)`

> ❓ **P10:** ¿Registramos «comunicación con la familia» como no-objetivo deliberado en el BACKLOG, o hay una versión mínima (nota para casa generada junto al render) que sí quieras en alcance?
> ✅ **Respuesta de Carlos (2026-09-03):** **Versión mínima:** una «nota para casa» opcional generada junto al render — qué se ha trabajado y cómo ayudar sin hacer los deberes por él, en lenguaje llano. Una salida más del Principio IV. Al BACKLOG priorizable.

---

## B · Flujos de uso — recorridos reales de punta a punta

> **Lente `flujos-uso`:** La arquitectura de navegación de 020/025 (route reducer, rail de tres formas, Configuración) está bien construida y bien razonada, pero el estado de sesión que quedó en App.tsx fuera del route — review, ingested, intent, reconnect — no tiene ciclo de vida: nada lo limpia, y eso rompe de verdad los recorridos de segunda vuelta (firmar la segunda hoja de una tanda es hoy imposible, la segunda adaptación de la sesión precarga el material de la primera, y reconectar el servicio secuestra Configuración). Los flujos de consulta (caseload, entrar en el alumno, expediente) funcionan, pero les faltan dos salidas prometidas: reimprimir un PDF antiguo y corregir/preguntar sobre el documento oficial (la conversación de la guía es directamente inalcanzable pese a estar «Built»). El grueso de lo que falta de 020 (US2-US4) está honestamente registrado en tasks.md; los hallazgos de arriba son casi todos agujeros NO registrados.

#### FLU-01 · «Revisar y firmar» es un viaje sin retorno: el estado `review` nunca se limpia y ReviewScreen no tiene salida, así que tras revisar UNA hoja la pantalla de adaptar queda en blanco el resto de la sesión y las hojas 2..N de una tanda quedan sin poder firmarse

**Severidad:** 🔴 Alta · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

App.tsx guarda `review` en useState (línea 74) y solo lo escribe en onReview (línea ~216); no existe ningún setReview(null) en todo el repo. ReviewScreen no recibe onBack/onDone: la única salida es el raíl. La vista de adaptar está condicionada a `route.view === 'adapt' && !review` (línea ~214), de modo que después de entrar una vez en revisión, cualquier camino que vuelva a 'adapt' (door → Empezar, «Preparar» dentro del alumno, «Hacerlo otra vez para otro alumno» desde el expediente) renderiza NADA: raíl más un main vacío, hasta reiniciar la aplicación. Peor aún para la tanda: AdaptScreen se desmonta al navegar a review y su `outcome` (la lista por alumno con sus botones «Revisar y firmar») vive en estado local, así que al firmar la hoja de Lucía las de Marco y de Iker se vuelven inalcanzables — exactamente el escenario 5 de 020 US2 («she signs them one at a time») y FR-1815/005 FR-511-512, que el firmado-por-alumno presupone poder llegar a cada hoja. e2e/group.spec.ts comprueba que no hay «firmar todo» pero nunca pulsa «Revisar y firmar» dos veces, por eso nadie lo ha visto.

**Evidencia:** `app/ui/src/App.tsx:74` · `app/ui/src/App.tsx:214-231` · `app/ui/src/review/ReviewScreen.tsx (sin onBack/onDone)` · `app/ui/src/adapt/AdaptScreen.tsx:509-520 (outcome en estado local)` · `specs/020-el-alumno-es-el-sitio/spec.md US2 escenario 5, FR-1815` · `app/e2e/group.spec.ts (nunca navega review→batch)`

> ❓ **P11:** ¿La vuelta desde la revisión debe regresar a la lista de la tanda (lo que exige sacar `outcome` del estado local de AdaptScreen, probablemente al route o al vault), o basta con que el expediente de cada alumno ofrezca «revisar y firmar» para lo pendiente?
> ✅ **Respuesta de Carlos (2026-09-03):** **Derivar del vault + volver.** (1) La pantalla de revisión gana «volver», que limpia `review` y regresa a la lista de la tanda; (2) «pendiente de firmar» se deriva del disco (hoja adaptada sin firma = fichero identificable), no de memoria de sesión — y el expediente de cada alumno ofrece «revisar y firmar» para cualquier borrador pendiente, en cualquier momento. Patrón «nada se almacena, todo se deriva».

#### FLU-02 · `ingested` nunca se resetea: después de cualquier ingesta/composición/reutilización, TODA entrada posterior a «adaptar» precarga el job viejo y salta directa a «Comprueba que lo he leído bien» con el material anterior

**Severidad:** 🔴 Alta · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

App.tsx pone `ingested` en onIngested/onResume (líneas 224-225), en ComposeSummary.onAdapt (183) y en onReuse (313), y no lo limpia jamás. AdaptScreen tiene un useEffect que, con presetJobId, fija stage='verify' y carga los bloques del job (AdaptScreen.tsx ~150-165). Consecuencia: la docente adapta una foto el lunes; el martes (misma sesión) va al door, elige «Adaptar algo que tengo» para material NUEVO y aterriza en la verificación del material del lunes. Si pulsa «Está bien leído, sigue» — plausible, porque el texto se lee perfectamente — paga por adaptar el material equivocado para el alumno nuevo, y queda en su expediente como si fuera lo que pidió. Es fallo silencioso del tipo que la constitución más teme (parece que funcionó). El mismo `ingested` estanco se filtra a GuideScreen (jobId={ingested}), ver hallazgo de la guía.

> **Matiz del refutador:** Las líneas del useEffect en AdaptScreen.tsx son ~163-175, no 150-165; el contenido citado es exacto.

**Evidencia:** `app/ui/src/App.tsx:78,183,224-225,313 (setIngested, nunca null)` · `app/ui/src/adapt/AdaptScreen.tsx (useEffect presetJobId → stage 'verify')` · `specs/016-una-puerta/spec.md FR-1410 (el door no introduce comportamiento) — aquí lo introduce el estado residual`

#### FLU-03 · Pulsar «cambiar de servicio» secuestra Configuración entera: `reconnect` solo se limpia al COMPLETAR la reconexión, no hay cancelar, y mientras tanto hasta el puntero de pictogramas del alumno aterriza en el asistente de conexión

**Severidad:** 🔴 Alta · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

En App.tsx el render de settings es `reconnect ? <ConnectStep/> : <SettingsSections pane={route.pane}/>` (líneas 356-358): mientras `reconnect` esté puesto, el pane del route se ignora. ConnectStep solo expone onDone (se dispara tras conectar con éxito, ConnectStep.tsx:139) — no hay cancelar ni volver. Secuencia real: la docente abre Mi servicio de IA, pulsa reconectar por curiosidad, se arrepiente; puede huir por el raíl, pero `reconnect` queda armado, y la PRÓXIMA vez que entre a Configuración — incluida la vez que sigue «Traer los pictogramas →» desde el perfil de un alumno (025 FR-2303/2304, SC-2304 «sin preguntar dónde ir») — se encuentra el asistente de pegar una clave en lugar de los pictogramas, en cualquiera de las tres secciones, hasta que complete una reconexión o reinicie. Estado sin salida clásico, y rompe el escenario estrella de 025.

**Evidencia:** `app/ui/src/App.tsx:76,356-358` · `app/ui/src/onboarding/ConnectStep.tsx:44,139 (solo onDone)` · `app/ui/src/settings/ConnectionScreen.tsx:129,149 (onReconnect)` · `specs/025-pictogramas-tienen-su-sitio/spec.md FR-2303/FR-2304, SC-2304`

#### FLU-04 · Reimprimir un PDF de hace un mes es imposible: `documents.rendered` está tipado y nadie lo lee, el expediente no ofrece el PDF, y el texto de offline promete «volver a imprimir»

**Severidad:** 🔴 Alta · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

RecordEntry declara `documents.rendered: string[]` (data/record.ts) y ningún componente lo consume — la enésima instancia del defecto que el propio repo cataloga como «a field written, typed and read by nothing» (G36). Las filas del expediente ofrecen «Lo adaptado» (markdown), el informe, el IR y la reutilización, pero no el PDF impreso ni un «volver a imprimir». El único «Guardar como PDF» vive en ReviewScreen, que solo se alcanza durante una adaptación recién hecha (onReview desde AdaptScreen) — inalcanzable para un trabajo del mes pasado. Mientras tanto es.errors.offline promete «puedes leer tus notas y volver a imprimir»: texto de UI que miente sobre lo que el sistema puede hacer. El caso de uso (la fotocopia se perdió, toca reimprimir la hoja firmada) es de los más frecuentes del curso.

**Evidencia:** `app/ui/src/data/record.ts (documents.rendered, sin consumidores)` · `app/ui/src/learners/RecordScreen.tsx (Entry: sin botón de PDF/reimprimir)` · `app/ui/src/i18n/es.ts (errors.offline: «volver a imprimir»)` · `app/ui/src/review/ReviewScreen.tsx (único usePdf, solo alcanzable post-adaptación)`

#### FLU-05 · La parada por adaptación significativa se dispara por el perfil (CUR≥2), no por la petición, y bloquea justo al alumnado típico del aula de apoyo

**Severidad:** 🔴 Alta · **Revisor:** `pt-gaps` · **Veredicto:** confirmado por refutador independiente

adapt.md dice «If the profile or the request implies changing objectives... typically a curricular gap of 2 or more — stop», y el Independent Test de 001 US3 lo confirma: perfil con CUR:2 + fuente tipo examen → el run DEBE pararse y no producir evaluación adaptada. Pero la mayoría del caseload real de una PT tiene desfase de uno o dos cursos, y esos niños hacen los exámenes de su grupo con adaptaciones DE ACCESO (letra grande, enunciados de una instrucción, pictogramas, más espacio) que no tocan ni un objetivo — eso es la ACNS de libro que la propia guide.md describe. Si la herramienta se niega a adaptar el acceso de un examen porque el perfil dice CUR:2, se niega a hacer el trabajo legal y diario de su usuaria principal la primera semana. Además, nada especifica qué pasa DESPUÉS de una ACS aprobada: 017 ingiere la ACS y adapt.md da precedencia a las «official adaptations», pero la regla de parada por CUR≥2 no tiene excepción escrita para el alumno cuya modificación de objetivos ya está decidida y registrada — el caso en que adaptar a nivel modificado es exactamente lo correcto.

**Evidencia:** `instructions/adapt.md (sección «La línea de la adaptación significativa»)` · `specs/001-phase-0-worksheet/spec.md:102-122 (US3, Independent Test con CUR:2)` · `instructions/axes.md (nota «A note on CUR»)` · `specs/017-la-guia/spec.md FR-1511 (medidas confirmadas en adaptations.md)` · `specs/001-phase-0-worksheet/spec.md FR-010`

> ❓ **P12:** ¿La parada debe dispararse por lo que la petición implicaría cambiar (no por el nivel CUR del perfil), y debe una ACS registrada vía 017 desbloquear explícitamente la adaptación a los objetivos ya modificados?
> ✅ **Respuesta de Carlos (2026-09-03):** **El gatillo pasa del perfil a la petición.** Adaptar el ACCESO (cómo se presenta) siempre está permitido, sea cual sea el CUR; la parada salta solo cuando lo pedido implicaría tocar el QUÉ (objetivos, contenidos, criterios). Y una ACS aprobada y registrada vía 017 desbloquea explícitamente adaptar a los objetivos ya modificados. Toca adapt.md y enmienda la spec 001 (US3/Independent Test).

#### FLU-06 · No existe el flujo «que lo valide el PT antes de firmarlo yo»: la revisión asume que quien revisa es quien usa la aplicación

**Severidad:** 🔴 Alta · **Revisor:** `tutor-gaps` · **Veredicto:** confirmado por refutador independiente

Todo el ciclo de firma (Principio VII, review.md) asume una sola persona en una sola máquina: adapto, reviso, firmo, la marca de borrador se quita. Pero material-kinds.md me advierte literalmente que en un examen «quien lo firma se está jugando la nota de un alumno» — y yo, tutor sin formación PT, exactamente por eso NO quiero firmar un examen adaptado sin que la PT lo mire. No hay ninguna vía especificada: ni exportar un borrador para revisión externa (el borrador con marca es un PDF que puedo imprimir, pero las correcciones que la PT me haga de palabra no entran al sistema salvo que las teclee yo, y review.md avisa de que «a correction not written down will be made again next week»), ni segunda firma, ni estado «pendiente de visto bueno de otra persona». El campo de firma es un rol libre (`by: "PT"` en el ejemplo de review.md) sin vocabulario definido, pese a que 017 hace del reparto de roles algo normativo (el tutor coordina la ACNS, el PT redacta la ACS). Para la persona a la que este producto dice servir en segundo lugar —el tutor— la pregunta «¿puedo pasárselo al PT para que lo valide?» tiene hoy como respuesta «por el pasillo, en papel, y sus correcciones se pierden».

**Evidencia:** `instructions/review.md (procedimiento y ejemplo `by: "PT"`)` · `.specify/memory/constitution.md Principio VII (líneas 84-89)` · `instructions/material-kinds.md (regla de exam)` · `specs/017-la-guia/spec.md:29 (reparto tutor/PT)`

> ❓ **P13:** ¿Quieres un flujo explícito de «segunda mirada» (exportar borrador anotable + reimportar correcciones, o doble firma por rol), o la posición del producto es que cada docente firma solo lo suyo y la validación cruzada queda fuera?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, vía paquete de coordinación** (la misma pieza de P5): el tutor exporta el borrador anotable, la PT lo revisa en su Rampa y devuelve correcciones que se importan y quedan registradas; la hoja anota «revisada por PT» junto a la firma del tutor. Una sola pieza nueva sirve a coordinación (P5/P7) y validación (P13).

#### FLU-07 · 016 FR-1408 sigue roto en compose: «Volver» al door borra los objetivos y el anclaje escritos

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

El intent (alumnos, trabajo, tipo) se izó a App.tsx precisamente porque el e2e cazó que «Volver» perdía trabajo — pero solo se izó ESO. `objectives`, `anchor`, `howMany`, `sessions` viven en useState de ComposeScreen (líneas 74-79); onBack navega al door, el componente se desmonta y al volver a entrar el formulario está vacío. Es literalmente el escenario 4 de 016 US1 («she can go back without losing what she typed») y FR-1408 («either door reachable from the other without losing entered work»), incumplidos para el contenido más caro de reescribir: el objetivo redactado y las tres frases de anclaje que FR-102 obliga a pedir.

> **Matiz del refutador:** Además de objectives/anchor/howMany/sessions también se pierden kind y minutes, que ComposeScreen pregunta por su cuenta (línea 74 y 79). Refuerza el hallazgo.

**Evidencia:** `app/ui/src/compose/ComposeScreen.tsx:74-79,170` · `app/ui/src/App.tsx:166-170 (onBack → door, ComposeScreen desmontado)` · `specs/016-una-puerta/spec.md US1 escenario 4, FR-1408`

#### FLU-08 · El intent no se resetea al terminar un trabajo: el door del siguiente llega con el tipo («examen»), el trabajo y los alumnos del anterior ya marcados — el «no default» de FR-1403 vencido por estado residual

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

reduceIntent solo se resetea desde onPrepare (dentro del alumno) y desde el botón «Quitar lo elegido». Tras completar una adaptación por la vía del door, el intent conserva alumnos, work y kind; la siguiente visita a «Preparar material» muestra «examen» ya pulsado para lo que hoy es una ficha (o al revés), con «Empezar» habilitado en cuanto entra. 012 FR-1001/016 FR-1403 existen exactamente contra esto («a defaulted worksheet is how an exam gets adapted as a worksheet»); la preselección por residuo de sesión es un default con otro nombre, y se combina mal con el hallazgo de `ingested` estanco: segunda tarea de la sesión = material viejo + respuestas viejas precargadas.

> **Matiz del refutador:** Precisión menor: onReuse (App.tsx:314) también despacha reset, pero re-fija work y kind acto seguido, así que la afirmación de fondo (no hay limpieza post-trabajo) es correcta.

**Evidencia:** `app/ui/src/App.tsx:67 (intent a nivel de App, sin reset post-run)` · `app/ui/src/door/intent.ts (reset solo explícito)` · `specs/016-una-puerta/spec.md FR-1403` · `specs/012-que-material-examen/spec.md FR-1001`

> ❓ **P14:** ¿Debe el intent sobrevivir solo mientras el trabajo está a medias (reset al llegar a 'done'/firmar), o prefieres que el door recuerde deliberadamente al alumno pero nunca el tipo?
> ✅ **Respuesta de Carlos (2026-09-03):** **Reset al terminar el trabajo.** El intent sobrevive solo mientras el trabajo está a medias; al llegar a «hecho»/firmar se limpia entero. El siguiente trabajo empieza de cero (FR-1403 respetado); si se entra desde un alumno, ese alumno llega marcado por el camino, no por residuo.

#### FLU-09 · «Traer los pictogramas →» pierde el trabajo del formulario sin avisar; en el alta de alumno además la vuelta cae al listado, y durante el onboarding el botón no hace nada visible

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

LearnerPictograms vive dentro de ProfileEditor y su callout de «juego que falta» aparece en cuanto marca el checkbox, ANTES de guardar. Seguir el puntero desmonta el editor: el checkbox recién marcado, los ejes a medio puntuar y el nombre tecleado se pierden (020 FR-1811: navegar no pierde trabajo introducido). Al volver (learner/open → 'who') el perfil se relee de disco con pictogramas apagados — el AC4 de 025 US1 («el perfil ya no dice que falta nada») se cumple de forma tramposa: porque su decisión se ha perdido. En la ruta newLearner (App.tsx:275) onConfigure va a settings SIN `from`, así que «volver» aterriza en el caseload, no en el alta. Y en el onboarding (App.tsx:124) onConfigure hace go() mientras el branch de onboarding sigue renderizando por `step !== 'done'`: botón que no hace nada visible. SC-2304 («enciende, le dicen que falta, lo trae y vuelve — sin preguntar dónde ir») no sobrevive a este recorrido.

**Evidencia:** `app/ui/src/pictograms/LearnerPictograms.tsx (callout pre-guardado)` · `app/ui/src/App.tsx:124,275 (onConfigure sin from / bajo onboarding)` · `app/ui/src/App.tsx:330-339 (onConfigure con from solo dentro del learner)` · `specs/020-el-alumno-es-el-sitio/spec.md FR-1811` · `specs/025-pictogramas-tienen-su-sitio/spec.md SC-2304, US1 AC4`

#### FLU-10 · Retomar el trabajo a medias del martes exige hoy contestar alumno + trabajo + tipo ANTES de poder verlo: el resume vive enterrado en IngestScreen, detrás del door

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

FR-1825/1826/1827 (marcador en el caseload, continuar desde Preparar) son US2 de 020 y están sin construir (T026/T027 sin marcar) — deuda conocida. Lo que no está registrado es lo hostil del camino provisional: «Tenías esto a medias» solo se muestra dentro de IngestScreen, que solo se alcanza vía door → «Adaptar algo que tengo» → elegir tipo de material → «Traer una foto, un PDF o un Word». Es decir, para RETOMAR una extracción ya pagada tiene que responder tres preguntas sobre un material que la aplicación ya tiene — el orden equivocado que la clarificación del miércoles de 020 describe, y que hoy ni siquiera tiene el marcador del caseload como paliativo. LearnersScreen no muestra nada pendiente.

**Evidencia:** `app/ui/src/ingest/IngestScreen.tsx:107-121 (pending solo aquí)` · `app/ui/src/learners/LearnersScreen.tsx (sin marcador de pendientes)` · `specs/020-el-alumno-es-el-sitio/tasks.md T026/T027 sin marcar` · `specs/020-el-alumno-es-el-sitio/spec.md FR-1825/FR-1827, SC-1808`

#### FLU-11 · Terminar el onboarding aterriza en el door («¿Qué vas a hacer?») con el intent vacío: contradice FR-1801/FR-2314 y le re-pregunta por el alumno que acaba de crear

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

App.tsx:125: al guardar el primer alumno, saveState('done') y go({type:'legacy', view:'door'}). 020 FR-1801 (reafirmado por 025 FR-2314) dice que la pantalla de apertura es el caseload; la primera pantalla que ve una docente nueva tras el onboarding es en cambio la pregunta del door — y con intent vacío, lo primero que le pide es «¿Para quién?» sobre el único alumno que existe, el que ella tecleó hace diez segundos. Información pedida dos veces y el patrón que 020 retiró («el niño es el sitio, no la primera pregunta de un formulario») reintroducido justo en el primer contacto. Lo coherente con 020 sería aterrizar dentro del alumno recién creado, o al menos en el caseload.

> **Matiz del refutador:** Matiz: FR-1801 se cumple en la letra para cada arranque posterior (startRoute() = caseload); la contradicción es solo en el primer contacto post-onboarding, donde el aterrizaje en el door con intent vacío re-pregunta por el alumno recién creado. El fondo del hallazgo (información pedida dos veces, patrón retirado por 020 reintroducido) se sostiene con la evidencia citada.

**Evidencia:** `app/ui/src/App.tsx:125` · `specs/020-el-alumno-es-el-sitio/spec.md FR-1801` · `specs/025-pictogramas-tienen-su-sitio/spec.md FR-2314`

#### FLU-12 · Un perfil casi vacío produce una adaptación casi nula, y ningún requisito obliga a decírmelo antes de gastar

**Severidad:** 🟠 Media · **Revisor:** `tutor-gaps` · **Veredicto:** confirmado por refutador independiente

El diseño es correcto en su lógica interna: un eje no observado es null, no cero (hard rule 3), y profile.md avisa de que «guessing a zero... silently disables recipes». Pero mírese desde mi lado: soy tutor, no tengo el vocabulario de la PT, la entrevista de perfil me hace buenas preguntas conductuales pero muchas no sé responderlas («¿cómo te muestra lo que sabe cuando escribir no es la vía?»), así que dejo la mitad de los ejes en blanco. La consecuencia mecánica es que se seleccionan pocas recetas y la hoja sale casi igual que el original — y mi conclusión la primera semana será «esta herramienta no hace nada», no «mi perfil está incompleto». No he encontrado ningún FR que obligue a la aplicación a avisar ANTES de lanzar el job de que el perfil es demasiado pobre para adaptar, ni a decirme qué observar o qué preguntarle a la PT para completarlo. La única mitigación es una frase en profile.md dirigida al modelo («if the profile does not tell you what you need, say so»), que es política de corpus, no un flujo de producto con sitio en la pantalla.

> **Matiz del refutador:** Cierto que no hay aviso pre-gasto exigido por ningún FR, pero no es cierto que la única mitigación sea corpus: app/ui/src/learners/AxisStrip.tsx:112 muestra «N sin observar» en el perfil del alumno, y tras un run vacío el informe dice en pantalla «No he cambiado nada. Revisa si el perfil tiene ejes sin observar» (app/packages/core/src/report/index.ts:307 y app/ui/src/review/ReportView.tsx:100). El hueco real es que ese diagnóstico llega DESPUÉS de gastar, no antes de lanzar el job.

**Evidencia:** `instructions/hard-rules.md (regla 3)` · `instructions/profile.md (punto 4: «Leave gaps as gaps»)` · `instructions/axes.md` · `specs/006-desktop-app/spec.md FR-401..406 (onboarding sin este aviso)`

> ❓ **P15:** ¿Añadimos un requisito de «perfil suficiente»: antes de adaptar, la app dice qué ejes están sin observar, qué recetas quedan desactivadas por ello, y sugiere las preguntas de observación pendientes?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, aviso completo antes de gastar:** «voy a aplicar N adaptaciones; estos ejes están sin observar y por eso estas recetas no se activan; estas preguntas te ayudarían a completar el perfil». La docente decide si sigue o completa primero. Complementa el stop de selección vacía de P1.

#### FLU-13 · El caso urgente choca de frente con el peor paso del onboarding, y no hay modo de practicar sin clave

**Severidad:** 🟠 Media · **Revisor:** `tutor-gaps` · **Veredicto:** confirmado por refutador independiente

Mi escenario real: me acuerdo la tarde antes del examen, instalo a las 20:00. SC-401 promete primera hoja en 30 minutos incluyendo setup, y 009 está bien pensado (free tiers sin tarjeta, deep-links, validación inmediata). Pero la propia spec 009 reconoce que la clave es «the single biggest drop-off point» y depende de consolas externas, verificaciones de cuenta y rate limits de free tier que a las nueve de la noche no controlo ni yo ni Rampa. No existe ningún camino degradado: ni un modo demo con material de ejemplo para al menos aprender el flujo (verificación, revisión, firma) mientras espero la clave, ni un vault de muestra. FR-401 hace cada paso «resumable», que ayuda, pero si el paso 2 (conexión) falla esa noche, el resultado la primera semana es cero hojas y una desinstalación — indistinguible, como dice la propia spec, de que el proyecto no exista.

**Evidencia:** `specs/009-connect-wizard/spec.md (párrafo «Why this is its own feature»)` · `specs/006-desktop-app/spec.md FR-401..405, SC-401, SC-402` · `specs/016-una-puerta/spec.md («a thing she has to get done by tomorrow»)`

> ❓ **P16:** ¿Merece Fase 1 un modo de ensayo sin proveedor (material de ejemplo pre-adaptado, pipeline simulado) para que la primera noche no dependa de conseguir una clave?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, modo ensayo completo:** alumno de ejemplo + material pre-adaptado embebido + pipeline simulado — todo el flujo (verificar, revisar, firmar, imprimir) sin clave y sin coste, claramente marcado como ensayo y separado del vault real. La clave llega después.

#### FLU-14 · FR-1809 («pulsar la sección donde ya estás la reinicia») solo existe en el reducer: los componentes no se remontan, así que filtros y formularios persisten y el control sigue sin hacer nada observable

**Severidad:** 🟡 Baja · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

reduceRoute devuelve un objeto nuevo para learner/tab y caseload, y route.test lo celebra — pero App.tsx no pone key por route en ninguna pantalla, de modo que React reutiliza el componente: pulsar «Mis alumnos» estando en el caseload no limpia filtros ni búsqueda; pulsar «Quién es» estando en 'who' no reinicia el editor. La motivación del FR era «un control que significa 'empezar aquí de nuevo' y no hace nada es peor que ausente, porque deja de fiarse del menú» — y eso es exactamente lo que hoy ocurre en la práctica, con el defecto declarado como corregido en el comentario del reducer.

**Evidencia:** `app/ui/src/nav/route.ts (comentario FR-1809 en learner/tab)` · `app/ui/src/App.tsx (render de caseload/learner sin key)` · `app/ui/src/learners/LearnersScreen.tsx (query/filter en useState local)` · `specs/020-el-alumno-es-el-sitio/spec.md FR-1809`

#### FLU-15 · Borrar un alumno no lo purga del intent del door (queda un «fantasma» contado pero invisible), y «Añadir un alumno» desde el door lleva al listado en vez de al alta

**Severidad:** 🟡 Baja · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

El intent vive en App y ForgetLearner solo dispara onErased→caseload: si la docente tenía a Lucía elegida en el door y la borra, intent.learners conserva su código; el door dirá «1 alumno» / mostrará la sección de trabajo con ningún tick visible (el picker solo pinta el roster) y «Empezar» puede habilitarse hacia un perfil inexistente. Aparte, App cablea onNewLearner del door a {type:'caseload'} (línea 164) cuando existe {type:'learner/new'}: el botón «Añadir un alumno» del picker (cuyo comentario promete «routes to creating one») deja a la docente delante de OTRO botón idéntico en el caseload — dos clics con el mismo nombre, el primero de los cuales no hace lo que dice.

> **Matiz del refutador:** Matiz menor: el door no muestra «1 alumno» — el lede con conteo solo aparece con length > 1 (DoorScreen.tsx:118-120); con un solo fantasma dice «Elige uno...». El síntoma real con un fantasma es la sección de trabajo visible sin ningún tick y «Empezar» habilitable; con un fantasma más un alumno real diría «2 alumnos» mostrando un solo tick. El fondo del hallazgo se sostiene íntegro.

**Evidencia:** `app/ui/src/App.tsx:67,164` · `app/ui/src/door/intent.ts (sin poda al borrar)` · `app/ui/src/learners/ForgetLearner.tsx → onErased` · `app/ui/src/door/LearnerPicker.tsx:36-42 (comentario T011)` · `specs/016-una-puerta/spec.md edge case «no learners»`

---

## C · Pipelines agénticos — adaptación, composición y el material que sale

> **Lente `agentico-adapt`:** El pipeline de adaptación tiene una arquitectura defensiva seria (gates deterministas de completitud/proveniencia, redacción en el chokepoint de egreso, corpus como política), pero visto con lupa antagonista el corpus de recetas no cubre los casos insignia (dislexia pura, PER-A/sordera, TDAH puro no activan ninguna receta y el job procede con 0 reglas), la trazabilidad que la maestra firma es falsificable (data-recipe/data-axis sin validar contra la selección), y varias promesas de «se reporta, nunca en silencio» se quedan en un logger o en un aviso que dice lo contrario de lo que hace el código. En el frente LLM, el material entra al prompt sin delimitación estructural (suplantación de secciones posible) y la heurística de nombres falla justo en el patrón más común (nombre desconocido a inicio de nota) con sesgo contra nombres no tradicionales.

> **Lente `agentico-compose`:** El núcleo verificador de 002 (aritmética) es sólido y honesto — clave calculada, nunca del modelo; rechaza sin reparar; el camino no verificable se declara como borrador — pero la corona alrededor tiene huecos serios: el mapeo lingüístico de objetivos traiciona el fraseo más común («restas con llevadas» quema presupuesto y devuelve cero), el camino de contenido envía dos formatos contradictorios en la misma llamada, y dos de las cuatro puertas de material (examen y problemas) se ofrecen, se cobran y no se pueden producir. En modalidades, la arquitectura una-extracción-N-salidas se sostiene, con dos desviaciones (ODT sin el gate de figura esencial; recorte del anclaje silencioso pese a la promesa del corpus); y la sustitución palabra→pictograma es un lookup ortográfico literal sin morfología, cuya cobertura real será escasa e inconsistente justo en el scope pensado para entender las órdenes.

#### AGE-01 · La heurística de nombres no detecta un nombre desconocido a inicio de frase — el patrón típico de una nota — y su lista de nombres comunes excluye a Sofía, Fátima, Mohamed…

**Severidad:** 🔴 Alta · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

`findProbableNames` solo marca una palabra capitalizada si (a) está en COMMON_NAMES o (b) NO está a inicio de frase (names.ts:109-115). Pero una nota de maestra empieza casi siempre por el nombre: «Fátima no arranca sin el primer paso hecho». Si el nombre no está en la lista, es inicio de frase → no se marca, no se pregunta, y sale al proveedor tal cual (el flujo `unknownNamesIn` de adapt.ts solo bloquea lo marcado). La lista tiene ~60 nombres tradicionales españoles y omite Sofía (top-3 en España una década), Fátima, Mohamed, Aya, Ainhoa… — el sesgo cae precisamente sobre el alumnado migrante, sobrerrepresentado en apoyo PT. La promesa de names.ts («Names never reach a model», 006 FR-418) y el ejemplo canónico del propio fichero («Lucía no arranca…») solo funcionan porque Lucía está en la lista. Es un riesgo RGPD directo: datos de un menor identificable saliendo del equipo sin que la maestra sea preguntada. (Recuerda además que cualquier tratamiento a escala de datos personales debería pasar por DPO/legal.)

> **Matiz del refutador:** Matiz: hay una segunda capa que el hallazgo no menciona — los nombres REGISTRADOS en el almacén cifrado se sustituyen por código en redact() y en sendRedacted (send.ts:29-45, con isClean como cinturón) independientemente de la heurística. El escenario de fuga aplica solo a nombres NO registrados (otro niño mencionado, alumno sin nombre guardado, o equipo Linux sin keyring donde los nombres no se persisten) — que es exactamente el caso que la heurística existe para cubrir, así que el defecto (sesgo de la lista + hueco de inicio de frase) sigue siendo real y con el sesgo señalado.

**Evidencia:** `app/packages/core/src/redact/names.ts:23-30 (COMMON_NAMES, sin sofia/fátima/mohamed)` · `app/packages/core/src/redact/names.ts:109-115 (sentence-initial no marcado)` · `app/packages/shell/src/jobs/adapt.ts (unknownNamesIn solo bloquea lo detectado)`

> ❓ **P17:** ¿Aceptamos ampliar la lista con los nombres más frecuentes del INE (incluidos los de origen extranjero) y marcar también el token inicial de cada nota aunque sea inicio de frase, a costa de más falsos positivos?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, ambas cosas:** ampliar la lista con los nombres más frecuentes del INE (incluidos los de origen extranjero) y tratar como candidato el token inicial de cada nota aunque sea inicio de frase. Se acepta el coste en falsos positivos: es RGPD de menores.

#### AGE-02 · El material entra al prompt bajo un simple heading '## Material a adaptar': un documento puede suplantar secciones del propio prompt y no hay recordatorio de tarea tras el contenido no confiable

**Severidad:** 🔴 Alta · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

`buildAdaptPrompt` separa secciones solo con headings markdown (`## Perfil…`, `## Correcciones de la maestra…`, `## Material a adaptar`) y pega el IR verbatim al final (prompt/adapt.ts:291). Un documento fuente que contenga una línea `## Correcciones de la maestra sobre el intento anterior` seguida de órdenes se lee estructuralmente idéntico a la sección legítima de máxima precedencia — y el detector de inyección no cubre ese vector: sus tiers exigen destinatario+directiva o capacidades concretas, no suplantación de secciones (injection.ts). Además, lo último que lee el modelo antes de generar es el material del atacante: la instrucción de salida (OUTPUT_FORMAT) queda al final del system prompt, lejos, y no hay reafirmación de tarea/reglas después del material — recency favorece la inyección. Las defensas estructurales aguas abajo (provenance, completeness) acotan el daño, tal como pide el Principio IX, pero delimitar el material con fences únicos (p. ej. etiquetas con nonce) y cerrar con un recordatorio es un endurecimiento barato que el diseño actual no hace.

**Evidencia:** `app/packages/core/src/prompt/adapt.ts:283-291 (secciones por heading, material al final sin cierre)` · `app/packages/shell/src/jobs/adapt.ts:35-44 (OUTPUT_FORMAT al final del system, no tras el material)` · `app/packages/core/src/ir/injection.ts (tiers no cubren suplantación de secciones)`

> ❓ **P18:** ¿Delimitamos el material con un fence/nonce y añadimos un recordatorio de tarea posterior al material? Toca prompt, no corpus, así que no roza el Principio I.
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí:** fences únicos con nonce por llamada alrededor del material no confiable + reafirmación de tarea/reglas después del contenido. Toca prompt, no corpus.

#### AGE-03 · «Restas con llevadas» — la forma más común de pedir restas con borrowing — quema el presupuesto entero y devuelve cero ejercicios

**Severidad:** 🔴 Alta · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

objectives.ts mapea `/\bcon\s+llevad|\bllevando\b/` → constraint 'carries' y reserva 'borrows' solo para «prestando»/«con préstamo». Pero el verificador aritmético declara que carrying no es propiedad de la resta: `case 'carries': if (p.op === '-' ...) return 'unknown'`. Resultado: una PT que escribe «restas con llevadas» (fraseo estándar en primaria española; el propio código lo admite — CONSTRAINT_ES traduce 'borrows' como «restar llevando») entra al bucle propose→verify donde TODA propuesta sale 'unknown', el bucle no corta en ese caso (solo corta con batch vacío), gasta hasta 30 propuestas de su dinero y termina con «no he podido comprobar los que proponía» y cero ejercicios — para una de las cuatro únicas destrezas que el sistema SÍ sabe verificar. Es la contradicción interna más barata de arreglar: el mapeo lingüístico debería resolver llevadas+resta → borrows.

**Evidencia:** `app/packages/core/src/compose/objectives.ts (CONSTRAINTS: llevad/llevando→carries; borrows solo con «prestando»)` · `app/packages/core/src/compose/verify/arithmetic.ts (case 'carries': op '-' → 'unknown'; CONSTRAINT_ES.borrows = 'restar llevando')` · `app/packages/core/src/compose/loop.ts (composeExercises: sin corte temprano cuando todo es 'unknown')` · `specs/002-compose/spec.md FR-123, FR-124`

> ❓ **P19:** ¿Confirmas que «restas con llevadas» debe interpretarse como 'borrows' cuando la operación es resta (o al menos abortar antes de gastar el presupuesto cuando el 100% de un lote sale 'unknown')?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, ambas:** el mapeo resuelve según la operación (llevadas+resta → borrows) y el bucle propose→verify aborta antes de gastar más cuando un lote entero sale unknown (señal de constraint imposible).

#### AGE-04 · El camino de contenido envía dos formatos de salida contradictorios en la misma llamada: el system exige «una línea por ejercicio» y el user exige bloques IR

**Severidad:** 🔴 Alta · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

systemPrompt() concatena hard-rules + compose.md + OUTPUT_FORMAT («Devuelve únicamente una línea por ejercicio, con este formato exacto y nada más: expresión = resultado... Sin numerar, sin explicaciones, sin texto alrededor»). Ese MISMO system se reutiliza en composeContent(), cuyo mensaje de usuario pide justo lo contrario: bloques `::: {#c1 .explanation data-objective=... data-anchor=...}`. Un modelo que obedezca el system devuelve algo que parseIR no entiende, los dos intentos fallan, ella paga dos llamadas (maxTokens 4000 cada una) y recibe un error que la culpa a ella de otra cosa: «se apoyaba en cosas que no me diste. Prueba a darme un poco más». El error diagnostica mal el fallo (formato, no anclaje). El camino de contenido necesita su propio system sin OUTPUT_FORMAT.

**Evidencia:** `app/packages/shell/src/jobs/compose.ts (OUTPUT_FORMAT y systemPrompt(), ~L50-65; composeContent usa args.system con CONTENT_FORMAT, ~L700-735; RampaError 'ir-no-provenance')`

#### AGE-05 · La sustitución palabra→pictograma es literal, sin morfología ni palabras compuestas: la cobertura real será escasa e inconsistente

**Severidad:** 🟠 Media · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

matchWord recibe tokens sueltos (apply.ts trocea con `\p{L}[\p{L}\p{M}'-]*`) y normalise solo pliega acentos/mayúsculas/espacios — sin lematización. Consecuencias verificables: (1) plurales y formas conjugadas no casan con los keywords lemma de ARASAAC («rana» sí, «ranas» no; «saltar» sí, «salta» no) → la misma palabra lleva dibujo en una frase y no en la siguiente, que para un lector SAAC es peor que la ausencia consistente; (2) los keywords multi-palabra del catálogo («lavarse las manos», «por favor») quedan indexados con espacios y son INALCANZABLES porque matchWord solo recibe una palabra; (3) el scope 'instructions' se vende como «el enunciado y las órdenes llevan pictograma», pero las órdenes van en imperativo («rodea», «une», «escribe») y los keywords son infinitivos → precisamente el scope pensado para 'entender qué se le pide' es el que menos casará. Todo cae en kind:'none', que se omite en silencio por diseño, así que nadie verá que la cobertura es del 10% en vez del 60%. Los SAAC reales trabajan con vocabulario nuclear y lemas; esto es lookup ortográfico exacto.

> **Matiz del refutador:** Matiz: la ausencia de morfología es diseño explícito y documentado en set.ts, no un olvido; lo no defendible que el hallazgo señala sigue en pie: keywords multi-palabra indexados pero inalcanzables, inconsistencia plural/singular invisible (kind 'none' silencioso) y el scope 'instructions' desatendido por imperativos. La afirmación sobre lemas/infinitivos del catálogo ARASAAC no es verificable desde el repo, pero la mecánica del código la hace plausible.

**Evidencia:** `app/packages/core/src/pictograms/match.ts (matchWord; Match kind 'none' omitido en silencio)` · `app/packages/core/src/pictograms/set.ts:208-210 (normalise: solo acentos/case/espacios)` · `app/packages/core/src/pictograms/apply.ts (tokenizador por palabra)` · `instructions/pictograms.md (scope instructions: «Sólo en lo que hay que hacer»)`

> ❓ **P20:** ¿Aceptarías una lematización determinista mínima (plural→singular, conjugación→infinitivo con una tabla/algoritmo offline) manteniendo la regla «exactamente uno o ninguno», o prefieres que sea la PT quien mapee formas en su vocabulario?
> ✅ **Respuesta de Carlos (2026-09-03):** **Lematización determinista mínima** (plural→singular, conjugación→infinitivo, tabla/algoritmo offline), manteniendo «exactamente uno o ninguno». El vocabulario elegido de la PT sigue mandando como peldaño superior.

#### AGE-06 · El guard anti-chivato de pictogramas en exámenes (asksAboutTheWord) falla con comillas tipográficas de apertura y con «que significa» sin tilde

**Severidad:** 🟠 Media · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

La clase de caracteres de apertura del regex es `[«"'”]` — incluye la comilla de CIERRE ” (U+201D) pero no la de APERTURA “ (U+201C) ni ‘ (U+2018). Un examen con «¿Qué significa “rana”?» escrito con comillas tipográficas (lo que producen Word y LibreOffice por autocorrección, que es donde las docentes escriben exámenes) no casa por el patrón de comillas; y si además la docente escribió «que significa» sin tilde (frecuentísimo en material escolar tecleado deprisa), tampoco casa el patrón léxico `qué (significa|es|...)`. Resultado: pictograma junto a la palabra preguntada en una prueba de vocabulario — exactamente el fallo que el propio comentario tarifa como «a child's mark» y que pictograms.md declara Nunca. El comentario dice «deliberately broad»; el regex es deliberadamente estrecho en los dos casos más probables.

**Evidencia:** `app/packages/core/src/pictograms/apply.ts (asksAboutTheWord: regex `[«"'”]...[»"'”]` y `/qué (significa|es|quiere decir)|cómo se (dice|llama)/`)` · `instructions/pictograms.md («En un examen... da la respuesta»)`

#### AGE-07 · Ningún proveedor detecta el corte por max_tokens: un texto de estudio truncado a 4000 tokens puede publicarse como completo

**Severidad:** 🟠 Media · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

anthropic.ts y compatible.ts fijan max_tokens (16.000 por defecto; compose fuerza 1500 para ejercicios y 4000 para contenido) y ningún sitio lee stop_reason/finish_reason del stream. Para ejercicios el daño es menor (líneas perdidas = menos propuestas). Para el camino de contenido es grave: composeContent parsea lo que llegó; checkObjectives detecta un objetivo ausente del todo, pero un corte DENTRO del desarrollo de un objetivo (quedan bloques con su data-objective y data-anchor válidos) pasa ambos checks y se escribe en la hoja. El tipo `study` existe precisamente porque «su fallo propio es enseñar menos sin que se note» (material-kinds.md) y su prohibición es la cobertura — y un truncado por presupuesto de tokens es exactamente ese fallo, generado por nosotros y sin ninguna red. Detectar stop_reason==='max_tokens' y rechazar/reintentar (o al menos reportarlo) es determinista y barato.

> **Matiz del refutador:** El hallazgo es incluso conservador en un punto: afirma que «checkObjectives detecta un objetivo ausente del todo», pero checkObjectives (core/src/compose/generated.ts:56-105) solo emite unknown-objective, no-objective y no-blocks — NO comprueba que cada objetivo pedido tenga bloques. Un truncado que elimine todos los bloques de un objetivo entero también pasaría mientras quede algún bloque generado. La red es aún más fina de lo que el hallazgo describe.

**Evidencia:** `app/packages/providers/src/anthropic.ts:78 (max_tokens sin lectura de stop_reason)` · `app/packages/providers/src/compatible.ts:152` · `app/packages/shell/src/jobs/compose.ts (maxTokens: 1500 y 4000)` · `instructions/material-kinds.md (study: «enseñar menos sin que se note»)`

#### AGE-08 · Un objetivo que nombra dos operaciones se reduce en silencio a la primera que casa: «sumas y restas con llevadas» compone solo sumas

**Severidad:** 🟠 Media · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

readObjective usa OPERATIONS.find(): la primera regex que casa gana y el resto del texto se ignora. «Sumas y restas con llevadas» (una línea completamente natural para una PT) se convierte en arith.add+carries; toda resta que el modelo proponga se rechaza como does-not-exercise, y si el bucle llena las 10 sumas pedidas, budgetExhausted es false, explainOutcome devuelve null y NADA le dice a la docente que la mitad de su objetivo se descartó. El fallo es doblemente invisible: la hoja parece correcta (10 sumas con llevadas verificadas) y el informe dice «he descartado los que no practicaban lo que pediste», que es falso para las restas — sí lo practicaban. Mitigación simple: detectar múltiples operaciones en una línea y o dividir el objetivo en dos skills o devolverlo como pregunta a la docente.

**Evidencia:** `app/packages/core/src/compose/objectives.ts (OPERATIONS.find: primera coincidencia)` · `app/packages/core/src/compose/loop.ts (explainOutcome: solo habla si budgetExhausted)`

#### AGE-09 · Tilde incorrecta en un texto que se imprime en el propio examen: «Válida cada una antes de usarlas»

**Severidad:** 🟡 Baja · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

En `material-kinds.md`, `composing.on_document` — frases que según el comentario van IMPRESAS en el documento porque «el papel sobrevive a la pantalla» — dice «Válida cada una antes de usarlas» (adjetivo) en lugar del imperativo «Valida». Un error ortográfico impreso en la cabecera de una prueba de evaluación, delante de docentes, mina la credibilidad de la herramienta justo donde pide confianza. Mismo fichero, misma frase repetida en `composing.before`, ahí correcta («tú validas»), lo que confirma que es errata y no elección.

**Evidencia:** `instructions/material-kinds.md:59 (on_document, exam)`

#### AGE-10 · La constraint 'exact' sobre una operación que no es división se aprueba en silencio, contra la propia filosofía del default-case

**Severidad:** 🟡 Baja · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

En exercises(), `case 'exact'` solo comprueba algo cuando p.op es '÷'; para +, − o × cae al final del switch y devuelve true — aprobación tácita de una constraint que nadie comprobó. El propio fichero argumenta lo contrario tres líneas más abajo: el default-case devuelve 'unknown' porque «returning true would silently approve an exercise against a constraint nobody checked». `/\bexact/i` es una regex ancha («resolver de forma exacta», «cálculo exacto») así que la combinación no es teórica. Debería ser 'unknown' como carries-sobre-resta.

**Evidencia:** `app/packages/core/src/compose/verify/arithmetic.ts (case 'exact' vs default case y su comentario)` · `app/packages/core/src/compose/objectives.ts (CONSTRAINTS: /\bexact/i)`

---

## D · Consistencia de la especificación — 25 specs, una historia

> **Lente `spec-consistencia-1`:** Las specs 001–012 son inusualmente rigurosas y autocríticas — 020 demuestra que el proyecto sabe retirar requisitos explícitamente — pero la red de referencias cruzadas se está erosionando por tres vías: una colisión frontal de numeración (005 y 007 comparten FR-501…FR-517 con significados distintos, y ya hay citas equivocadas en 021/022), enmiendas tardías que no se propagan (023 rompe 007 FR-511 sin decirlo; FR-129 de 002 pisa a FR-122), y residuos de la era harness en 001/003 que la nota de ADR 0006 no cubre. El hallazgo de mayor consecuencia práctica es que el borrado de un alumno no alcanza al almacén cifrado de nombres introducido por 006, y la verificación especificada es incapaz de detectarlo.

> **Lente `spec-consistencia-2`:** Las specs 013–025 son inusualmente honestas consigo mismas (retiradas anotadas en 016 y 018, procesos violados registrados en 019), pero esa convención de enmienda in situ se aplica de forma inconsistente: 025 contradice MUSTs de 020 sin tocar 020, 024 invalida FRs de 023 sin anotarlos, y el BACKLOG conserva un BLOCKER escrito sobre la descarga de ARASAAC que 023/024 se saltaron sin cerrarlo. Los dos hallazgos más graves son estructurales: la «conversación» que Carlos pidió no existe en ninguna spec y cuatro specs apuntan a números equivocados, y 022 se implementó y envió sin plan ni tasks — segunda violación del gate NON-NEGOTIABLE, esta vez sin registro, lo que demuestra que check-spec-kit.sh no cubre el caso real.

#### CONS-01 · 023 afirma que 022 «shipped» y su T023 ticked dice haber comprobado «022's diagrams» — pero 022 no existe: ni plan, ni tasks, ni una línea de código, ni entrada en BACKLOG

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

022-material-que-se-ve tiene solo spec.md (Draft) y checklists: sin plan.md ni tasks.md, es decir, nunca pasó la puerta Spec Kit y no puede tener implementación. No hay ningún renderer de diagramas en el código (grep de «diagram» solo toca ingest/read.ts, sin relación; no existe el allowlist de markup de FR-2008). Sin embargo: (a) el propio spec de 023 dice «after `022` shipped without touching it»; (b) 023 T023 está TICKED afirmando «`019`'s linear renderings and `022`'s diagrams are unaffected — asserted, not assumed» — no se puede asertar nada sobre diagramas que no existen: tick hueco, el mismo defecto que FR-2218 ya enseñó; (c) fetch.ts:64 cita «`022` FR-2008's [rule] for markup» como regla vigente del proyecto, dando a un spec sin implementar el rango de precedente. Y BACKLOG.md no menciona 022 ni una sola vez, así que el único registro de su estado real es la ausencia de tasks.md — el hueco de producto más grande de la serie (material visual, la queja original de Carlos) no está en la lista de deudas.

**Evidencia:** `specs/022-material-que-se-ve/ (solo spec.md + checklists; sin plan.md ni tasks.md)` · `specs/023-los-pictogramas-los-trae-rampa/spec.md (Input: «after `022` shipped»)` · `specs/023-los-pictogramas-los-trae-rampa/tasks.md (T023, ticked)` · `app/packages/core/src/pictograms/fetch.ts:64` · `specs/BACKLOG.md (cero menciones a 022)`

> ❓ **P21:** ¿022 sigue en la mesa? Si sí, debería entrar en BACKLOG como G-item y corregirse el texto de 023 (spec y T023); si no, hay que decir por qué se descarta.
> ✅ **Respuesta de Carlos (2026-09-03):** **Sigue, y se prioriza ya.** 022 entra en la cola inmediata junto a P2 (examen/problemas) y P4 (material de estructura) — enseñar a multiplicar necesita el diagrama. Además se limpia el registro: corregir el «shipped» falso y el tick hueco de T023 en 023, retirar la cita de código a FR-2008 como precedente, y 022 al BACKLOG como pendiente real hasta que tenga plan/tasks.

#### CONS-02 · Colisión de numeración: 005 y 007 definen ambos FR-501…FR-517 con significados distintos, y ya hay citas erróneas aguas abajo

**Severidad:** 🔴 Alta · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

El spec 007 (creado 2026-08-27) usa FR-501…FR-517 y el spec 005 (creado 2026-08-30) reutiliza exactamente el mismo rango, FR-501…FR-520. El mismo ID significa dos cosas: FR-511 es «cada hoja lleva su marca de borrador y su propia firma» en 005 y «la capa determinista no hace llamadas salientes salvo al endpoint del modelo» en 007; FR-516/517 son «entrada en el expediente / borrado por alumno» en 005 y «completitud / salida truncada» en 007. Las specs posteriores citan ambos lados con prefijo («005 FR-511» en 020:279 y 021:67; «007 FR-516/517» en 005:141), pero la colisión ya produce citas rotas: 021:201 cita «(`007` FR-511)» para «imprimir debe fallar ante una figura esencial sin describir», que no es FR-511 de 007 (llamadas salientes) ni de 005 (firma) — la regla real es el edge case de 001 y FR-516 de 007. Y 022:178 cita «FR-508's rule for paths» sin prefijo, ambiguo entre 005 FR-508 (reintento por alumno) y 007 FR-508 (escrituras confinadas al vault). En un proyecto cuyo argumento central es la trazabilidad (Principio VI), tener IDs de requisito ambiguos es exactamente el defecto que el propio proyecto llama «traceability to a moving target is not traceability».

> **Matiz del refutador:** Parcial: el ejemplo de 022:178 es falso. La cita SÍ lleva prefijo — el texto es «(`007`\n  FR-508's rule for paths, applied here)» con el `007` al final de la línea 177 y el FR-508 en la 178 por salto de línea; no hay ambigüedad, solo un line-wrap que el revisor leyó a medias. La colisión de rangos y la cita rota de 021:201 se sostienen y bastan para la severidad alta; retirar el ejemplo de 022.

**Evidencia:** `specs/005-group/spec.md:218-272 (FR-501…FR-520)` · `specs/007-untrusted-content/spec.md:170-214 (FR-501…FR-517)` · `specs/021-material-de-primera/spec.md:201 (cita errónea de 007 FR-511)` · `specs/022-material-que-se-ve/spec.md:178 (FR-508 sin prefijo)` · `specs/020-el-alumno-es-el-sitio/spec.md:279`

> ❓ **P22:** ¿Renumeramos los FR de 005 (p. ej. a FR-55x, es el spec más joven y menos citado) o congelamos la convención de citar siempre con prefijo de spec y lo escribimos en AGENTS.md/plantilla de Spec Kit?
> ✅ **Respuesta de Carlos (2026-09-03):** **Prefijo obligatorio, sin renumerar.** Convención «todo FR se cita con prefijo de spec» congelada en AGENTS.md y en la plantilla de Spec Kit; corregir la cita rota de 021:201. No se renumera 005.

#### CONS-03 · 023 introduce la primera llamada saliente que no va al modelo y 007 FR-511 no está enmendado: la spec vigente dice que ese camino «no existe»

**Severidad:** 🔴 Alta · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

007 FR-511 dice «The deterministic layer MUST make no outbound calls other than to the configured model endpoint» y su US3-4 afirma «Given any content, When it requests network access, Then there is no path». 023 (los pictogramas los trae Rampa) dice explícitamente «A search term travels to a server in Aragón. That is the first outbound request in this application that is not to her AI provider» — es decir, ARASAAC es ahora un segundo destino de red. 023 no menciona ni a 007 ni a FR-511 (grep confirmado: cero coincidencias), y 007 no lleva nota de enmienda. El contraste es visible porque el proyecto sí sabe hacerlo bien: 020 retira 016 FR-1401 tachándolo en el propio fichero de 016. Consecuencia práctica: 021:201 sigue citando FR-511 como vigente, y un contribuidor (o un test de seguridad) que lea 007 concluirá que el fetch de pictogramas es una violación del Principio IX. Nota menor adicional: la literalidad de FR-511 («the deterministic layer... other than the configured model endpoint») choca con el Principio II — la capa determinista no debería hacer NINGUNA llamada al modelo; la excepción debería colgar de la aplicación, no de la capa determinista.

**Evidencia:** `specs/007-untrusted-content/spec.md:190 (FR-511)` · `specs/007-untrusted-content/spec.md (US3 escenario 4)` · `specs/023-los-pictogramas-los-trae-rampa/spec.md:127` · `specs/021-material-de-primera/spec.md:201` · `.specify/memory/constitution.md (Principio II)` · `specs/020-el-alumno-es-el-sitio/spec.md:236,368 (el patrón correcto de retirada explícita)`

> ❓ **P23:** ¿Enmendamos 007 FR-511 a «ningún destino de red fuera de los declarados en el corpus» (modelo + ARASAAC, ambos revisados), con nota fechada que apunte a 023?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, enmienda con nota fechada:** 007 FR-511 pasa a «ningún destino de red fuera de los declarados en el corpus» (modelo + ARASAAC), nota apuntando a 023, y se corrige la literalidad (la excepción cuelga de la aplicación, no de la capa determinista).

#### CONS-04 · El borrado de un alumno (forget) no cubre el almacén cifrado de nombres, y la verificación por búsqueda de texto no puede detectarlo

**Severidad:** 🔴 Alta · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

003 US5 y FR-215–217 enumeran lo que forget elimina: profile, notes, overlay, jobs y outputs. 006 FR-417 introduce después un almacén nuevo — el nombre real («Lucía») cifrado, fuera del vault — que 003 no podía conocer. 014 extiende el borrado (FR-1209: record, adaptaciones, renders, entradas de índice) pero tampoco menciona la entrada del mapa de nombres. Resultado: tras «olvidar» a un alumno, su nombre real puede quedar en la máquina indefinidamente, junto al código que lo vincula a todo lo que se borró. Peor: la verificación especificada (003 FR-216 y SC-207, «una búsqueda de texto por el código del alumno no devuelve nada en la working copy») es estructuralmente incapaz de encontrar un nombre cifrado, así que el criterio de éxito pasaría en verde con el dato personal más sensible aún presente. Esto socava la promesa que 003 US5 hace en sus propios términos («It is still processing, and the teacher is still the one holding it» — derecho de supresión). Dado que esto toca tratamiento de datos personales de menores, la corrección de la spec debería validarse además con quien lleve protección de datos del proyecto.

**Evidencia:** `specs/003-memory/spec.md:119 (Independent Test), FR-215, specs/003-memory/spec.md:192 (FR-216), specs/003-memory/spec.md:230 (SC-207)` · `specs/006-desktop-app/spec.md:210 (FR-417)` · `specs/014-expediente-del-alumno/spec.md:235 (FR-1209), specs/014-expediente-del-alumno/spec.md:268 (SC-1206)`

#### CONS-05 · La «conversación» que Carlos pidió no tiene spec y la cadena de punteros entre specs está rota en cuatro eslabones

**Severidad:** 🔴 Alta · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

El input de 021 es literalmente «¿donde está la parte de iterar el material? no veo chat ni nada», y 021 lo difiere diciendo «The conversation is 022». Pero 022 resultó ser diagramas y dice «The conversation is 024»; 023 dice «024 is the conversation»; 024 dice «025 is the conversation»; y 025 es la reubicación de pictogramas, no la conversación. Resultado: el chat de iteración — la petición explícita de Carlos, y la mitad del «copilot completo» de 017 — no existe en ninguna spec, y cuatro specs vigentes contienen afirmaciones falsas sobre dónde vive. Cada spec nueva empujó el número una posición sin corregir a las anteriores. Cualquier lector que siga el puntero de 021 acaba en la spec equivocada.

**Evidencia:** `specs/021-material-de-primera/spec.md:39-42,347` · `specs/022-material-que-se-ve/spec.md:240` · `specs/023-los-pictogramas-los-trae-rampa/spec.md:264` · `specs/024-el-juego-entero/spec.md:279` · `specs/025-pictogramas-tienen-su-sitio/spec.md (no menciona conversación)`

> ❓ **P24:** ¿La conversación de iteración será la 026, o se descarta? En cualquier caso los cuatro punteros de 021–024 hay que corregirlos para que apunten a algo real.
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí: la conversación de iteración será la spec 026.** Se crea specs/026 (chat de iteración sobre material ya generado) y los cuatro punteros rotos de 021–024 se corrigen para apuntar a 026.

#### CONS-06 · 025 FR-2310 (raíl de cuatro entradas) contradice frontalmente 020 FR-1802 (exactamente dos destinos) y 020 FR-1817 (contenido de Configuración), sin enmendar 020

**Severidad:** 🔴 Alta · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

020 FR-1802: «The top level MUST offer exactly two destinations: her learners and Configuración». 025 FR-2310: «The rail's top level MUST be four entries: Mis alumnos, Preparar material, Mis notas, Configuración». Ambos son MUST vigentes e incompatibles. Además 020 FR-1817 exige que Configuración contenga el servicio de IA, el house style, los controles de display, la ubicación del vault y las licencias, y FR-1819 mueve las notas de práctica allí; 025 FR-2305 define Configuración con solo tres secciones (Pictogramas, Mi servicio de IA, Acerca de) y mantiene «Mis notas» en el top level. 025 sí registra que honra FR-1801 (FR-2314) y explica en Assumptions que «Preparar material stays» porque 020 US2 no está construida — pero no anota nada en 020, mientras que cuando 020 retiró 016 FR-1401 sí escribió la nota de retirada en el fichero de 016. La propia assumption de 020 dice: «A requirement that quietly disappears is a requirement nobody can argue with later». Eso es exactamente lo que le está pasando a FR-1802, FR-1817 y FR-1819: nadie puede saber leyendo 020 que 025 las ha dejado en suspenso.

**Evidencia:** `specs/020-el-alumno-es-el-sitio/spec.md:237 (FR-1802), 302 (FR-1817), 305 (FR-1819), 368-370 (assumption sobre enmendar)` · `specs/025-pictogramas-tienen-su-sitio/spec.md:174 (FR-2305), 186-187 (FR-2310), 197 (FR-2314), 231-233 (assumption Preparar material)`

> ❓ **P25:** ¿020 FR-1802/FR-1817/FR-1819 quedan aplazadas (025 es un paso intermedio hacia el raíl de dos entradas) o retiradas? La respuesta debe escribirse como nota en 020, igual que se hizo con 016 FR-1401.
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí: la visión de 020 se monta completa.** US2–US4 entran en la cola de trabajo («Preparar» dentro del alumno, retirar el door, partir «Mis notas»). En 020 se anota «aplazado por 025, sigue siendo el destino» (FR-1802/1817/1819) y en 025 que el raíl de cuatro es un paso intermedio.

#### CONS-07 · BACKLOG G28 mantiene sin tachar un «BLOCKER: the download must not ship on my assumption» mientras 023 y 024 registran la descarga como enviada

**Severidad:** 🔴 Alta · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

G28 dice, en negrita y sin enmienda posterior: «BLOCKER, and it is real: I could not read ARASAAC's own terms of use. Their terms page returned no content... the download must not ship on my assumption. Somebody reads that page first». Pero 023 afirma «Read on 2026-09-02, the terms say...» (y verifica solo la API, no consta quién leyó la página de términos que antes devolvía vacío), y el input de 024 dice «Carlos, on 023 as shipped» — es decir, la descarga se envió. O el blocker se resolvió y el BACKLOG no lo registra (rompiendo la convención de tachado/«withdrawn» que este mismo fichero usa en G22, G30, G33...), o se envió por encima de un blocker escrito. En ambos casos el registro miente a un auditor. Nótese que la assumption de 023 degrada la cuestión a «before a release rather than before a branch», lo cual contradice el «must not ship» de G28 sin decir que lo contradice.

> **Matiz del refutador:** G28 no está «sin enmienda posterior»: la sección «Added 2026-09-02» y el título «TEXT CORRECTED, THREE ITEMS OPEN» son enmiendas que registran la nueva lectura y mueven la revisión legal a pre-release. Lo que sigue siendo cierto y grave es que el párrafo BLOCKER («the download must not ship on my assumption») permanece sin tachar ni reconciliar dentro de la misma entrada, contradiciendo tanto la sección añadida como el hecho registrado en 024 de que 023 se envió — el fichero queda internamente contradictorio para un auditor, y la lectura de los términos que consta es la del propio autor no-abogado, verificada solo contra la API.

**Evidencia:** `specs/BACKLOG.md:806-810 (BLOCKER en G28), 756-780 (añadido 2026-09-02)` · `specs/023-los-pictogramas-los-trae-rampa/spec.md:24-33 (lectura de términos), 251-256 (assumption sobre revisión legal)` · `specs/024-el-juego-entero/spec.md:9 («on 023 as shipped»)`

> ❓ **P26:** ¿Alguien ha leído la página de condiciones de ARASAAC en su fuente (no solo comprobado que la API responde)? Si sí, hay que tachar el BLOCKER de G28 con fecha y quién; si no, la descarga está enviada contra un blocker vigente.
> ✅ **Respuesta de Carlos (2026-09-03):** **Ningún humano las ha leído todavía.** Se reconoce en G28 que la descarga se adelantó al blocker; el párrafo se actualiza con el estado real y un criterio de cierre explícito: un humano lee las condiciones de ARASAAC (y compliance/legal si procede) **antes de la primera release pública** — hasta entonces la feature existe pero no se distribuye.

#### CONS-08 · Contradicción entre recetas sobre exámenes y una maquinaria de conflictos que nunca se ejecuta: todas las recetas ship con conflicts: []

**Severidad:** 🟠 Media · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

`one-task-per-page` tiene scope [exercise, assessment] y manda «When one exercise contains several sub-questions, split those too» — mientras `exam-access-not-difficulty` lista como anti-patrón «Splitting a two-part answer into two one-part answers on an assessment». Ambas pueden estar seleccionadas a la vez sobre el mismo bloque .assessment y ninguna declara a la otra en `conflicts`. De hecho TODAS las recetas del corpus llevan `conflicts: []`, así que el resolutor de `selectRecipes` (acceso vence a optimización, severidad, opción conservadora) y la línea del informe «Conflicto entre X e Y…» son código muerto en producción: la única resolución de conflictos que existe hoy son las 2 recetas de conflicto (ATE/REG y PER-V/COG), que cubren dos pares de los muchos posibles — dislexia+TDAH (DEC+ATE: texto troceado con más estructura vs página mínima) no tiene ninguna. adapt.md precedencia 5 remite a «the conflict recipes» como si el mecanismo fuera general.

> **Matiz del refutador:** El par one-task-per-page ↔ exam-access-not-difficulty contradice sus textos sin declararse mutuamente en conflicts, y pares como DEC+ATE carecen de receta de conflicto — eso se sostiene. Lo que no se sostiene es que el mecanismo sea código muerto: lectura-facil@lang/es declara conflicts: [exam-access-not-difficulty], de modo que el resolutor corre al menos para ese par. La corrección: el mecanismo está infrautilizado (1 declaración en ~10 recetas), no muerto.

**Evidencia:** `app/corpus/recipes/core/one-task-per-page.md (scope y 'split those too')` · `app/corpus/recipes/core/exam-access-not-difficulty.md (anti-patrón de partir respuestas)` · `app/corpus/recipes/*/*.md (conflicts: [] en todas)` · `app/packages/core/src/recipes/index.ts:137-170 (resolutor que nunca corre)` · `instructions/adapt.md §Order of precedence, punto 5`

> ❓ **P27:** ¿Debe `one-task-per-page` excluir assessment de su scope (dejando la paginación de exámenes solo a exam-access-not-difficulty), o declarar el conflicto explícitamente?
> ✅ **Respuesta de Carlos (2026-09-03):** **Declarar conflictos + escribir los pares que faltan.** one-task-per-page y exam-access-not-difficulty se declaran mutuamente en `conflicts:` (en exámenes gana el acceso), y se escriben las recetas de conflicto de los pares frecuentes que faltan (DEC+ATE el primero). Todo corpus, cero código.

#### CONS-09 · adapt.md describe a la modelo un informe que el pipeline no puede producir: la maestra recibe 'one-task-per-page · 3 bloques', no las decisiones narradas que el corpus promete

**Severidad:** 🟠 Media · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

La sección «The report» de adapt.md (que viaja entera en el system prompt) enseña ejemplos con título narrativo y justificación («## Split exercises 4–6 into three sheets of two … Original numbering preserved»), pero el único canal de salida del modelo es el documento + `.report-notes` («Return the adapted document and nothing else»), y el informe real lo compone `buildReport` de forma determinista con títulos `titleFor` = «recipeId · N bloques». Resultado: (a) el modelo recibe instrucciones detalladas sobre un artefacto que no tiene canal para emitir — ruido de prompt que invita a meter el informe dentro del documento; (b) la promesa «the teacher reviews about fifteen decisions» se degrada a ids de receta + recuentos de bloques, mucho menos revisable que el ejemplo; (c) el ejemplo es además internamente incoherente: «three sheets of two» citando la receta `one-task-per-page` (una tarea por página) — y los ejemplos del corpus son exactamente lo que un modelo imita. También queda sin cablear en adapt (a diferencia de compose) el matiz de qué gana si una corrección de la maestra contradice el overlay oficial: adapt.md ordena overlay(2) > correcciones(3), pero ambas secciones del prompt solo dicen mandar «sobre las reglas seleccionadas» y las correcciones van al final.

> **Matiz del refutador:** Matiz sobre la cola del hallazgo: la precedencia overlay(2) > correcciones(3) SÍ llega al modelo, porque §Order of precedence de adapt.md va entero en el system prompt. Lo exacto es que las dos secciones del mensaje de usuario (prompt/adapt.ts:263-271 y 283-289) no reafirman esa precedencia mutua entre sí — ambas dicen solo «manda sobre las reglas seleccionadas» — no que la precedencia esté ausente del prompt.

**Evidencia:** `instructions/adapt.md §The report y §Output (ejemplo 'three sheets of two' con Recipe: one-task-per-page)` · `app/packages/core/src/report/index.ts:106-110 (titleFor = 'id · N bloques')` · `app/packages/core/src/prompt/adapt.ts:243-291 (overlay y correcciones sin precedencia mutua)`

#### CONS-10 · El corpus que una PT debe poder leer y corregir está mayoritariamente en inglés, y hard rule 12 contradice al informe cableado en español

**Severidad:** 🟠 Media · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

El Principio I existe para que la política pedagógica la pueda auditar «a special-education teacher who does not write code» — en el locale objetivo, una PT española. Pero hard-rules.md (la política central, enviada en cada adaptación), review.md, ingest.md y las 9 recetas core están en inglés, y adapt.md alterna inglés y español dentro del mismo fichero. La contribuyente para la que se diseñó el camino de contribución no puede leer la mitad de la política real. Además, hard rule 12 ordena al modelo hablar a la maestra «in the language of the source material» — con una ficha de la asignatura de inglés, las .report-notes saldrían en inglés — mientras `buildReport` compone el esqueleto del informe en español fijo: informe bilingüe incoherente para el caso de uso más normal de un colegio español. La propia constitución dice que las recetas language-neutral van en recipes/core y las específicas en recipes/lang, pero no resuelve en qué idioma se escribe el core para su público.

> **Matiz del refutador:** Corrección menor: recipes/core contiene 8 recetas más 2 recetas de conflicto (10 ficheros de receta), no «9 recetas core». El resto del hallazgo se sostiene tal cual.

**Evidencia:** `instructions/hard-rules.md (íntegro en inglés, regla 12)` · `instructions/adapt.md (mezcla EN/ES por secciones)` · `app/packages/core/src/report/index.ts:200+ (markdown en español fijo)` · `.specify/memory/constitution.md Principio I e Internacionalización`

> ❓ **P28:** ¿El corpus core se traduce al español (público real hoy) con el inglés como traducción, o mantenemos inglés-fuente y bloqueamos la contribución de PTs hasta tener recipes/lang/es completo?
> ✅ **Respuesta de Carlos (2026-09-03):** **Español fuente.** El corpus core se traduce al español — la auditora real es la PT española (Principio I). Con el multi-país de P3, cada lengua tendrá su corpus (patrón recipes/lang) y el inglés será una más. Se corrige además la regla dura 12: el informe habla SIEMPRE en el idioma de la docente (locale), no en el del material fuente.

#### CONS-11 · compose.md manda usar los intereses del alumno «en el contexto» de los ejercicios, pero el formato de cable hace imposible cualquier contexto

**Severidad:** 🟠 Media · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

El corpus (compose.md, «Qué hace un ejercicio bueno») exige: «El contexto es de su mundo... que los kilos sean de dinosaurio. Eso no es decoración: es lo que hace que empiece», y propose() inyecta «Le interesan: X. Úsalo en el contexto, no en la dificultad». Pero OUTPUT_FORMAT exige exactamente «expresión = resultado... sin explicaciones, sin texto alrededor», y parseProposals descarta cualquier línea con enunciado. Un modelo que obedezca el corpus produce líneas imparseables que gastan presupuesto en silencio; uno que obedezca el formato ignora el corpus. El Principio I dice que el Markdown es «el texto que la aplicación realmente envía» — aquí se envía y a la vez se anula mecánicamente. O el corpus deja de prometer contexto para el ramal aritmético, o el formato admite enunciado + expresión verificable.

> **Matiz del refutador:** Precisión: parseProposals no «descarta cualquier línea con enunciado» — una línea con enunciado que termina en «= número» sí parsea, pero entonces la rechaza el verificador como 'unknown'. El efecto neto (contexto imposible + presupuesto gastado) es el que el hallazgo afirma.

**Evidencia:** `instructions/compose.md («El contexto es de su mundo»)` · `app/packages/shell/src/jobs/compose.ts (OUTPUT_FORMAT; propose(): «Úsalo en el contexto»)` · `app/packages/core/src/compose/proposals.ts`

#### CONS-12 · Dos specs vivas disputan qué contiene Configuración: 020 FR-1817 (servicio + estilo propio + display + vault + licencias) vs lo construido por 025 (tres panes), y nadie marcó FR-1817 como enmendado

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

025 construyó Configuración con SettingsPane = 'pictograms' | 'service' | 'about', y route.ts declara además que los controles de display se quedan en el pie del raíl — decisión razonada, pero que contradice frontalmente 020 FR-1817 («Configuración MUST hold the AI service, her house style, the display controls, the vault location, and the licences»). 016 FR-1401 fue retirado con nota cruzada y fecha (el patrón correcto que el propio 020 exige en Assumptions: «a requirement that quietly disappears is a requirement nobody can argue with later»); FR-1817 en cambio ha sido re-escopado en silencio por el código de 025. Ni 'house' ni 'vault' existen hoy en ninguna pantalla. O 020 FR-1817 se enmienda formalmente, o 025 está incumpliéndolo sin registro.

> **Matiz del refutador:** Matiz: 'house' y 'vault' no están «re-escopados» sino pendientes — T033/T036 de 020 siguen sin marcar ([ ] en tasks.md:194,202) y route.ts:56 dice que «vuelven cuando existan las pantallas». La contradicción firme y sin registro es la de los controles de display: route.ts:68-74 la cierra como decisión permanente contra FR-1817, y nadie enmendó el FR.

**Evidencia:** `app/ui/src/nav/route.ts (SettingsPane + comentario «No display pane»)` · `specs/020-el-alumno-es-el-sitio/spec.md FR-1817, Assumptions` · `specs/025-pictogramas-tienen-su-sitio/spec.md FR-2305`

> ❓ **P29:** ¿Enmiendas 020 FR-1817 (display en el raíl, house/vault pospuestos con tarea numerada) o los panes que faltan son deuda que debe entrar en BACKLOG con G propio?
> ✅ **Respuesta de Carlos (2026-09-03):** Resuelto por P25: **Configuración se monta completa** — los panes que faltan (estilo propio, Mi carpeta, Pantalla e idioma, notas de práctica) entran en la cola de trabajo de 020 US2–US4. Nada se retira de FR-1817.

#### CONS-13 · El desfase y las medidas son por área en la normativa, pero el perfil de Rampa es único por alumno

**Severidad:** 🟠 Media · **Revisor:** `pt-gaps` · **Veredicto:** confirmado por refutador independiente

La propia constitución justifica el Principio V con «one learner needs different things in different subjects», y la tabla de guide.md condiciona la ACNS a «un desfase curricular de al menos un curso EN ESA ÁREA». Pero el perfil tiene un solo juego de niveles por eje, sin dimensión de área: el caso real de un niño a nivel en Lengua y con dos cursos de desfase en Matemáticas no se puede representar. Con un solo CUR, o se bloquea todo (ver el hallazgo sobre la parada por CUR≥2) o no se refleja nada. Las notes/works/avoid tampoco distinguen área, y 014 admite que el subject en el expediente es best-effort («where they do not, the row simply has no subject»). El principio enuncia una realidad que el modelo de datos no recoge.

**Evidencia:** `.specify/memory/constitution.md:69-72 (Principio V)` · `instructions/profile.md (un profile.yaml por alumno, ejes sin área)` · `instructions/guide.md (tabla: «desfase... en esa área»)` · `specs/014-expediente-del-alumno/spec.md:279-280`

> ❓ **P30:** ¿Merece el perfil una excepción por área al menos en CUR (que es el eje que dispara decisiones legales), o se acepta que el eje refleje el área en la que se trabaja con la PT?
> ✅ **Respuesta de Carlos (2026-09-03):** **Solo CUR gana dimensión de área** («Mates: 2, Lengua: 0», con valor general como fallback). Los demás ejes siguen siendo por alumno (barreras funcionales que viajan entre asignaturas). Cambio de modelo de datos acotado → spec. Casa con el CUR bidireccional de P9.

#### CONS-14 · 011 FR-918/919/920/921: cuatro MUST sin implementación, «cubiertos» en tasks.md con una justificación de por qué no se hicieron — el patrón FR-2218

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

FR-918 dice que un fichero de sistema educativo «MUST be able to carry» competencias específicas, criterios de evaluación y saberes básicos con su código oficial; FR-920 lo mismo para la taxonomía de objetivos PT/AL. Ni `education/parse.ts` ni `es.md` soportan nada de eso (cero apariciones de competencia/criterio/saberes/taxonomía en el parser). La tabla de evidencias de tasks.md los da por «satisfechos» con razonamientos de por qué no construirlos («Rampa ships no curriculum database», «writing a plausible one would put an invented list in front of her») — razonamientos defendibles, pero el spec no está enmendado, no hay entrada en BACKLOG (grep de 918/920/921/taxonom devuelve nada), y `check-fr-coverage.sh` queda satisfecho porque el FR «aparece» en tasks.md. Es exactamente la fisura por la que pasó FR-2218: la mención cuenta como cobertura. Además 002 FR-127 referencia este corpus como su entrada.

> **Matiz del refutador:** Tres MUST (FR-918, FR-920, FR-921) de 011 siguen sin implementación, documentados honestamente en tasks.md como «Not done, and needing a person» — no dados por satisfechos. El hueco real es de registro: el spec no se ha enmendado (siguen siendo MUST vigentes), la deuda no está en BACKLOG.md, y check-fr-coverage.sh acepta por diseño la justificación como cobertura, así que nada obliga a revisitarlos. FR-919 sí está satisfecho (opcionalidad asertada).

**Evidencia:** `specs/011-quien-alumno-edad/spec.md:217-236 (FR-918..922)` · `specs/011-quien-alumno-edad/tasks.md:128-129` · `app/packages/core/src/education/parse.ts (sin soporte)` · `instructions/education/es.md` · `specs/002-compose/spec.md FR-127`

> ❓ **P31:** ¿Enmendamos el spec 011 (retirar o marcar como aplazados FR-918..921 con su razón) o abrimos entrada en BACKLOG? Y ¿debería check-fr-coverage.sh distinguir «citado» de «implementado» — p. ej. exigir un marcador explícito de deferral?
> ✅ **Respuesta de Carlos (2026-09-03):** **Aplazar + endurecer el script.** FR-918/920/921 se marcan «aplazado: necesita una persona que valide contenido curricular real» con deuda en BACKLOG. Y check-fr-coverage.sh pasa a exigir declaración explícita por requisito (done / deferred:razón / dropped:razón) — la mención deja de contar como cobertura.

#### CONS-15 · Residuos de la era harness en 001 y 003 que la nota de ADR 0006 no cubre: git pull, commit hook, working copy y «no necesita API key» siguen como requisitos vigentes

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

La nota añadida por ADR 0006 a 001–003 dice «read a command name as the step it names», pero hay requisitos y supuestos que no son nombres de comando y que 006 invalida sin que nadie lo diga: (a) 003 US4-1 promete que un «git pull» no toca profiles/ ni memory/ — en el mundo 006 la docente no hace git pull, el corpus se actualiza «por un botón» (FR-414) y el vault es una carpeta elegida por ella sin repo; (b) 003 FR-214 exige memory/ git-ignored «enforced by the commit hook» y 001 FR-015 lo mismo para profiles/material/output/ — ese hook protege el repo de desarrollo, no el vault de la docente, y nadie re-especifica la protección en términos de la aplicación; (c) 003 FR-216/SC-207 hablan de «the working copy», vocabulario git para lo que ahora es el vault; (d) la assumption de 001 «The teacher has a working AI agent... and does not need to supply an API key. Provider comparison is out of scope» está frontalmente contradicha por 006 (BYO key es la premisa) y 009 (la comparación de proveedores es una feature entera), y no está tachada como sí lo está la de «which real teacher validates». El coste es real: 001-003 son las specs que un contribuidor nuevo lee primero.

**Evidencia:** `specs/003-memory/spec.md:99 (git pull)` · `specs/003-memory/spec.md:188-189 (FR-214)` · `specs/003-memory/spec.md:192,230 (working copy)` · `specs/001-phase-0-worksheet/spec.md:172 (FR-015)` · `specs/001-phase-0-worksheet/spec.md:248 (assumption API key)` · `specs/006-desktop-app/spec.md (FR-407, FR-414)`

#### CONS-16 · 002 FR-122 vs FR-129: dos fuentes obligatorias y mutuamente excluyentes para el nivel curricular

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

FR-122 (añadido 2026-08-29): para skill practice «the level MUST come from the education corpus (011), never from the model's own sense of the learner's age». FR-129 (añadido 2026-08-30): «The curricular level the material targets MUST be an input, and it MUST come from her or from the learner's overlay — never from the application's own judgement about the child». Ambos usan MUST + una cláusula «never», con fuentes distintas. El caso que los enfrenta es el flujo normal: la docente pide «multiplicar con llevadas» para un niño de 5.º y no declara nivel. ¿Derivar el nivel de curso→corpus (FR-122, y el escenario US5-1 lo exige) cuenta como «juicio propio de la aplicación sobre el niño» que FR-129 prohíbe, o como input de ella porque ella eligió el curso? Hay una lectura reconciliadora (ella nombra el nivel, el corpus define qué contiene), pero ninguno de los dos FRs la enuncia, y son los dos añadidos con un día de diferencia sin referenciarse entre sí.

> **Matiz del refutador:** Un matiz es falso: no es cierto que los dos FRs no se referencien entre sí. El preámbulo de la sección del 2026-08-30 (la misma que introduce FR-129) cita explícitamente FR-122: «FR-102 already requires an anchor and FR-122 already says the level comes from the education corpus». Eso agrava el hallazgo en vez de anularlo: la sección reafirma que el nivel viene del corpus y tres FRs más abajo exige que venga de ella o del overlay, sin conciliar ambas cosas.

**Evidencia:** `specs/002-compose/spec.md:221 (FR-122)` · `specs/002-compose/spec.md:249 (FR-129)` · `specs/002-compose/spec.md (US5 escenario 1)`

> ❓ **P32:** Cuando la docente no declara nivel explícito: ¿vale el derivado curso→corpus como cumplimiento de FR-129, o FR-129 obliga a preguntárselo siempre en compose?
> ✅ **Respuesta de Carlos (2026-09-03):** **Curso→corpus vale como input de ella.** Se escribe la lectura reconciliadora en ambas reglas (FR-122 y FR-129): ella nombra el curso del niño — eso es su input — y el corpus define qué contiene ese curso. Solo se pregunta si tampoco hay curso.

#### CONS-17 · 009 FR-707a vs FR-707b: la regla de recomendación puede volverse imposible de satisfacer, y la rama de pago omite el requisito de fotos

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

FR-707a fija la regla: con tarjeta → «the service with the best measured quality overall». FR-707b prohíbe que la recomendación por defecto proponga un servicio establecido fuera de EU/US. El día en que el mejor medido en cases/002-model-floor sea DeepSeek, Kimi o Qwen — todos previstos por el propio spec como entradas baratas del corpus — los dos MUST colisionan y no hay precedencia declarada; FR-707a debería decir «el mejor medido entre los elegibles según FR-707b». Segundo defecto en la misma regla: la rama sin tarjeta exige «that supports photographs» y la rama con tarjeta no, pese a que 008 declara la foto como «the common path, not the fallback» — tal como está escrito, la recomendación de pago podría señalar un servicio sin visión y romper el journey principal de 006 (SC-401 se mide desde una ficha fotografiada).

> **Matiz del refutador:** El primer defecto está sobredimensionado: FR-707b sí declara su precedencia con «however cheap or capable it measures», que anticipa exactamente el caso en que el mejor medido esté fuera de EU/US y dice que la prohibición gana igualmente. FR-707a no fue enmendado para decir «among the eligible», lo cual es una redacción mejorable, pero no hay colisión sin precedencia: la precedencia está escrita dentro de FR-707b. El defecto real y confirmado es la asimetría de la rama de pago respecto al soporte de fotografías.

**Evidencia:** `specs/009-connect-wizard/spec.md:324 (FR-707a)` · `specs/009-connect-wizard/spec.md:333 (FR-707b)` · `specs/008-vision-ingest/spec.md (Input: «the low-quality path is the common path»)` · `specs/006-desktop-app/spec.md (US1-5, SC-401)`

> ❓ **P33:** ¿Reescribimos FR-707a como «mejor calidad medida entre los servicios elegibles por FR-707b y con soporte de fotos en ambas ramas»?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí:** FR-707a se reescribe a «el mejor medido entre los elegibles por FR-707b y con soporte de fotografías, en ambas ramas».

#### CONS-18 · Requisitos no testeables tal como están escritos: «probable name» (006 FR-419) nunca se define y 007 SC-506 no tiene métrica

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

006 FR-419 exige que «probable unknown names» en texto saliente se marquen antes de enviar, y 008 FR-610 y 023 US3 apoyan promesas de privacidad sobre esa detección — pero ninguna spec define qué hace a un nombre «probable»: ni método, ni umbral, ni fixture, ni criterio de aceptación. Un test no puede afirmar ni negar el cumplimiento, y el caso límite lo admite la propia 023 («A first name that is also a common noun is a real limit») sin que eso se convierta en criterio verificable en 006, que es donde vive el requisito. 007 SC-506 tiene el mismo problema en un criterio de éxito: «False positives... stay low enough that the notice is still read rather than dismissed reflexively» — «low enough» no es medible y no se dice sobre qué corpus limpio ni con qué procedimiento, a diferencia de sus vecinos SC-501/502 que sí son porcentajes sobre fixtures.

**Evidencia:** `specs/006-desktop-app/spec.md:214 (FR-419)` · `specs/008-vision-ingest/spec.md:237-240 (FR-609/610)` · `specs/007-untrusted-content/spec.md:230 (SC-506)` · `specs/023-los-pictogramas-los-trae-rampa/spec.md (edge case del nombre-sustantivo)`

#### CONS-19 · 024 FR-2201/2202 retiran el diseño palabra-a-palabra de 023 pero 023 FR-2111 («The whole catalogue MUST NOT be fetched») sigue vigente sin anotación

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

023 FR-2111 dice que el catálogo entero NO debe descargarse y FR-2117 acota el número de palabras por fetch. 024 FR-2201 retira el fetch por palabras «as the primary path», FR-2202 trae el índice completo y US1 baja el set entero (157 MB). La convención del proyecto es enmendar in situ: 016 FR-1401 lleva su nota «RETIRED 2026-09-01 by 020 FR-1801», 018 FR-1601 lleva «NARROWED by 023 FR-2101», 018 FR-1602 lleva «CORRECTED... (backlog G28)». 023 FR-2111 y FR-2117 no llevan nada: quien lea 023 hoy encuentra dos MUST que la spec siguiente invalida sin rastro. Es la misma clase de deuda que el hallazgo del raíl (020 vs 025): la convención existe y se aplica de forma inconsistente.

**Evidencia:** `specs/023-los-pictogramas-los-trae-rampa/spec.md:198-199 (FR-2111), 212-213 (FR-2117)` · `specs/024-el-juego-entero/spec.md:178-181 (FR-2201/2202)` · `specs/016-una-puerta/spec.md:224-236 (el patrón de retirada bien hecho)` · `specs/018-pictogramas/spec.md:221-239 (FR-1601 narrowed, FR-1602 corrected)`

#### CONS-20 · G35 (abierto) documenta que 024 FR-2218 está incumplido y que la app ahora dice lo contrario del spec, sin enmienda en 024

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

024 FR-2218 es un MUST vigente: cambiar la elección de pictograma marca como stale las hojas hechas con el anterior. G35 registra que no está implementado (la frescura solo compara el fingerprint de ir.md, que un cambio de vocabulario no toca), que durante un tiempo la pantalla y vocabulario.md mintieron afirmando que sí, y que el arreglo aplicado fue cambiar el texto para decir «lo que de verdad pasa» — es decir, lo shipped ahora contradice deliberadamente el FR sin que 024 lleve nota alguna. El propio G35 reconoce que el segundo eje de frescura «is a spec, because 005's data model has exactly one today and adding a second silently would be the fourteenth thing two places disagree about» — o sea, el backlog mismo dice que esto debería ser una spec y no una entrada.

**Evidencia:** `specs/024-el-juego-entero/spec.md:217-218 (FR-2218)` · `specs/BACKLOG.md:517-534 (G35), 427-434 (G37, «the thing that mattered most»)`

> ❓ **P34:** ¿Priorizamos la spec del segundo eje de frescura (word→id ya está en data-picto, es computable), o se enmienda 024 FR-2218 a lo que la app hace hoy para que spec y producto digan lo mismo?
> ✅ **Respuesta de Carlos (2026-09-03):** **Construir la detección de verdad** (spec del segundo eje de frescura: al cambiar un dibujo, las hojas que lo llevan se marcan desactualizadas — el dato word→id ya está en data-picto). Mientras llega, FR-2218 se anota como aplazado en 024 para que spec y producto no se contradigan.

#### CONS-21 · 024 es internamente inconsistente: corrige la cifra a 157 MB en su tabla pero conserva «55 MB» en dos sitios y una conclusión («wrong by an order of magnitude») que ya no se sostiene

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

La tabla de 024 (línea 32) dice que el catálogo completo son «157 MB, measured» y que el 55 MB del primer borrador era una extrapolación errónea desde un pictograma de 4 KB — el mismo error que G33 documenta. Pero la spec conserva «US1 alone is 55 MB and a broken promise» (línea 110) y «Her disk is nearly full. 55 MB is small but not nothing» (línea 159) — precisamente el caso del disco, donde la cifra equivocada es la peligrosa (G33: el check habría dado por bueno un disco con 72 MB libres). Y la frase «So the objection was wrong by an order of magnitude» (línea 35) se escribió cuando se creía 55 MB: con 157 MB medidos, la objeción de 018 («hundreds of megabytes») no estaba equivocada en un orden de magnitud — estaba casi bien. La corrección llegó a la tabla y a las Assumptions pero no al cuerpo argumental.

**Evidencia:** `specs/024-el-juego-entero/spec.md:32,35,46,110,159,264-269` · `specs/BACKLOG.md:567-589 (G33)`

#### CONS-22 · 016 tras la retirada de FR-1401: US1, su Independent Test y SC-1406 siguen describiendo una primera pantalla que ya no existe, sin nota

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

020 FR-1801 retiró 016 FR-1401 y la nota en 016 está bien puesta — pero solo sobre el FR. El US1 de 016 («Given the first screen, Then both kinds of work are offered as peers»), su Independent Test («From the first screen, both branches are reachable in one interaction») y SC-1406 («A teacher's first ten seconds on the first screen produce 'puedo hacer varias cosas aquí'») siguen vigentes textualmente y contradicen 020 FR-1801: la primera pantalla es ahora el caseload, y las dos puertas están a 2-3 interacciones, dentro del alumno. La nota de retirada afirma «Everything else here — FR-1402 through FR-1412 — is unchanged and restated in 020», lo cual es cierto para los FRs pero deja huérfanos los escenarios y el SC que median el requisito retirado. Un test escrito contra SC-1406 hoy fallaría o mediría la pantalla equivocada.

**Evidencia:** `specs/016-una-puerta/spec.md:107-120 (US1 y su Independent Test), 248-250 (SC-1406), 224-236 (nota de retirada)` · `specs/020-el-alumno-es-el-sitio/spec.md:236 (FR-1801)`

#### CONS-23 · 022 FR-2012 exige describir diagramas en renderizados (audio/braille) que 019 declara sin empezar, y omite la única modalidad implementada: el export editable

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

022 FR-2012 dice que un diagrama DEBE describirse en palabras en los renderizados audio-ready y braille-ready «(019)» — pero el status de 019 dice «US2/US3 unstarted»: 022 depende de renderizados que no existen y no los lista como bloqueo. Peor: la modalidad que sí está construida (019 US1, ODT/Word) no aparece en 022 por ningún lado. ¿Un diagrama de markup sobrevive al export editable con estructura intacta (019 FR-1704)? ¿O el ODT de material compuesto con diagramas pierde las figuras? 021 FR-1902 exige que toda modalidad funcione sobre material compuesto «o nombre la razón específica»; 022 no da ni el comportamiento ni la razón, así que la promesa «un documento, N renderizados» (Principio IV, 019 FR-1701) tiene un agujero exactamente en el renderizado que la gente usa hoy.

**Evidencia:** `specs/022-material-que-se-ve/spec.md:186-188 (FR-2012), 139-140 (edge case linear renderings)` · `specs/019-modalidades/spec.md:7 (status US2/US3 unstarted), 227-234 (FR-1704)` · `specs/021-material-de-primera/spec.md:213-215 (FR-1902)`

#### CONS-24 · 022 FR-2007 (nada de personajes ni marcas de terceros) no es testeable: ningún mecanismo ni SC lo cubre

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

FR-2007 prohíbe que un diagrama reproduzca personajes, logos u otra propiedad protegida, y la propia spec lo califica como «a sharper infringement than a Creative Commons breach». Pero el tema del diagrama lo escribe el modelo (etiquetas y formas), y nada determinista puede distinguir una etiqueta «Pikachu» de una etiqueta «monstruo»: no hay allowlist de temas, no hay verificación nombrada, y ningún Success Criterion lo mide (SC-2003 solo comprueba que dos temas difieren, no que ninguno sea una marca). La assumption «the theme is words and shapes, not artwork... keeps FR-2007 achievable» confunde «improbable» con «verificado»: con profile.interests = 'Pokémon' el caso de fallo es el camino feliz. Compárese con cómo el mismo proyecto trata riesgos análogos: FR-2008 (allowlist de markup) sí tiene mecanismo y SC-2002 sí lo asserta.

**Evidencia:** `specs/022-material-que-se-ve/spec.md:168-171 (FR-2007), 211-224 (SCs, ninguno cubre FR-2007), 233-234 (assumption)`

#### CONS-25 · 013 FR-1105 («exactamente un control primario por pantalla») lleva desde agosto sin test, ya se rompió una vez, y G31 admite que no se escribe el test porque fallaría

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

G31 documenta que ningún test cuenta .btn-primary por pantalla, que 023 rompió la regla en una hora (dos botones sólidos a 900px con texto xlarge, cazado por captura y no por test), y que el motivo de no escribir el test es que «it would probably fail on several existing screens». Es decir: un FR vigente de 013, con violaciones conocidas en pantallas actuales, cuya única defensa es que alguien mire. El propio backlog lo compara con el defecto aria-pressed sin .door-on: «a rule that lives only in a specification is a rule that holds until somebody is in a hurry». Con 020/025 rediseñando la navegación entera — más pantallas nuevas, más prisa — es exactamente el momento en que esta regla sin guardia vuelve a romperse.

**Evidencia:** `specs/013-composicion-del-front/spec.md (FR-1105)` · `specs/BACKLOG.md:634-652 (G31)`

> ❓ **P35:** ¿Autorizas escribir el test de FR-1105 asumiendo que va a fallar en varias pantallas existentes, y tratar esos fallos como la lista de trabajo que destape?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, el test primero.** Se escribe ya el test que cuenta controles primarios por pantalla; sus fallos son la lista de trabajo. Protege las obras de navegación de P25.

#### CONS-26 · 024 FR-2222 exige que traer el set sea alcanzable sin entrar en un perfil, pero 025 describe lo shipped de 024 con todo dentro del formulario del perfil

**Severidad:** 🟠 Media · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

024 FR-2222: «Bringing the set MUST be reachable without first ticking a box inside one learner's profile. It is a fact about her installation, not about a child». Pero el relato de 025 sobre 024-tal-como-se-envió es: «Two specifications later I put a licence, four bullets of terms, ... a 157 MB download, a progress bar, a stop button, a folder picker and an update check inside that same profile form». Las dos afirmaciones no cuadran: o 024 se envió incumpliendo su propio FR-2222 (y ni 024 ni el BACKLOG lo registran como violación), o la descarga sí era alcanzable fuera del perfil y el diagnóstico de 025 exagera el defecto que dice arreglar. Un auditor no puede saber cuál de las dos specs dice la verdad sobre el estado que 025 corrige.

> **Matiz del refutador:** La inconsistencia es real y la violación no está registrada, pero la frase «un auditor no puede saber cuál de las dos specs dice la verdad» es excesiva: el historial git (822a530) lo resuelve — 025 dice la verdad y la tarea T016 de 024 está marcada como hecha sin estarlo. El hallazgo debería formularse como: 024 se envió violando FR-2222 con T016 falsamente [X], y ninguna de las dos specs ni el BACKLOG lo registra.

**Evidencia:** `specs/024-el-juego-entero/spec.md:227-229 (FR-2222)` · `specs/025-pictogramas-tienen-su-sitio/spec.md:24-31`

#### CONS-27 · Máquina de flow del reducer (flow/start, flow/step, flow/also, flow/leave, insideLearner) escrita y testeada pero que ninguna pantalla despacha: andamiaje de US2 conviviendo con el camino legacy real

**Severidad:** 🟡 Baja · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

reduceRoute implementa cinco acciones de flow, el tipo Flow con el orden whoElse-después-de-verify (la clarificación de costes de 020), withSelf y el helper insideLearner — y el único código que las ejercita es ui/test/route.test.ts; LearnerSection.prepare esquiva todo eso y manda al door legacy. Es scaffolding previsto (US2, T019-T030 sin marcar), pero mientras tanto el fichero cuyo propósito es «dónde está ella» contiene un segundo sistema de navegación que nada puede alcanzar — exactamente lo que el propio comentario de SettingsPane censura («la decimocuarta declaración escrita por un sitio y leída por nadie»). Riesgo concreto: US2 se construirá contra un reducer que nunca ha corrido bajo React (p. ej. nadie ha visto aún qué pinta la pantalla cuando flow existe y tab≠prepare).

**Evidencia:** `app/ui/src/nav/route.ts (Flow, flow/*, insideLearner)` · `app/ui/test/route.test.ts:63-127 (únicos dispatchers)` · `app/ui/src/learners/LearnerSections.tsx (prepare → onPrepare → door)` · `specs/020-el-alumno-es-el-sitio/tasks.md T019-T030 sin marcar`

#### CONS-28 · Dos umbrales distintos para el mismo filtro de roster: el caseload lo enseña desde 4 (corregido tras la queja de Carlos) y el picker del door lo mantiene desde 6 (el umbral rechazado)

**Severidad:** 🟡 Baja · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

LearnersScreen.tsx:182 muestra RosterFilters con rows.length >= 4, con un comentario que documenta por qué 6 estaba mal («Carlos: la lista de alumnos sigue sin tener filtros… estaban detrás de un umbral de seis y él probaba con dos»). LearnerPicker.tsx:88 conserva learners.length >= 6 con el comentario «like 015's» que ya no describe a 015. Mismo componente, misma docente, dos comportamientos: con 5 alumnos puede filtrar en «Mis alumnos» y no en «¿Para quién?». Deriva de dos copias de una verdad — el defecto que el propio repo persigue.

**Evidencia:** `app/ui/src/learners/LearnersScreen.tsx:182,241` · `app/ui/src/door/LearnerPicker.tsx:88`

#### CONS-29 · FR-210 (003): tasks.md dice «NOT done — a genuine gap» pero el código ya lo implementa — el registro de cobertura está desactualizado en dirección contraria a la habitual

**Severidad:** 🟡 Baja · **Revisor:** `spec-codigo-1` · **Veredicto:** confirmado por refutador independiente

specs/003-memory/tasks.md T004 registra FR-210 (el informe dice qué elemento de memoria alteró una decisión) como no hecho. El código lo implementa desde entonces: jobs/adapt.ts pasa `memoryAvailable` a `buildReport`, y report/index.ts:161-165 verifica las declaraciones `[memory:...]` del modelo contra lo cargado y produce `memoryApplied`. No es un defecto de producto, pero el documento que este proyecto usa como fuente de verdad de cobertura afirma lo contrario de lo que hace el código — la misma desconexión spec↔código que produjo FR-2218, en el sentido inverso. Quien lea tasks.md re-implementará o desconfiará del informe.

**Evidencia:** `specs/003-memory/tasks.md:16 (T004 «NOT done»)` · `app/packages/shell/src/jobs/adapt.ts:365-372 (memoryAvailable)` · `app/packages/core/src/report/index.ts:147-165`

#### CONS-30 · FR-019/FR-020 (001): la procedencia sigue sin registrar qué servicio de IA produjo el material — abierto y honesto (G18), pero son FRs normativos dentro de una spec «cerrada»

**Severidad:** 🟡 Baja · **Revisor:** `spec-codigo-1` · **Veredicto:** confirmado por refutador independiente

La propia tabla de cobertura de 001 lo declara «Not done — backlog G18», así que no es un hallazgo oculto. Lo señalo porque la spec 001 es la única de las ocho donde dos FRs con MUST viven indefinidamente como backlog dentro de un documento cuyo estado no lo refleja: con 6 proveedores conectables (009) y el `adapted_on` ya estampado en jobs/adapt.ts, el coste de añadir `service:` al mismo front matter es pequeño y la ventana en que las hojas existentes quedan sin trazar crece con cada semana de uso real. Verificado en código: `runAdaptation` estampa `adapted_on`/`school_year` y el fingerprint de lectura, y ningún campo registra el servicio.

**Evidencia:** `specs/001-phase-0-worksheet/spec.md (FR-019, FR-020)` · `specs/001-phase-0-worksheet/tasks.md:59 (fila FR-019/FR-020)` · `specs/BACKLOG.md:1219 (G18)` · `app/packages/shell/src/jobs/adapt.ts:318-341 (stamps sin servicio)`

#### CONS-31 · 025 T009 (FR-2309, progreso sobrevive a la navegación) figura como «Not done» pero el código lo implementa — el tracking está desactualizado en sentido inverso

**Severidad:** 🟡 Baja · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

tasks.md de 025 deja T009 sin marcar diciendo que la barra es useState del componente y se pierde al navegar. Pero bring.ts guarda `lastProgress` junto al AbortController (líneas 162-191), expone `bringing()` por IPC (ipc/pictograms.ts:112, preload.ts:130) y PictogramSetSection se siembra en el mount con `useBringing()` (líneas 74-88, con comentario «Seeded from the main process on mount (FR-2309)»). Exactamente el fix que T009 pedía. Consecuencia práctica: la lista de pendientes que se maneja (T016/T019-T021 en 025) no coincide con la real — abiertos de verdad: T010, T014, T016, T017, T018, T019, T020, T021 (y en 024, además de T021/T022: T020 —FR-2218/G35—, T030, T031). Un tasks.md que dice pendiente lo hecho es tan corrosivo para la planificación como el tick hueco, en dirección opuesta.

**Evidencia:** `specs/025-pictogramas-tienen-su-sitio/tasks.md (T009 sin marcar)` · `app/packages/shell/src/pictograms/bring.ts:162-191` · `app/packages/shell/src/ipc/pictograms.ts:112` · `app/ui/src/pictograms/PictogramSetSection.tsx:74-88` · `specs/024-el-juego-entero/tasks.md (T020, T021, T022, T030, T031 abiertos)`

#### CONS-32 · Referencias cruzadas rotas: «007 FR-011» en 012, «the barriers of 005» en 011, «003 US4» en 014

**Severidad:** 🟡 Baja · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

Tres punteros equivocados, cada uno verificado contra el destino: (1) 012:24 atribuye FR-011 (solo cambia presentación en bloques .assessment) al spec 007, cuando es de 001 — el propio 012:170 lo cita bien como «001 FR-011», así que la línea 24 es el error; (2) 011:229 (FR-920) dice que los objetivos PT/AL son «a different axis from the barriers of `005`», pero 005 es el spec de grupo (una ficha, varios alumnos) y las barreras viven en 001/Principio V/ADR 0002 — probablemente quería decir Principio V o ADR 0002, que FR-922 sí cita bien; (3) 014:187 cita «(`003` US4)» para «A learner erased», pero el borrado es 003 US5 («A learner leaves»); US4 es backups y export. Individualmente menores, pero en un corpus de specs que se citan tanto entre sí, cada puntero roto multiplica el coste de la colisión FR-5xx ya señalada.

**Evidencia:** `specs/012-que-material-examen/spec.md:24 vs specs/012-que-material-examen/spec.md:170` · `specs/011-quien-alumno-edad/spec.md:229 (FR-920) vs specs/005-group/spec.md` · `specs/014-expediente-del-alumno/spec.md:187 vs specs/003-memory/spec.md:92,109`

#### CONS-33 · Numeración interna rota y cronología imposible dentro de las propias specs

**Severidad:** 🟡 Baja · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

(1) 002 salta de User Story 3 a User Story 5: no existe US4, y el hueco no está explicado (el US añadido el 2026-08-29 se numeró 5 directamente). (2) 001 lista sus FRs añadidos en orden FR-016, FR-017, FR-019, FR-020 y después FR-018, sin nota. (3) La cronología narrativa es internamente imposible: 005:15 dice «Three years of specification later» sobre un backlog G3 que su propio Input fecha como abierto el 2026-08-27, en un spec creado el 2026-08-30 — son tres días; y 001:221 (FR-019) dice que el hueco «was not noticed for a year» en un proyecto cuya constitución se ratificó el 2026-08-27. Para un proyecto que trata sus specs como registro histórico trazable (cada enmienda fechada, cada decisión con su porqué), afirmaciones cronológicas falsas en ese registro son deuda: un lector futuro no puede distinguirlas de las fechas reales que sí importan.

**Evidencia:** `specs/002-compose/spec.md:125,151 (US3→US5)` · `specs/001-phase-0-worksheet/spec.md:207-230 (orden FR-016…FR-020/FR-018)` · `specs/005-group/spec.md:15` · `specs/001-phase-0-worksheet/spec.md:221` · `.specify/memory/constitution.md (Ratified 2026-08-27)`

#### CONS-34 · 006 FR-403 fija como copy literal «Unos 3 céntimos por ficha» mientras 012 FR-1011 prohíbe llamar «ficha» a todo — dos MUST en tensión

**Severidad:** 🟡 Baja · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

012 FR-1011 («The interface MUST stop calling everything “una ficha”», restated en 016 FR-1402) nace del argumento de que una docente que lee «ficha» por todas partes concluye que la aplicación no hace exámenes y nunca lo intenta. Pero 006 FR-403/US1-2 y 009 US4-4 fijan como copy literal de éxito de la conexión — la primera pantalla que ella ve — «✓ Conectado. Unos 3 céntimos por ficha», y 009 FR-724 exige reportar el coste «per worksheet». Ninguno de los dos specs posteriores (012, 016) enmienda o exceptúa ese literal. Es defendible que «por ficha» como unidad de coste sea aceptable, pero hoy la spec dice a la vez «este texto exacto MUST aparecer» y «esta palabra usada así MUST desaparecer», y el implementador de la pantalla de conexión no tiene forma de saber cuál gana.

> **Matiz del refutador:** Precisión menor: FR-403 (006:177-179) no contiene el literal — solo exige «report success in cost terms, not technical terms». El copy exacto lo fijan los escenarios de aceptación US1-2 (006:58) y US4 (009:259), que son criterios testeables, así que el conflicto se sostiene igualmente; solo cambia dónde vive el literal.

**Evidencia:** `specs/006-desktop-app/spec.md:58 (US1-2) y FR-403` · `specs/009-connect-wizard/spec.md (US4-4, FR-724)` · `specs/012-que-material-examen/spec.md:179 (FR-1011)` · `specs/016-una-puerta/spec.md:210 (FR-1402)`

> ❓ **P36:** ¿«Por ficha» como unidad de coste queda exento de FR-1011 (y se anota en 012), o cambiamos el copy de conexión a algo como «por hoja adaptada»?
> ✅ **Respuesta de Carlos (2026-09-03):** **Cambiar el literal a «por hoja adaptada»** en la pantalla de conexión (006 US1-2 y 009 US4). Sin excepciones a la regla de «ficha».

#### CONS-35 · «Settings» nombra dos almacenes distintos: el fichero fuera del vault (008, 010) y unos «vault settings» (011) que ningún spec define

**Severidad:** 🟡 Baja · **Revisor:** `spec-consistencia-1` · **Veredicto:** confirmado por refutador independiente

008 (clarificación de FR-609) sitúa el flag de aviso en «the settings file outside the vault, alongside the display preferences», y 010 FR-820 confirma que las preferencias viven «outside the vault» y no viajan en un handover. 011 FR-911, en cambio, guarda el sistema educativo «in the vault settings» — un almacén que 006, que define el vault (FR-407, FR-412), no menciona en ningún sitio. La distinción es intencionada y correcta (el sistema educativo es un hecho del vault y debe viajar con él; el flag de aviso es un hecho de esta máquina), pero usar la misma palabra para los dos deja sin especificar el contrato que importa: qué viaja en un backup, en un handover o al mover el vault de máquina, y en qué fichero concreto se materializa cada cosa. Es exactamente el tipo de ambigüedad que este proyecto resuelve en todas partes con un path explícito (profiles/<code>/adaptations.md, .rampa/index.md) y aquí falta.

**Evidencia:** `specs/008-vision-ingest/spec.md:71` · `specs/010-look-and-feel/spec.md:291 (FR-820)` · `specs/011-quien-alumno-edad/spec.md:182-183 (FR-911)` · `specs/006-desktop-app/spec.md (FR-407, FR-412: el vault definido sin «vault settings»)`

#### CONS-36 · Los campos Status de 020–025 están stale: todos dicen «Draft» mientras las specs siguientes los citan como «shipped» o «built»

**Severidad:** 🟡 Baja · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

020, 021, 022, 023, 024 y 025 declaran Status: Draft. Pero 023 dice que 022 «shipped», 024 dice que 023 «as shipped», 025 dice que 024 «as shipped» y que 020 US1 está construida (el caseload es la pantalla de apertura). 015 sigue diciendo «needs /speckit-clarify» pese a tener plan.md y tasks.md y a que el BACKLOG la da por cerrada «down to their remainders». En contraste, 016, 017, 018 y 019 sí actualizaron su Status. El campo existe para que alguien sepa qué está vigente sin leer seis specs; hoy responde mal en la mitad de los casos, y es el mismo defecto de segunda-copia-de-la-verdad que el proyecto persigue en todas partes.

**Evidencia:** `specs/020-el-alumno-es-el-sitio/spec.md:7` · `specs/021-material-de-primera/spec.md:7` · `specs/022-material-que-se-ve/spec.md:7` · `specs/023-los-pictogramas-los-trae-rampa/spec.md:7 y 14` · `specs/024-el-juego-entero/spec.md:7 y 9` · `specs/025-pictogramas-tienen-su-sitio/spec.md:7 y 9` · `specs/015-navegar-la-clase/spec.md:7` · `specs/BACKLOG.md:124-126`

#### CONS-37 · G29 deja abierta una violación viva de Principio I (PRICES compilado en código con un comentario que decía ser datos del corpus) sin spec ni tarea que la posea

**Severidad:** 🟡 Baja · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

G29 registra que PRICES está «compiled in» y que su comentario afirmó durante meses que era «shipped as data and updated with the corpus» — falso. El propio backlog reconoce que por Principio I pertenece al corpus (una tarifa que cambia debe ser un update, no una release), igual que USD_TO_EUR, y que cost_measured es false en todo el catálogo. Es exactamente la clase de deriva («el juicio en código, el Markdown de adorno») que la constitución 1.3.0 se enmendó para cazar, y hoy vive solo como dos bullets de «Open» al final de una entrada de backlog, sin dueño, sin spec y sin fecha. Las entradas deliberadamente abiertas del backlog (G14, G15, G16, G17) tienen todas una razón de espera nombrada; esta no la tiene.

**Evidencia:** `specs/BACKLOG.md:740-748 (G29 · Open)` · `.specify/memory/constitution.md (Principio I y enmienda 1.3.0)`

#### CONS-38 · El material de un especialista en lengua extranjera queda sin recetas lingüísticas y nadie especifica qué pasa entonces

**Severidad:** 🟡 Baja · **Revisor:** `tutor-gaps` · **Veredicto:** confirmado por refutador independiente

La regla dura 12 acierta: el material se adapta en su idioma («Speak the language of the material», no se traduce). Pero la constitución divide el corpus en recipes/core/ (neutro) y recipes/lang/<code>/, con «Spanish is the first fully populated locale». Cuando la especialista de inglés de mi centro adapte una worksheet en inglés para el alumno con dislexia, las recetas de simplificación léxica y legibilidad que necesita viven en un recipes/lang/en que no está poblado. Ninguna spec dice qué ocurre: ¿el job degrada en silencio a solo recetas core (presentación, carga, formato) sin decir que la parte lingüística no se aplicó? Un degradado silencioso contradice el espíritu de «nunca resolver nada en silencio» que gobierna el resto del sistema.

**Evidencia:** `instructions/hard-rules.md (regla 12)` · `.specify/memory/constitution.md (Internationalisation, líneas 166-170)`

---

## E · Spec ↔ código — lo reclamado contra lo que hay

> **Lente `spec-codigo-1`:** Las costuras centrales de 001–008 están mejor implementadas de lo habitual (puerta de verificación derivada por página, batch con fallo por alumno, chokepoint de redacción, marca de borrador derivada del documento, ancla y verificador aritmético de compose), y las tasks.md suelen registrar sus huecos con honestidad. Pero el defecto-firma del proyecto —«construido, correcto, inalcanzable»— sigue vivo exactamente donde las tablas de cobertura afirman lo contrario: `evidence:` sigue sin llegar al informe (el requisito escrito para cerrar ese patrón), el downscale y el renderizado de PDF escaneado existen como piezas que nada une (con HEIC roto de punta a punta), y el borrado deja el mapa código→nombre real, los paquetes de traspaso y el roster fuera de su alcance mientras el e2e afirma lo contrario con una aserción vacua sobre texto cifrado.

> **Lente `spec-codigo-2`:** Las specs 009–017 tienen una trazabilidad FR→código→test inusualmente buena (009, 012, 013, 016 verificadas contra código real sin desviaciones graves; las tareas abiertas están honestamente registradas en BACKLOG). El punto débil sistemático es el borrado (003 vía 014/015): cuatro residuos distintos sobreviven a «He borrado todo lo de X» — el mapa cifrado código→nombre (con un e2e cuya justificación es falsa y cuya aserción pasa en vacío sobre ciphertext), los paquetes de handover, los requests de composición en .rampa, y el diario archivado — y verifyForgotten está construido de forma que no puede ver tres de los cuatro. Además, el patrón FR-2218 (requisito citado ≠ requisito implementado) reaparece en 011 FR-918..921, donde check-fr-coverage.sh queda satisfecho por filas de tasks.md que argumentan por qué no se implementó, sin enmienda del spec ni entrada en BACKLOG.

> **Lente `spec-codigo-3`:** La cadena 018→023→024→025 está mayormente implementada y el proyecto es inusualmente honesto consigo mismo (FR-2218/G35, T009 sin marcar, comentarios que confiesan defectos), pero la honestidad no es uniforme: encontré tres huecos graves sin registrar — la atribución cableada a ARASAAC que imprime crédito falso con cualquier otro set (FR-1604/FR-2116), el spec 023 y su T023 ticked afirmando que 022 «shipped» cuando 022 no tiene ni plan ni una línea de código ni entrada en BACKLOG, y FR-2217 («biggest-used first») ticked cuando la popularidad ni siquiera se persiste en disco. Además, el gate de descarga tiene una puerta trasera estructural (default httpTransport en fetchWholeSet), el ODT pierde pictogramas en silencio, y el tracking de 024/025 está desincronizado en ambas direcciones (más tareas abiertas de las que se citan, y una cerrada que figura abierta).

#### COD-01 · La guía (017, marcada «Built, all 26 tasks») tiene su conversación inalcanzable y su puerta de entrada es un callejón: no hay forma honesta de traer el documento oficial

**Severidad:** 🔴 Alta · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

Tres defectos encadenados. (1) La vista 'guide-ask' (GuideConversation, la US de 017 «she loads a guide and asks about it») se renderiza en App.tsx:199 pero NADA en el código despacha {type:'legacy', view:'guide-ask'} — pantalla muerta, feature entera inalcanzable pese al estado «Built». (2) «Traer el documento que me han dado» (LearnerSections → curriculum) abre GuideScreen con jobId={ingested}; si no hay ingesta previa, la nota dice «Trae primero el documento y comprueba que lo he leído bien» pero la pantalla no ofrece NINGÚN control para traerlo: el único camino a la ingesta es door → «Adaptar algo que tengo» → elegir un TIPO DE MATERIAL (¿el DIAC es «una ficha» o «un examen»?) → traer foto → verificar → abandonar el flujo de adaptar → volver andando a alumno → curriculum. Paso muerto y preguntas en el orden equivocado. (3) Con un `ingested` residual de una ficha adaptada antes, «Leer las medidas» se HABILITA y lee las «medidas» de una ficha de mates como si fuera la adaptación curricular oficial — el comentario de App.tsx («ingested is set by exactly that flow, and there is no second path») es falso a escala de sesión.

> **Matiz del refutador:** La US de conversación es la US3 (P2), en ~specs/017-la-guia/spec.md:234-250, no exactamente 236-246; el estado 'Built, all 26 tasks' está en las líneas 6-8. Sustancia intacta.

**Evidencia:** `app/ui/src/App.tsx:190-199 (guide y guide-ask con jobId={ingested})` · `app/ui/src/guide/GuideScreen.tsx:66-71 (disabled={!jobId}, nota sin control)` · `app/ui/src/learners/LearnerSections.tsx (curriculum → onGuide)` · `specs/017-la-guia/spec.md:7 (Status Built), líneas 236-246 (US de conversación)`

> ❓ **P37:** ¿La ingesta del documento oficial debe vivir dentro de la sección «Su adaptación curricular» (su propio «traer», sin tipo de material ni door), o quieres reutilizar IngestScreen parametrizada por destino?
> ✅ **Respuesta de Carlos (2026-09-03):** **Traer propio en la sección:** «Su adaptación curricular» gana su propio botón de traer (sin tipo de material ni door), reutilizando la maquinaria de ingesta por debajo. Y la pantalla de preguntas de la guía se conecta por fin.

#### COD-02 · FR-016/FR-017 (001): la cita `evidence:` de las recetas sigue sin llegar al informe, y la tabla de cobertura afirma que llega

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-1` · **Veredicto:** confirmado por refutador independiente

La spec 001 añadió FR-016/FR-017 precisamente porque `evidence:` era «el cuarto campo parseado y nunca leído». El campo existe en el corpus (p. ej. recipes/core/one-task-per-page.md:7), `parseRecipe` lo tipa y lo parsea (recipes/index.ts:12,45)… y nada lo lee después: `buildReport` (report/index.ts) construye cada Decision solo con {title, recipe, axis, blocks} — grep de 'evidence' en report/, prompt/ y ui/ devuelve cero usos (los únicos hits de UI son del handover, otro concepto). Ni el markdown del informe ni ReportView muestran la cita. Sin embargo, la tabla de cobertura de tasks.md (línea 57) marca «FR-016, FR-017 | `evidence:` reaches the report» como satisfecho, y contracts/trace.md ni siquiera menciona FR-016/017. Es exactamente la forma de FR-2218: reclamado, no implementado — y en este caso el requisito que se escribió PARA cerrar ese patrón.

**Evidencia:** `specs/001-phase-0-worksheet/spec.md (FR-016, FR-017)` · `specs/001-phase-0-worksheet/tasks.md:57` · `app/packages/core/src/report/index.ts:113-186 (Decision sin evidence)` · `app/packages/core/src/recipes/index.ts:12,45` · `recipes/core/one-task-per-page.md:7`

#### COD-03 · FR-216 (003): el borrado deja el nombre real del alumno en .rampa/names.enc, los paquetes de traspaso en handover/ y la fila del roster

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-1` · **Veredicto:** confirmado por refutador independiente

Tras `memory:forget`: (a) nada elimina la entrada código→nombre real del mapa cifrado — `planForget`/`executeForget` (memory/forget.ts) no tocan `.rampa/names.enc` y `ForgetLearner.tsx` nunca llama a `names:set(code,'')`. El e2e (e2e/erasure.spec.ts:150-152) justifica la lápida con el código diciendo «the map from code to name is deleted along with everything else», que es falso, y su aserción es vacua porque el fichero es base64 de texto cifrado y nunca contendrá el código en claro. Con el mapa vivo, la excepción de FR-217 deja de ser defendible según el propio razonamiento del test. (b) Los paquetes de traspaso `handover/<code>-<year>.md` (ipc/memory.ts:162) — que llevan el código en el nombre del fichero y las barreras del niño dentro — no están en el plan de borrado, y `verifyForgotten` solo recorre profiles/material/output/memory (forget.ts:122), así que ni se borran ni se detectan; la spec 003 tiene un edge case explícito: «el paquete se borra también». (c) El roster: el enum `status: 'forgotten'` existe (vault/schema.ts:122) y nada en el código lo escribe jamás — otro campo declarado que nadie usa.

> **Matiz del refutador:** Todo cierto salvo la cita literal del e2e: el comentario real (erasure.spec.ts:149) dice «The map from code to name is gone, which is what makes the exception safe», no «is deleted along with everything else». La sustancia es idéntica — el test justifica la excepción de FR-217 afirmando que el mapa se borra, y no se borra — pero la cita debe corregirse a la frase real.

**Evidencia:** `specs/003-memory/spec.md (FR-216, edge case «Forget requested for a learner with an outstanding handover packet»)` · `app/packages/core/src/memory/forget.ts:33-122` · `app/packages/shell/src/ipc/memory.ts:162,170-177` · `app/e2e/erasure.spec.ts:150-152` · `app/packages/core/src/vault/schema.ts:122` · `app/ui/src/learners/ForgetLearner.tsx:43-153`

> ❓ **P38:** ¿Confirmas que forget debe borrar también la entrada de names.enc, los paquetes de handover/ y la fila del roster, o hay una decisión registrada en algún coverage.md que no encontré?
> ✅ **Respuesta de Carlos (2026-09-03):** **Confirmado, los cinco residuos:** el borrado elimina la entrada del mapa cifrado de nombres, los paquetes de traspaso, la fila del roster, las peticiones de composición guardadas y el diario archivado. verifyForgotten recorre los cinco sitios y el e2e vacuo se reescribe para poder fallar. Validar la corrección con quien lleve protección de datos.

#### COD-04 · 008: un PDF escaneado no se convierte nunca a imagen — el modelo recibe «Lee esta imagen» sin imagen — y tasks.md afirma que el renderizado de páginas está hecho

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-1` · **Veredicto:** confirmado por refutador independiente

La spec dice que la ruta visión cubre «PDF escaneado: cada página renderizada a imagen, una llamada por página». En `readPdf` (ingest/read.ts:184-237) no hay renderizado alguno: solo se lee la capa de texto y los operator lists; un PDF clasificado 'pdf-scanned' produce SourcePage sin `text` y sin `image`. En `runIngest`, `needsVision` (`p.image && !p.text`) da false, así que ni siquiera salta la comprobación de capacidad de visión, y `extractPage` manda el prompt «Página N. Lee esta imagen.» con `images: undefined` (jobs/ingest.ts:258-266) — el modelo inventa o falla, y ella paga la llamada. tasks.md T012 marca hecho «PDF page rendering via pdfjs-dist» y la fila FR-601 reclama «PDF (scanned and digital)». Además, los `figures` de un PDF digital se calculan con esmero (pageFigures, read.ts:216 y ss., «rendered only when there is something to crop») y NADA los consume — grep de `figures` fuera de read.ts devuelve cero — así que el diagrama del que trata la pregunta desaparece, la falla que el comentario dice existir para prevenir. US3-1 («figures are cropped and carried into the IR») no está implementado.

**Evidencia:** `specs/008-vision-ingest/spec.md (tabla «Two paths, one IR», FR-601, US3-1)` · `specs/008-vision-ingest/tasks.md:48,134` · `app/packages/shell/src/ingest/read.ts:184-237` · `app/packages/shell/src/jobs/ingest.ts:106-110,258-266`

> ❓ **P39:** ¿El PDF escaneado se difiere explícitamente (y se dice en la UI) o hay que renderizar páginas con pdfjs en el renderer antes de ingest:run?
> ✅ **Respuesta de Carlos (2026-09-03):** **Construirlo ya:** renderizar las páginas del PDF escaneado a imagen (pdfjs en el renderer) antes de ingerir, cerrando la promesa de la spec. Nada de pagar llamadas sin imagen.

#### COD-05 · FR-616 (008): el downscale de imágenes nunca se ejecuta — `planDownscale` no lo llama nadie — y la ruta HEIC envía RGBA crudo con mediaType inválido

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-1` · **Veredicto:** confirmado por refutador independiente

FR-616 exige reducir las imágenes antes de enviar, al límite del corpus. Las tres piezas existen por separado y no están unidas: `image_long_edge: 1600` se parsea de instructions/ingest.md a `IngestBudget.imageLongEdge` (ingest/budget.ts:21,71), `planDownscale` existe como aritmética pura (downscale.ts:23), y `jobs/ingest.ts` la importa (línea 3) pero jamás la invoca — la foto va al proveedor a resolución completa: `base64: Buffer.from(page.image.data).toString('base64')` (jobs/ingest.ts:262). El coste que la spec cuantifica («varias veces el de una página legible») se paga en cada foto de móvil. Peor: `decodeHeic` devuelve RGBA crudo con `mediaType: 'image/rgba'` (read.ts:128) confiando en que «el renderer lo re-codifica a JPEG» — ese renderer no existe (cero usos de canvas/toDataURL para esto) — así que una foto de iPhone llega a Anthropic como `media_type: 'image/rgba'` (anthropic.ts:56), que la API rechaza: el edge case «HEIC de un iPhone: la docente nunca ve un error de formato» está roto de punta a punta. tasks.md T013 marca hecho «decode → downscale → one call per page» y la fila FR-616 reclama «planDownscale with the bound read from the corpus».

**Evidencia:** `specs/008-vision-ingest/spec.md (FR-616, edge case HEIC)` · `specs/008-vision-ingest/tasks.md:32,49,142` · `app/packages/core/src/ingest/downscale.ts:23 (única definición; grep sin llamadas)` · `app/packages/shell/src/jobs/ingest.ts:3,262` · `app/packages/shell/src/ingest/read.ts:128` · `app/packages/providers/src/anthropic.ts:56`

#### COD-06 · El borrado de un alumno no elimina su entrada del mapa cifrado código→nombre, y el e2e afirma lo contrario pasando en vacío

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

003 FR-216 exige que tras el borrado «ningún fichero de la copia de trabajo contenga el código o el contenido del alumno», y 014 FR-1209 extiende el borrado a los índices. Pero `memory:forget` solo ejecuta `executeForget(plan)` y añade la lápida: nunca borra la entrada del alumno en `.rampa/names.enc` (la única vía de borrado de nombre es `names:set(code, '')`, que ningún flujo de olvido llama). Tras «He borrado todo lo de Lucía», `names:resolve(code)` en ese equipo sigue devolviendo 'Lucía' — el dato más personal del sistema sobrevive. Peor: el comentario del e2e (erasure.spec.ts:127-133) justifica que la lápida conserve el código precisamente porque «the map from code to name is deleted along with everything else. If the name map survived, this exception would not be defensible» — y el mapa SÍ sobrevive. La aserción `nameMap.text` (línea 150-151) pasa en vacío porque compara contra ciphertext base64, donde el código nunca aparece en claro. La justificación de la lápida se derrumba y la prueba que debía sostenerla no puede fallar.

**Evidencia:** `app/packages/shell/src/ipc/memory.ts:170-177` · `app/packages/core/src/memory/forget.ts:31-70,99-107` · `app/packages/shell/src/ipc/names.ts:145 (names:set, única vía de borrado, nunca llamada al olvidar)` · `app/e2e/erasure.spec.ts:119-151` · `specs/003-memory/spec.md FR-216` · `specs/014-expediente-del-alumno/spec.md FR-1209`

#### COD-07 · Los paquetes de handover (handover/<code>-<año>.md) sobreviven al borrado, y ni el plan ni la verificación honesta los miran

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

`memory:buildPacket` escribe el paquete de traspaso en `handover/<code>-<año>.md` dentro del vault, con el código en el nombre del fichero y las claims del perfil (barreras, lo que le funciona) en el contenido. `planForget` recoge rutas solo de profiles/, material/, output/ y memory/journal — nunca de handover/. Y `verifyForgotten`, la función cuyo trabajo es que la frase «he borrado todo» sea honesta, recorre exactamente [profiles, material, output, memory]: handover/ queda fuera también de la verificación, así que ni siquiera aparece en `remaining`. Un alumno con handover generado queda con un fichero entero suyo tras el borrado y la pantalla dice «He borrado todo lo de X» sin matiz. El e2e no lo detecta porque `seedTwo` no genera ningún paquete. Viola 003 FR-216 directamente y el alcance de 014 FR-1209/FR-1211.

**Evidencia:** `app/packages/shell/src/ipc/memory.ts:160-164` · `app/packages/core/src/memory/forget.ts:110-124 (walk de solo cuatro directorios)` · `app/packages/core/src/vault/paths.ts:31 (handover: 'handover')` · `specs/003-memory/spec.md FR-216` · `specs/014-expediente-del-alumno/spec.md FR-1209, FR-1211`

#### COD-08 · La atribución de pictogramas está cableada a ARASAAC: FR-1604 y FR-2116 no se cumplen en el render y nadie lo registra

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

`attributionFor(doc, attribution = ARASAAC_ATTRIBUTION)` acepta una atribución alternativa, pero sus DOS únicos call sites (html.ts:208 y linear.ts:208) la llaman sin segundo argumento: el parámetro está muerto. Consecuencia: una docente que use un juego que NO sea ARASAAC (el caso que FR-1604 exige soportar, carpeta a mano con su propio LICENSE — que set.ts lee y muestra pero nunca pasa al render) imprime en cada hoja «Autor pictogramas: Sergio Palao · Origen: ARASAAC · Licencia: CC BY-NC-SA» — una atribución FALSA, que es legalmente peor que omitirla. Además, 023 FR-2116 exige que la atribución registre de qué publisher viene CADA pictograma «para que un set construido de dos fuentes se atribuya correctamente»: `PictogramEntry` es solo {id, keywords} (set.ts:35-38), `mergeSet` no guarda publisher, y el inventario guarda un único publisher global. El dato por-pictograma no existe en ningún sitio. 023 T001/T002 están ticked citando FR-2116, pero solo cubren el catálogo del corpus. BACKLOG.md no tiene ninguna entrada sobre esto: FR incumplido, ticked y sin registrar.

**Evidencia:** `app/packages/core/src/render/attribution.ts:50-73` · `app/packages/core/src/render/html.ts:208` · `app/packages/core/src/render/linear.ts:208` · `app/packages/core/src/pictograms/set.ts:35-49,176-181` · `specs/023-los-pictogramas-los-trae-rampa/spec.md (FR-2116)` · `specs/023-los-pictogramas-los-trae-rampa/tasks.md (T001, T002)` · `specs/018-pictogramas/spec.md (FR-1603, FR-1604)`

> ❓ **P40:** ¿Implementamos publisher por entrada + atribución derivada del set configurado, o degradamos FR-2116/la mitad de FR-1604 a una entrada de backlog explícita («solo ARASAAC atribuible hoy»)?
> ✅ **Respuesta de Carlos (2026-09-03):** **Atribución por fuente real:** el render lee la atribución del set configurado (la licencia que la app ya lee y muestra) en vez del texto cableado, y el catálogo guarda de qué fuente vino cada pictograma (sets mezclados atribuibles). Nunca más una atribución falsa impresa.

#### COD-09 · FR-2217 «biggest-used first» es imposible tal como está: la popularidad no se persiste y el chooser ordena por orden de metadata, con 024 T017 ticked afirmando lo contrario

**Severidad:** 🔴 Alta · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

024 FR-2217 y US2 exigen mostrar los candidatos «largest-used first», y T017 está ticked como «popularity-ordered». Pero `popularity` solo vive en `readIndex`/`planWholeSet` durante la descarga (ordena la llegada); `mergeSet` la descarta al escribir `pictograms.<lang>.json` ({id, keywords} y nada más), así que el dato no está en disco. `candidatesFor` y `chosenSoFar` (bring.ts) devuelven los ids en el orden en que el metadata los insertó — lexicográfico por id tras mergeSet — y ni el handler ni ChooseWord.tsx ordenan nada; los comentarios de bring.ts (~línea 490) y ChooseWord.tsx:32 afirman un orden por popularidad que ningún código produce. La maestra ve los cuatro dibujos de «casa» en orden arbitrario. No hay entrada en BACKLOG (G30 se cerró por el chooser sin recoger esto): FR incumplido, ticked y sin registrar.

**Evidencia:** `specs/024-el-juego-entero/spec.md (FR-2217, US2 escenario)` · `specs/024-el-juego-entero/tasks.md (T017, ticked)` · `app/packages/core/src/pictograms/fetch.ts:131-157 (mergeSet descarta popularity), 225, 269, 314` · `app/packages/shell/src/pictograms/bring.ts:487-533 (candidatesFor sin orden alguno)` · `app/ui/src/pictograms/ChooseWord.tsx:32`

> ❓ **P41:** ¿Persistimos popularity en el metadata (rompe el contrato de 018 «reader unchanged»… aunque el reader tolera campos extra) o en el inventario, o rebajamos FR-2217 a «orden estable» registrándolo?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, persistir la popularidad** en el catálogo local al descargar (el lector tolera campos extra) y ordenar el selector del más usado al menos. El tick de la tarea deja de ser falso.

#### COD-10 · 022 se implementó y «shipped» sin plan.md ni tasks.md, violando el gate NON-NEGOTIABLE de la constitución, y a diferencia de 019 no lo registra

**Severidad:** 🔴 Alta · **Revisor:** `spec-consistencia-2` · **Veredicto:** confirmado por refutador independiente

La constitución (1.4.0, Development Workflow) dice: «Implementation code MUST NOT be written for work that has no numbered task in a specs/<feature>/tasks.md», y lo marca NON-NEGOTIABLE. El directorio specs/022-material-que-se-ve/ contiene solo spec.md y checklists/ — ni plan.md ni tasks.md — y sin embargo 023 dice en su input «after 022 shipped without touching it». Es la segunda violación del gate (la primera, 019 US1/US4, al menos se registró a sí misma en un «process note» dentro de la spec); 022 no dice una palabra. Esto además demuestra que scripts/check-spec-kit.sh no cubre el caso real: bloquea spec+implementación en un mismo commit, pero no bloquea implementar en commits posteriores sin tasks.md — el agujero exacto que 019 ya había señalado («the gate does not block this — so nothing stopped it»), reincidido sin registro.

**Evidencia:** `.specify/memory/constitution.md (Development Workflow, gate 1.4.0)` · `specs/022-material-que-se-ve/ (solo spec.md y checklists/)` · `specs/023-los-pictogramas-los-trae-rampa/spec.md:14 («after 022 shipped without touching it»)` · `specs/019-modalidades/spec.md:78-96 (el precedente registrado)`

> ❓ **P42:** ¿Quieres que check-spec-kit.sh se endurezca para exigir tasks.md antes de que exista código atribuible a una spec (p. ej. vía referencia de FR/tarea en el commit), o el gate se queda como está y 022 recibe al menos su nota de proceso como 019?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, endurecer:** check-spec-kit.sh pasa a comprobar que toda spec citada por código o dada por enviada por otra spec tenga plan.md y tasks.md. Y 022 recibe su nota de proceso como hizo 019.

#### COD-11 · La trazabilidad es falsificable: data-recipe y data-axis no se validan contra las recetas seleccionadas ni contra el perfil

**Severidad:** 🟠 Media · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

`checkProvenance` solo comprueba PRESENCIA de `data-from`/`data-recipe`/`data-axis`, nunca que la receta citada esté entre las que `selectRecipes` seleccionó ni que el eje citado exista o esté observado en el perfil. Un modelo (o una inyección) puede atribuir un cambio a `receta-inventada@1` con `data-axis: COG:3` en un alumno sin COG observado, y `buildReport` lo imprime tal cual («Receta: `receta-inventada@1`») para que la maestra lo firme. El contraste es flagrante con `[memory:...]`, donde la declaración SÍ se verifica contra lo cargado precisamente para que «una línea signifique que su corrección tuvo efecto». El Principio VI y la regla dura 6 prometen que cada cambio nombra la receta y la barrera que lo justifican; hoy esa promesa es sintáctica, no semántica. La verificación es determinista y barata: intersección con `selection.selected` y con los ejes observados.

**Evidencia:** `app/packages/core/src/ir/provenance.ts:29-48 (solo presencia)` · `app/packages/core/src/report/index.ts:113-127 (agrupa e imprime sin validar)` · `app/packages/core/src/report/index.ts:160-165 (memoria SÍ verificada — asimetría)` · `.specify/memory/constitution.md (Principio VI)`

#### COD-12 · Tres promesas de 'se reporta, nunca en silencio' que el código no cumple: notas truncadas solo al log, checkBounds no bloquea pese a decir lo contrario, y coste no registrado cuando falla la proveniencia

**Severidad:** 🟠 Media · **Revisor:** `agentico-adapt` · **Veredicto:** confirmado por refutador independiente

(1) `boundNotes` documenta «dropping is reported» y prompt/adapt.ts dice «Bounded here, never silently dropped», pero `notesOmitted > 0` acaba solo en `logger.info` (adapt.ts:252): la maestra jamás sabe que se descartaron secciones de sus notas — exactamente el defecto (correcciones tiradas al suelo) que ese módulo dice haber arreglado. (2) `checkBounds(doc)` en adapt.ts:133 solo añade un aviso cuyo texto dice «No lo he cortado por mi cuenta: divídelo en partes y lo hacemos por trozos» — pero el job envía el material entero igualmente y el aviso llega al final; `assertWithinBounds` existe y no lo llama nadie (FR-513: un input desbordado sirve para empujar las instrucciones fuera de contexto). (3) Si `assertProvenance`/`findUnaccountedBlocks` lanzan tras un intento (o tras el retry), el flujo aborta antes de `recordCost` (adapt.ts:301 vs 381): dinero de la maestra gastado y no contabilizado, cuando el fallo de retry sí lo registra (adapt.ts:289). De propina, la proveniencia no disfruta del retry que sí tiene la completitud, siendo igual de recuperable.

**Evidencia:** `app/packages/shell/src/jobs/adapt.ts:133, 252-254, 289, 301, 381` · `app/packages/core/src/prompt/adapt.ts:68-75 (promesa de boundNotes)` · `app/packages/core/src/ir/bounds.ts (assertWithinBounds sin llamadas fuera de tests)`

#### COD-13 · El recorte del anclaje es silencioso para la docente, contra la promesa explícita del corpus

**Severidad:** 🟠 Media · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

compose.md (front matter, anchor_max_chars) promete: «reaching the bound is reported, never silent». En el código, cuando readAnchor recorta (20.000 chars / 40 pasajes) solo hay un logger.warn; `anchorCut` viaja en ComposeResult y está tipado en el UI (data/compose.ts:61) pero NINGÚN componente lo renderiza (ComposeScreen muestra cutObjectives, needsAnchor y anchorNotices — anchorCut no aparece), y buildComposeReport tampoco lo recibe. Consecuencia: una profesora que pega un capítulo entero compone contra un anclaje amputado sin saberlo, y las afirmaciones que caían en la parte cortada saldrán como «no ancladas» o directamente rechazadas sin que ella entienda por qué. Es literalmente el patrón que el propio código dice haber sufrido doce veces: «a field written by one place and read by nobody».

**Evidencia:** `instructions/compose.md (front matter: «reaching the bound is reported, never silent»)` · `app/packages/shell/src/jobs/compose.ts (~L241-245: solo logger.warn('compose.anchor-bound'))` · `app/ui/src/data/compose.ts:61 (anchorCut tipado)` · `app/ui/src/compose/ComposeScreen.tsx (sin uso de anchorCut)` · `app/packages/core/src/report/compose.ts (ComposeReportInput sin anchorCut)`

#### COD-14 · La figura esencial sin descripción bloquea el PDF pero no el ODT ni las salidas audio/braille: render.md y el código dicen cosas distintas

**Severidad:** 🟠 Media · **Revisor:** `agentico-compose` · **Veredicto:** confirmado por refutador independiente

instructions/render.md, sección «Non-visual output»: «An essential figure with no long description blocks the render — an exercise the learner cannot possibly answer is worse than no sheet at all». En el código, print.ts (PDF) sí lanza RampaError('render-undescribed'); pero export.ts — que produce ODT, audio-ready y braille-ready — nunca llama a checkEssentialFigures: el ODT sale sin comprobación alguna, y linear.ts convierte la figura sin describir en un anuncio («Hay una imagen sin describir») y sigue. Para audio/braille el anuncio es defendible (019 FR-1709 lo pide así), pero entonces render.md contradice a 019 y hay que corregir el corpus; para el ODT no hay defensa: es la salida visual editable saltándose un gate que el PDF de la misma hoja sí aplica — una desviación entre modalidades del mismo documento, que es exactamente lo que el Principio IV prohíbe que aparezca «como omisión».

> **Matiz del refutador:** Matiz: la regla «blocks the render» de render.md está dentro de la sección «Non-visual output» (línea 32), es decir, el corpus la enuncia para audio/braille — justo las modalidades donde el código anuncia y sigue (FR-1709) — y no dice nada del PDF ni del ODT. El código es más estricto que el corpus en el PDF y más laxo en audio/braille; el ODT queda sin gate en ambas lecturas. La contradicción corpus↔019 y la desviación ODT↔PDF se sostienen igual, pero el fichero de corpus a corregir debe alinear la sección non-visual con FR-1709, no solo añadir el gate al ODT.

**Evidencia:** `instructions/render.md (Non-visual output: «blocks the render»)` · `app/packages/shell/src/jobs/print.ts:57-61 (throw render-undescribed)` · `app/packages/shell/src/jobs/export.ts (renderOdt y linearFor: sin checkEssentialFigures)` · `app/packages/core/src/render/linear.ts (UNDESCRIBED: anuncia y continúa)` · `specs/019-modalidades/spec.md FR-1709`

> ❓ **P43:** ¿Cuál es la regla buena: bloquear en todas las modalidades (y corregir 019/linear) o anunciar en las no visuales (y corregir render.md)? El ODT necesita el gate en cualquiera de los dos casos.
> ✅ **Respuesta de Carlos (2026-09-03):** **Visual imprime, no-visual bloquea.** PDF y ODT salen (la figura se ve impresa; el ODT gana la comprobación que le falta); audio y braille se bloquean con explicación. Se corrigen render.md y 019 para decir lo mismo. Nota: esto invierte el comportamiento actual del PDF (hoy bloquea) — enmienda deliberada.

#### COD-15 · Elegido «examen», casi todas las pantallas siguientes siguen diciendo «ficha»: SC-1402/FR-1404 de 016 incumplidos en el texto real de la UI

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

016 FR-1404: «la palabra elegida se refleja en la interfaz desde ese momento»; SC-1402: «ve la palabra examen en cada pantalla desde que lo dice». Realidad: IngestScreen dice «Elegir la ficha»/«Leer la ficha» (128, 197), VerifyScreen «la ficha se lee perfectamente» (95) y «Ya puedes adaptar esta ficha», AdaptScreen «Otra ficha» (467, 563) y «N fichas adaptadas» (499), ReviewScreen «Rehacer esta ficha» (161), el coste «por ficha» (i18n connectedCost). Un examen atraviesa el flujo entero llamado «ficha» en todo menos el door — que es exactamente la mentira léxica que 012 FR-1011 prohibió y por la que se abrió 016. Ninguna de estas cadenas recibe el kind.

**Evidencia:** `app/ui/src/ingest/IngestScreen.tsx:128,197` · `app/ui/src/ingest/VerifyScreen.tsx:95` · `app/ui/src/adapt/AdaptScreen.tsx:467,499,563` · `app/ui/src/review/ReviewScreen.tsx:161` · `app/ui/src/i18n/es.ts (connectedCost 'por ficha')` · `specs/016-una-puerta/spec.md FR-1404, SC-1402`

#### COD-16 · El caseload — la pantalla de apertura — hace un escaneo del vault POR alumno cada vez que se abre, el patrón que 020 FR-1828 llama «cómo una pantalla se vuelve lenta justo al tamaño de roster para el que existe el producto»

**Severidad:** 🟠 Media · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

useCaseloadFacts lanza window.rampa.record.forLearner(code) una vez por alumno (Promise.all sobre codes) para sacar años y conteo. Con 30 alumnos son 30 recorridos de material/ en cada apertura de «Mis alumnos» — que además es la pantalla inicial (FR-1801). SC-1808 exige que el caseload «no tarde más en aparecer que hoy»; FR-1828 exige explícitamente UNA lectura del directorio para los marcadores pendientes que vienen en US2. Construir FR-1825 encima de este hook multiplicaría el problema; la agregación pertenece al proceso main (una pasada, respuestas para todos), no a N llamadas IPC.

**Evidencia:** `app/ui/src/data/record.ts (useCaseloadFacts: Promise.all por código)` · `specs/020-el-alumno-es-el-sitio/spec.md FR-1828, SC-1808`

#### COD-17 · FR-302 (004): el marcador de evidencia está hardcodeado a 'observed' y las fechas de works/avoid se fabrican con today() — el mismo defecto que T003 corrigió dos líneas más arriba

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-1` · **Veredicto:** confirmado por refutador independiente

FR-302 exige que cada afirmación lleve `observed`/`inferred`/`reported` según su fuerza. `buildPacket` pone `evidence: 'observed'` en el 100% de las claims (handover.ts:39,61,62) — 'inferred' y 'reported' son inalcanzables porque el perfil no guarda esa información y ninguna pantalla la pregunta. Es la inversión exacta del anti-anclaje que la spec persigue: todo llega al receptor con el nivel de confianza MÁXIMO («visto repetidamente»), fabricado. Y el test lo consagra en vez de detectarlo: handover.test.ts:141 asserta `every(c => c.evidence === 'observed')`. Además, T003 eliminó el `?? today()` de los ejes con un comentario largo llamándolo «a fabrication» — y dos líneas más abajo `works` y `avoid` siguen estampando `date: today()` (handover.ts:61-62): una preferencia anotada en octubre llega al receptor fechada hoy. tasks.md T002 marca FR-302 como hecho.

> **Matiz del refutador:** Matiz: la parte del marcador 'observed' no es un defecto oculto sino una limitación reconocida por escrito — el propio test se titula «marks everything observed, which is a claim the application cannot verify» y tasks.md T002 registra que «only a human can check a marker is true». Lo que sí es un defecto sin registrar en ningún sitio es `date: today()` en works/avoid (handover.ts:61-62): fabrica frescura en el campo cuya función es decir la antigüedad, contradiciendo la corrección de T003 aplicada en la misma función. La severidad 'media' es justa por esa segunda parte.

**Evidencia:** `specs/004-handover/spec.md (FR-302, US1-2)` · `specs/004-handover/tasks.md (T002 marcado done)` · `app/packages/core/src/memory/handover.ts:39,57,61-62` · `app/packages/core/test/handover.test.ts:141`

> ❓ **P44:** ¿Se enmienda FR-302 (todo lo del perfil es 'observado' por definición) o se añade el origen de cada claim al perfil? Lo que no puede quedarse es la fecha fabricada de works/avoid.
> ✅ **Respuesta de Carlos (2026-09-03):** **Marcador honesto + fecha real:** las afirmaciones del perfil viajan como «apuntado en el perfil» (sin inventar fuerza), y las preferencias guardan su fecha de anotación real desde ahora. FR-302 se enmienda a lo honesto; el test que consagraba el 'observed' fabricado se reescribe.

#### COD-18 · `.rampa/requests/<job>.json` guarda el código del alumno en claro y texto libre de la docente, y el borrado no lo toca — verifyForgotten salta `.rampa` por diseño

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

Cada composición persiste el `ComposeRequest` completo en `.rampa/requests/<job>.json`: incluye `learnerCode` en claro y los campos libres `objectives` y `anchor`, donde la docente puede haber descrito al niño. Cuando el borrado elimina el `jobDir` del alumno (era el único usuario), el request de ese job sobrevive con su código. `planForget` nunca recorre `.rampa/requests/`, y `verifyForgotten` no camina VAULT.machine (además de la guarda muerta `if (dir === VAULT.machine) continue` en un walk que nunca lo visita), así que el residuo es estructuralmente invisible para la comprobación de honestidad. FR-1209 exige que el borrado alcance «their index entries» y FR-1214 dice que lo de `.rampa/` debe ser caché reconstruible — un request con código y texto de la docente que nadie borra no es ninguna de las dos cosas.

**Evidencia:** `app/packages/shell/src/jobs/compose.ts:67-68 (learnerCode), 519-520 (escritura)` · `app/packages/core/src/vault/paths.ts:77-78` · `app/packages/core/src/memory/forget.ts:110-124` · `specs/014-expediente-del-alumno/spec.md FR-1209, FR-1214` · `specs/003-memory/spec.md FR-216`

#### COD-19 · Las entradas de diario archivadas (memory/archive) con `learner: <code>` no entran en el plan de borrado; se detectan después como «fallo mío» sin remedio

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

`memory:archive` mueve entradas de diario a `memory/archive/` conservando su front matter (`learner: <code>` incluido). `planForget` solo escanea `VAULT.journal` (memory/journal) buscando `learner: code`; el archivo no. Como `verifyForgotten` sí camina VAULT.memory entero, la entrada archivada aparece en `remaining` DESPUÉS de ejecutar, y la UI muestra «He borrado casi todo, pero no todo. Es un fallo mío, no tuyo — dímelo y lo arreglo» — un callejón sin salida: no hay acción para completar el borrado y 003 FR-215 exige listar TODO lo que se va a borrar antes de confirmar, no descubrirlo después. Es el único de los cuatro residuos de borrado que al menos se confiesa, pero la confesión sin remedio no es cumplimiento.

**Evidencia:** `app/packages/core/src/memory/forget.ts:63-66` · `app/packages/shell/src/ipc/memory.ts:101-113` · `app/ui/src/learners/ForgetLearner.tsx:60-72` · `specs/003-memory/spec.md FR-215` · `specs/014-expediente-del-alumno/spec.md FR-1209`

#### COD-20 · FR-1211: `sharedKept` (qué materiales compartidos sobreviven y por qué) se calcula, se testea, y la pantalla nunca lo muestra

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

FR-1211 exige que el plan de borrado muestre «which shared sources will survive and why» antes de actuar. `planForget` devuelve `sharedKept: Array<{ job, alsoUsedBy }>` con exactamente esa información, pero la interfaz `Plan` de ForgetLearner.tsx la omite (solo code, paths, survives, outOfReach) y ningún JSX la renderiza. Lo único que llega a la docente es la frase agregada inyectada en `survives` («N materiales se quedan…») — el cuánto, no el cuál. La mitad del requisito («which») existe solo en el tipo del proceso main. Mismo patrón que el propio comentario de ForgetLearner denuncia sobre su pasado: datos cuidadosamente construidos que ninguna pantalla lee.

**Evidencia:** `app/packages/core/src/memory/forget.ts:20-28,86-90` · `app/ui/src/learners/ForgetLearner.tsx:27-32 (interfaz Plan sin sharedKept)` · `specs/014-expediente-del-alumno/spec.md FR-1211`

> ❓ **P45:** ¿Quieres que el plan liste los jobs compartidos por título/id (sin códigos de otros alumnos, como ya hace el diseño), o basta el agregado y se enmienda FR-1211?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, la lista:** el plan de borrado lista los materiales compartidos que sobreviven por título/fecha con su porqué («lo usan otros 2 alumnos»), sin códigos de otros alumnos. El dato ya existe.

#### COD-21 · checkDeclines (FR-1520/1523): la heurística de código salta cualquier frase que contenga «no», dejando pasar propuestas de quitar objetivos

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

La segunda capa de refuse.ts (la que existe para cazar lo que la lista de frases del corpus no contiene) descarta una frase entera si contiene `\bno\b|\bnunca\b|\bnadie\b|\bdecide\b`. Como el split es por [.;\n] y no por comas, una respuesta como «Puedes quitar el objetivo 4, no te hace falta el criterio 2» es una sola “frase”, contiene «no», se salta — y «puedes quitar» no está en proposal_phrases de acs.md (sí «se puede prescindir de», no «puedes quitar»). Resultado: una propuesta de reducción curricular se muestra a la docente, en el único módulo cuyo comentario declara que «omission is the safe direction: a false positive costs one re-ask». El corpus declara honestamente su límite (SC-1507 acota a las formulaciones del fixture set), pero la capa de código contradice su propia dirección de fallo: la guarda anti-falso-positivo genera falsos negativos sistemáticos en la clase de frases más probable (propuesta + subordinada negativa).

**Evidencia:** `app/packages/core/src/guide/refuse.ts:61-72` · `instructions/acs.md:28-52` · `specs/017-la-guia/spec.md FR-1520, FR-1523`

#### COD-22 · FR-1516: el borrador de ACNS no tiene camino de firma — la marca «removable only by sign-off» no puede retirarse nunca, y el borrador ni se guarda ni se imprime

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

FR-1516 dice que el borrador de ACNS «MUST carry the draft mark, removable only by sign-off (Principle VII)». Lo implementado: `draftAcnsJob` devuelve markdown con el encabezado «# BORRADOR de adaptación curricular NO significativa» y la UI lo vuelca como texto plano en un div (`{result.markdown}` — ni siquiera se renderiza el Markdown). No se persiste en el vault, no hay render/print, y `job:signOff` solo firma documentos (job × learner) resueltos por `resolveDocument` — el ACNS no es uno. Es la dirección conservadora (la marca nunca se quita), pero el mecanismo que el FR promete no existe: no hay firma que la retire, y el flujo real es que ella copie el texto a mano a Séneca, con lo que la marca se pierde en el copy-paste sin que ninguna revisión haya ocurrido dentro de Rampa. La tabla de evidencias de 017 no tiene fila para FR-1516; se da por cubierto porque el id aparece citado en T022.

**Evidencia:** `app/packages/core/src/guide/acns.ts:91-110` · `app/ui/src/guide/GuideScreen.tsx:227-283` · `app/packages/shell/src/jobs/guide.ts:202-239 (no escribe nada al vault)` · `app/packages/shell/src/ipc/signoff.ts:30-56` · `specs/017-la-guia/spec.md FR-1516` · `specs/017-la-guia/tasks.md:169-179 (tabla sin fila FR-1516)`

> ❓ **P46:** ¿Es intencional que el borrador de ACNS no se persista ni se firme (solo lectura en pantalla), o falta la mitad del flujo (guardarlo como documento firmable con la marca gestionada por sign-off)? Si es intencional, FR-1516 debería reescribirse.
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, flujo completo:** el borrador de ACNS se guarda en el vault como documento, se imprime con su marca, y la firma es lo único que la quita — como cualquier otra hoja.

#### COD-23 · El gate de la licencia tiene una puerta trasera estructural: fetchWholeSet usa httpTransport sin gate por defecto, contradiciendo su propio diseño y su propio test

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

El comentario de download.ts:44-59 dice que tras la revisión de seguridad «there is no exported httpTransport any more, so a fourth call site cannot make a request without a FetchGate» y pictogram-gate.test.ts:68-75 asegura que httpTransport no se exporta. Pero `fetchWholeSet` — que SÍ se exporta — hace `const transport = args.transport ?? httpTransport` (download.ts:204): cualquier caller que omita el parámetro obtiene el transporte HTTP crudo sin pasar por `transportFor(gate)`. Hoy no hay violación activa (bring.ts:338 y :446 pasan transporte gated), pero es exactamente el «cuarto caller» que el comentario teme, y el defecto ya ocurrió una vez con `checkUpdate`. FR-2104 («ninguna petición antes de aceptar») descansa en que nadie olvide un parámetro opcional — el tipo NO lleva el requisito, como el diseño afirma. El fix es una línea: quitar el default y exigir Transport en WholeSetArgs.

**Evidencia:** `app/packages/shell/src/pictograms/download.ts:204 (vs. 44-72)` · `app/packages/shell/test/pictogram-gate.test.ts:19,68-75` · `app/packages/shell/src/pictograms/bring.ts:338,446` · `specs/023-los-pictogramas-los-trae-rampa/spec.md (FR-2104, SC-2103)`

#### COD-24 · El export ODT pierde los pictogramas en silencio: renderODT ignora data-picto — ni imagen, ni hueco nombrado, ni atribución (FR-1615/FR-1616 no llegan a esa modalidad)

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

renderHTML incrusta las imágenes como data: URIs y degrada a hueco nombrado (html.ts:163-176); renderLinear lleva la atribución. Pero render/odt.ts no contiene ni una referencia a data-picto, imágenes o atribución: una hoja adaptada CON pictogramas exportada a ODT (jobs/export.ts:40-64 lee el mismo IR persistido) sale sin ellos, sin hueco marcado y sin decir nada — pérdida silenciosa de un apoyo que la docente activó, en la modalidad pensada para que ella retoque y reimprima. 018 FR-1615 exige imágenes incrustadas en documentos exportados y 019 FR-1702 reclama «same adapted IR» en todas las modalidades («satisfied by absence» en su tabla de tasks — que aquí es falso por omisión, no por diseño). Sin entrada en BACKLOG. Como mínimo debería ser hueco nombrado + nota, o exclusión documentada.

**Evidencia:** `app/packages/core/src/render/odt.ts (cero referencias a data-picto/imagen/atribución)` · `app/packages/core/src/render/html.ts:136-176` · `app/packages/shell/src/jobs/export.ts:40-64` · `specs/018-pictogramas/spec.md (FR-1615, FR-1616)` · `specs/019-modalidades/tasks.md:105 (FR-1702 «satisfied by absence»)`

> ❓ **P47:** ¿El ODT debe incrustar los pictogramas (ODF lo permite: Pictures/ + manifest) o basta hueco nombrado + aviso, registrado como G-item?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, incrustar:** el ODT lleva los mismos pictogramas y la misma atribución que el PDF (ODF lo permite). Un documento, N salidas, de verdad.

#### COD-25 · El override por alumno (018 FR-1612, peldaño 1 de la precedencia) sigue sin pantalla, y G30 — que lo registraba — se cerró por otra cosa

**Severidad:** 🟠 Media · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

La precedencia de 4 peldaños de match.ts es correcta en código (nombre→nada, override, vocabulario, set-único, ambiguo→nada; match.ts:103-136) y adapt.ts la alimenta bien. Pero el peldaño 1 — `profile.pictograms.overrides`, «la excepción por niño» que 024 FR-2215 mantiene deliberadamente — sigue siendo «carried rather than surfaced»: ProfileEditor lo aparca en `_pictoOverrides` sin control alguno para editarlo (ProfileEditor.tsx:82-88,139), y ChooseWord escribe solo en el vocabulario global. G30, que decía textualmente «the override is a field only a developer can set», se cerró el 2026-09-02 «by 024» — pero 024 construyó el chooser del vocabulario, no el del override. Resultado: un MUST de 018 satisfecho solo editando YAML a mano, y ya sin item abierto que lo cubra.

> **Matiz del refutador:** Todo lo factual se sostiene; añadir que el código documenta el vault-YAML como editor deliberado del override (ProfileEditor.tsx:82-85), así que el hallazgo es sobre todo de tracking (G30 cerrado sin cubrir el hueco y sin ítem sucesor) más que de omisión no reconocida.

**Evidencia:** `specs/018-pictogramas/spec.md (FR-1612)` · `specs/024-el-juego-entero/spec.md (FR-2215, tabla de precedencia)` · `app/ui/src/learners/ProfileEditor.tsx:82-88,139` · `app/packages/core/src/pictograms/match.ts:103-136` · `specs/BACKLOG.md:655-698 (G30 cerrado, con el hueco descrito dentro)`

> ❓ **P48:** ¿Reabrir el hueco como G-item propio (UI del override por alumno) o decidir que el vocabulario global basta y estrechar FR-1612 formalmente como se hizo con FR-1601?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, pantalla — como deuda registrada con ítem propio:** un control pequeño en el perfil del alumno para fijar «para este niño, esta palabra usa este dibujo». Se construye cuando toque en la cola.

#### COD-26 · La vuelta desde Configuración muestra el código en vez del nombre («← L123») y `from.tab` se escribe pero nunca se lee

**Severidad:** 🟡 Baja · **Revisor:** `flujos-uso` · **Veredicto:** confirmado por refutador independiente

App solo pasa learnerName al Rail cuando route.at === 'learner'; en la forma de Configuración el botón de vuelta renderiza `learnerName ?? route.from.code` con learnerName siempre undefined, así que la docente que siguió el puntero de pictogramas ve «← S1» — un identificador donde va un nombre, el mismo defecto que el propio caseload corrigió («Sin nombre todavía»). Además onConfigure guarda from:{code, tab} pero el botón hace learner/open, que siempre aterriza en 'who': `from.tab` es otro campo escrito, tipado y leído por nadie (patrón G36). Hoy es benigno porque el puntero solo nace en 'who', pero el campo promete una garantía que no existe.

**Evidencia:** `app/ui/src/App.tsx:139-141 (learnerName solo si at==='learner')` · `app/ui/src/nav/Rail.tsx:139 (learner/open, «← {learnerName ?? route.from.code}»)` · `app/ui/src/App.tsx:338 (from con tab)` · `specs/025-pictogramas-tienen-su-sitio/spec.md FR-2304`

#### COD-27 · FR-1521: «written in plain Markdown to her folder» resuelto como un consejo de copiar a mano; la «separate call» que citan los comentarios no existe como acción

**Severidad:** 🟡 Baja · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

FR-1521 exige que lo que ella decida conservar de una conversación sobre la guía «MUST be chosen by her ... and written in plain Markdown to her folder». Los comentarios de jobs/guide.ts y GuideScreen.tsx afirman que «what is kept is what she selects, written by a separate call she makes afterwards» — pero en la conversación no hay ningún control de selección ni llamada de guardado: el help text dice «Nada de esto se guarda solo. Si quieres quedarte con algo, cópialo a tus notas». Que nada se guarde solo cumple el Principio VIII; que Rampa no ofrezca la escritura de lo elegido diverge de la letra del FR, y el comentario describe un mecanismo que no está.

**Evidencia:** `app/ui/src/guide/GuideScreen.tsx:288-291,345` · `app/packages/shell/src/jobs/guide.ts:245-249` · `specs/017-la-guia/spec.md FR-1521`

#### COD-28 · VAULT.archive ('profiles/archive') declarado en paths.ts y no usado por nadie — el patrón G25 «campo que nadie lee» en miniatura

**Severidad:** 🟡 Baja · **Revisor:** `spec-codigo-2` · **Veredicto:** confirmado por refutador independiente

`archive: 'profiles/archive'` existe en el mapa de rutas del vault y ningún módulo de core, shell o UI lo referencia (grep sin resultados fuera de la declaración). O es un resto de un diseño retirado o la mitad de una feature que no llegó; en ambos casos es exactamente la clase de artefacto que el BACKLOG G25/G36 documenta como origen recurrente de defectos (algo declarado que nadie lee). Si algún día algo escribe ahí, quedaría dentro del walk de verifyForgotten (VAULT.profiles) pero fuera del plan de borrado, que solo coge `profiles/<code>`.

**Evidencia:** `app/packages/core/src/vault/paths.ts:18` · `specs/BACKLOG.md G25, G36`

#### COD-29 · FR-2304: la ruta guarda from.tab y nadie lo lee — el «volver» de Configuración aterriza siempre en «Quién es»

**Severidad:** 🟡 Baja · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

route.ts:139 guarda `from: { code, tab }` para «volver al alumno del que vino», pero el botón de vuelta del Rail hace `go({ type: 'learner/open', code })` (Rail.tsx:138-141), y `learner/open` resetea a tab 'who' (route.ts:211): `from.tab` es un campo escrito y leído por nadie — el patrón que el propio proyecto ya ha contado quince veces. Hoy es inocuo porque el único puntero vive en «Quién es», así que el tab correcto coincide por casualidad; el día que otro sitio apunte a Configuración (p. ej. desde un informe con palabra omitida), el «volver» perderá la sección. Fix trivial: una acción que restaure code+tab, o leer from.tab en el botón.

**Evidencia:** `app/ui/src/nav/route.ts:128-140,210-211` · `app/ui/src/nav/Rail.tsx:130-146` · `specs/025-pictogramas-tienen-su-sitio/spec.md (FR-2304, edge case «Deep-linking back»)`

#### COD-30 · Pendientes correctamente registrados (solo lista, sin gravedad): lo verificado del lado bueno

**Severidad:** 🟡 Baja · **Revisor:** `spec-codigo-3` · **Veredicto:** confirmado por refutador independiente

Verificado y en orden, para separar lo grave de lo administrado: el gate de aceptación funciona y está testado con transporte-espía (bring.ts:264-277, pictogram-gate.test.ts); nada se pide en el arranque ni al abrir pantallas (setState responde de disco, FR-2209/2210); FR-2201 cumplido (el word path borrado, ninguna palabra sale); FR-2205 cumplido (<vault>/pictogramas, bring.ts:212); la mudanza de 025 hecha (route.ts settings, Rail 4 entradas, SettingsSections, compact eliminado, MyVocabulary para FR-2308, test learner-page-is-clean para SC-2301/2303); no-pictograms-shipped.test.ts cubre SC-1601/FR-2101; FR-2218 ahora honestamente documentado en código, en pantalla y en vocabulario.md, reabierto como G35. Pendientes registrados como tales: 024 T020/T021/T022/T030/T031; 025 T010/T014/T016-T021 (más T009 estancado, ver hallazgo aparte); 023 T026; 019 T020; 021 T030/T031/T033/T040; 020 US2-US4 enteras (T019-T041) — de las que depende que Configuración gane «Mi estilo» y «vault» y que el raíl llegue a las dos entradas de FR-1802.

**Evidencia:** `app/packages/shell/test/no-pictograms-shipped.test.ts:31` · `app/packages/shell/src/pictograms/bring.ts:212,264-277,536-557` · `app/ui/test/learner-page-is-clean.test.tsx:7` · `specs/020-el-alumno-es-el-sitio/tasks.md (T019-T041 abiertos)` · `specs/BACKLOG.md:517 (G35)`

---

## F · Lo que esta revisión NO miró — huecos señalados por el crítico de completitud

Dimensiones sin revisor asignado. No son hallazgos verificados: son deuda de revisión.

#### CRIT-01 · Nadie ha mirado cómo llega una versión nueva a la docente: no hay mecanismo de actualización ni spec que lo posea, y el corpus — la política pedagógica — solo se corrige reinstalando la app entera

**Severidad:** 🔴 Alta · **Revisor:** `critico`

Ninguno de los hallazgos de la revisión toca la dimensión «actualización». En el código no existe electron-updater ni ningún checkForUpdates (grep sobre app/packages y app/ui devuelve cero; package.json no lo declara como dependencia), ninguna spec 001-025 menciona cómo se entera la docente de que hay versión nueva, y electron-builder.yml configura `publish: provider: github` que nada consume. Importa doblemente por el Principio I: el juicio pedagógico vive en el corpus, que se empaqueta read-only como extraResources — así que cada corrección del corpus (la tilde impresa en exámenes, las recetas reviewed_by_teacher:false que algún día se validen, la cobertura de dislexia/TDAH que falta) solo llega a una instalación existente si una docente no técnica descarga y reinstala la app completa a mano. El propio BACKLOG lo roza sin resolverlo: «a moving rate should be an update, not a release» (línea ~744, sobre PRICES), pero no existe el vehículo «update» del que habla. Para un producto cuyo argumento es que el criterio se corrige en Markdown, no tener camino de entrega de esas correcciones es un agujero de producto, no un detalle de ops.

**Evidencia:** `app/package.json (sin electron-updater; scripts dist)` · `app/electron-builder.yml (publish: github sin consumidor; extraResources corpus read-only)` · `specs/BACKLOG.md:743-744` · `grep 'electron-updater|checkForUpdates' en app/packages, app/ui/src, specs/*/spec.md: 0 resultados`

> ❓ **P49:** ¿Quieres una spec que decida el mecanismo (auto-update vs aviso «hay versión nueva» con enlace) y, aparte, si el corpus debe poder actualizarse sin reinstalar la app?
> ✅ **Respuesta de Carlos (2026-09-03):** **Aviso + corpus separado** (spec que lo decida): la app comprueba y avisa «hay versión nueva» con enlace (sin auto-instalar), y el corpus se actualiza por separado sin reinstalar la app — la política pedagógica corregible es el argumento del producto.

#### CRIT-02 · El vault no tiene versión de esquema ni historia de migración: el primer cambio de forma (p. ej. el perfil por área que la propia revisión recomienda) no tiene vehículo, y dos versiones de la app escribiendo al mismo vault por OneDrive no tienen árbitro

**Severidad:** 🟠 Media · **Revisor:** `critico`

La revisión propuso cambios de esquema (perfil por área en vez de único por alumno) sin que nadie mirase si el vault puede migrar. No existe ningún marcador de versión en el vault ni en los perfiles (grep 'schemaVersion|vault version|migrat' sobre app/packages/core/src: nada relevante). Lo que hay es tolerancia por reparación — app/packages/core/src/vault/schema.ts conserva campos que no validan y app/packages/core/src/vault/parse.ts registra Repairs — que cubre un campo malformado, no un rediseño de forma. La única migración escrita es la del credential store (credentials.ts, forma legacy de 006), es decir, el patrón existe una vez fuera del vault y ninguna dentro. El agravante viene de un hallazgo ya aceptado por la revisión: si PT y tutor comparten vault por OneDrive con versiones distintas de la app instaladas, la versión vieja reescribe (y «repara») lo que la nueva escribió, sin que ningún marcador permita siquiera detectarlo.

**Evidencia:** `app/packages/core/src/vault/schema.ts:5 (repair semantics, sin versión)` · `app/packages/core/src/vault/parse.ts:10-54` · `app/packages/shell/src/credentials.ts:24-90 (única migración existente, fuera del vault)`

> ❓ **P50:** ¿Añadimos un marcador de versión de esquema al vault ahora, antes del primer cambio de forma real, aunque hoy no haya nada que migrar?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí, ahora:** marcador de versión de esquema en el vault desde ya, antes de los cambios de forma aprobados hoy (CUR por área, segundo eje de frescura, popularidad).

#### CRIT-03 · La dimensión soporte está construida a medias y muerta: el canal de diagnóstico (log sanitizado, reveal, tail) existe en shell y preload pero ninguna pantalla lo expone — cuando algo falle, la docente no tiene nada que enseñar ni adjuntar

**Severidad:** 🟠 Media · **Revisor:** `critico`

La revisión no miró telemetría/soporte. El proyecto sí lo pensó — y bien: log en userData fuera del vault, sanitizado para que jamás contenga nombre ni material (app/packages/core/src/log.ts), rotación, captura de uncaughtException, y tres IPC (`diagnostics:path`, `diagnostics:reveal` — «So she can attach it to a message without hunting through folders» — y `diagnostics:tail`) expuestos en preload.ts:293-296. Pero grep 'diagnostics' sobre app/ui/src devuelve cero: ningún componente los llama, no hay botón «mostrar el registro» en Configuración ni en ninguna pantalla de error. Es exactamente el patrón que la revisión bautizó en otros sitios («se calcula, se testea, la pantalla nunca lo muestra»), aplicado esta vez a la única vía de soporte de un producto sin telemetría, para usuarias que no abrirán una terminal.

**Evidencia:** `app/packages/shell/src/ipc/diagnostics.ts:41-50` · `app/packages/shell/src/preload.ts:293-296` · `app/packages/core/src/log.ts:1-14` · `grep 'diagnostics' en app/ui/src: 0 resultados`

#### CRIT-04 · Lenguas cooficiales: la UI reserva el hueco ('ca', 'gl', 'eu' están en el tipo) pero nada en specs ni en el corpus dice qué hace el pipeline con material escolar cuya lengua vehicular es el catalán, el gallego o el euskera

**Severidad:** 🟠 Media · **Revisor:** `critico`

La revisión cubrió al especialista de lengua extranjera (inglés como asignatura) y la normativa Andalucía-only, pero no la situación mayoritaria en Cataluña, Galicia, Euskadi, Baleares o Comunidad Valenciana: el material de aula — el documento fuente entero — está en la lengua cooficial. app/ui/src/i18n/types.ts:19 ya declara LocaleCode = 'es'|'en'|'ca'|'gl'|'eu' y i18n/index.ts:10 deja el comentario «Catalan, Galician and Basque go here», así que la intención existe para la interfaz; pero grep de catalán/gallego/euskera sobre specs/ e instructions/ devuelve cero: ninguna spec declara ese material dentro o fuera de alcance, y las recetas lingüísticas del corpus (simplificación de sintaxis, vocabulario, lectura fácil) están razonadas sobre el español. Una docente de una escuela catalana metería su material y recibiría o una adaptación en la lengua equivocada o una aplicación de recetas pensadas para otro idioma, sin que ningún requisito diga cuál de las dos cosas debe pasar.

**Evidencia:** `app/ui/src/i18n/types.ts:19` · `app/ui/src/i18n/index.ts:7-12` · `grep -i 'catalán|galego|euskera|cooficial' en specs/ e instructions/: 0 resultados fuera de i18n`

> ❓ **P51:** ¿El material en lengua cooficial está dentro del alcance de v1 (y entonces necesita spec y recetas) o se declara explícitamente fuera, con un mensaje honesto al detectar la lengua?
> ✅ **Respuesta de Carlos (2026-09-03):** **Fuera de v1, declarado:** al detectar material en catalán/gallego/euskera, mensaje honesto y deuda registrada. El camino ya está decidido por P3/P28 (corpus por lengua); entra cuando el español esté sólido.

#### CRIT-05 · Cambio de ordenador y máquina sin keyring, revisados a medias por el propio código: el «explicit export» de nombres que el comentario promete no existe, y la clave API desaparece en silencio cada reinicio en un Linux sin libsecret — justo el portátil de centro que electron-builder.yml defiende como target

**Severidad:** 🟠 Media · **Revisor:** `critico`

La revisión no miró la dimensión «el equipo de la docente». El diseño es consciente y en parte ejemplar: names.enc va cifrado con safeStorage dentro del vault, el onboarding sí muestra el estado del cifrado (VaultStep.tsx:13 vía useNameStatusCheck), y el comentario de names.ts documenta el coste — «moving computers loses the mapping... an explicit export covers the deliberate move». Pero ese export no existe: registerNamesIpc no expone ninguna acción de exportar/reimportar el mapa, así que la mudanza de ordenador (o el fin de curso con equipo devuelto al centro) pierde todos los nombres sin remedio previsto, contra la promesa del Principio VIII de portabilidad copiando una carpeta. Y en la misma máquina sin keyring, credentials.write hace no-op silencioso (credentials.ts:99-100): la clave API vive solo en memoria y mañana se le pide otra vez, sin que ningún mensaje lo explique — el aviso del onboarding habla de los nombres, no de la clave. Nótese que el propio electron-builder.yml vende el AppImage como «the honest answer to a locked-down school laptop», el entorno donde libsecret más probablemente falta.

**Evidencia:** `app/packages/shell/src/ipc/names.ts:17-21 (comentario del export prometido), 140-142 (IPC sin export)` · `app/packages/shell/src/credentials.ts:96-100` · `app/ui/src/onboarding/VaultStep.tsx:13` · `app/electron-builder.yml (bloque linux)`

#### CRIT-06 · La distribución sin firma es una decisión documentada pero sin dueño vivo: no hay entrada en BACKLOG ni criterio de cierre, y publish a GitHub releases ya está configurado para empujar instaladores sin firmar

**Severidad:** 🟡 Baja · **Revisor:** `critico`

La revisión no miró empaquetado/distribución. La decisión de diferir la firma está bien razonada y escrita (electron-builder.yml: «Revisit before any public release beyond Linux — an unsigned public build on Windows or macOS is worse than no release»; 006 research R14/R15 con costes y la tabla «Remaining NEEDS CLARIFICATION» asignada a Project owner). El hueco es de registro, el mismo patrón que la revisión señaló en G28: la condición «revisit before any public release» no existe como ítem en specs/BACKLOG.md (grep de certificat/notariz/SmartScreen: cero), ninguna spec la posee, y mientras tanto `npm run dist` + el bloque `publish: provider: github, releaseType: release` ya forman el camino completo para publicar un NSIS sin firmar que SmartScreen bloqueará y un DMG que Gatekeeper rechazará. El día que alguien publique la primera release, nada en el repo le recordará la condición.

**Evidencia:** `app/electron-builder.yml (comentario R14 y bloque publish)` · `specs/006-desktop-app/research.md:290-357 (R14, R15, tabla de pendientes)` · `grep -i 'certificat|notariz|smartscreen' specs/BACKLOG.md: 0 resultados`

> ❓ **P52:** ¿Registramos la firma como ítem de BACKLOG con criterio de cierre explícito («antes de la primera release pública no-Linux»), para que no dependa de recordar un comentario en un yml?
> ✅ **Respuesta de Carlos (2026-09-03):** **Sí: deuda con criterio de cierre** en BACKLOG: «antes de la primera release pública para macOS/Windows, los instaladores van firmados; hasta entonces no se publica ninguno». La decisión deja de vivir en un comentario de yml.

---

## G · Hallazgos refutados — y por qué merecen leerse igual

Solo 2 de 95 hallazgos factuales cayeron, y los dos dejan lección:

#### REF-01 · Los niveles 3 de PER-V y DEC prometen una vía (audio) que el producto no tiene construida

**Refutación** (`pt-gaps`): Refutado en su afirmación central: la vía SÍ está construida. El revisor se apoyó en la línea de Status de specs/019-modalidades/spec.md:7 («US2/US3 unstarted»), que está DESACTUALIZADA: specs/019-modalidades/tasks.md marca hechas la Fase 3 completa (US2 audio, T011-T016, «unblocked 2026-08-31») y la Fase 4 (US3 braille-ready, T017-T019, «written 2026-08-31, not validated»). El código lo confirma: app/packages/shell/src/jobs/export.ts exporta renderAudioReady y renderBraille; app/packages/shell/src/ipc/print.ts:105,114 registra job:audio y job:brailleReady; app/ui/src/review/ReviewScreen.tsx:193-201 tiene los botones de audio y «Para braille» en pantalla. Además specs/019-modalidades/plan.md existe (4.6K), así que la nota de proceso «sin plan.md» tampoco se sostiene hoy. Una PT con un alumno PER-V:3/DEC:3 sí tiene salida usable tras adaptar.

#### REF-02 · El canal de imagen en ingest sale sin redactar: el nombre manuscrito del alumno en la ficha fotografiada llega al proveedor, mientras names.ts promete que 'los nombres nunca llegan a un modelo'

**Refutación** (`agentico-adapt`): La mecánica citada es cierta (send.ts:29-45: redactRequest solo pasa system y messages[].content por redact, las images del spread ...req salen intactas; ingest.ts:261-279 envía base64 vía sendRedacted), pero las dos carencias que el hallazgo denuncia están implementadas. El «aviso previo del tipo tapa o recorta» EXISTE: IngestScreen.tsx:147-161 muestra, antes de enviar la primera imagen del job (comentario «FR-609 · once, before the first image of the job is sent»), un Callout «Antes de mandar las fotos» que dice literalmente «si en la hoja hay un nombre escrito a mano, ese nombre llega a tu servicio de IA tal cual… tapa o recorta esa parte antes de seguir», con botón de acuse. Y la Disclosure en lenguaje llano también existe: ui/src/i18n/es.ts:74 (texto 'residual' con la misma explicación) y AboutScreen.tsx:51-57 (sección «Para el equipo directivo y el DPO» que nombra explícitamente «el límite honesto: si la foto de la ficha lleva el nombre escrito a mano, ese nombre llega al proveedor dentro de la imagen»). El residual es real pero está reconocido, avisado antes del envío y documentado — el hallazgo pide exactamente la mitigación que ya está hecha, así que como defecto no se sostiene; a lo sumo queda la tensión cosmética del docstring absoluto de names.ts («Names never reach a model»), que describe el canal de texto.

---

## H · Las 52 preguntas, consolidadas — ✅ TODAS RESPONDIDAS (2026-09-03)

Cada una remite a su hallazgo. Puedes contestarlas por número («P3: sí, P7: lo dejamos») e iteramos sobre este documento.


### Producto

- ✅ **P1** (PROD-01 · _Huecos graves de cobertura de recetas: dislexia pura, sordera (PER-A), TDAH puro y LIN pur_): ¿La lista `axes:` de una receta debería ser OR en vez de AND, y qué recetas faltan para DEC solo (dislexia) y PER-A (acceso auditivo)? ¿Debe el job pararse o avisar cuando la selección queda vacía? → **AND + recetas mono-eje nuevas; selección vacía = parar antes de gastar.**
- ✅ **P2** (PROD-02 · _Dos de las cuatro puertas de material («examen» y «problemas») se ofrecen y se cobran, per_): ¿Cuál es la intención a corto plazo: retirar/atenuar las puertas exam y problems en compose hasta que exista su camino de generación, o priorizar ese camino (y en qué orden respecto a 022)? → **Construir la generación real de examen/problemas ya (spec propia), no atenuar.**
- ✅ **P3** (PROD-03 · _El corpus normativo es Andalucía en exclusiva (Séneca, Instrucciones 8-3-2017), presentado_): ¿Corpus normativo por comunidad (instructions/normativa/<cc>.md, mismo patrón que education/) o declarar honestamente en la UI que la v1 de guías es solo Andalucía? → **Corpus normativo seleccionable por territorio, reescribible por alumno, aportable por el usuario; fallback genérico. Genérico para cualquier país.**
- ✅ **P4** (PROD-04 · _No existe el material de estructura y anticipación: agenda visual, secuencia de pasos, his_): ¿Entra el material de estructura (agendas, secuencias, historias sociales) como quinto tipo con su propio flujo, o se registra como no-goal deliberado tipo G17? → **Sí: spec propia para material de estructura (agendas, secuencias, historias sociales).**
- ✅ **P5** (PROD-05 · _La colaboración tutor–PT sobre el mismo alumno durante el curso no está especificada en ni_): ¿La colaboración intra-curso tutor↔PT (mismo alumno, dos máquinas, mismo trimestre) está en el alcance de Fase 0/1? Y si lo está, ¿el modelo es vault compartido con merge especificado o intercambio de paquetes ligeros derivado de 004? → **Un vault = una docente; coordinación por paquetes ligeros derivados de 004. Vault compartido fuera por diseño.**
- ✅ **P6** (PROD-07 · _El alumnado de incorporación tardía sin español no cabe en los ejes ni en el corpus_): ¿Está el alumnado sin lengua vehicular dentro del alcance? Si no, ¿se registra como no-goal explícito en el BACKLOG para que su reaparición sea una decisión? → **Sí: eje/marca propia de lengua vehicular + recetas propias (spec).**
- ✅ **P7** (PROD-09 · _La coordinación viva PT↔tutor no existe: el traspaso (004) es para cambio de año, no para _): ¿Contempla el modelo dos docentes activos sobre el mismo alumno (PT+tutor), aunque sea vía un paquete de coordinación más ligero que el handover de 004? → **Resuelto por P5 (paquetes ligeros).**
- ✅ **P8** (PROD-11 · _La normativa está hard-codeada a Andalucía (Séneca, Instrucciones de 8/3/2017) y se presen_): Mientras solo exista el corpus andaluz, ¿debería la UI declarar explícitamente «esto sigue la normativa de Andalucía» antes de redactar una ACNS, o prefieres bloquear la ayuda normativa fuera de esa comunidad? → **Resuelto por P3 (selección + genérico + subida).**
- ✅ **P9** (PROD-15 · _Altas capacidades: CUR solo mira hacia abajo y el enriquecimiento no existe_): ¿AACC fuera de alcance deliberadamente? Si sí, registrarlo como no-goal en el BACKLOG. → **Sí, más adelante: CUR bidireccional + modo enriquecimiento (BACKLOG).**
- ✅ **P10** (PROD-17 · _La familia existe como fuente de información pero nunca como destinataria_): ¿Registramos «comunicación con la familia» como no-objetivo deliberado en el BACKLOG, o hay una versión mínima (nota para casa generada junto al render) que sí quieras en alcance? → **Versión mínima: «nota para casa» opcional como salida extra (BACKLOG).**

### Flujos

- ✅ **P11** (FLU-01 · _«Revisar y firmar» es un viaje sin retorno: el estado `review` nunca se limpia y ReviewScr_): ¿La vuelta desde la revisión debe regresar a la lista de la tanda (lo que exige sacar `outcome` del estado local de AdaptScreen, probablemente al route o al vault), o basta con que el expediente de cada alumno ofrezca «revisar y firmar» para lo pendiente? → **Derivar pendientes del vault + volver a la tanda; el expediente firma cualquier borrador.**
- ✅ **P12** (FLU-05 · _La parada por adaptación significativa se dispara por el perfil (CUR≥2), no por la petició_): ¿La parada debe dispararse por lo que la petición implicaría cambiar (no por el nivel CUR del perfil), y debe una ACS registrada vía 017 desbloquear explícitamente la adaptación a los objetivos ya modificados? → **Parada por lo que la petición cambiaría (acceso siempre permitido); ACS registrada desbloquea.**
- ✅ **P13** (FLU-06 · _No existe el flujo «que lo valide el PT antes de firmarlo yo»: la revisión asume que quien_): ¿Quieres un flujo explícito de «segunda mirada» (exportar borrador anotable + reimportar correcciones, o doble firma por rol), o la posición del producto es que cada docente firma solo lo suyo y la validación cruzada queda fuera? → **Sí: segunda mirada vía el paquete de coordinación de P5, con registro «revisada por PT».**
- ✅ **P14** (FLU-08 · _El intent no se resetea al terminar un trabajo: el door del siguiente llega con el tipo («_): ¿Debe el intent sobrevivir solo mientras el trabajo está a medias (reset al llegar a 'done'/firmar), o prefieres que el door recuerde deliberadamente al alumno pero nunca el tipo? → **Reset del intent al completar el trabajo; sin residuos entre trabajos.**
- ✅ **P15** (FLU-12 · _Un perfil casi vacío produce una adaptación casi nula, y ningún requisito obliga a decírme_): ¿Añadimos un requisito de «perfil suficiente»: antes de adaptar, la app dice qué ejes están sin observar, qué recetas quedan desactivadas por ello, y sugiere las preguntas de observación pendientes? → **Sí: aviso de perfil insuficiente con ejes sin observar y recetas desactivadas, antes de gastar.**
- ✅ **P16** (FLU-13 · _El caso urgente choca de frente con el peor paso del onboarding, y no hay modo de practica_): ¿Merece Fase 1 un modo de ensayo sin proveedor (material de ejemplo pre-adaptado, pipeline simulado) para que la primera noche no dependa de conseguir una clave? → **Sí: modo ensayo sin proveedor, flujo completo simulado.**

### Agéntico

- ✅ **P17** (AGE-01 · _La heurística de nombres no detecta un nombre desconocido a inicio de frase — el patrón tí_): ¿Aceptamos ampliar la lista con los nombres más frecuentes del INE (incluidos los de origen extranjero) y marcar también el token inicial de cada nota aunque sea inicio de frase, a costa de más falsos positivos? → **Sí: lista INE ampliada + marcar token inicial de frase.**
- ✅ **P18** (AGE-02 · _El material entra al prompt bajo un simple heading '## Material a adaptar': un documento p_): ¿Delimitamos el material con un fence/nonce y añadimos un recordatorio de tarea posterior al material? Toca prompt, no corpus, así que no roza el Principio I. → **Sí: fence+nonce y recordatorio de tarea posterior.**
- ✅ **P19** (AGE-03 · _«Restas con llevadas» — la forma más común de pedir restas con borrowing — quema el presup_): ¿Confirmas que «restas con llevadas» debe interpretarse como 'borrows' cuando la operación es resta (o al menos abortar antes de gastar el presupuesto cuando el 100% de un lote sale 'unknown')? → **Sí: llevadas+resta → borrows + corte de bucle con lote 100% unknown.**
- ✅ **P20** (AGE-05 · _La sustitución palabra→pictograma es literal, sin morfología ni palabras compuestas: la co_): ¿Aceptarías una lematización determinista mínima (plural→singular, conjugación→infinitivo con una tabla/algoritmo offline) manteniendo la regla «exactamente uno o ninguno», o prefieres que sea la PT quien mapee formas en su vocabulario? → **Lematización determinista mínima, regla «uno o ninguno» intacta.**

### Especificación

- ✅ **P21** (CONS-01 · _023 afirma que 022 «shipped» y su T023 ticked dice haber comprobado «022's diagrams» — per_): ¿022 sigue en la mesa? Si sí, debería entrar en BACKLOG como G-item y corregirse el texto de 023 (spec y T023); si no, hay que decir por qué se descarta. → **022 sigue y se prioriza ya; limpiar 023 (shipped falso, tick T023) y la cita de código.**
- ✅ **P22** (CONS-02 · _Colisión de numeración: 005 y 007 definen ambos FR-501…FR-517 con significados distintos, _): ¿Renumeramos los FR de 005 (p. ej. a FR-55x, es el spec más joven y menos citado) o congelamos la convención de citar siempre con prefijo de spec y lo escribimos en AGENTS.md/plantilla de Spec Kit? → **Prefijo de spec obligatorio (AGENTS.md + plantilla); sin renumerar; corregir 021:201.**
- ✅ **P23** (CONS-03 · _023 introduce la primera llamada saliente que no va al modelo y 007 FR-511 no está enmenda_): ¿Enmendamos 007 FR-511 a «ningún destino de red fuera de los declarados en el corpus» (modelo + ARASAAC, ambos revisados), con nota fechada que apunte a 023? → **Enmendar FR-511: destinos declarados en el corpus, nota fechada → 023.**
- ✅ **P24** (CONS-05 · _La «conversación» que Carlos pidió no tiene spec y la cadena de punteros entre specs está _): ¿La conversación de iteración será la 026, o se descarta? En cualquier caso los cuatro punteros de 021–024 hay que corregirlos para que apunten a algo real. → **La conversación = spec 026; corregir los cuatro punteros.**
- ✅ **P25** (CONS-06 · _025 FR-2310 (raíl de cuatro entradas) contradice frontalmente 020 FR-1802 (exactamente dos_): ¿020 FR-1802/FR-1817/FR-1819 quedan aplazadas (025 es un paso intermedio hacia el raíl de dos entradas) o retiradas? La respuesta debe escribirse como nota en 020, igual que se hizo con 016 FR-1401. → **La visión de 020 se monta completa; anotar «aplazado, sigue siendo el destino».**
- ✅ **P26** (CONS-07 · _BACKLOG G28 mantiene sin tachar un «BLOCKER: the download must not ship on my assumption» _): ¿Alguien ha leído la página de condiciones de ARASAAC en su fuente (no solo comprobado que la API responde)? Si sí, hay que tachar el BLOCKER de G28 con fecha y quién; si no, la descarga está enviada contra un blocker vigente. → **Nadie las ha leído aún: actualizar G28 con criterio de cierre «lectura humana antes de la primera release».**
- ✅ **P27** (CONS-08 · _Contradicción entre recetas sobre exámenes y una maquinaria de conflictos que nunca se eje_): ¿Debe `one-task-per-page` excluir assessment de su scope (dejando la paginación de exámenes solo a exam-access-not-difficulty), o declarar el conflicto explícitamente? → **Declarar conflicts: mutuos + recetas de conflicto de pares frecuentes (DEC+ATE primero).**
- ✅ **P28** (CONS-10 · _El corpus que una PT debe poder leer y corregir está mayoritariamente en inglés, y hard ru_): ¿El corpus core se traduce al español (público real hoy) con el inglés como traducción, o mantenemos inglés-fuente y bloqueamos la contribución de PTs hasta tener recipes/lang/es completo? → **Corpus core en español fuente; regla 12 corregida: informe en el idioma de la docente.**
- ✅ **P29** (CONS-12 · _Dos specs vivas disputan qué contiene Configuración: 020 FR-1817 (servicio + estilo propio_): ¿Enmiendas 020 FR-1817 (display en el raíl, house/vault pospuestos con tarea numerada) o los panes que faltan son deuda que debe entrar en BACKLOG con G propio? → **Resuelto por P25: Configuración completa en la cola de 020.**
- ✅ **P30** (CONS-13 · _El desfase y las medidas son por área en la normativa, pero el perfil de Rampa es único po_): ¿Merece el perfil una excepción por área al menos en CUR (que es el eje que dispara decisiones legales), o se acepta que el eje refleje el área en la que se trabaja con la PT? → **CUR por área con fallback general (spec); resto de ejes por alumno.**
- ✅ **P31** (CONS-14 · _011 FR-918/919/920/921: cuatro MUST sin implementación, «cubiertos» en tasks.md con una ju_): ¿Enmendamos el spec 011 (retirar o marcar como aplazados FR-918..921 con su razón) o abrimos entrada en BACKLOG? Y ¿debería check-fr-coverage.sh distinguir «citado» de «implementado» — p. ej. exigir un marcador explícito de deferral? → **Aplazar FR-918/920/921 con deuda; check-fr-coverage exige done/deferred/dropped explícito.**
- ✅ **P32** (CONS-16 · _002 FR-122 vs FR-129: dos fuentes obligatorias y mutuamente excluyentes para el nivel curr_): Cuando la docente no declara nivel explícito: ¿vale el derivado curso→corpus como cumplimiento de FR-129, o FR-129 obliga a preguntárselo siempre en compose? → **Curso→corpus vale como input; lectura reconciliadora escrita en ambos FRs.**
- ✅ **P33** (CONS-17 · _009 FR-707a vs FR-707b: la regla de recomendación puede volverse imposible de satisfacer, _): ¿Reescribimos FR-707a como «mejor calidad medida entre los servicios elegibles por FR-707b y con soporte de fotos en ambas ramas»? → **Soporte de fotos exigido en ambas ramas de la recomendación.**
- ✅ **P34** (CONS-20 · _G35 (abierto) documenta que 024 FR-2218 está incumplido y que la app ahora dice lo contrar_): ¿Priorizamos la spec del segundo eje de frescura (word→id ya está en data-picto, es computable), o se enmienda 024 FR-2218 a lo que la app hace hoy para que spec y producto digan lo mismo? → **Spec del segundo eje de frescura; FR-2218 anotado como aplazado mientras tanto.**
- ✅ **P35** (CONS-25 · _013 FR-1105 («exactamente un control primario por pantalla») lleva desde agosto sin test, _): ¿Autorizas escribir el test de FR-1105 asumiendo que va a fallar en varias pantallas existentes, y tratar esos fallos como la lista de trabajo que destape? → **Escribir el test de FR-1105 ya; los fallos son la lista de trabajo.**
- ✅ **P36** (CONS-34 · _006 FR-403 fija como copy literal «Unos 3 céntimos por ficha» mientras 012 FR-1011 prohíbe_): ¿«Por ficha» como unidad de coste queda exento de FR-1011 (y se anota en 012), o cambiamos el copy de conexión a algo como «por hoja adaptada»? → **Copy de conexión pasa a «por hoja adaptada».**

### Spec↔código

- ✅ **P37** (COD-01 · _La guía (017, marcada «Built, all 26 tasks») tiene su conversación inalcanzable y su puert_): ¿La ingesta del documento oficial debe vivir dentro de la sección «Su adaptación curricular» (su propio «traer», sin tipo de material ni door), o quieres reutilizar IngestScreen parametrizada por destino? → **Botón de traer propio en «Su adaptación curricular»; conectar la pantalla de preguntas.**
- ✅ **P38** (COD-03 · _FR-216 (003): el borrado deja el nombre real del alumno en .rampa/names.enc, los paquetes _): ¿Confirmas que forget debe borrar también la entrada de names.enc, los paquetes de handover/ y la fila del roster, o hay una decisión registrada en algún coverage.md que no encontré? → **Borrado ampliado a los cinco residuos + verificador que los ve; validar con DPO.**
- ✅ **P39** (COD-04 · _008: un PDF escaneado no se convierte nunca a imagen — el modelo recibe «Lee esta imagen» _): ¿El PDF escaneado se difiere explícitamente (y se dice en la UI) o hay que renderizar páginas con pdfjs en el renderer antes de ingest:run? → **Construir ya el renderizado página→imagen del PDF escaneado.**
- ✅ **P40** (COD-08 · _La atribución de pictogramas está cableada a ARASAAC: FR-1604 y FR-2116 no se cumplen en e_): ¿Implementamos publisher por entrada + atribución derivada del set configurado, o degradamos FR-2116/la mitad de FR-1604 a una entrada de backlog explícita («solo ARASAAC atribuible hoy»)? → **Atribución derivada del set real + fuente por pictograma en el catálogo.**
- ✅ **P41** (COD-09 · _FR-2217 «biggest-used first» es imposible tal como está: la popularidad no se persiste y e_): ¿Persistimos popularity en el metadata (rompe el contrato de 018 «reader unchanged»… aunque el reader tolera campos extra) o en el inventario, o rebajamos FR-2217 a «orden estable» registrándolo? → **Persistir popularity y ordenar el selector por uso.**
- ✅ **P42** (COD-10 · _022 se implementó y «shipped» sin plan.md ni tasks.md, violando el gate NON-NEGOTIABLE de _): ¿Quieres que check-spec-kit.sh se endurezca para exigir tasks.md antes de que exista código atribuible a una spec (p. ej. vía referencia de FR/tarea en el commit), o el gate se queda como está y 022 recibe al menos su nota de proceso como 019? → **Endurecer check-spec-kit (spec citada/shipped ⇒ plan+tasks) + nota de proceso en 022.**
- ✅ **P43** (COD-14 · _La figura esencial sin descripción bloquea el PDF pero no el ODT ni las salidas audio/brai_): ¿Cuál es la regla buena: bloquear en todas las modalidades (y corregir 019/linear) o anunciar en las no visuales (y corregir render.md)? El ODT necesita el gate en cualquiera de los dos casos. → **Visual imprime, no-visual bloquea; ODT gana el gate; corregir corpus y 019.**
- ✅ **P44** (COD-17 · _FR-302 (004): el marcador de evidencia está hardcodeado a 'observed' y las fechas de works_): ¿Se enmienda FR-302 (todo lo del perfil es 'observado' por definición) o se añade el origen de cada claim al perfil? Lo que no puede quedarse es la fecha fabricada de works/avoid. → **«Apuntado en el perfil» sin fuerza inventada + fechas reales de anotación.**
- ✅ **P45** (COD-20 · _FR-1211: `sharedKept` (qué materiales compartidos sobreviven y por qué) se calcula, se tes_): ¿Quieres que el plan liste los jobs compartidos por título/id (sin códigos de otros alumnos, como ya hace el diseño), o basta el agregado y se enmienda FR-1211? → **El plan de borrado lista qué sobrevive y por qué.**
- ✅ **P46** (COD-22 · _FR-1516: el borrador de ACNS no tiene camino de firma — la marca «removable only by sign-o_): ¿Es intencional que el borrador de ACNS no se persista ni se firme (solo lectura en pantalla), o falta la mitad del flujo (guardarlo como documento firmable con la marca gestionada por sign-off)? Si es intencional, FR-1516 debería reescribirse. → **Flujo completo del borrador de ACNS: guardar, imprimir, firmar.**
- ✅ **P47** (COD-24 · _El export ODT pierde los pictogramas en silencio: renderODT ignora data-picto — ni imagen,_): ¿El ODT debe incrustar los pictogramas (ODF lo permite: Pictures/ + manifest) o basta hueco nombrado + aviso, registrado como G-item? → **Incrustar pictogramas y atribución en el ODT.**
- ✅ **P48** (COD-25 · _El override por alumno (018 FR-1612, peldaño 1 de la precedencia) sigue sin pantalla, y G3_): ¿Reabrir el hueco como G-item propio (UI del override por alumno) o decidir que el vocabulario global basta y estrechar FR-1612 formalmente como se hizo con FR-1601? → **Pantalla del override por niño, como deuda registrada.**

### Sin revisar

- ✅ **P49** (CRIT-01 · _Nadie ha mirado cómo llega una versión nueva a la docente: no hay mecanismo de actualizaci_): ¿Quieres una spec que decida el mecanismo (auto-update vs aviso «hay versión nueva» con enlace) y, aparte, si el corpus debe poder actualizarse sin reinstalar la app? → **Aviso de versión nueva + corpus actualizable por separado (spec).**
- ✅ **P50** (CRIT-02 · _El vault no tiene versión de esquema ni historia de migración: el primer cambio de forma (_): ¿Añadimos un marcador de versión de esquema al vault ahora, antes del primer cambio de forma real, aunque hoy no haya nada que migrar? → **Versión de esquema del vault, ya.**
- ✅ **P51** (CRIT-04 · _Lenguas cooficiales: la UI reserva el hueco ('ca', 'gl', 'eu' están en el tipo) pero nada _): ¿El material en lengua cooficial está dentro del alcance de v1 (y entonces necesita spec y recetas) o se declara explícitamente fuera, con un mensaje honesto al detectar la lengua? → **Cooficiales fuera de v1 con mensaje honesto y deuda registrada.**
- ✅ **P52** (CRIT-06 · _La distribución sin firma es una decisión documentada pero sin dueño vivo: no hay entrada _): ¿Registramos la firma como ítem de BACKLOG con criterio de cierre explícito («antes de la primera release pública no-Linux»), para que no dependa de recordar un comentario en un yml? → **Deuda con criterio: sin firma no hay release pública mac/Windows.**
