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

- [ ] **0.1 · Ciclo de vida del estado de sesión de App.tsx** (P11, P14; FLU-01/03/04/05, exec-tema 2).
      `review`, `ingested`, `intent`, `reconnect`: definir cuándo se limpia cada uno.
      Incluye: «volver» desde ReviewScreen; pendientes-de-firma derivados del vault (no estado
      local) + «revisar y firmar» desde el expediente; `ingested` no precarga jobs viejos;
      `reconnect` cancelable y que no secuestre Configuración; intent reset al completar.
      Es UN refactor con cinco síntomas — hacerlo junto. e2e nuevo: firmar la 2ª hoja de una tanda.
- [ ] **0.2 · Borrado completo, los cinco residuos** (P38; COD-03/04/07/08/18/19/20, exec-tema 1).
      `forget` borra: entrada de names.enc, paquetes handover/, fila del roster, .rampa/requests,
      memory/archive. `verifyForgotten` recorre los cinco sitios. Reescribir el e2e vacuo de
      erasure para que pueda fallar. **RGPD de menores: revisar la corrección con DPO/legal.**
- [ ] **0.3 · Endurecer los dos guardianes** (P31, P42).
      `check-fr-coverage.sh`: cada FR en tasks.md exige marcador done/deferred:razón/dropped:razón —
      la mención deja de contar. `check-spec-kit.sh`: toda spec citada por código o declarada
      shipped/built por otra spec debe tener plan.md y tasks.md. Hacerlo ANTES de escribir las
      specs nuevas: protege todo lo que viene.
- [ ] **0.4 · Fugas y honestidad del pipeline** (P17, P18, P19, P15, P1-parte2).
      Nombres: lista INE ampliada + marcar token inicial de frase. Prompt: fence+nonce alrededor
      del material + recordatorio de tarea posterior. Compose: llevadas+resta→borrows + corte de
      bucle con lote 100% unknown. Adaptar: stop con selección de recetas vacía + aviso de perfil
      insuficiente (ejes sin observar, recetas desactivadas).
- [ ] **0.5 · Test del control primario único** (P35). Escribirlo YA aunque falle; sus fallos son
      lista de trabajo. Protege las obras de navegación del Lote 3.

## Lote 1 · Enmiendas documentales, de una pasada (baratas, todas decididas)

Un solo commit de specs/corpus puede llevarlas todas. Sin código salvo donde se indica.

- [ ] **1.1** Prefijo de spec obligatorio al citar FRs → AGENTS.md + plantilla; corregir 021:201 (P22).
- [ ] **1.2** 007 FR-511 → «destinos declarados en el corpus», nota fechada → 023 (P23).
- [ ] **1.3** Punteros de la conversación: 021/022/023/024 → apuntan a 026 (P24).
- [ ] **1.4** 020 FR-1802/1817/1819 anotados «aplazado por 025, sigue siendo el destino»; 025 anotada
      como paso intermedio (P25/P29).
- [ ] **1.5** G28: actualizar con estado real + criterio de cierre «lectura humana de los términos de
      ARASAAC antes de la primera release pública» (P26).
- [ ] **1.6** 023: corregir «022 shipped» y el tick hueco de T023; retirar la cita de código a
      FR-2008 como precedente; 022 al BACKLOG hasta tener plan/tasks; nota de proceso en 022 (P21, P42).
- [ ] **1.7** 011 FR-918/920/921 marcados deferred con razón + entrada BACKLOG (P31).
- [ ] **1.8** 024 FR-2218 anotado «aplazado, ver G35» hasta la spec del segundo eje (P34).
- [ ] **1.9** FR-122/FR-129: escribir la lectura reconciliadora (curso→corpus = input de ella) (P32).
- [ ] **1.10** FR-707a: «mejor medido entre elegibles y con soporte de fotos, ambas ramas» (P33).
- [ ] **1.11** Copy de conexión → «por hoja adaptada» (spec + i18n + test) (P36).
- [ ] **1.12** Recetas: declarar conflicts: one-task-per-page ↔ exam-access; escribir receta de
      conflicto DEC+ATE (P27). Corpus, no código.
- [ ] **1.13** Regla dura 12 → el informe habla siempre en el idioma de la docente (P28-parte).
- [ ] **1.14** Cooficiales: mensaje honesto al detectar la lengua + deuda registrada (P51).
- [ ] **1.15** Firma de código: entrada BACKLOG con criterio «sin firma no hay release pública
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

**2026-09-03: las 10 specs están ESCRITAS (026–035), con checklist en verde y los guardianes del
repo pasando.** Lo que falta de cada una: clarify (opcional si Carlos revisa la spec directamente)
→ plan → tasks → implement. 022 y 020 no necesitaban spec nueva (3.2 y 3.10).

- [x] **3.1 · Spec ESCRITA → `027-examenes-y-problemas`** (P2). Falta: clarify → plan → tasks → implement. Formato de salida
      propio, verificación adecuada por tipo, el tipo elegido gobierna lo producido de verdad.
- [ ] **3.2 · Spec 022 (ya existía) → plan + tasks + implementación: diagramas como marcado** (P21).
      Pasa por el guardián endurecido de 0.3.
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
