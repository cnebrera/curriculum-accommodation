# El escenario — una PT, un trimestre, Rampa

> **Qué es este documento.** La historia completa de uso contra la que se revisa
> toda especificación, y el guion de la observación de Fase 0. Si una spec no se
> puede señalar desde un momento de esta historia, hay que preguntarse para quién
> es. Si un momento de esta historia no tiene spec, ese es el siguiente trabajo.
>
> Escrito 2026-08-28, después de la revisión especificación↔problema. Marta es un
> personaje compuesto, construido desde `docs/adoption-risks.md`; no es ninguna
> maestra real.

## Quién es y qué quiere

Marta es PT en un colegio público. Tiene 24 alumnos con necesidades repartidos en
varios grupos, un aula de apoyo, y huecos de 45 minutos entre clases. Nunca ha
usado una IA más allá de haber oído hablar de ChatGPT. El portátil es del centro.
Imprime en blanco y negro en la fotocopiadora del pasillo.

Lo que quiere no es "usar IA". Es:

1. **Recuperar sus tardes de domingo.** Adaptar una ficha a mano son 40-60
   minutos; tiene varias por semana.
2. **Material que firmaría con su nombre.** Un dato inventado o un término
   curricular desaparecido y no vuelve a fiarse — no hay segunda primera
   impresión.
3. **Exámenes que no certifiquen algo falso.** Un examen adaptado que además es
   más fácil es otra prueba, y lo sabe mejor que nadie.
4. **No repetirse.** Que lo que corrige una semana no vuelva mal la siguiente, y
   que lo que sabe de cada niño no muera cada junio.
5. **No meterse en un lío.** Son datos de salud de menores. Necesita poder
   explicárselo al equipo directivo en una página.

Lo que no quiere ver, nunca: "IR", "ejes", "corpus", "tokens", "prompt".

---

## Los momentos

Cada momento nombra la especificación que lo cubre y el criterio que lo mide.
**La Fase 0 se juega entera en los momentos 0 a 4.**

### 0 · Domingo por la tarde: la instalación

Una compañera se lo ha enseñado. Descarga, instala, y en tres pasos que puede
interrumpir y retomar: dónde guardar sus cosas (acepta la carpeta propuesta),
conectar su servicio de IA, y su primer alumno, descrito con lo que ve en clase,
sin diagnóstico y sin códigos.

El paso de conectar *(actualizado 2026-08-28 con la spec 009)* le hace **una sola
pregunta**: «¿puedes usar una tarjeta para esto?». Contesta que no —en su centro
no dejan— y le sale **un servicio recomendado con el porqué**: «No pide tarjeta y
es gratis, y lee fotos, que es como te llega casi todo». Es una frase que puede
repetirle a la directora, que es la prueba de verdad.

Debajo, plegado, hay «¿te ha dicho tu centro dónde pueden procesarse los datos?».
No lo sabe, y no pasa nada: no cambia la recomendación. Y una línea que no le
promete de más — Rampa cambia los nombres por códigos, pero si en la ficha que
fotografía hay un nombre escrito a mano, ese nombre va dentro de la imagen.

Si quiere, «ver todos y comparar» le da los seis con lo que de verdad decide:
tarjeta, qué hay gratis y con qué límite, coste por ficha, dónde se procesa, qué
dicen sus condiciones sobre entrenar, si lee fotos, y para quién es cada uno.
Cada dato con la fecha en que se comprobó. Ninguno aparece como aprobado ni
certificado por nadie.

Elige, y el paso a paso le dice lo que va a **ver**: «busca el botón azul que dice
*Create API key*». Antes del paso uno, lo que la va a frenar: qué cuenta necesita,
si le pedirán el móvil. Pega la clave. Si se equivoca —pega la página entera, o la
clave de otro servicio— cada error le dice algo distinto y qué hacer, no «clave no
válida». Y «✓ Conectado. Este servicio es gratis dentro de su límite», que sale
del fichero del servicio y no de un tres escrito a mano.

Meses después el plan gratuito se le queda corto. En «Mi servicio de IA» conecta
otro sin perder el que tenía, y cuando cambia a uno que se procesa en otro sitio,
se lo dice una vez —porque ese es el dato por el que preguntó su centro.

Lo que **no** le pregunta en ningún momento: si quiere «modo accesibilidad».
La aplicación ya lee del sistema si tiene el tema oscuro, si ha pedido más
contraste o menos movimiento, y arranca así. Preguntarlo significaría que lo de
por defecto es lo inaccesible, en una herramienta que adapta material para
alumnos con discapacidad.

*Cubierto por:* 006 US1, FR-401…406 · **009 US1…US5** · 010 FR-809/FR-817 ·
*medido por:* SC-401, SC-407, SC-701…SC-706, SC-808.
*Deuda dicha:* el instalador sin firmar avisa en Windows/macOS (R14) — la
validación llevará ese asterisco hasta que haya certificados. Y de los seis
servicios, **ninguno se ha conectado de verdad todavía**: los adaptadores están
probados contra respuestas simuladas, no contra una cuenta real. Está dicho en
`specs/006-desktop-app/validation.md`, no olvidado.

### 1 · Martes, hueco de 45 minutos: la ficha de Hugo

La ficha de naturales de esta semana existe como dos fotos de móvil — el libro
está en la plataforma de la editorial y no se puede exportar. Las arrastra.

La aplicación lee página a página y le enseña **el original al lado de lo que ha
leído**: primero lo que no pudo leer, las descripciones de las imágenes
imprescindibles, y cualquier texto raro que venga en la hoja. Corrige un número
que salió mal y confirma. Sin su confirmación no hay adaptación — un error de
lectura aquí contamina todo lo demás y luego no se nota.

*(Implementado 2026-08-28 con la spec 008.)* Y confirma **página a página**: una
sola confirmación para dos páginas no abre la puerta. Antes de mandar la primera
foto le dice una vez que un nombre escrito a mano en la hoja va dentro de la
imagen y llega al proveedor — Rampa cambia los nombres en todo lo que ella
escribe, pero no puede borrar lo que hay en una foto. Si el móvil le da la foto en
HEIC, no ve ningún error de formato: es lo que su teléfono hace por defecto y ella
no lo eligió.

Si la interrumpen a mitad —y la van a interrumpir— la extracción sigue ahí:
«tenías esto a medias, 1 de 2 páginas confirmadas». Antes de eso, cerrar la
ventana perdía el trabajo y lo que había costado.

Adapta para Hugo (carga cognitiva alta, no arranca sin el primer paso hecho). En
un minuto tiene: las hojas adaptadas —un ejercicio por página, numeración
original intacta— y un informe de ~10 decisiones con su porqué. Lee el informe,
no relee la ficha. Lo que la aplicación no hizo — un bloque que quitó, algo que
necesita decisión suya — va primero.

El informe no es un volcado de texto: cada decisión con su porqué, agrupada, y
lo que necesita criterio suyo arriba. Mientras trabaja, arriba de la hoja hay una
barra que dice **«Borrador · sin revisar — no la entregues todavía»**, con la
trama diagonal a 1:12, la misma pendiente accesible del logotipo. Lo dice con
palabras, no solo con color: la misma hoja fotocopiada en blanco y negro sigue
avisando.

Firma. La marca de BORRADOR desaparece — solo desaparece así, y cambia en
pantalla en el momento. Imprime. El PDF sobrevive a la fotocopiadora en blanco y
negro.

El tutor de Hugo le pide la ficha para tenerla en clase: le reenvía el PDF ya
firmado, que por estar firmado no lleva marca de borrador. *(Un camino mejor que
el correo está registrado como pendiente — adoption-risks §4.10 — no olvidado.)*

*Cubierto por:* **008 (entrada y verificación real, implementada)** · 001/006
(adaptar, informe, firma) · 007 (avisos, procedencia, completitud — FR-512/516/517)
· recetas + `instructions/` · *medido por:* SC-001, SC-002, SC-005, SC-601…606.
*Deuda dicha:* SC-601 y SC-602 necesitan las fotos de los fixtures —impresora y
móvil— y SC-603 necesita cronometrar el recorrido con una clave real. Ninguna
está medida.

### 2 · La misma ficha para Vega

Vega está en el mismo grupo y no ve la pizarra ni la letra pequeña. La ficha ya
está leída y verificada — eso no se repite. Adaptar para Vega es otra pasada
sobre el mismo trabajo: su hoja, su informe, su firma, sin tocar nada de Hugo.

*Cubierto por:* el modelo de datos por (trabajo × alumno) — corregido
2026-08-28, T092b. *El flujo cómodo de grupo (verificar una vez, adaptar N de una
tacada, revisar comparando) es la spec 005, post-Fase 0 (G3).* Hoy son dos
pasadas manuales; mañana una.

### 3 · La corrección que no se repite

En la hoja de Hugo, las casillas de verificación no funcionaron: él las cuenta
como tareas. Lo escribe con sus palabras. La aplicación pregunta lo único que
ella sabe y nadie más: **¿esto es de Hugo, de cómo trabajas tú, o de la regla?**
— sin opción preseleccionada. Es de Hugo; decide guardarlo en «evitar». Rehace
esta ficha ahora mismo con la corrección; la semana que viene sale bien a la
primera.

*Cubierto por:* 003 US1/US2, FR-201…204 · T084-T086 (el cableado que la revisión
encontró roto) · *medido por:* SC-201, SC-202, SC-204 — **SC-204 es la tesis:**
su tiempo por ficha baja entre la semana 1 y la 4.

### 4 · El examen

El control del tema lleva otra vía: se lo leen en voz alta y contesta dictando.
Lo que se evalúa no se toca; ni un ítem menos, ni un ejemplo regalado. Cuando una
adaptación pedida cruzaría esa línea, la aplicación se para y lo dice: esa
decisión es del equipo docente y del expediente, no de una herramienta.

*Cubierto por:* `exam-access-not-difficulty` (guarda que nunca se descarta),
reglas duras 4-5, escalado de adaptación significativa · *medido por:* SC-006,
SC-003.

### 5 · Cada pocas semanas: lo aprendido

La aplicación le propone — nunca aplica sola: «esto de Hugo se ha repetido tres
veces, ¿lo fijo en su perfil?»; «esta nota sobre las recetas, reescrita en
general y sin nada de ningún niño, ¿la mandamos a la comunidad?». Ella confirma
una a una, y ve la versión desidentificada antes de que salga nada.

*Cubierto por:* 003 US3, FR-211/212 · T093 · *medido por:* SC-203, SC-205.

### 6 · Junio: el traspaso

Hugo cambia de centro. Marta genera el paquete: lo que funcionó, lo que hay que
evitar, cada afirmación con fecha y con cómo lo sabe (visto / deducido / se lo
contaron). Lo revisa y quita una entrada antes de que salga. El paquete es prosa
que la maestra receptora puede leer sin ninguna herramienta — y llega como
hipótesis a confirmar, no como sentencia: los niños cambian, a veces
precisamente porque la adaptación funcionó.

*Cubierto por:* 004 (export hoy; import post-Fase 0) · 003 US4.

### 7 · Un alumno se va del todo

La familia pide el borrado. Marta lo ejecuta: la aplicación lista todo lo que va
a eliminar, espera su confirmación, verifica que no queda nada con ese código, y
le dice dos cosas sin que pregunte: las mejoras anónimas ya compartidas no se
retiran (no llevan nada del niño, por construcción) y las copias que hiciera
ella están fuera de su alcance.

*Cubierto por:* 003 US5, FR-215…220 · *medido por:* SC-207, SC-208.

### 8 · El director pregunta

Antes de usarlo con datos reales, el equipo directivo quiere saber qué es esto.
Marta imprime una página: qué datos existen y dónde, qué sale hacia el proveedor
de IA en cada paso y qué no sale nunca, el residuo honesto (una foto con el
nombre escrito llega al proveedor como imagen), y la lista de comprobación para
el DPO.

*Cubierto por:* `docs/proteccion-de-datos.md` (G14) y el mandato de disclosure de
la constitución.

### 9 · Cuando algo falla

Sin wifi, todo menos adaptar sigue funcionando y lo dice. El servicio ocupado no
es culpa suya y lo dice. Una foto oscura se rechaza con «vuelve a hacerla con más
luz», no se lee mal en silencio. Un resultado incompleto no se le enseña: se
reintenta una vez y, si no, error claro con su última versión buena intacta.
Nunca un código de estado, nunca la culpa para ella.

*Cubierto por:* 006 US5 · 007 FR-517 · resiliencia de providers.

---

### 10 · La pantalla, para ella

*(Añadido 2026-08-28 con la spec 010.)*

Marta tiene 52 años y lleva el portátil del carro del aula: 1366×768, y a
última hora de la tarde le cuesta la letra pequeña. En el carril de la izquierda,
debajo del coste, hay un botón que dice **«Aa  Cómo se ve»**. No dice
«preferencias de accesibilidad» ni «escala tipográfica»: dice tamaño de la letra,
colores, más contraste, menos movimiento, y debajo de cada uno para qué sirve.

Pone la letra en «muy grande» y marca «más contraste». No se pierde nada ni se
solapa nada, ni sumándole el zoom del sistema al 200%. Y se queda así la próxima
vez, en este ordenador y solo aquí: sus preferencias no viajan con los alumnos ni
con lo que comparte.

*Cubierto por:* 010 US2/US3, FR-809…FR-821 · *medido por:* SC-801…SC-804,
SC-806. *Sin cerrar:* SC-805 y SC-806 no se pueden medir con un test — hacen
falta los primeros diez segundos de una PT que no sepa dónde mirar.

## Lo que Marta no ve nunca

El IR, los códigos de eje, las recetas seleccionadas, el prompt, los tokens, los
reintentos, la redacción de nombres, WCAG, ni la palabra «contraste 4.5:1». Ve: sus alumnos por su nombre, sus fichas,
sus informes, céntimos, y una carpeta de ficheros legibles que es suya aunque
Rampa desaparezca mañana.

## La foto completa — inventario funcional

*(Añadido 2026-08-28, en el repaso final antes de las clarificaciones.)* Todo lo
que hace una PT, cruzado con dónde está especificado. Cuatro estados posibles, y
ninguno es "sin decidir":

**v1** = en el alcance de la Fase 0 · **dif.** = diferido con spec o gap
numerado · **no-obj.** = no-objetivo registrado con motivo · **fuera** = de otra
herramienta, dicho explícitamente.

| La función de la PT | Estado | Dónde |
|---|---|---|
| Adaptar ficha / lectura / unidad | **v1** | 001, 006, 008, recetas |
| Adaptar examen sin tocar el criterio | **v1** | `exam-access-not-difficulty`, reglas 4-5 |
| Crear material desde objetivos, con ancla | dif. | 002, post-Fase 0 por su propia spec |
| Entrada real: foto, PDF, digital, con verificación | **v1** | 008 |
| Perfil por barreras + calibración de ejes | **v1** | profile-schema, axis-calibration (G2 espera PT) |
| Aplicar el documento oficial de adaptaciones (overlay) | **v1** (a mano) | 003 FR-209; UI diferida (tasks F12) |
| Que las correcciones no se repitan | **v1** | 003, T084-086 |
| Consolidar lo aprendido, con confirmación | dif. | 003 US3, T093 |
| Misma ficha, N alumnos (hojas separadas) | dif. | modelo de datos listo (T092b); flujo = spec 005 (G3) |
| **Una** hoja para un grupo mixto (aula de apoyo, UDL) | **no-obj.** | G17 — vuelve solo si la Fase 0 lo pide |
| Pictogramas / apoyo visual (ARASAAC) | dif. | G16 ampliado — familia + licencia NC por resolver |
| Vía de respuesta (MOT), acceso auditivo (PER-A), REG directo | dif. | G16 — primera contribución natural |
| Salidas: HTML + PDF fotocopiable | **v1** | 006 FR-425/427 |
| Audio, braille-ready, ODT | dif. | G8, deliberado; el IR ya lo permite sin re-adaptar |
| Compartir con el tutor / la familia | **v1** (PDF firmado) | camino mejor: 4.10, registrado |
| Traspaso en junio (export revisado, prosa) | dif. | 004 export; import post-Fase 0 |
| Borrado completo de un alumno | **v1** | 003 US5 |
| Cierre de curso, archivo, roster | dif. | tasks F12 (antes del primer verano) |
| Coste visible y avisado | **v1** | 006 US4, T091/092 |
| Papel para el director/DPO | **v1** | proteccion-de-datos.md (espera DPO) |
| Nombres fuera del modelo (con el residuo de la foto dicho) | **v1** | 006 US2, 008 US4 |
| Material que intenta dar órdenes | **v1** | 007 |
| Sus ficheros suyos, legibles, portables | **v1** | 006 US3 |
| Horarios, actas, evaluación continua, DIAC | **fuera** | V0 "Qué NO es"; Additio/Séneca existen |

La regla de mantenimiento: una función nueva entra en esta tabla **antes** de
entrar en ninguna spec, y una fila nunca se borra — cambia de estado.

## Qué es "funciona", por fases

| Fase | La pregunta | Se responde con |
|---|---|---|
| **Antes de Fase 0** | ¿Cuál es el modelo mínimo que da calidad suficiente? | `cases/002-model-floor/` — la validación corre sobre ese suelo o por encima |
| **Fase 0** | ¿Los momentos 0-4 le sirven a una PT real, sola, con retoques menores? | SC-401/407, SC-001…006, protocolo del quickstart — **la PT está identificada** (2026-08-28) |
| Después | ¿La curva baja? (momento 3 sostenido en el tiempo) | SC-204, cuatro semanas |
| Después | ¿El grupo (momento 2 cómodo), el import del traspaso, audio/braille? | 005, 004-import, G8 |
