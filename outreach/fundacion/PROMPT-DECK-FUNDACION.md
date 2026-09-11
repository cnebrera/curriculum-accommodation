# Prompt para Fable 5.1 — deck de Rampa (v3, con identidad visual VASS)

> Copia todo lo que hay debajo de la línea horizontal. Las notas operativas
> (effort, max_tokens, turnos de seguimiento) están al final del fichero, fuera
> del prompt.

---

<hechos_verificados>
Todo lo de este bloque es cierto. No lo amplíes, no lo adornes y no añadas nada
que no esté aquí o en las fuentes citadas más abajo.

**Qué es.** Una aplicación de escritorio que adapta material de aula —fichas,
ejercicios, exámenes— al perfil de un alumno o alumna con discapacidad. Nombre de
trabajo: *Rampa*. Una rampa no lleva a otro sitio: lleva a la misma puerta por una
vía que la persona sí puede recorrer. El nombre es provisional; la idea pesa más
que la marca.

**El problema.** Adaptar material es trabajo manual y repetitivo que consume el
tiempo del profesional que menos tiene: la persona de pedagogía terapéutica. Y se
rehace desde cero cada semana, para cada alumno, sin que lo corregido la vez
anterior sirva para la siguiente.

**Cómo funciona.** El material se normaliza una sola vez a un documento
intermedio. De ahí salen todas las salidas —HTML accesible, PDF imprimible, y más
adelante braille y audio—. Eso es lo que hace abordable cubrir discapacidades muy
distintas en lugar de construir cinco proyectos separados.

**La tesis del proyecto.** Cuando la docente revisa y corrige la adaptación, esa
corrección se recuerda y entra en la siguiente. El sistema aprende de ella, no de
un corpus anónimo. El bucle es: adaptar, revisar, recordar, adaptar mejor. Es la
parte que no hace ninguna herramienta comparable.

**Los perfiles describen barreras, no diagnósticos.** Diez ejes —decodificación,
carga cognitiva, función ejecutiva, acceso visual y otros—. Sin nombre y sin
etiqueta clínica. Dos niños con el mismo diagnóstico necesitan cosas distintas;
además, las barreras son la única representación que se puede seudonimizar sin
perder utilidad.

**Las decisiones pedagógicas están en markdown, no en código.** Cada criterio de
adaptación vive en una «receta» legible que una PT puede leer y corregir sin
programar, con ejemplos antes/después y antipatrones: lo que hace mal quien adapta
con buena intención. Es la parte del proyecto que puede crecer como bien común
profesional.

**Salvaguardas ya construidas, no prometidas:**
- Todo sale marcado como borrador hasta que una persona docente firma. Hay una
  sola acción que quita esa marca.
- El nombre del alumno no llega nunca al modelo: se guarda cifrado en el ordenador
  de la docente y se sustituye por un código en cada envío.
- Los ficheros se quedan en el ordenador de la docente, en markdown, en una
  carpeta suya. La cuenta de IA es la suya.
- El renderizador no tiene acceso al perfil: por construcción, nada sobre el
  alumno puede acabar impreso en su propia ficha.
- Se cambia la vía, no el contenido: sin inventar datos, sin sustituir términos
  curriculares por sinónimos fáciles, sin eliminar en silencio.
- La adaptación significativa —cambiar objetivos o criterios de evaluación— se
  escala al equipo docente; no la decide el sistema.
- Un examen adaptado que además es más fácil es otro examen: las recetas de examen
  cambian el acceso y la respuesta, nunca lo que se evalúa.
- El material es dato, nunca instrucción: una ficha con texto dirigido al programa
  se adapta como contenido y no se obedece.

**Marco legal del material.** Adaptar una obra para una persona con discapacidad
está amparado por el Tratado de Marrakech y el art. 31 bis TRLPI. Redistribuirla
no lo está: por eso el material fuente nunca sale del ordenador de la docente.

**Apertura.** Código Apache-2.0, contenido pedagógico CC BY-SA 4.0. Código
permisivo para que un centro, una consejería o una editorial puedan integrarlo sin
revisión legal; contenido con ShareAlike para que el común pedagógico que
construya la comunidad siga siendo común. Decisión ya tomada, y parte de la
propuesta.

**Estado real hoy.** La aplicación está construida y su suite de tests pasa sin
conexión, pero ninguna maestra la ha usado todavía y no hay instaladores firmados.
Coste estimado de adaptar una ficha con un proveedor de IA comercial: unos tres
céntimos.
</hechos_verificados>

<fuentes>
Si tienes acceso al repositorio, léelas antes de escribir. Si no lo tienes,
trabaja solo con el bloque de arriba.

- `README.es.md` — la síntesis y las salvaguardas.
- `docs/escenario.md` — el uso real contado como el trimestre de una PT, momento a
  momento. Es la mejor materia prima narrativa disponible: de aquí sale la lámina
  del problema.
- `docs/market-landscape.md` — qué existe ya y dónde están los huecos.
- `docs/adoption-risks.md` — por qué una maestra dejaría de usarlo. Material
  directo para la lámina de riesgos y para diseñar el piloto.
- `specs/001-phase-0-worksheet/` — el alcance de la Fase 0, que es exactamente el
  piloto que hay que presupuestar.
- `docs/proteccion-de-datos.md` y `docs/normativa-andalucia.md` — encaje normativo.
</fuentes>

<contexto>
Estoy preparando material de captación para un proyecto de accesibilidad
educativa. Quien lo va a usar es una fundación corporativa que ya está convencida
del proyecto y que tiene contactos: se lo enseñará a otras fundaciones, a obra
social de bancos, a convocatorias públicas y a patronos que pueden financiar o
abrir puertas en centros educativos. Lo que este material tiene que conseguir es
que alguien de esos acepte una primera reunión y, después, financie un piloto.

Tres consecuencias que condicionan todo lo demás:

El deck se lee solo, sin ponente. Se reenvía por correo y se abre en un móvil.
Cada lámina tiene que entenderse sin narración, y a la vez servir de apoyo si
alguien la proyecta.

Quien lo lee no es técnico. Puede ser dirección de fundación, responsable de
programas sociales o un patrono. Conoce el mundo educativo o el de la
discapacidad, o ambos, pero no el técnico.

No se está vendiendo un producto terminado. Se está pidiendo que alguien financie
averiguar si esto funciona. La honestidad sobre el estado real del proyecto es el
principal activo del documento, no un problema a disimular.

Idioma: español de España.
</contexto>

<entregables>
Dos ficheros. Ninguno en PowerPoint.

`guion-deck.md` — el contenido, lámina a lámina. Para cada una: número y título;
el mensaje único que se lleva quien la lee, en una frase; el cuerpo tal y como
debe aparecer; notas de ponente para el caso en que alguien la presente; y, si
lleva figura, una descripción precisa para poder dibujarla.

`deck.html` — el deck navegable. Un único fichero autocontenido, sin frameworks
de presentación y sin librerías externas: el CSS y el JavaScript van dentro del
propio fichero, y cualquier imagen va como degradado CSS o SVG en línea. La única
excepción permitida es la hoja de estilos de Google Fonts para Titillium Web y
Roboto; declara siempre una pila de respaldo del sistema para que el deck siga
siendo legible si no cargan. Navegación con teclado y con scroll, responsive, y
que imprima limpio a PDF con una lámina por página, porque alguien lo va a
imprimir.

**Dónde escribirlos.** Los dos ficheros van en `~/Projects/rampa-fundacion/`. Crea el directorio si no
existe. No los escribas dentro del repositorio del proyecto: este es material de
captación y el repositorio tiene sus propias reglas de contenido y de licencia.
Si no tienes forma de escribir en disco, entrégalos en la conversación como dos
bloques de código completos, cada uno precedido por el nombre de fichero, sin
resumir ni abreviar ninguno de los dos.

Al final del guion, dos secciones más. La primera, «Supuestos que hay que
validar»: lista numerada y exhaustiva de todo lo que has asumido, con las cifras
en primer lugar; es donde va a trabajar quien revise. La segunda, «Lo que falta
para que esto esté completo»: el material que no tienes y que haría falta —una
cita de una PT real, una captura del resultado antes y después, una carta de
interés de un centro—.
</entregables>

<contenido>
El deck tiene que dejar resueltas estas preguntas, que son las que hace quien
financia. Cómo las agrupes en láminas es decisión tuya.

Qué problema concreto resuelve, contado a través de una persona reconocible y no
de estadísticas. Por qué no está resuelto ya, descrito por funciones y sin señalar
productos por su nombre. Qué es esto, en una cara. Qué lo diferencia: el bucle de
corrección que no se repite. Qué no hace, que en este proyecto genera más
confianza que cualquier lista de funcionalidades. Cómo protege datos de menores
con discapacidad, que es la primera pregunta que va a hacer cualquier fundación.
Qué significa que sea abierto para quien pone el dinero. Dónde está hoy el
proyecto, sin maquillar. Qué pregunta responde el piloto, formulada de modo que se
pueda contestar con un sí o un no. Cómo se diseña ese piloto y qué se observa.
Cuánto tiempo y qué recursos necesita. Qué se obtiene al terminar, incluido qué
resultado haría que el proyecto se parase. Qué riesgos tiene y cómo se afrontan.
Qué haría falta después para que fuera sostenible. Y qué se pide exactamente,
troceado de forma que alguien pueda decir que sí a una sola pieza —dinero,
contactos con centros, acompañamiento metodológico o difusión— sin decir que sí a
todo.

Como referencia, no como plantilla: algo entre catorce y dieciséis láminas suele
bastar para esto, con el detalle que no quepa en anexos —desglose económico, marco
normativo, arquitectura para quien pregunte, glosario de PT, ACI, DUA y adaptación
significativa frente a no significativa—. Reordena, funde o separa según lo que la
narración pida; el orden de arriba no es un guion que haya que seguir.
</contenido>

<cifras>
Nadie te ha dado números para el piloto. Los propones tú, con estas reglas.

Deriva el alcance de la Fase 0 del repositorio, no de tu intuición sobre qué suena
razonable. Da rangos y no puntos: «diez a catorce semanas», no «doce semanas».
Cada cifra lleva detrás su base de cálculo, visible en el deck o en el anexo: una
cifra sin base de cálculo hunde la reunión en cuanto alguien pregunta de dónde
sale. Marca visiblemente que son estimaciones pendientes de validar.

Desglosa al menos perfiles y dedicación —desarrollo, pedagogía, coordinación,
observación—, consumo de modelos de IA, dispositivos si hacen falta, coordinación
con centros y contingencia. Estima también lo que no cuesta dinero y cuesta más:
las horas de las docentes participantes, y los permisos del centro y de las
familias.

Si una cifra depende de algo que no sabes, no la inventes: nómbrala como variable
y di de qué depende.
</cifras>

<restricciones>
Estas no se negocian.

No inventes nada: ni usuarios, ni centros interesados, ni tracción, ni premios, ni
partners, ni pilotos previos, ni citas de docentes. Donde una lámina pida un
testimonio, deja el hueco marcado como `[PENDIENTE: cita de una PT]`.

Ninguna estadística sin fuente verificable. Si no la tienes, dilo cualitativamente
o marca `[PENDIENTE: dato con fuente]`. Una cifra inventada en un deck de fundación
se detecta y cuesta la relación entera.

Cero datos personales. Las personas que aparezcan son ficticias y así hay que
etiquetarlas. Ningún caso real, ningún dato de menores.

Nada de resultados de aprendizaje prometidos. Esto ahorra trabajo mecánico a una
profesional; no hay evidencia de que mejore resultados del alumnado y no se puede
sugerir que la haya. Ninguna afirmación clínica, terapéutica ni diagnóstica.

Escribe «alumnado con discapacidad», con la persona por delante de la condición.
Evita «sufre», «padece», «necesidades especiales» como eufemismo y el registro de
superación. El marco es de derechos y acceso, no de caridad ni de inspiración.

El documento no compromete jurídicamente a nadie: ni a la fundación que lo mueve,
ni a la empresa de la que sale, ni a quien lo firma. Comunica una intención y una
propuesta. La figura jurídica y la gobernanza futuras se presentan como decisión
abierta, no como algo ya resuelto.

Nada de información confidencial de empresa: ni clientes, ni proyectos internos,
ni cifras de negocio.

El deck tiene que ser accesible. Es un proyecto de accesibilidad: si el material
no lo es, el argumento se cae en la primera lámina. Contraste mínimo AA, cuerpo de
texto generoso, texto real y nunca texto dentro de imágenes, HTML semántico con
encabezados de verdad, navegable con teclado, comprensible con lector de pantalla,
ninguna información transmitida solo por color, y `alt` con contenido real en cada
figura. Dedica una línea del guion a confirmar que esto se ha cumplido.
</restricciones>

<estilo>
La prosa amanerada sustituye la afirmación directa por metáfora y floritura. En
lugar de «un parámetro que conviene variar», quien escribe amanerado produce «una
palanca que merece la pena accionar». En lugar de «este punto sigue importando»,
escribe «este punto se gana su sitio». Esas frases existen para lucir a quien
escribe, no para transmitir la idea, y quien lee lo nota. Por eso irrita: obliga al
lector a trabajar más para que el autor se luzca. Además es imprecisa, porque las
metáforas arrastran connotaciones que el autor no ha elegido y no controla. La
solución es decir lo que quieres decir. Cuando exista una expresión literal, úsala.

Nada de «revolucionario», «disruptivo», «transformar la educación» ni «IA de
última generación». Quien financia proyectos sociales ha visto cien decks de IA
este año y le queda uno de paciencia.

Usa listas y viñetas cuando el contenido tenga partes discretas de verdad y la
lista ayude a leerlo —recursos del piloto, riesgos, el desglose del ask—. En las
láminas narrativas, el problema y lo que diferencia al proyecto, escribe prosa: un
párrafo corto lee mejor que cinco viñetas sueltas. Da a cada lámina el texto que
necesite para sostenerse sin ponente; una lámina con tres palabras no comunica
nada por correo.

Cada afirmación fuerte debe poder responder a «¿y cómo lo sabes?». Si no puede,
reescríbela.

Sin fotos de archivo de niños ni fotografía de banco de imágenes. Si hace falta
un apoyo visual, antes un diagrama que una fotografía. El sistema visual que hay
que aplicar está en `<identidad_visual>`.
</estilo>

<identidad_visual>
El deck usa el sistema visual corporativo de VASS. Todo lo que sigue está sacado
del manual de marca 2025 y de las plantillas oficiales; respétalo al detalle,
porque parte del efecto es que quien lo reciba vea material serio y no un deck
improvisado.

**Base cromática.** Fondo negro VASS `#141414` en todas las láminas: es el
registro corporativo por defecto y el que mejor sostiene el azul. Texto principal
blanco `#FFFFFF`, secundario gris claro `#E9E9E9`, metadatos y pies en gris medio
`#8A8691`. El azul VASS `#4BBCEE` es el color de marca: acentos, cifras
destacadas, rótulos de sección, subrayados y elementos gráficos, nunca cuerpos
largos de texto.

Si alguna lámina o anexo va sobre fondo blanco, el azul para texto es `#067DB9`,
no `#4BBCEE`: sobre blanco el azul VASS se queda por debajo de 2:1 de contraste y
no cumple AA. El manual tiene dos paletas precisamente por esto, y lo dice con
todas las letras, así que es coherente con la lámina de accesibilidad del deck.

**Paleta de infografías**, solo para gráficos y diagramas, nunca para la marca:
`#4BBCEE`, `#FCC936`, `#007DA4`, `#DCD7AA`, `#B4B5B4`, `#006D70`, `#CCCD41`,
`#DC6200`, `#2F426B`, `#005896`.

**Tipografía.** Titillium Web para titulares y títulos —SemiBold 600 en títulos,
Bold 700 en rótulos cortos— y Roboto Light o Regular para los cuerpos largos. Las
dos están en Google Fonts. Regla del manual: los rótulos cortos pueden ir en
mayúsculas; los títulos y subtítulos van siempre en minúscula, en caja de frase.
Deja una pila de respaldo del sistema por si las fuentes no cargan.

**Retícula de lámina**, que es el patrón que repiten todas las corporativas.
Arriba a la izquierda, un rótulo de sección en mayúsculas, gris medio, cuerpo
pequeño y con el interletrado abierto (unos 0.12em). Arriba a la derecha, el
logo. El título grande a la izquierda, con aire generoso por encima. El contenido
en dos columnas asimétricas: texto a la izquierda en torno al 40% del ancho,
material visual a la derecha en torno al 55%. Márgenes amplios y mucho negro
respirando: el vacío es parte del estilo, no espacio desaprovechado.

**Elementos icónicos de la marca.** Reprodúcelos en SVG y CSS; aquí es donde está
el carácter del sistema.

Una retícula de puntos de cuatro por cuatro en azul VASS, abajo a la izquierda,
en portada y en separadores de sección. Un arco blanco de un píxel, de radio muy
grande, que entra y sale por los bordes de la lámina de modo que solo se ve un
segmento de la circunferencia. Una flecha gruesa azul con los extremos
redondeados apuntando a la derecha, abajo a la derecha, en los separadores.
Formas con una sola esquina redondeada —radio grande, del orden de 64 píxeles, en
una esquina y el resto a noventa grados—, que es la firma de la marca para
imágenes y tarjetas. Una onda azul: una curva amplia en azul VASS que entra desde
un borde y ocupa parte de la lámina. Y la numeración de sección en grande, en
Titillium ExtraLight y azul claro, tipo «01», «02».

Vértices redondeados en todo: el logotipo los tiene y es un rasgo deliberado de la
marca, así que usa `stroke-linecap="round"` y `stroke-linejoin="round"` en todos
los diagramas.

**Textura de fondo.** La marca se apoya en imágenes abstractas y fluidas con
degradados de azul, púrpura y naranja que transmiten movimiento. Reprodúcelas con
CSS y no con ficheros: degradados radiales superpuestos en azul VASS, púrpura e
índigo sobre el negro, desenfocados y a baja opacidad. Úsalas en portada y
separadores, nunca detrás de un párrafo.

**El logo.** No recrees el wordmark VASS con una tipografía. Está construido con
VAG Rounded Bold y el manual prohíbe expresamente cambiarle la tipografía, el
color, la opacidad o las proporciones. Deja un contenedor con las proporciones
reservadas y la marca `[LOGO VASS: sustituir por el SVG oficial]`, respetando el
margen de seguridad que fija el manual: el espacio libre alrededor equivale a la
anchura de la «S» del logotipo.

**Quién presenta.** El deck lo mueve la Fundación VASS, cuya misión declarada es
fomentar la inclusión social y la accesibilidad a través del talento digital. Esa
frase es real y conviene que aparezca, porque es la conexión explícita entre el
proyecto y quien abre las puertas.

**Movimiento.** Comedido. Transiciones suaves al cambiar de lámina y poco más:
nada que gire, rebote o parpadee. Respeta `prefers-reduced-motion` y deja el deck
completamente utilizable sin animación.

Que quede vistoso es parte del encargo, y en este sistema lo vistoso viene del
contraste entre el negro y el azul, de la escala tipográfica y del aire, no de
recargar la lámina. Si dudas entre añadir un elemento gráfico o quitar uno,
quítalo.
</identidad_visual>

<ejemplo>
Sobre cómo usar las fuentes que leas: reformula, no copies. Este es el
comportamiento correcto.

<peticion>Escribe la lámina del problema a partir del escenario de la PT.</peticion>
<respuesta_correcta>
Marta es maestra de pedagogía terapéutica. Tiene cuarenta y cinco minutos libres un
martes y tres alumnos que necesitan la misma ficha de tres maneras distintas. Uno
no descodifica el enunciado, otra no ve la hoja y el tercero lee con pictogramas.
Hoy eso significa reescribir la ficha tres veces a mano, y volver a hacerlo la
semana siguiente con la ficha siguiente. Lo que corrigió la última vez no vuelve:
cada adaptación empieza en blanco.
</respuesta_correcta>
<por_que_es_correcta>
La lámina está organizada alrededor de la idea que tiene que llevarse quien lee
—el trabajo se repite y no acumula—, no como un recorrido por el documento fuente.
El contenido del escenario se transmite con frases propias en estilo indirecto.
No hay ni una frase copiada literalmente del fichero de origen; si hubiera hecho
falta una, iría entre comillas y señalada como cita. Y sigue siendo concreta: una
persona, un hueco de tiempo, tres barreras distintas.
</por_que_es_correcta>
</ejemplo>

<forma_de_trabajar>
Estás trabajando de forma autónoma. Quien te ha pedido esto no está mirando en
tiempo real y no puede responder preguntas a mitad, así que preguntar «¿quieres
que…?» o «¿sigo?» bloquea el trabajo. Para lo que se deduce del encargo, sigue sin
preguntar.

El encargo fija el alcance, y el alcance es el entregable: no lo estreches, no lo
ensanches y no lo cambies por otro. Lee la ambigüedad como la leería un colega con
criterio: las decisiones de rutina las tomas tú y las declaras al final, en la
lista de supuestos. Si ves un problema real en el encargo tal como está planteado,
dilo en una o dos frases y sigue construyendo bajo supuestos explícitos.

Entrega los dos ficheros completos. Si una parte se queda bloqueada, completa todo
lo demás y di exactamente qué has dejado fuera y por qué.

Antes de terminar el turno, mira tu último párrafo. Si es un plan, una pregunta,
una lista de próximos pasos o una promesa sobre trabajo que no has hecho, haz ese
trabajo ahora. Un paso que ya has decidido es algo que se ejecuta, no algo que se
anuncia.

Cuéntame en una línea qué vas a hacer antes de empezar, y ve dejando notas breves
mientras trabajas si el proceso es largo.

Cuando acabes, dime en tres líneas el resultado de revisarlo tú mismo: si queda
alguna cifra o afirmación que no puedas rastrear hasta los hechos verificados o
una fuente citada, si el deck se entiende leído en silencio y de arriba abajo, y
si el propio deck cumple los criterios de accesibilidad que predica. Solo reporta
lo que puedas señalar con el dedo; lo que no hayas comprobado, dilo.
</forma_de_trabajar>

Con todo lo anterior en mente: escribe `guion-deck.md` y `deck.html` en `~/Projects/rampa-fundacion/`.

---

## Notas operativas (fuera del prompt)

**Effort: `high`, no `xhigh` ni `max`.** Es lo que recomienda Anthropic para
entregables largos: por encima de `high`, Fable 5.1 tiende a redactar el
entregable entero dentro del razonamiento y luego escribirlo otra vez como
respuesta — el doble de tokens de salida y más espera, sin ganancia medida.

Si aun así lo lanzas a `xhigh` o `max`, sube `max_tokens` para que quepan el
razonamiento *y* la respuesta, y pega esto al final del mensaje de usuario
(sustituyendo el corchete por el `max_tokens` real):

> Todo lo que produzcas en una respuesta, incluido el razonamiento o los
> borradores previos, cuenta para un único límite de unos [max_tokens] tokens. Si
> se alcanza antes de terminar, quien lo recibe se encuentra una respuesta cortada
> y tiene que empezar de nuevo. Componer el entregable entero como razonamiento y
> otra vez como respuesta duplicaría la longitud del turno sin mejorar el
> resultado, así que no lo hagas. En lugar de eso, cuando se te pide un entregable
> largo —un documento de varias secciones, una tabla grande, un fichero de código
> completo— dedica el esfuerzo extra a entender la petición, comprobar las
> entradas de las que depende tu respuesta y cerrar la estructura y las decisiones
> difíciles; usa el espacio de razonamiento para razonar y el de salida para
> escribir la salida.

**En turnos de seguimiento**, para que no te reescriba el `deck.html` entero cada
vez que pidas un retoque:

> Conviene minimizar los tokens empleados en editar ficheros. Por eso, cuando no
> afecte al resultado final, edita el fichero de forma quirúrgica en lugar de
> reescribirlo entero.

**Si quieres que busque datos de mercado con fuente real**, añade esto — a `low`
effort Fable 5.1 tiende a responder de memoria en vez de buscar:

> Cuando una consulta gire sobre un nombre que no reconozcas con seguridad, o que
> reconozcas de un área que se mueve rápido, el nombre es precisamente lo que hay
> que verificar: busca antes de responder, e incluye el nombre tal como está
> escrito en al menos una de las búsquedas. Esto vale también cuando tengas algún
> conocimiento previo: un conocimiento parcial es justo lo que hace que una
> respuesta desactualizada suene autorizada.

**El bloque de estilo va en el mensaje de usuario, no en el system prompt.** La
guía de Anthropic dice explícitamente que las instrucciones de estilo sujetan
mejor ahí. El prompt de arriba ya está montado como un único mensaje de usuario,
así que pégalo tal cual.

**La ruta de salida** viene fijada a `~/Projects/rampa-fundacion/`,
deliberadamente fuera del repositorio. Aparece dos veces, en `<entregables>` y en
la línea final; cámbiala ahí si la quieres en otro sitio. Si lo lanzas en un chat
sin acceso a disco, usa la versión autocontenida en su lugar.

**Ficheros de marca, por si quieres adjuntárselos.** El prompt lleva la identidad
descrita en texto y no necesita los ficheros, pero si el modelo tiene acceso a
disco y quieres que los mire:

- Manual de marca: `40_Corporate/Brand/Brandbook/VASS-BRAND BOOK-ESP-2025.pdf`
- Plantillas: `40_Corporate/Brand/Templates/CORPORATE TEMPLATES/VASS/VASS_DARK_TEMPLATE.potx` y `VASS_LIGHT_TEMPLATE.potx`
- Corporativa de referencia: `40_Corporate/Brand/Corporate Presentations/Spanish/VASS Propuesta de Valor 2025_ES.pptx`
- Texturas abstractas: `40_Corporate/Brand/Graphic Resources/TEXTURES/`
- Fuentes: `40_Corporate/Brand/Fonts/` (Titillium Web y Roboto, ambas en Google Fonts)

Todo cuelga de `~/Library/CloudStorage/OneDrive-GrupoVASS/`.

**El logo.** No hay SVG del wordmark en la carpeta de marca, solo incrustado en
las plantillas. Por eso el prompt le pide a Fable que reserve el hueco en lugar de
recrearlo: el logo es VAG Rounded Bold y el manual prohíbe expresamente cambiarle
la tipografía. Sácalo de cualquier plantilla `.potx` y pégalo tú, o pídeselo a
marketing.
