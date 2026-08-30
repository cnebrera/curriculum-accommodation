# Especificación funcional y técnica — Generador de Situaciones de Aprendizaje con IA (SDA-IA)

**Organismo:** Junta de Andalucía · Consejería de Desarrollo Educativo y Formación Profesional
**URL base:** `https://edea.juntadeandalucia.es/sda-ia/`
**Versión analizada:** `v3.5.5.13` (footer de la aplicación)
**Fecha del análisis:** 30 de agosto de 2026
**Método:** ingeniería inversa de caja negra/gris — inspección del DOM renderizado, de los *bundles* JavaScript servidos, de los recursos de datos (`.csv`, `.json`) y de la API REST interna, más ejecución guiada de los flujos de la interfaz sobre una sesión autenticada.

> **Nota de alcance y de tratamiento de datos.** Este documento describe el comportamiento observable de la aplicación. No incluye código de servidor (no accesible) ni datos personales del usuario de la sesión ni de alumnado. La herramienta está diseñada para trabajar con **siglas** del alumnado, no con nombres: es la propia aplicación la que aplica minimización de datos. Cualquier despliegue, réplica o integración de esta herramienta debe validarse con el DPO / equipo de compliance, por tratarse de un servicio de administración pública educativa con datos de menores (RGPD, ENS, y en su caso NIS2).

> **La aplicación se declara a sí misma como versión DEMO.** Al entrar (una vez por pestaña, y siempre tras un F5) se muestra un modal *"Advertencia !!!"* con el texto: *"Esta es una versión demo. Para probar y ver su funcionamiento, puede usar los cursos de 1.º y 2.º, así como las asignaturas de Matemáticas y Lenguaje. En el momento que esté operativa, al entrar aquí será redirigido automáticamente a dicha página."* Es decir: el catálogo curricular completo (13 cursos, hasta 28 materias) está cargado y es navegable, pero **el ámbito validado por el equipo es 1.º y 2.º de Primaria en Matemáticas y Lengua**. Conviene tenerlo presente al valorar cualquier hallazgo de este documento: parte de la deuda técnica descrita es probablemente deliberada en un piloto.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura](#2-arquitectura)
3. [Mapa de módulos y rutas](#3-mapa-de-módulos-y-rutas)
4. [API REST interna](#4-api-rest-interna)
5. [Modelo de dominio](#5-modelo-de-dominio)
6. [Generador de Situaciones de Aprendizaje — especificación funcional](#6-generador-de-situaciones-de-aprendizaje--especificación-funcional)
7. [Atención a la diversidad: PT / AL / ACS](#7-atención-a-la-diversidad-programa-específico-pt--al-y-acs)
8. [El motor de prompts (`PromptEngine`)](#8-el-motor-de-prompts-promptengine)
9. [Contenido del prompt generado](#9-contenido-del-prompt-generado)
10. [Módulos de Tareas Docentes](#10-módulos-de-tareas-docentes)
11. [Flujos completos](#11-flujos-completos)
12. [Hallazgos, deuda técnica y riesgos](#12-hallazgos-deuda-técnica-y-riesgos)
13. [Anexos](#13-anexos)
14. [Valoración final](#14-valoración-final)

---

## 1. Resumen ejecutivo

SDA-IA es una **aplicación web de generación asistida de prompts** para profesorado andaluz. No genera contenido pedagógico por sí misma: su función real es **componer un prompt muy extenso, estructurado y normativamente anclado** (LOMLOE, Orden de 30 de mayo de 2023 de Andalucía, DUA 3.0, ODS) a partir de:

1. datos que el docente introduce en un formulario guiado,
2. el **currículo oficial andaluz** servido desde una API interna (competencias específicas, criterios de evaluación, saberes básicos y descriptores operativos del Perfil de salida), y
3. un **repositorio de fragmentos de texto** en CSV (~12.500 filas) que actúa como plantilla maestra.

Ese prompt se puede (a) descargar como `.txt` para pegarlo en cualquier LLM, o (b) enviarse directamente al *backend*, que lo reenvía a **Gemini** y devuelve la Situación de Aprendizaje redactada en HTML (nueva pestaña) o en DOCX (descarga).

El valor diferencial del producto no está en la IA, sino en **el motor de plantillas y en el modelo de datos curricular**: la herramienta garantiza que el prompt contenga siempre la terminología, la codificación oficial y la estructura normativa exigidas por la Orden andaluza.

### 1.1 Cifras de la solución

| Elemento | Magnitud observada |
|---|---|
| Módulos generadores | 6 rutas activas (3 de SdA + ESO + 3 de tareas docentes) |
| Cursos en catálogo | 13 (3 de Infantil, 6 de Primaria, 4 de ESO) |
| Materias por curso | 3 (Infantil) · 16 (Primaria) · 28 (3.º ESO) |
| Endpoints REST internos | 6 |
| Filas del CSV de fragmentos | 12.501 (≈2,6 MB), útiles hasta ~5.420 |
| Longitud típica del prompt generado | ~26.000 caracteres (caso simple, sin PT/AL/ACS) |
| Ítems de la taxonomía PT | 6 áreas · 24 bloques · ~110 objetivos |
| Ítems de la taxonomía AL | 6 áreas (una con 4 ámbitos) · ~30 bloques · ~130 objetivos |

---

## 2. Arquitectura

### 2.1 Pila tecnológica inferida

**Servidor**

- **Spring Boot** (Java). Confirmado por: comentario literal `// URL de tu endpoint de Spring Boot`, referencia al modelo `PromptRequest.java`, y el `POST /sda-ia/logout` con formulario, patrón de **Spring Security**.
- Renderizado de vistas en servidor (plantillas tipo Thymeleaf/JSP): las rutas devuelven HTML completo, no un SPA.
- Generación documental server-side: endpoint que devuelve `.docx` con cabecera `Content-Disposition: attachment`.
- Integración server-side con la **API de Gemini** (la clave nunca se expone al navegador — decisión correcta).

**Cliente**

- jQuery 3.x + Bootstrap 4 + Popper + SmartMenus + bootstrap-table (con locale `es-ES`).
- **Sin framework SPA**. Toda la lógica es JavaScript imperativo sobre el DOM.
- Plantilla corporativa de la Junta de Andalucía (cabecera institucional, logotipo, tipografía).

**Autenticación**

- Sesión de servidor con Spring Security; el nombre del usuario se pinta en la cabecera.
- Salida vía `POST /sda-ia/logout` (protección CSRF por formulario).
- No hay ninguna llamada de API sin sesión: los endpoints `/api/*` cuelgan de la sesión autenticada.

### 2.2 Mapa de ficheros JavaScript

| Fichero | Tamaño | Responsabilidad |
|---|---|---|
| `js/generador/generador.js` | ~202 KB | Núcleo de UI: carga de catálogos, listas duales de concreción curricular, bloques PT/AL/ACS y sus taxonomías completas, acordeones, modales, contadores. |
| `js/generador/scripts_prompt.js` | ~34 KB | **`PromptEngine`**: motor de plantillas. Carga y parsea el CSV, resuelve referencias `(fila,col)`, ejecuta las fórmulas, valida campos obligatorios. |
| `js/generador/script_generador.js` | ~18 KB | Define la **plantilla del prompt de SdA**, los campos obligatorios, el mapeo de materia→variantes y los *hooks* que conectan `PromptEngine` con el DOM. |
| `js/generador/gemini-generator.js` | ~7 KB | Llamadas al *backend* (`generar-documento`, `generar-html`), modales de progreso, contador MM:SS, *timeout*. |
| `js/generador/agrupado.js` | ~1 KB | Configuración del generador combinado Infantil+Primaria y carga de `/api/cursos`. |
| `js/generador/infantil.js` · `primaria.js` · `eso.js` | <1,1 KB | Equivalentes para cada etapa por separado. |
| `js/generador/actas.js` | ~7 KB | Módulo "Actas": UI de paneles plegables + `build_prompt_actas()`. |
| `js/generador/actividades.js` | ~5 KB | Módulo "Actividades" + `build_prompt_actividades()`. |
| `js/generador/instrumentos-evaluacion.js` | ~5 KB | Módulo "Instrumentos de evaluación" + `build_prompt_instrumentos()`. |
| `js/autenticacion/login.js` | 98 B | Únicamente el *submit* del formulario de logout. |

### 2.3 Recursos de datos

| Recurso | Estado | Contenido |
|---|---|---|
| `data/generador/valores_prompt.csv` | **Activo, crítico** | 12.501 filas × 3 columnas. Col. A = texto del fragmento; col. B = etiqueta/agrupador; col. C = identificador de control (`alumno-pt-{{id}}-area-N-bloque-M-obj-K`). Es la fuente única de verdad del prompt. |
| `data/generador/concrecion-curricular.json` | **Activo pero de relleno** | 7,4 KB. Estructura `{competencias, criterios, saberes, descriptores}` con textos de ejemplo (*"Descripción detallada de lo que implica esta competencia"*). Se usa sólo para el mapeo competencia→descriptores; los textos reales llegan por API. |
| `assets/json/fragmentos-prompt.json` | **Inexistente (500)** | Ruta referenciada en `generador.js` pero no desplegada. Código muerto. |
| `data/concrecion-curricular.json` | **Inexistente (500)** | Idem, referencia con `window.BASE_URL` que nunca se define. |

---

## 3. Mapa de módulos y rutas

| Ruta | Título | Estado en el menú | JS específico |
|---|---|---|---|
| `/sda-ia/` | Portada (sirve el generador Infantil y Primaria) | Visible | `agrupado.js` |
| `/sda-ia/generador/infantil-primaria` | Generador Educación Infantil y Primaria | **Visible** ("GENERADOR") | `agrupado.js` |
| `/sda-ia/generador/infantil` | Generador Educación Infantil | Accesible, **no enlazado** en el menú | `infantil.js` |
| `/sda-ia/generador/primaria` | Generador Educación Primaria | Accesible, **no enlazado** | `primaria.js` |
| `/sda-ia/generador/eso` | Generador Educación Secundaria Obligatoria | Accesible, **no enlazado** | `eso.js` |
| `/sda-ia/generador/actas` | Actas | Visible ("TAREAS DOCENTES") | `actas.js` |
| `/sda-ia/generador/actividades` | Actividades | Visible ("TAREAS DOCENTES") | `actividades.js` |
| `/sda-ia/generador/instrumentos-evaluacion` | Instrumentos de evaluación | Visible ("TAREAS DOCENTES") | `instrumentos-evaluacion.js` |

Las cuatro rutas de generador de SdA comparten **exactamente la misma vista y el mismo JS de núcleo**; sólo cambia el fichero de configuración que fija el conjunto de cursos ofrecidos y el rótulo. Es un patrón de configuración, no de especialización: la variación real por etapa se resuelve en el CSV.

---

## 4. API REST interna

Base: `https://edea.juntadeandalucia.es/sda-ia/api/`. Todos los endpoints son `GET`, devuelven JSON y requieren sesión autenticada. Los objetos anidan la entidad padre completa (serialización JPA sin DTO).

### 4.1 `GET /api/cursos`

Devuelve el catálogo completo de cursos de las tres etapas.

```json
[{ "id": 100304, "curso": "Tres Años", "orden": 1 },
 { "id": 100317, "curso": "1º Educación Primaria", "orden": 1 },
 { "id": 101140, "curso": "1º de E.S.O.", "orden": 1 }]
```

| Etapa | IDs | Cursos |
|---|---|---|
| Infantil | 100304–100306 | Tres Años, Cuatro Años, Cinco Años |
| Primaria | 100317–100322 | 1.º a 6.º de Educación Primaria |
| ESO | 101140–101143 | 1.º a 4.º de E.S.O. |

El `orden` reinicia en cada etapa, de modo que el cliente debe filtrar por rango de `id`, no por `orden`. Cada módulo generador filtra el catálogo contra una lista blanca de nombres declarada en su fichero de configuración (`cursos` y `cursos_programa_especifico`).

### 4.2 `GET /api/materias-curso/{cursoId}`

```json
{ "id": 7416,
  "curso": { "id": 100319, "curso": "3º Educación Primaria", "orden": 3 },
  "materia": "Matemáticas" }
```

Devuelve la relación curso↔materia. **El `id` de esta relación (no el de la materia) es la clave que consumen los endpoints siguientes.**

Volumen observado: 3 materias en Infantil, 16 en 3.º de Primaria, 28 en 3.º de ESO.

- **Infantil** ofrece las dos religiones más una entrada **"Global"** que agrupa las tres áreas de experiencia (*Crecimiento en Armonía*, *Descubrimiento y Exploración del Entorno*, *Comunicación y Representación de la Realidad*).
- **Primaria** ofrece las áreas troncales, las religiones, los primeros idiomas (inglés, francés, alemán, italiano, portugués), las materias de plurilingüismo y una entrada **"Globalizada"** que agrupa las seis áreas principales para diseñar SdA interdisciplinares.
- **ESO** incluye materias específicas de Andalucía como *Cultura del Flamenco*, *Oratoria y Debate*, *Computación y Robótica*, y los **ámbitos** (Científico-Tecnológico, Lingüístico y Social) propios de los programas de diversificación.

### 4.3 `GET /api/competencias-especificas-materia/{materiaCursoId}`

```json
{ "id": 5498,
  "materia": { ...objeto materia-curso completo... },
  "competencia": "MAT.3.1.Interpretar situaciones de la vida cotidiana...",
  "etiqueta": "COMPRENSIÓN PROBLEMAS" }
```

`etiqueta` es un rótulo corto en mayúsculas que la UI muestra destacado sobre el texto largo. La codificación oficial (`MAT.3.1.`) va embebida al inicio del campo `competencia`, no en un campo propio.

### 4.4 `GET /api/criterios-in-competencias-especificas/{ids}`

`{ids}` es una **lista de identificadores de competencia separados por comas**. Devuelve todos los criterios de evaluación colgados de esas competencias.

```json
{ "id": 16909,
  "competencia": { ...objeto competencia completo, con materia y curso anidados... },
  "criterio": "MAT.3.1.1.Reconocer de forma verbal o gráfica, problemas...",
  "etiqueta": "Reconocer, interpretar y comprender" }
```

Este endpoint es el que materializa la **dependencia competencias → criterios**: hasta que el docente no selecciona competencias, la caja de criterios está vacía.

### 4.5 `GET /api/saberes-materia/{materiaCursoId}`

```json
{ "id": 34244,
  "materia": { ... },
  "saber": "MAT.3.A.1.1.Estrategias variadas de conteo..." }
```

73 saberes básicos en Matemáticas de 3.º de Primaria. **Se observan duplicados exactos** en la respuesta (p. ej. `MAT.3.A.2.7`, `MAT.3.A.3.2`, `MAT.3.A.3.4`, `MAT.3.D.4.2` aparecen dos veces) — defecto de datos, no de la UI.

### 4.6 `GET /api/descriptores-curso/{cursoId}`

```json
{ "id": 1140,
  "curso": { ... },
  "descriptor": "CCL1. Expresa de forma oral, escrita, signada o multimodal..." }
```

34 descriptores operativos del **Perfil de salida** para 3.º de Primaria (CCL, CP, STEM, CD, CPSAA, CC, CE, CCEC). Se muestran como panel de consulta desplegable ("Mostrar/Ocultar descriptores"); **no son seleccionables**.

### 4.7 Endpoints de generación (POST, no `/api`)

| Endpoint | Método | Cuerpo | Respuesta |
|---|---|---|---|
| `./generar-documento` | POST | `{ "promptText": "..." }` (modelo `PromptRequest`) | `.docx` binario con `Content-Disposition: attachment`; nombre por defecto `Situacion_Aprendizaje.docx` |
| `./generar-html` | POST | `{ "promptText": "..." }` | HTML de la SdA; el cliente lo escribe en `window.open('', '_blank')` |

`./generar-html` es el que usa el botón visible **"LANZAR EN GEMINI DIRECTAMENTE"**. Tiene un **timeout de cliente de 300 s** (`TIMEOUT_MS = 300000`) resuelto con `Promise.race`, y un modal de progreso con contador MM:SS. Un comentario del código dice "Timeout de 30 segundos" — desincronizado con el valor real.

`./generar-documento` (`generarYDescargarSdA()`) está implementado pero **no hay ningún botón que lo invoque** en la interfaz actual: es una funcionalidad completa y latente.

---

## 5. Modelo de dominio

```
Curso (id, curso, orden)
  └─ MateriaCurso (id, curso→Curso, materia)
       ├─ CompetenciaEspecifica (id, materia→MateriaCurso, competencia, etiqueta)
       │    └─ CriterioEvaluacion (id, competencia→CompetenciaEspecifica, criterio, etiqueta)
       └─ SaberBasico (id, materia→MateriaCurso, saber)
Curso
  └─ DescriptorOperativo (id, curso→Curso, descriptor)
```

En el cliente, el estado de la concreción se mantiene en un objeto `concrecionData` con la forma:

```js
concrecionData = {
  competencias: { disponibles: [], autorizados: [] },
  criterios:    { disponibles: [], autorizados: [] },
  saberes:      { disponibles: [], autorizados: [], /* saber.criterios[] , saber._movidoAutomaticamente */ }
}
```

El vínculo **saber ↔ criterios** (`saber.criterios[]`) es lo que permite el arrastre automático descrito en §6.4.

---

## 6. Generador de Situaciones de Aprendizaje — especificación funcional

La vista es un formulario largo de una sola página dividido en cuatro secciones, más el bloque de acciones final. Las cuatro secciones reproducen literalmente la estructura de SdA de la Orden de 30 de mayo de 2023.

### 6.1 Sección A — Identificación / Participantes

| Campo | Control | id | Obligatorio | Comportamiento |
|---|---|---|---|---|
| Cursos | `select` | `selector-cursos` | **Sí** | Se rellena desde `/api/cursos` filtrado por la lista blanca del módulo. Al cambiar dispara: carga de materias, carga de descriptores, y reseteo de la concreción. El `value` de la opción es el **nombre** del curso, no el id. |
| Materias | `select` | `selector-materias` | **Sí** | Se rellena desde `/api/materias-curso/{cursoId}`. Al cambiar carga competencias y saberes. |
| Título | `select` + `textarea` | `selector-titulo` / `campo-titulo-manual` | No | Tres opciones: *Seleccionar* · *Generado automáticamente por la IA* (por defecto) · *Introducir manualmente*. El `textarea` sólo se habilita en modo manual. |
| Contexto · Localidad | `textarea` | `contexto-localidad` | **Sí** | Texto libre. |
| Contexto · Alumnado | `textarea` | `contexto-alumnado` | **Sí** | Texto libre descriptivo del grupo. |
| Justificación | `select` + `textarea` | `selector-justificacion` / `campo-justificacion-manual` | No | Mismo patrón IA/manual. En modo IA el prompt pide **máximo 1000 caracteres**, derivada de temática, contexto, competencias, descriptores y **ODS**. |
| Temporalización | `select` + `textarea` | `selector-temporalizacion` / `campo-temporalizacion-manual` | No | Mismo patrón. En modo IA el prompt exige **mínimo 20 sesiones** (Primaria/resto). |

Dentro de esta sección viven además dos bloques desplegables de atención a la diversidad, descritos en §7: **Programa Específico** (alumnado PT y AL) y **Adaptación Curricular Significativa** (ACS).

**Validación.** `onGenerarPromptClick()` comprueba los cuatro campos obligatorios declarados en `REQUIRED_FIELDS`. Si falta alguno, muestra un modal que agrupa los errores por módulo y resalta los controles vacíos (clase de error durante ~1500 ms). Las validaciones de la concreción curricular existen en el código pero están **comentadas**: hoy se puede generar un prompt sin ninguna competencia, criterio ni saber seleccionado.

### 6.2 Sección B — Concreción curricular

Tres pares de listas duales (disponibles ↔ seleccionadas), con una barra de filtro superior de cuatro pestañas: **Todo · Competencias · Criterios · Saberes**.

```
┌── Competencias disponibles ──┐  → ←  ┌── Competencias seleccionadas ──┐
│  etiqueta + texto oficial     │  ⇒ ⇐  │                                 │
└───────────────────────────────┘       └─────────────────────────────────┘
                 │ (al mover, consulta /api/criterios-in-competencias-especificas)
                 ▼
┌── Criterios disponibles ──────┐  → ←  ┌── Criterios seleccionados ──────┐
└───────────────────────────────┘       └─────────────────────────────────┘
                 │ (al mover, arrastra los saberes vinculados)
                 ▼
┌── Saberes disponibles ────────┐  → ←  ┌── Saberes seleccionados ────────┐
└───────────────────────────────┘       └─────────────────────────────────┘
```

Cada ítem es un `div.concrecion-item` con `data-id` (el id de la entidad) y dos spans: `concrecion-item-id` (la etiqueta corta) y `concrecion-item-desc` (el texto oficial completo). La selección es por clic (multiselección acumulativa). Cada caja lleva un contador `"N elementos ( M seleccionados )"`.

**Controles de trasvase** (`moverSeleccionados` / `moverTodos`), en ambos sentidos, para las tres familias.

**Panel de descriptores operativos**: botón `btn-descriptores` que alterna "Mostrar/Ocultar descriptores" y despliega los 34 descriptores del Perfil de salida del curso. Es informativo — sirve para que el docente los tenga a la vista al seleccionar competencias.

Si no hay curso **y** materia seleccionados, la sección muestra: *"Para rellenar la concreción curricular, es necesario seleccionar un curso y una materia."*

### 6.3 Sección C — Secuenciación didáctica

| Campo | id | Reglas |
|---|---|---|
| "CONTENIDOS" (activación) | `sd-contenidos-check` | Checkbox que habilita el textarea. |
| Contenidos | `sd-contenidos-texto` | Texto libre: *"Describe los contenidos a trabajar…"* |
| Producto final — modo | `sd-producto-final-modo` | *Generado automáticamente por la IA* / *Manual* |
| Producto final — texto | `sd-producto-final-texto` | Sólo habilitado en modo Manual |

**Seis fases** (modelo de secuenciación de la Junta), cada una con selector de modo IA/Manual y, en modo Manual, dos campos numéricos:

| # | Fase | Descripción en pantalla | Sesiones (min–max) | Actividades (min–max) |
|---|---|---|---|---|
| 1 | MOTIVACIÓN | Planteamos el reto o desafío y los objetivos de aprendizaje. | 1–2 | 1–30 |
| 2 | ACTIVACIÓN | Conectamos con sus conocimientos previos. | 1–2 | 1–30 |
| 3 | EXPLORACIÓN | Damos oportunidades de éxito de cara a la propuesta inicial a partir de lo que ya conoce. | 1–2 | **2**–30 |
| 4 | ESTRUCTURACIÓN | Introducción de nuevos aprendizajes necesarios de cara a la realización del producto final. | **10–20** | **6**–30 |
| 5 | APLICACIÓN | Realización del producto o desempeño para responder al reto inicial. | **3–20** | **1–1** |
| 6 | CONCLUSIÓN | Difusión de resultados. Evaluación del proceso y transferencia de aprendizajes. | 1–2 | 1–30 |

Los inputs son `type="number"`, `step=1`, con `placeholder` autogenerado *"Introduzca un número ( mínimo X y máximo Y )"*, y **nacen `disabled`**: sólo se habilitan al pasar la fase a modo Manual. Cada control lleva un atributo `data-prompt-key` (`secuenciacion.b4.sesiones`, etc.) que documenta su papel en el prompt.

Los mínimos y máximos codifican una regla pedagógica: **la fase de Estructuración concentra el grueso del trabajo** (10–20 sesiones) y la de Aplicación produce **una única actividad** (el producto final).

### 6.4 Regla de arrastre automático de saberes

Función `verificarSaberes()`. Cuando el docente mueve criterios, la aplicación:

1. recalcula el conjunto de ids de criterios seleccionados;
2. para cada saber ya seleccionado, comprueba si alguno de sus `criterios[]` sigue en ese conjunto;
3. si sigue vinculado, lo **mantiene**;
4. si ya no lo está **y** había sido movido automáticamente (`_movidoAutomaticamente === true`), lo **devuelve** a "disponibles";
5. si ya no lo está pero lo movió el docente a mano, lo **respeta**.

Es una regla bien diseñada: automatiza la coherencia curricular sin pisar las decisiones manuales del usuario.

### 6.5 Sección D — Evaluación de la práctica docente

Selector de modo IA/Manual (`sd-practica-modo`) y, en modo Manual, cinco casillas (`sd-practica-c1` … `c5`):

1. Resultados de la evaluación de la materia
2. Métodos didácticos y pedagógicos
3. Adecuación de los materiales y recursos didácticos
4. Eficacia de las medidas de atención a la diversidad y a las diferencias individuales
5. Utilización de los instrumentos de evaluación variados, diversos, accesibles y adaptados

### 6.6 Sección E — Acciones finales

| Acción | Comportamiento |
|---|---|
| **GENERAR PROMPT PARA IA** | Cabecera de la sección; internamente `onGenerarPromptClick()` valida, construye el prompt y lo cachea en `window.__LAST_PROMPT__`. |
| **LANZAR EN GEMINI DIRECTAMENTE** | Abre el modal `confirmModal` con la advertencia: *"La generación de la Situación de Aprendizaje requiere una llamada a la API de Gemini cuyo resultado se mostrará en una nueva ventana/pestaña… Asegúrese de que su navegador permite ventanas emergentes (pop-ups)"*. Al confirmar → `confirmarYEjecutar()` → `POST ./generar-html` → modal "Generando Contenido…" con contador → `window.open`. |
| **DESCARGAR PROMPT PARA IA** | `descargarPrompt()` → valida → genera → `downloadText()` con nombre sellado con marca de tiempo (`promptFilename()`). |

---

## 7. Atención a la diversidad: Programa Específico (PT / AL) y ACS

### 7.1 Programa Específico

Dos contenedores independientes con botón **`+ AÑADIR ALUMNO PT`** y **`+ AÑADIR ALUMNO AL`**. Cada pulsación instancia un bloque plegable "ALUMNO *n* (PT|AL)" con numeración autoincremental (`window.contadorPT` / `window.contadorAL`). **No hay límite de alumnos.** El botón de borrado pide confirmación (`mostrarConfirmacionEliminar`).

Campos comunes por alumno (`alumno-{pt|al}-{n}-…`):

| Campo | Sufijo del id | Tipo |
|---|---|---|
| Siglas Alumnado | `-siglas` | textarea |
| Sesiones | `-sesiones` | textarea |
| Déficit/dificultad | `-deficit` | textarea |
| Curso adaptado | `-curso-adaptado` | select (cursos del módulo) |
| Temática (opcional) | `-tematica` | textarea |

> **Diseño de privacidad:** el campo se llama "Siglas", no "Nombre". El resto de la ficha (déficit/dificultad) es texto libre y **sí puede contener categorías especiales de datos** (salud, diagnóstico). Es el punto de mayor riesgo RGPD de la herramienta, agravado por el hecho de que ese texto se envía a un proveedor de IA de terceros. Debe validarse con el DPO.

A continuación, un **árbol de objetivos con casillas de verificación** en tres niveles (área → bloque → objetivo), con casillas maestras en área y bloque (`-area-N-master`, `-area-N-bloque-M-master`) que marcan/desmarcan en cascada, y ajuste dinámico de altura del contenedor.

Los identificadores de las casillas siguen el patrón `alumno-pt-{n}-area-{A}-bloque-{B}-obj-{O}` (y `-amb-{X}-` cuando hay nivel de ámbito). Estos mismos identificadores, con `{{id}}` como marcador, están en la **columna C del CSV**, lo que permite al motor recuperar el texto literal de cada objetivo marcado.

#### 7.1.1 Taxonomía PT (Pedagogía Terapéutica) — 6 áreas

**Área 1 · Desarrollo cognitivo**
- Bloque 1 — Atención: 1.1 sostenida · 1.2 selectiva · 1.3 dividida · 1.4 flexibilidad atencional
- Bloque 2 — Memoria: 2.1 de trabajo · 2.2 a corto plazo · 2.3 a largo plazo (2.3.1 semántica · 2.3.2 episódica · 2.3.3 procedimental)
- Bloque 3 — Funciones ejecutivas: 3.1 planificación · 3.2 organización · 3.3 inhibición · 3.4 flexibilidad cognitiva · 3.5 resolución de problemas · 3.6 toma de decisiones
- Bloque 4 — Razonamiento: 4.1 lógico · 4.2 abstracto · 4.3 verbal · 4.4 numérico
- Bloque 5 — Percepción: 5.1 visual · 5.2 auditiva · 5.3 táctil/háptica
- Bloque 6 — Lenguaje (componente cognitivo): 6.1 comprensión verbal · 6.2 expresión verbal · 6.3 vocabulario · 6.4 semántica · 6.5 pragmática
- Bloque 7 — Metacognición: 7.1 conocimiento metacognitivo · 7.2 regulación metacognitiva

**Área 2 · Desarrollo comunicativo y lingüístico**
- Bloque 1 — Lecto-escritura: 1.1 abecedario · 1.2 expresión oral · 1.3 expresión escrita · 1.4 comprensión oral · 1.5 comprensión escrita · 1.6 velocidad lectora · 1.7 exactitud lectora · 1.8 reglas ortográficas · 1.9 gramática

**Área 3 · Autonomía personal**
- Bloque 1 — Hábitos de independencia personal: 1.1 control de esfínteres · 1.2 autonomía en la comida · 1.3 en la bebida · 1.4 vestido–desvestido · 1.5 calzado–descalzado · 1.6 aseo personal · 1.7 deambulación independiente
- Bloque 2 — Autonomía y responsabilidad: 2.1 toma de decisiones · 2.2 independencia · 2.3 responsabilidad · 2.4 iniciativa

**Área 4 · Desarrollo psicomotor**
- Bloque 1 — Aspectos generales: 1.1 esquema corporal · 1.2 lateralidad · 1.3 control postural y equilibrio · 1.4 coordinación dinámica general · 1.5 coordinación óculo-manual/óculo-pedal
- Bloque 2 — Componentes específicos: 2.1 psicomotricidad fina · 2.2 gruesa · 2.3 ritmo y temporalidad · 2.4 organización espacial

**Área 5 · Desarrollo social y emocional**
- Bloque 1 — Conciencia y regulación emocional (1.1–1.8: identificación, expresión, regulación, tolerancia a la frustración, formular quejas, aceptación/rechazo de críticas, decir no, preguntar por qué)
- Bloque 2 — Autoconcepto y autoestima (2.1–2.3)
- Bloque 3 — Habilidades sociales (3.1 empatía · 3.2 escucha activa · 3.3 asertividad · 3.4 resolución de conflictos · 3.5 cooperación · 3.6 iniciación y mantenimiento de amistades)
- Bloque 4 — Autonomía y responsabilidad (4.1–4.4)
- Bloque 5 — Habilidades de interacción social individual (5.1–5.9: contacto físico, juegos de interacción, ayuda a otro, escondite, construir torres, juego social, marionetas, juego simbólico)
- Bloque 6 — Habilidades para relacionarse con iguales (6.1 cumplidos · 6.2 compartir · 6.3 juegos cooperativos · 6.4 presentaciones · 6.5 conversaciones · 6.6 actuar por turnos)
- Bloque 7 — Comportamiento prosocial (7.1 altruismo · 7.2 solidaridad · 7.3 respeto a normas y límites · 7.4 convivencia y respeto a la diversidad)

**Área 6 · Motora**
- Bloque 1 — Aspectos generales del desarrollo motor: 1.1 equilibrio · 1.2 coordinación (1.2.1 dinámica general · 1.2.2 óculo-manual · 1.2.3 óculo-pedal) · 1.3 lateralidad · 1.4 control postural · 1.5 disociación de movimientos · 1.6 ritmo y velocidad

#### 7.1.2 Taxonomía AL (Audición y Lenguaje) — 6 áreas

Comparte con PT las áreas 1 (cognitivo), 3 (autonomía personal, reordenada), 4 (psicomotor), 5 (social y emocional) y 6 (motora). **La diferencia estructural está en el área 2**, que introduce un nivel adicional de **ámbito**:

**Área 2 · Desarrollo comunicativo y lingüístico**

- **Ámbito fonética**: 1.1 fonemas vocálicos · 1.2 fonemas consonánticos · 1.3 fonemas en palabras y frases · 1.4 diptongos · 1.5 fonema /R/ · 1.6 fonema /RR/ · 1.7 sinfones (grupos consonánticos)
- **Ámbito fonológico (habilidades metalingüísticas)**
  - Bloque 1 — Memoria auditiva: secuencial directa · secuencial inversa · de frases · manipulación de series
  - Bloque 2 — Conciencia léxica: conciencia de palabra · construcción de frases · rimas · palabras compuestas
  - Bloque 3 — Conciencia silábica: identificación y conteo · posición de la sílaba · manipulación · combinación y encadenamiento
  - Bloque 4 — Conciencia fonémica: identificación · discriminación y conteo · manipulación · segmentación y síntesis
  - Bloque 5 — Principio alfabético: correspondencia fonema-grafema
- **Ámbito semántica**: 1 comunicación gestual · 2 léxico comprensivo · 3 léxico expresivo · 4 comprensión oral · 5 conciencia semántica · 6 familias de palabras · 7 lenguaje figurado · 8 secuencias y descripciones · 9 absurdos de contenido · 10 narración
- **Ámbito morfología y sintaxis**: 1 primeras producciones · 2 estructura de la oración · 3 concordancia · 4 tipos de palabras gramaticales · 5 tipos de oraciones · 6 oraciones complejas · 7 flexiones verbales · 8 derivación de palabras · 9 detección de errores
- **Ámbito pragmática**: 1 conductas preverbales · 2 intención comunicativa · 3 habilidades conversacionales · 4 normas de cortesía · 5 discurso y narración · 6 lenguaje no literal

En la variante AL, el área de autonomía personal se reorganiza en 5 bloques (conciencia y regulación emocional, autoconcepto y autoestima, habilidades sociales, autonomía y responsabilidad, comportamiento prosocial), duplicando en parte el área social y emocional — **redundancia de modelo detectada**.

### 7.2 Adaptación Curricular Significativa (ACS)

Bloque mucho más simple. Botón **`+`** que añade "ALUMNO *n* (ACS)" con sólo dos campos:

| Campo | Tipo |
|---|---|
| Siglas | textarea |
| Curso | select (curso al que se adapta el currículo) |

Toda la elaboración de la ACS queda delegada en el modelo de IA: el prompt le indica *"Adapta los elementos curriculares de la SdA (Competencias específicas, Criterios…)"* al nivel del curso indicado.

---

## 8. El motor de prompts (`PromptEngine`)

El componente más interesante de la aplicación. Es un **micro-lenguaje de plantillas** que resuelve referencias a celdas de un CSV y ejecuta fórmulas que leen el DOM.

### 8.1 La hoja de fragmentos

`data/generador/valores_prompt.csv` — 12.501 filas, ~2,6 MB, tres columnas:

| Columna | Índice en `cell()` | Contenido |
|---|---|---|
| A | 1 | **Texto del fragmento** que se inyecta en el prompt |
| B | 2 | Etiqueta/agrupador (contexto de bloque) |
| C | 3 | **Identificador de control** DOM, con `{{id}}` como marcador del índice de alumno |

Distribución observada de rangos:

| Rango | Contenido |
|---|---|
| 1–~980 | Fragmentos de prompt de **Educación Infantil** |
| ~981–~1891 | Fragmentos de prompt de **Primaria / resto de materias** |
| ~1892–~2361 | Variante de **Matemáticas** |
| ~2362–~5041 | Variante de **Educación Física** y contenido curricular heredado (saberes por materia: FRA, ITA, REV…) |
| **5042–5173** | Objetivos de la taxonomía **PT** (con id en columna C) |
| **5173–5353** | Objetivos de la taxonomía **AL** |
| 5354–5401 | Fragmentos de los módulos de **tareas docentes** (actas, actividades, instrumentos) |
| 5402 | Preámbulo común: *"Lee el documento adjunto y realiza el desarrollo completo de todo lo que te pide"* |
| ~5403–~5420 | Fragmentos residuales (bloques PT/AL, "Actúa como docente experto…") |
| >5420 | **Vacías** (~7.000 filas de relleno) |

### 8.2 API del motor

| Método | Función |
|---|---|
| `loadCSV(url)` | Descarga y parsea el CSV; normaliza columnas separadas por barras. |
| `configure(hooks)` | Inyecta los *hooks* que aíslan el motor del DOM (`getFieldValue`, `getAlumnoPTField`, `getAlumnoALField`, `getAlumnoACSField`, `getConcrecionItems`…). |
| `cell(fila, col)` | Acceso indexado a la hoja. |
| `textById(id)` | Búsqueda inversa: dado un id de control (columna C), devuelve su texto (columna A). |
| `buildFromTemplate(template)` | Intérprete de la plantilla. |
| `checkRequired(ids, {highlight})` | Validación de obligatorios con resaltado temporal. |

### 8.3 Gramática de la plantilla

La plantilla es una cadena de **tokens separados por `;`** (los `;` dentro de paréntesis no separan). Cada token se resuelve a una cadena; los vacíos se descartan y el resto se une con espacios.

| Token | Semántica |
|---|---|
| `(fila,col)` | Texto literal de esa celda del CSV |
| `id=controlId` | Valor actual de ese control del DOM |
| `funcion_selector(id=SEL; filaIA; filaEtiquetaManual; id=CAMPO)` | Si el selector está en modo "generado por la IA" → `cell(filaIA,1)`. Si está en manual → `cell(filaEtiquetaManual,1)` + valor del campo manual. |
| `formula_concrecion((f,c); (f,c))` | Concatena competencias + descriptores asociados + *etiqueta* + criterios + *etiqueta* + saberes seleccionados |
| `formula_sd_contenidos()` | Si `#sd-contenidos-check` está marcado → `cell(545,1)` + el textarea |
| `formula_secuenciacion(id=MODO; filaIA; (fEtq;id=SES;fEtq;id=ACT;fCierre))` | Modo IA → fragmento genérico; modo manual → etiquetas + números de sesiones y actividades |
| `formula_epd(id=MODO; filaIA; (id=c1;…;id=c5))` | Evaluación de la práctica docente: modo IA o lista de ítems marcados |
| `formula_alumno("PT"\|"AL"\|"ACS")` | Itera todos los bloques de alumno de ese tipo; por cada uno vuelca siglas, sesiones, déficit, curso adaptado, temática y **los objetivos marcados, agrupados jerárquicamente** (Área → Ámbito → Bloque → Objetivo) para no repetir prefijos |

Los objetivos marcados se resuelven así: se normaliza el id del checkbox (`alumno-pt-3-area-1-bloque-2-obj-1` → `alumno-pt-{{id}}-area-1-bloque-2-obj-1`), se busca en la columna C del CSV y se recupera el literal de la columna A. Por eso el prompt final contiene el texto oficial del objetivo ("2.1. Memoria de trabajo (u operativa)") y no un código.

### 8.4 Variación por materia

`getMateriaActualKey()` normaliza el nombre de la materia seleccionada (minúsculas, sin acentos) a una de cuatro claves, y `PROMPT_IDS_BY_MATERIA` asigna tres filas del CSV a cada una:

| Clave | ID_A (rol docente + marco legal) | ID_B (temporalización) | ID_C (bloque de instrucciones de actividades) |
|---|---|---|---|
| `matematicas` | 981 | 982 | **1892** |
| `ef` (Educación Física) | 981 | 982 | **2362** |
| `infantil` | **1** | **13** | **549** |
| `resto` | 981 | 982 | 549 |

Es decir: Matemáticas y Educación Física reciben **instrucciones didácticas específicas** (razonamiento matemático, actividad motriz), e Infantil recibe un **preámbulo completo distinto** (rol de maestro de Infantil, temporalización propia). El resto comparte plantilla.

### 8.5 Plantilla completa del prompt de SdA

Reconstruida literalmente desde `buildPromptConMateria()`:

```
(5402,1); (ID_A,1); (2,1); (3,1);
id=selector-cursos;
funcion_selector(id=selector-titulo; 5; 6; id=campo-titulo-manual);
(7,1); (8,1); id=contexto-localidad;
(9,1); id=contexto-alumnado;
(11,1);
funcion_selector(id=selector-justificacion; 11; 10; id=campo-justificacion-manual);
funcion_selector(id=selector-temporalizacion; ID_B; 14; id=campo-temporalizacion-manual);
(15,1); id=selector-materias; (983,1); (17,1);
formula_concrecion((30,1);(85,1));
(544,1); formula_sd_contenidos();
(546,1); funcion_selector(id=sd-producto-final-modo; 547; 548; id=sd-producto-final-texto);
(ID_C,1);
(550,1); (551,1); (552,1); formula_secuenciacion(id=sd-b1-modo;553;(554;id=sd-b1-sesiones;555;id=sd-b1-actividades;556));
(557,1); (558,1);            formula_secuenciacion(id=sd-b2-modo;559;(560;id=sd-b2-sesiones;561;id=sd-b2-actividades;562));
(563,1); (564,1);            formula_secuenciacion(id=sd-b3-modo;565;(566;id=sd-b3-sesiones;567;id=sd-b3-actividades;568));
(569,1); (570,1);            formula_secuenciacion(id=sd-b4-modo;571;(572;id=sd-b4-sesiones;573;id=sd-b4-actividades;574));
(575,1); (576,1);            formula_secuenciacion(id=sd-b5-modo;577;(578;id=sd-b5-sesiones;579;id=sd-b5-actividades;580));
(581,1); (582,1);            formula_secuenciacion(id=sd-b6-modo;583;(584;id=sd-b6-sesiones;585;id=sd-b6-actividades;586));
(587,1); (588,1); formula_epd(id=sd-practica-modo;589;(id=sd-practica-c1;…;id=sd-practica-c5));
(595,1); (596,1); formula_alumno("PT");
(604,1); formula_alumno("AL");
(611,1); formula_alumno("ACS");
(614,1)
```

Correspondencia de las filas estructurales clave:

| Fila | Texto (inicio) |
|---|---|
| 5402 | *Lee el documento adjunto y realiza el desarrollo completo de todo lo que te pide* |
| 1 | *Eres un experto maestro de **Educación Infantil** en Andalucía…* |
| 981 | *Eres un experto maestro de **Educación Primaria** en Andalucía…* |
| 982 | *Selecciona un número apropiado de sesiones para la Temporalización (mínimo 20 sesiones).* |
| 544 | `SECUENCIACIÓN DIDÁCTICA` |
| 546 | *Crea un reto final. Recuerda que debe implicar una resolución creativa y co…* |
| 547 / 548 | *Selecciona un reto/producto final adecuado…* / *Usa este Producto final:* |
| 549 / 1892 / 2362 | *Para poder lograr esta propuesta, vamos a diseñar en este caso las actividades relativas a…* (genérico / Matemáticas / EF) |
| 587 | `EVALUACIÓN DE LA PRÁCTICA DOCENTE` |
| 588 / 589 | *Como evaluadores de la práctica docente (solo dame los ítems…)* / *Selecciona los que consideres más oportunos…* |
| 595 | `Programa Específico` + *Previamente a realizar la SdA, diseña los programas específicos…* |
| 596 / 604 | `PROGRAMA ESPECÍFICO PT` / `PROGRAMA ESPECÍFICO AL` |
| 611 | `ADAPTACIÓN CURRICULAR SIGNIFICATIVA` |
| 614 | *Adapta los elementos curriculares de la SdA (Competencias específicas, Criterios…)* |

---

## 9. Contenido del prompt generado

Prompt de referencia capturado en ejecución real (3.º Primaria · Matemáticas · sin PT/AL/ACS): **25.947 caracteres, 116 líneas**. Su estructura:

### 9.1 Encabezado y marco normativo

> *"Eres un experto maestro de Educación Primaria en Andalucía (España) en el diseño de Situaciones de Aprendizaje (SdA) con conocimiento avanzado de la legislación educativa LOMLOE, 2020 […] y en la Orden de 30 de mayo de 2023 de Andalucía […]. Siguiendo esta legislación, ayúdame a diseñar una Situación de Aprendizaje teniendo en cuenta la metodología DUA versión 3.0 […]."*

El prompt incorpora **enlaces literales** al BOE (BOE-A-2020-17264), al BOJA (BOJA23-104-00208-9731-01), a las *UDL Guidelines 3.0* de CAST en español y a los ODS del PNUD. Además:

- *"Elabora un único documento que combine programas específicos (si los hay), SdA y adaptación curricular significativa (si las hay), en este orden."*
- *"Descríbelo para maestros con un nivel avanzado y tómate el tiempo necesario (prefiero que razones y tardes un poco más…)."*
- Instrucción de **integrar actividades multimodales** (papel y digital).

### 9.2 Bloques del documento pedido

1. **IDENTIFICACIÓN/PARTICIPANTES** — curso, título, contexto (localidad y alumnado), justificación (máx. 1000 caracteres, ligada a temática, contexto, competencias, descriptores y ODS), temporalización (mín. 20 sesiones), materia.
2. **CONCRECIÓN CURRICULAR** — se vuelcan íntegros los textos oficiales de las competencias específicas seleccionadas (con su etiqueta y su código `MAT.3.1.`…), los descriptores operativos asociados (sólo nomenclatura), los criterios de evaluación y los saberes básicos.
3. **SECUENCIACIÓN DIDÁCTICA** — contenidos, producto final/reto, y las seis fases con su número de sesiones y actividades.
4. **EVALUACIÓN DE LA PRÁCTICA DOCENTE** — los ítems seleccionados.
5. **PROGRAMAS ESPECÍFICOS PT / AL** y **ACS** cuando existen.

### 9.3 Ficha obligatoria por actividad

El prompt exige, para **cada** actividad de **cada** fase:

- Título de la actividad
- Tipo de actividad (fase a la que pertenece)
- Abreviatura (máximo 7 caracteres)
- Orden de presentación
- Descripción completa
- Temporalización (nº de sesiones)
- Recursos
- **Trazabilidad** (tipo de evidencia)
- Criterios de evaluación asociados
- **Ejercicios**, desglosados sesión a sesión (`Sesión 1: a) b) c)…`)
- **Metodologías** aplicadas, de un catálogo cerrado:
  - a) Rutinas de pensamiento (puntos cardinales, 3-2-1 puente…)
  - b) Destrezas de pensamiento (ideas detalladas, analogías…)
  - c) Estructuras cooperativas
  - d) Técnicas de aprendizaje activo (gamificación, aprendizaje basado en…)
  - e) Pedagogías ágiles en el emprendimiento (kanban, paladar…)
  - f) **DUA** — con tres sub-campos obligatorios: *Pauta/s DUA aplicada*, *Estrategia aplicada*, *Herramienta digital o IA utilizada*

### 9.4 Guía pedagógica por fase

El prompt describe la intención de cada fase con un vocabulario propio, en mayúsculas:

| Fase | Verbo rector | Orientación incluida en el prompt |
|---|---|---|
| Motivación | **PROVOCAR** | curiosidad, emoción, captar atención, por qué y para qué; preguntas, vídeos, imágenes, estrategias motivacionales |
| Activación | **RECORDAR** | evocar conocimientos previos; predicciones; eliminar falsas creencias mediante ensayo-error |
| Exploración | **EXPERIMENTAR** | de ideas previas a respuestas; visitas, excursiones, encuestas, pequeños desafíos, investigaciones en distintos entornos |
| Estructuración | **INSTRUIR** | explicar, nuevos aprendizajes; análisis tras la exploración |
| Aplicación | **REALIZAR** | verificar lo aprendido, resolver el reto; conexiones con la vida real |
| Conclusión | **COMPROBAR** | valorar el proceso; recolectar datos, portfolio |

### 9.5 Bloque de Programas Específicos (cuando hay alumnado PT/AL)

Se antepone al resto del documento. Instruye al modelo a *"Actuar como docente experto de la especialidad de Audición y Lenguaje / Pedagogía Terapéutica"* y fija:

- **Propósito y objetivos** — programas específicos de alta calidad, actividades adaptadas al nivel indicado, justificación y temporalización detalladas, concreción curricular conforme a la **Instrucción de la Consejería**, vinculación con competencias clave, atención a la diversidad y DUA.
- **Metodologías activas** de catálogo: ABP (problemas), ABP (proyectos), gamificación, aprendizaje-servicio.
- **Temporalización**: 10–12 sesiones (SdA) / 10–20 sesiones (programa específico).
- **Estructura obligatoria de cada programa**: Curso y título · Alumnado destinatario (siglas) · Justificación · Temporalización · **Objetivos** (escritos de forma literal, con área, bloque y objetivo) · **Indicadores de evaluación** vinculados a los objetivos · **Contenidos** · **Actividades y tareas** (mínimo tres actividades distintas por sesión, con recursos) · **Competencias clave** · **Evaluación**.
- **Perfiles de alumnado**: el prompt incluye **enlaces externos** con las características de TEL, discapacidad intelectual, TEA, TDAH y dislexia (dominios `diogeneslogopeda.com`, `gobiernodecanarias.org`, `psicolink.es` y dos ficheros en `drive.google.com`).

> **Observación crítica.** Esos enlaces externos son dependencias no gobernadas: dos apuntan a Google Drive personal y otros a blogs privados. Si desaparecen o cambian, la instrucción degrada en silencio. Para un servicio público esto debería sustituirse por documentación alojada en dominio institucional.

---

## 10. Módulos de Tareas Docentes

Tres generadores de prompt mucho más ligeros, sin currículo ni API: formulario plano + casillas que activan bloques condicionales del CSV. Comparten `PromptEngine` (cargan el CSV con *cache-busting* por marca de tiempo) y el patrón `build_prompt_*()` → `prompt_tareas_descargar(pagina)`.

### 10.1 Actas (`/generador/actas`)

Datos base: **Centro** (`acta-centro`) · **Fecha** (`acta-fecha`, formato *Ej. 17/10/2025*) · **Modalidad** (`acta-modalidad`).

Cuatro tipos de acta, activables de forma **independiente y acumulable** mediante casilla con panel plegable:

| Tipo | Casilla | Campos del panel |
|---|---|---|
| Tutoría con familia | `actas-tutoria` | Curso/Unidad · Tutor/a · Familia o representante |
| Equipo docente | `actas-equipo` | Curso/Unidad · Tutor · Docente de Lengua · Docente de Matemáticas · Orientador/a |
| Equipo de ciclo | `actas-ciclo` | Nombre del equipo de ciclo · Asistentes |
| Sesión de evaluación | `actas-sesion` | Curso/Unidad · Convocatoria (*Primera / Segunda / Extraordinaria*) |

Filas del CSV implicadas: cabecera `5402, 5354, 5355 (centro), 5356 (fecha), 5357 (modalidad)`; tutoría `5358–5363`; equipo docente `5364, 5359, 5360, 5361, 5365…`; y las correspondientes de ciclo y sesión.

> El bloque de "Equipo docente" tiene los docentes **cableados a Lengua y Matemáticas**. No es extensible desde la interfaz.

### 10.2 Actividades (`/generador/actividades`)

Campos: Etapa · Curso/Unidad · Área o materia · Temática · Criterios · Nº de sesiones · Notas ACNEAE · Notas ACS.
Dos modificadores por casilla: **Actividades evaluables** (`actividades-evaluables`) y **Producto final** (`actividades-producto-final`), cada uno de los cuales inserta dos filas adicionales del CSV.

Todo es texto libre: este módulo no está conectado al currículo oficial.

### 10.3 Instrumentos de evaluación (`/generador/instrumentos-evaluacion`)

Campos: Curso/Unidad · Área o materia · Situación de aprendizaje · Criterios · Descripción de la actividad.
Tres instrumentos activables de forma acumulable: **Lista de cotejo** · **Rúbrica analítica** · **Rúbrica holística**. Cada uno inserta dos filas del CSV.

### 10.4 Limitación común

Existe la función `prompt_tareas_gemini(pagina)`, pero depende de `window.callGemini`, **que no está definida en estas páginas**. En caso de invocarse cae a un `console.log` y un `alert("Gemini respondió. Revisa la consola…")`. En la práctica, los tres módulos de tareas docentes **sólo permiten descargar el prompt**; no hay generación directa.

---

## 11. Flujos completos

### 11.1 Flujo principal — SdA con generación directa

```
1. Autenticación (Spring Security) → cabecera con nombre del docente
2. Selecciona CURSO           → GET /api/cursos (ya cacheado) → GET /api/materias-curso/{id}
                              → GET /api/descriptores-curso/{id}
3. Selecciona MATERIA         → GET /api/competencias-especificas-materia/{id}
                              → GET /api/saberes-materia/{id}
4. Título / Justificación / Temporalización → IA o manual
5. Contexto (localidad + alumnado)          [OBLIGATORIO]
6. (Opcional) Añade alumnado PT / AL        → marca objetivos del árbol
   (Opcional) Añade alumnado ACS            → siglas + curso
7. Concreción curricular:
     mueve COMPETENCIAS → dispara GET /api/criterios-in-competencias-especificas/{ids}
     mueve CRITERIOS    → arrastra automáticamente los SABERES vinculados
     ajusta SABERES manualmente
8. Secuenciación: contenidos, producto final, 6 fases (IA o sesiones+actividades)
9. Evaluación de la práctica docente: IA o 5 ítems
10. "LANZAR EN GEMINI DIRECTAMENTE"
      → modal de advertencia de pop-ups → Continuar
      → onGenerarPromptClick(): valida REQUIRED_FIELDS
           · si falta algo → modal de errores agrupado por módulo, fin
      → PromptEngine.loadCSV() si no está cargado
      → buildPromptConMateria() → buildFromTemplate() → prompt (~26 KB)
      → POST ./generar-html {promptText}
      → modal "Generando Contenido…" con contador MM:SS, timeout 300 s
      → respuesta HTML → window.open('', '_blank') → document.write
```

### 11.2 Flujo alternativo — descarga del prompt

Idéntico hasta el paso 9; luego `descargarPrompt()` → validación → generación → descarga de `.txt` con nombre sellado por fecha/hora. El docente lo pega en el LLM de su elección. El prompt empieza por *"Lee el documento adjunto…"*, lo que sugiere que el flujo previsto incluye **adjuntar documentación de apoyo** en la conversación con el modelo.

### 11.3 Flujo de tareas docentes

```
Selecciona módulo (Actas / Actividades / Instrumentos)
  → rellena campos base
  → activa casillas de los sub-bloques que necesita (acumulables)
  → "DESCARGAR PROMPT PARA IA"
  → build_prompt_*() concatena filas del CSV + valores → .txt
```

---

## 12. Hallazgos, deuda técnica y riesgos

### 12.1 Aciertos de diseño

| # | Hallazgo |
|---|---|
| 1 | **Separación contenido/código.** Todo el texto pedagógico vive en un CSV editable por perfiles no técnicos. Un asesor de formación puede ajustar el prompt sin tocar JavaScript. |
| 2 | **Currículo oficial como fuente de verdad.** Las competencias, criterios y saberes llegan de base de datos con su codificación oficial, no del CSV ni del modelo. Elimina la alucinación curricular, que es el fallo más grave que puede tener una herramienta así. |
| 3 | **Arrastre automático de saberes** respetando las decisiones manuales del docente (`_movidoAutomaticamente`). |
| 4 | **Clave de Gemini en servidor.** Ninguna credencial de IA se expone al navegador. |
| 5 | **Minimización por diseño** en la identificación del alumnado (siglas, no nombres). |
| 6 | **Rangos de sesiones que codifican criterio pedagógico** (fase 4 de 10–20 sesiones, fase 5 con actividad única). |
| 7 | **`PromptEngine` desacoplado del DOM** mediante *hooks*: reutilizable en los seis módulos. |

### 12.2 Deuda técnica

| # | Hallazgo | Impacto |
|---|---|---|
| 1 | `assets/json/fragmentos-prompt.json` y `data/concrecion-curricular.json` devuelven **500**; `window.BASE_URL` nunca se define. Código muerto en `generador.js`. | Bajo · ruido en consola |
| 2 | `concrecion-curricular.json` desplegado contiene **datos de relleno** ("Descripción detallada de lo que implica esta competencia"). Se usa para el mapeo competencia→descriptor. | **Medio** · el mapeo de descriptores puede estar incompleto o desalineado con los datos reales |
| 3 | El CSV tiene **~7.000 filas vacías** de 12.501 y pesa 2,6 MB, que se descargan íntegras en cada sesión. | Medio · rendimiento, especialmente en centros con conectividad limitada |
| 4 | Las opciones de `selector-cursos` usan el **nombre del curso como `value`**, no el `id`. Cualquier cambio de literal rompe la aplicación. | Medio · fragilidad |
| 5 | Duplicados exactos en `/api/saberes-materia` (al menos 4 en Matemáticas de 3.º). | Medio · el docente ve ítems repetidos y puede enviarlos duplicados al prompt |
| 6 | Comentario "Timeout de 30 segundos" sobre `TIMEOUT_MS = 300000`. | Bajo |
| 7 | `generarYDescargarSdA()` (DOCX) implementado pero **sin botón** que lo invoque. | Bajo · funcionalidad latente sin exponer |
| 8 | `prompt_tareas_gemini()` depende de `window.callGemini`, inexistente en esas páginas → cae a `alert` + consola. | **Medio** · funcionalidad rota si se llegara a exponer |
| 9 | Las validaciones de concreción curricular están **comentadas**: se puede generar un prompt sin competencias, criterios ni saberes. | **Alto** · produce SdA sin anclaje curricular |
| 10 | Rutas `/generador/infantil`, `/primaria` y `/eso` accesibles pero **no enlazadas** en el menú. | Medio · funcionalidad completa e invisible para el usuario |
| 11 | Redundancia en la taxonomía AL: el "Área Autonomía personal" duplica los bloques del "Área Desarrollo social y emocional". | Bajo · confunde al usuario |
| 12 | Serialización JPA sin DTO: cada criterio arrastra su competencia, su materia-curso y su curso completos. Respuestas mucho más pesadas de lo necesario. | Medio · ancho de banda |
| 13 | Módulos de Tareas Docentes con campos **cableados** (docente de Lengua, docente de Matemáticas) y sin conexión al currículo. | Medio · poco extensible |
| 14 | **Código legacy de llamada directa a Gemini desde el navegador.** `generador.js` conserva `enviarAGemini()` y `enviarAGeminiORI()`, que hacen `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent` desde el cliente con `const apiKey = "API_KEY"` (marcador de posición — **no hay ninguna clave real expuesta**, se verificó que el *bundle* no contiene literales tipo `AIza…`). Dependen además de `window.BASE_URL` y `data/fragmentos-prompt.json`, ambos inexistentes, por lo que el código es inalcanzable. | Medio · debe eliminarse: es un patrón peligroso a la vista de cualquiera que lea el fichero, y una regresión futura podría rellenar esa constante |
| 15 | Restos de mojibake en el propio código fuente (`IDENTIFICACIÃ“N`, emojis corruptos en `console.log`): el fichero se editó con codificación inconsistente. | Bajo |

### 12.3 Riesgos de cumplimiento y gobernanza

> Lo que sigue es orientativo y debe ser validado por el DPO y el equipo jurídico de la Consejería antes de cualquier decisión.

| # | Riesgo | Comentario |
|---|---|---|
| 1 | **Datos de salud de menores en texto libre.** El campo "Déficit/dificultad" de PT/AL invita a escribir diagnósticos (TEA, TDAH, dislexia, TEL, discapacidad intelectual, todos ellos citados en el propio prompt). Junto con las siglas, el curso y el centro, la reidentificación es plausible en un aula concreta. Ese contenido se transmite a un **proveedor de IA de terceros**. | Requiere base jurídica explícita, EIPD (evaluación de impacto), y verificación del acuerdo de encargo de tratamiento con el proveedor del modelo. Es el punto más sensible de toda la herramienta. |
| 2 | **Ausencia de aviso de tratamiento en el punto de entrada de datos.** La única advertencia visible antes de llamar a la IA es sobre **pop-ups**, no sobre el envío de datos a un tercero. | Recomendable un aviso explícito en los bloques PT/AL/ACS. |
| 3 | **Dependencias externas no gobernadas** dentro del prompt: dos ficheros en `drive.google.com`, y dominios privados (`diogeneslogopeda.com`, `psicolink.es`). | Sustituir por documentación institucional. |
| 4 | **Sin trazabilidad visible** del prompt enviado ni del resultado. No hay registro accesible al docente ni versionado de las SdA generadas. | Relevante para ENS y para auditoría de uso de IA. |
| 5 | **Sin descargo de responsabilidad sobre el resultado.** El documento generado por IA no lleva marca de origen ni advertencia de revisión obligatoria por el docente. | Recomendable por el AI Act (obligaciones de transparencia) y por prudencia pedagógica. |
| 6 | **Sin control de cuota ni de coste.** Nada limita el número de llamadas a la API de Gemini por usuario. | Riesgo operativo y presupuestario. |

### 12.4 Oportunidades de evolución

1. **Persistencia.** Hoy no se guarda nada del trabajo del docente: `sessionStorage` se usa únicamente para tres banderas de interfaz (`KEY_STATE` y `KEY_COUNT` del panel de descriptores, y `demoWarningShown`), y no hay `localStorage` ni ningún endpoint de guardado. Refrescar la página pierde el formulario entero. Guardar borradores por docente sería la mejora de mayor impacto percibido.
2. **Biblioteca de SdA.** Compartir y reutilizar situaciones de aprendizaje entre centros multiplicaría el valor de la herramienta.
3. **Migrar el CSV a base de datos** con interfaz de edición para asesores, versionado y publicación controlada de plantillas de prompt.
4. **Exponer el DOCX** (ya implementado) y añadir exportación a la plantilla oficial de programación.
5. **Reactivar las validaciones de concreción** y añadir avisos de coherencia (p. ej. criterios sin saberes asociados).
6. **DTOs en la API** y paginación/deduplicación de saberes.
7. **Enlazar en el menú** los generadores por etapa separada, o retirarlos si el combinado los sustituye.
8. **Registro de auditoría** de prompts y resultados, con retención definida.

---

## 13. Anexos

### 13.1 Inventario de identificadores del formulario de SdA

```
selector-cursos, selector-materias
selector-titulo           / campo-titulo-manual
contexto-localidad, contexto-alumnado
selector-justificacion    / campo-justificacion-manual
selector-temporalizacion  / campo-temporalizacion-manual

contenedor-alumnos-pt, contenedor-alumnos-al, contenedor-alumnos-acs
alumno-{pt|al}-{n}-{siglas|sesiones|deficit|curso-adaptado|tematica}
alumno-{pt|al}-{n}-area-{A}[-amb-{X}]-bloque-{B}-obj-{O}
alumno-{pt|al}-{n}-area-{A}-master , -area-{A}-bloque-{B}-master

competencias-disponibles / competencias-autorizadas
criterios-disponibles    / criterios-autorizados
saberes-disponibles      / saberes-autorizados
btn-descriptores

sd-contenidos, sd-contenidos-check, sd-contenidos-texto
sd-producto-final, sd-producto-final-modo, sd-producto-final-texto
sd-secuenciacion-header, sd-secuenciacion-titulo, sd-secuenciacion-grid
sd-b{1..6}-modo, sd-b{1..6}-sesiones, sd-b{1..6}-actividades
sd-practica-modo, sd-practica-c{1..5}

confirmModal, logoutForm
```

### 13.2 Funciones globales de `generador.js` (65 declaradas)

`mostrarError` · `cargarListaMaterias` · `cargarListaCompetenciasEspecificas` · `cargarListaSaberes` · `cargarListaDescriptores` · `llenarSelector` · `configurarEventos` · `waitReady` · `setState` · `getState` · `setPrevCount` · `getPrevCount` · `countCMP` · `applyState` · `reapply` · `step` · `attachClick` · `onClick` · `toggleBloqueEspecifico` · `agregarAlumno` · `llenarSelectorAlumno` · `generarAreasEspecificas` · `generarAreasPT` · `generarAreasAL` · `ajustarAltura` · `setupAreaMasterCheckboxes` · `setupAreasFixed` · `refreshAmbito` · `refreshAreaState` · `toggleBloqueACS` · `agregarAlumnoACS` · `eliminarAlumno` · `mostrarConfirmacionEliminar` · `cargarDatosConcrecion` · `filtrarCompetenciasPorCursoYMateria` · `configurarObservadoresCursoMateria` · `getCMPSeleccionadasRobusto` · `renderDescriptores` · `actualizarListas` · `crearElementoLista` · `filtrarCriterios` · `filtrarSaberes` · `moverSeleccionados` · `moverTodos` · `verificarSaberes` · `actualizarContadores` · `obtenerDatosSeleccionados` · `findConcrecionBlock` · `findContentEl` · `ensureGate` · `findBlockByTitle` · `configNumero` · `mkRow` · `findProgramaEspecificoScope` · `ensureInfoModal` · `postFormateoPT` · `enviarAGemini` · `descargarTexto` · `enviarAGeminiORI`

### 13.3 Configuración de un módulo generador (ejemplo real)

```js
const educacionInfantilYPrimaria = {
  "cursos": ["Tres Años", "Cuatro Años", "Cinco Años",
             "1º Educación Primaria", ..., "6º Educación Primaria"],
  "cursos_programa_especifico": [ /* mismo listado */ ],
  "justificacion":    ["Generado automáticamente por la IA", "Introducir manualmente"],
  "materias":         [],   // se rellena por API
  "temporalizacion":  ["Generado automáticamente por la IA", "Introducir manualmente"],
  "titulo":           ["Generado automáticamente por la IA", "Introducir manualmente"]
};
datosPrincipales = educacionInfantilYPrimaria;
```

Añadir una etapa nueva es, literalmente, crear un fichero con esta forma, una ruta y una vista que lo incluya.

---

## 14. Valoración final

SDA-IA es, en el fondo, **un compilador de prompts con un modelo de datos curricular detrás**. Esa es la decisión de arquitectura correcta para este problema: el conocimiento normativo y pedagógico está fuera del modelo de lenguaje, en datos gobernables, y el LLM sólo aporta redacción. Un docente obtiene en minutos un documento que le costaría horas, y lo obtiene con la codificación oficial andaluza intacta.

Las debilidades son de madurez, no de concepto: falta persistencia, falta trazabilidad, hay código muerto y validaciones desactivadas, y el tratamiento de datos de alumnado con necesidades específicas necesita un marco de cumplimiento explícito antes de escalar. Ninguna de ellas invalida el enfoque; todas son abordables sin rediseñar.

---

*Documento elaborado por ingeniería inversa de la aplicación en producción, 30 de agosto de 2026. No incluye datos personales de usuarios ni de alumnado. Las valoraciones de cumplimiento normativo son orientativas y requieren validación por el DPO y el equipo jurídico correspondiente.*
