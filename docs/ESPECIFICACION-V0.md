# Adaptación curricular asistida — Especificación de alto nivel (v0)

> Estado: **borrador para discusión**. Recoge las decisiones tomadas hasta ahora y fija
> la arquitectura. No es todavía una especificación técnica implementable: al final
> están las preguntas que quedan abiertas.
>
> Nombre del proyecto: pendiente. Se usa *Adapta* como provisional.

---

## 1. Qué es

Un **harness open source**: un repositorio que un maestro de Pedagogía Terapéutica (PT),
un orientador o un tutor clona en su ordenador, abre con **su propio agente de IA**
(Claude Code, Gemini CLI, Codex, Cursor…) y que ya viene preparado con todo lo necesario
para adaptar material didáctico.

El docente aporta tres cosas:

1. **El material** del curso — completo o la parte que toca esta semana.
2. **El perfil del alumno** — sus barreras funcionales.
3. **La guía de adaptaciones**, si el centro tiene una. Si no la hay, el proyecto trae
   recetas propias basadas en las barreras.

El agente devuelve el material adaptado en las modalidades que el alumno necesita, más un
**informe de qué se cambió y por qué**, para que la revisión del docente sea rápida.

### Qué NO es

- **No sustituye al docente.** Genera borradores. La adaptación la valida y firma una
  persona; el objetivo es quitar el 90% del trabajo mecánico, no el criterio profesional.
- **No es un SaaS.** No hay servidor, no hay cuenta, no hay datos de menores en la nube
  de nadie más allá del proveedor de IA que el propio docente ya usa.
- **No es un banco de materiales.** El material del libro de texto nunca entra en el
  repositorio (ver §9.3).
- **No genera el DIAC ni documentación legal.** Adapta material de aula. El documento
  administrativo es otro problema y quizá otra fase.

---

## 2. Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Forma de distribución | Harness: repo + instrucciones + scripts deterministas | Fricción mínima; el docente usa la suscripción de IA que ya tiene |
| Motor de IA | Agnóstico (Claude, Gemini, GPT, Grok…) | El proyecto no gestiona claves ni facturación |
| Entradas | PDF escaneado, fotos de móvil, PDF/DOCX digital, texto pegado | Es lo que realmente circula por un departamento de orientación |
| Salidas | HTML (primario) → PDF, ODT/ODF, texto para braille, **audio** | HTML permite interactividad y es la fuente para el resto; PPTX descartado |
| Alcance | Todas las discapacidades desde el inicio | Requisito explícito; §4 explica cómo se hace viable |
| Datos del alumno | Perfil seudonimizado, siempre local, fuera de git | Art. 9 RGPD: son datos de salud de un menor |
| Aportación de la comunidad | Recetas y perfiles-tipo. **Nunca material** | Copyright (§9.3) |
| App de escritorio | Fase 2, tras validar que la adaptación es buena | No construir producto antes de validar la calidad |

---

## 3. Principios de diseño

1. **El juicio pedagógico va en markdown, no en código.** Una PT con 20 años de aula
   tiene que poder leer una receta, ver que está mal y corregirla en un pull request sin
   saber programar. Si la lógica de adaptación vive en Python, la comunidad no existe.
2. **El código hace solo lo determinista.** Extraer, trocear, renderizar, convertir,
   sintetizar voz, validar accesibilidad. Nada que requiera criterio. Así es testeable y
   no depende del proveedor de IA.
3. **Adaptar el *cómo*, nunca falsear el *qué*.** Simplificar el lenguaje de un enunciado
   sobre la fotosíntesis está bien; cambiar lo que dice sobre la fotosíntesis no.
4. **Una extracción, N salidas.** Ver §4.2. Es la decisión que hace viable cubrir todas
   las discapacidades a la vez.
5. **Barreras funcionales, no etiquetas diagnósticas.** Dos niños con el mismo diagnóstico
   necesitan cosas distintas. Ver §5.
6. **Todo cambio es trazable.** Cada modificación queda anotada con la receta que la
   produjo y la barrera a la que responde. El docente revisa decisiones, no relee el texto.
7. **El borrador se marca como borrador.** El material sale con marca de "no revisado"
   hasta que una persona lo firma.

---

## 4. Arquitectura

### 4.1 Tres capas

```
┌─ Capa de datos locales (nunca en git) ──────────────────────────┐
│  material/    perfiles/    salidas/                             │
└─────────────────────────────────────────────────────────────────┘
           ▲                                        │
           │                                        ▼
┌─ Capa determinista (scripts, sin IA) ───────────────────────────┐
│  extraer · trocear · renderizar · convertir · TTS · validar     │
└─────────────────────────────────────────────────────────────────┘
           ▲                                        │
           │                                        ▼
┌─ Capa de juicio (markdown, leída por el agente) ────────────────┐
│  instrucciones/   recetas/   plantillas/   checklists/          │
│  ← esto es lo que aporta y mejora la comunidad                  │
└─────────────────────────────────────────────────────────────────┘
```

La capa determinista **no llama a ningún modelo**. Todo lo que necesita criterio lo hace el
agente del docente leyendo la capa de juicio. Consecuencias buenas: el proyecto es
agnóstico de proveedor, los scripts se testean sin gastar tokens, y el coste lo asume la
suscripción que el docente ya paga.

### 4.2 El Documento Intermedio Estructurado (DIE)

Es la pieza central. El material original —venga de un escaneo, una foto o un DOCX— se
normaliza **una sola vez** a un formato intermedio: markdown con anotaciones semánticas.

En el DIE está marcado explícitamente qué es cada cosa:

- Qué bloques son **enunciado**, **explicación**, **ejemplo**, **ejercicio**, **examen**.
- Cada ejercicio, con su numeración original, su tipo (respuesta corta, opción múltiple,
  desarrollo, manipulativo) y, si se conoce, el criterio de evaluación al que responde.
- Cada imagen, con su **rol**: decorativa, informativa o imprescindible para resolver la
  tarea — y su descripción textual.
- Las fórmulas, en notación recuperable (LaTeX/MathML), no como imagen.

Sobre el DIE se aplican las adaptaciones, produciendo un **DIE adaptado**. Y desde el DIE
adaptado se renderiza a todas las modalidades que el alumno necesite.

```
  fuentes heterogéneas          una sola comprensión           muchas salidas
 ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
 │ PDF escaneado    │          │                  │   ┌────► │ HTML visual      │
 │ Fotos de móvil   │ ───────► │  DIE  ──►  DIE   │ ──┼────► │ PDF imprimible   │
 │ PDF/DOCX digital │  extraer │       adaptar    │   ├────► │ ODT editable     │
 │ Texto pegado     │          │          adaptado│   ├────► │ Texto p/ braille │
 └──────────────────┘          └──────────────────┘   └────► │ Audio (MP3)      │
                                                             └──────────────────┘
```

**Por qué importa:** el trabajo caro es *entender* el material (¿esto es un ejercicio o un
ejemplo? ¿esta imagen hace falta para responder?). Ese trabajo se paga una vez. Generar la
versión en audio para un alumno ciego, la de alto contraste para uno con baja visión y la
de un ejercicio por página para uno con TDAH son entonces tres renderizados del mismo DIE
adaptado, no tres proyectos distintos. Es lo que permite decir "todas las discapacidades"
sin que el alcance explote.

**El punto de control humano está aquí.** Tras la extracción, el docente verifica que el
DIE es fiel al original. Un error de OCR en el paso 1 contamina las cinco salidas.

---

## 5. El perfil del alumno: barreras, no diagnósticos

El perfil **no** dice "TEA nivel 1" ni "dislexia". Dice qué le cuesta al niño y cómo
responde mejor. Se estructura en ejes, cada uno con nivel 0–3 (0 = sin barrera,
3 = barrera severa o total):

| Eje | Código | Qué captura |
|---|---|---|
| Acceso visual | `PER-V` | Desde baja visión hasta ceguera total |
| Acceso auditivo | `PER-A` | Desde hipoacusia hasta sordera; lengua de signos como L1 |
| Decodificación lectora | `DEC` | Velocidad y precisión al leer, independiente de la comprensión |
| Comprensión lingüística | `LIN` | Vocabulario, sintaxis compleja, lenguaje figurado, inferencias |
| Carga cognitiva | `COG` | Memoria de trabajo, número de elementos simultáneos que tolera |
| Atención | `ATE` | Sostenida, selectiva; tolerancia a distractores en la página |
| Función ejecutiva | `EJE` | Planificar, secuenciar, iniciar la tarea, autorregularse |
| Motricidad y respuesta | `MOT` | Cómo puede responder: escribir, teclear, señalar, dictar |
| Regulación sensorial | `REG` | Saturación por color, densidad, sonido; necesidad de previsibilidad |
| Nivel curricular | `CUR` | Desfase respecto al curso; solo relevante para adaptación significativa |

Además, campos cualitativos: **apoyos que ya funcionan**, **intereses** (una ficha sobre
dinosaurios engancha donde una sobre el comercio medieval no), **detonantes a evitar**, y
**formato de respuesta preferido**.

Seudonimización: el fichero se llama `alumno-A3.yaml`, sin nombre ni apellidos ni
diagnóstico clínico literal. La correspondencia entre el código y el niño la mantiene el
docente fuera del sistema. Lo que viaja al modelo son barreras funcionales, no la
identidad de un menor.

La carpeta `perfiles/` está en `.gitignore` desde el primer commit, y el proyecto incluye
un hook que **bloquea el commit** si detecta que se está intentando subir un perfil o
material. Es un fallo de un solo docente el que rompería la confianza del proyecto entero.

---

## 6. Recetas de adaptación

Una receta es un fichero markdown con front-matter. Es la unidad que aporta la comunidad.

```yaml
---
id: texto-frases-cortas
ejes: [DEC>=2, LIN>=2]          # cuándo aplica
ambito: [explicacion, enunciado] # sobre qué bloques del DIE
conflictos: [texto-literal-examen]
evidencia: "Lectura fácil, UNE 153101:2018"
---
```

El cuerpo contiene: qué hacer, **ejemplos antes/después reales**, y —lo más importante—
**antipatrones**: qué NO hacer. "No sustituyas el término técnico que el alumno tiene que
aprender por un sinónimo fácil; mantenlo y añade la explicación al lado." Los antipatrones
son lo que separa una adaptación buena de una que le roba el currículo al niño.

Familias previstas: lenguaje y legibilidad · estructura y carga · apoyo visual y
pictogramas · acceso no visual · acceso no auditivo · formato de respuesta · exámenes y
evaluación · adaptación significativa.

**Recetas de examen: cuidado especial.** Un examen adaptado que además es más fácil no es
una adaptación, es otra prueba. La regla es preservar el criterio de evaluación y cambiar
solo la vía de acceso y de respuesta. El agente debe señalar explícitamente cuando una
adaptación pedida cruza esa línea.

---

## 7. Flujo de trabajo

Cinco comandos. Cada uno con un punto de revisión humana.

| Paso | Qué hace | El docente… |
|---|---|---|
| `/perfil` | Entrevista al docente y genera o actualiza el perfil por ejes | Confirma que el perfil le suena a su alumno |
| `/ingerir` | Material → DIE. OCR/visión donde haga falta | **Verifica fidelidad al original** |
| `/adaptar` | DIE + perfil + recetas → DIE adaptado + informe | — |
| `/renderizar` | DIE adaptado → HTML, PDF, ODT, texto braille, audio | — |
| `/revisar` | Genera checklist de revisión sobre las decisiones tomadas | **Revisa, corrige y firma** |

El informe de adaptación es tan importante como el material: agrupa los cambios por
decisión ("he partido los 6 ejercicios en 3 fichas de 2 porque `COG=3`"), de modo que el
docente revisa ~15 decisiones en lugar de releer 12 páginas.

---

## 8. Modalidades de salida

| Modalidad | Cómo | Notas |
|---|---|---|
| HTML | Plantilla accesible; tipografía, interlineado, contraste y densidad parametrizados por perfil | Formato primario. Permite interactividad y animación cuando ayuda |
| PDF | HTML → PDF (navegador headless o WeasyPrint) | Para imprimir y llevar al aula |
| ODT / ODF | Vía pandoc | Formato abierto y editable; el docente retoca lo que quiera |
| Texto para braille | Texto plano bien estructurado, sin dependencias visuales, con las imágenes convertidas en descripción | No generamos braille: lo hace la línea o impresora del centro. Opcionalmente liblouis |
| Audio | TTS **offline** (Piper u OS) sobre el DIE adaptado | Offline por RGPD y coste. Incluye ejercicios locutados con pausas para responder |

Nota sobre matemáticas: las fórmulas se guardan en notación recuperable precisamente para
poder locutarlas y llevarlas a braille. Es la parte técnicamente más delicada del proyecto
(ver §11).

---

## 9. Salvaguardas

### 9.1 Pedagógicas
- Nada se da por bueno sin revisión y firma humana. El PDF sale con marca de agua
  "BORRADOR — pendiente de revisión" hasta que se firma.
- El agente no inventa contenido curricular. Si el original no lo dice, la adaptación no
  lo dice.
- Si una adaptación solicitada implica modificar objetivos o criterios de evaluación
  (adaptación **significativa**), el agente lo señala y lo separa: esa decisión es del
  equipo docente y va al DIAC, no la toma una herramienta.

### 9.2 Protección de datos
- Perfiles seudonimizados, locales, fuera de git, con hook de bloqueo.
- El proyecto documenta con claridad qué se envía al proveedor de IA en cada paso, para
  que un centro pueda hacer su propia valoración de riesgo.
- Aviso explícito: el docente debe comprobar la política de su proveedor. No todos los
  planes de todos los proveedores son igual de adecuados para esto.

### 9.3 Copyright
Adaptar una obra para una persona con discapacidad está amparado en España por el
**art. 31 bis TRLPI** y por el **Tratado de Marrakech**; **redistribuir** esa adaptación,
no. De ahí la regla dura del proyecto:

> El material fuente y el material adaptado **nunca** entran en el repositorio. La
> comunidad comparte recetas, perfiles-tipo y plantillas.

---

## 10. Estructura del repositorio

```
adapta/
├─ AGENTS.md               # instrucciones raíz, leídas por cualquier agente
├─ .claude/ .cursor/ …     # adaptadores finos que apuntan a lo mismo
├─ instrucciones/          # el flujo de los 5 comandos, en markdown
├─ recetas/                # ← el corazón; lo que aporta la comunidad
├─ perfiles-tipo/          # perfiles anónimos de ejemplo, para probar sin datos reales
├─ plantillas/             # HTML/CSS accesible, hojas de estilo por perfil
├─ checklists/             # guías de revisión para el docente
├─ scripts/                # capa determinista
├─ casos/                  # material de licencia abierta + salida esperada
├─ perfiles/    (git-ignored)
├─ material/    (git-ignored)
└─ salidas/     (git-ignored)
```

**Agnosticismo real:** las instrucciones y recetas viven una sola vez, en markdown neutro.
`AGENTS.md` es el punto de entrada estándar; los ficheros específicos de cada agente son
punteros de tres líneas, no copias. Se mantiene una matriz de compatibilidad con lo que
se ha probado en cada agente.

**Dependencias:** el docente no debería instalar medio sistema. Los scripts se ejecutan
con un único comando autoinstalable (`uv run`), hay un `doctor` que dice qué falta, y todo
**degrada con gracia**: sin pandoc no hay ODT pero sigue habiendo HTML y PDF; sin TTS no
hay audio pero sí todo lo demás.

---

## 11. Fases

**Fase 0 — Validar que la adaptación es buena** *(lo único que importa ahora)*
Harness mínimo, un perfil real, un tema real, salida HTML + PDF + informe. Un puñado de
recetas de las familias más frecuentes. Criterio de éxito: **una PT real dice que le
ahorra tiempo y que el resultado es utilizable con retoques menores**. Si esto falla, nada
de lo demás importa.

**Fase 1 — Cobertura**
Recetas de todos los ejes. Audio, texto para braille, ODT. Casos de evaluación para que
las contribuciones no degraden la calidad. Documentación para contribuir sin saber
programar.

**Fase 2 — Producto**
App de escritorio, gestión de perfiles con interfaz, biblioteca de recetas navegable,
posible modo API key para procesar por lotes. Solo después de la validación.

---

## 12. Riesgos abiertos

| Riesgo | Gravedad | Mitigación prevista |
|---|---|---|
| OCR de libro de texto con maquetación compleja (columnas, cuadros, viñetas) | **Alta** | Verificación humana obligatoria del DIE; probar con material real desde el día 1 |
| Matemáticas: extracción y locución de fórmulas | **Alta** | Acotar Fase 0 a materias de texto; abordar matemáticas como línea propia |
| Calidad muy desigual entre proveedores de IA | Media | Matriz de compatibilidad honesta; casos de evaluación |
| Alucinación en contenido curricular | Media | Reglas duras en instrucciones + checklist de revisión que lo busca activamente |
| La comunidad no llega y el proyecto lo mantiene una persona | Media | Barrera de contribución en markdown; buscar aliados en asociaciones y facultades de educación |
| Un docente sube material o un perfil por error | Alta si ocurre | `.gitignore` + hook de bloqueo + aviso en el README |

---

## 13. Preguntas abiertas para la siguiente iteración

1. **¿Cerramos la sintaxis exacta del DIE?** Es la decisión técnica de la que cuelga todo
   lo demás.
2. **¿Qué material real usamos para Fase 0?** Hace falta un tema concreto y un perfil
   concreto para no diseñar en el vacío.
3. **¿Tenemos acceso a una PT o un equipo de orientación** dispuesto a probar y criticar?
   Sin eso, validamos a ciegas.
4. **Licencia.** ¿AGPL, MIT, o CC-BY-SA para las recetas y MIT para el código? El material
   pedagógico y el código quizá no quieran la misma licencia.
5. **Idioma del proyecto.** ¿Solo castellano, o desde el principio preparado para catalán,
   euskera, gallego y LATAM? Afecta a cómo se organizan las recetas.
6. **¿Entra el currículo oficial?** Anclar a criterios de evaluación LOMLOE por CCAA es
   valioso pero es un proyecto en sí mismo. Probablemente Fase 1 o 2.
