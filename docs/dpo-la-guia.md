# La conversación con el DPO sobre las guías (spec 017)

> **Qué es este documento.** La spec `017` está bloqueada, no diferida: dice
> literalmente «this feature must not be planned until the DPO and legal have been
> asked», y no como fórmula de descargo. Este fichero existe para que esa
> conversación dure veinte minutos y no sea un descubrimiento.
>
> **No es una spec ni un plan.** No hay diseño aquí. Hay cuatro preguntas, lo que
> depende de cada respuesta, y qué está ya construido y verificable — para que el
> DPO responda sobre hechos y no sobre intenciones.
>
> Escrito 2026-08-31, cuando `002`, `012`, `016`, `018` y `019` cerraron y `017` se
> quedó como el único bloqueo real.

## Primero: **qué** DPO, porque no es obvio y sólo uno puede responder

Todo el repositorio dice «el DPO» como si hubiera uno. No lo hay, y confundirlos
cuesta la reunión entera.

| Quién | ¿Puede responder a esto? |
|---|---|
| **El delegado de protección de datos del responsable del tratamiento** — el centro si es privado o concertado; **si es un centro público andaluz, normalmente la Consejería y no el centro** *(a confirmar: cambia quién firma y cuánto tarda)* | **Sí. Es el único.** Los datos del alumno los trata el centro/la Administración, y la base jurídica y el registro de actividades son suyos |
| **El DPO de VASS** | **No.** Rampa no es un producto de VASS y VASS no trata estos datos. Puede darte una lectura interna como favor, y no autoriza nada |
| **El proveedor de IA** (Anthropic, Google…) | **No.** Lo que importa de ellos no es su DPO: son sus condiciones — retención, entrenamiento, transferencias — y el contrato lo firma quien trata, no nosotros |

Y una cosa que conviene tener clara antes de pedir la reunión: **tú no eres
encargado del tratamiento.** Rampa es software libre que corre en el ordenador de
la maestra; no recibe nada, no almacena nada y no hay servicio detrás. No hay
contrato que firmar contigo, y eso simplifica la conversación — pero también
significa que quien tiene que decidir no trabaja para ti.

## El objeto de la conversación, en un párrafo

Una PT recibe del orientador un DIAC o una ACNS: el documento oficial que dice qué
adaptaciones lleva un alumno. Hoy Rampa puede aplicarlo **si ella lo teclea a mano**
en `profiles/<código>/adaptations.md` (spec `003` FR-209, ya construido). Lo que
`017` añade es **leerlo del documento** — foto, PDF o Word — y quedarse sólo con las
medidas.

El problema no es el almacenamiento. Es que **un DIAC contiene, por definición, el
resumen de la evaluación psicopedagógica, un diagnóstico y a menudo circunstancias
familiares**, y leerlo significa enviar esa página a un modelo de un tercero.

## Lo que ya está decidido y no se pregunta

Para que el DPO no gaste tiempo en lo que ya está cerrado:

- **Rampa no es el registro.** Séneca lo es. Cualquier diseño donde la copia de
  Rampa sea la autorizada está mal antes de construirse, y eso ya está escrito en la
  spec.
- **Rampa no guarda material clínico** ([ADR 0002](decisions/0002-no-clinical-material.md)),
  y el perfil describe **barreras, nunca diagnósticos** (Principio V). El diseño
  propuesto extrae las medidas y **no guarda el diagnóstico**.
- **Rampa nunca produce una evaluación psicopedagógica**, ni la resume si no se la
  han dado, ni genera un documento que parezca que existe una. Una ACS redactada sin
  ese informe es **nula de procedimiento**, y un documento que *parece* completo
  invita a alguien a archivarlo.
- **El nombre del alumno no sale de la máquina.** Punto único de salida con
  sustitución por código, y si un nombre sobreviviera a la sustitución no se envía
  nada. Es un test que corre en cada cambio, no una promesa.

## Las cuatro preguntas

### 1 · «Leer y descartar» frente a «guardar»: ¿es una diferencia que cuenta?

El diseño propuesto envía la página del DIAC al proveedor para extraerla, se queda
con las medidas y **no escribe el diagnóstico en ningún fichero**.

**Lo que hay que saber:** una imagen de una página contiene todo lo impreso en esa
página. Aunque Rampa sólo conserve las medidas, **el proveedor ha visto la página
entera**. Eso es exactamente la misma limitación que ya está dicha para una foto con
un nombre escrito a mano (spec `009`), y se dirá con las mismas palabras y en el
mismo momento: antes de que ella suba nada.

**De qué depende la respuesta:** si «leer y descartar» no es suficiente, la
conversación termina en la opción C de abajo y `017` se reduce a la mitad. Si lo es,
sigue en pie con las condiciones que el DPO ponga.

### 2 · ¿Cambia la respuesta según el proveedor y su contrato?

Rampa no elige el proveedor: lo elige el centro, y la aplicación pregunta y avisa de
dónde se procesan los datos. Retención, uso para entrenamiento y transferencias
internacionales son del contrato, no del código.

**La pregunta concreta:** ¿hay una lista de proveedores con los que el centro **sí**
podría hacer esto, distinta de la lista con la que adapta fichas? Adaptar una ficha
y leer un DIAC no son el mismo tratamiento, y puede que la respuesta correcta sea
«para esto, sólo con encargado con contrato y datos en la UE».

### 3 · Categoría especial: ¿art. 9 RGPD, y con qué base?

Un diagnóstico es dato de salud. La adaptación curricular como tal es dato educativo
del expediente; el resumen de la evaluación psicopedagógica no.

**La pregunta concreta:** ¿el tratamiento que propone `017` entra en el art. 9.1 y,
si entra, con qué excepción del 9.2 — y encaja en el registro de actividades del
centro tal y como está hoy, o hay que modificarlo? *(Esta es la pregunta que sólo el
DPO puede responder, y es la que decide si hace falta una EIPD.)*

### 4 · La ACS, donde una respuesta equivocada afecta a la escolarización

`017` US4 ayuda a redactar la adaptación **significativa** — la que modifica
objetivos y criterios de evaluación. Carlos eligió ese alcance a sabiendas, con la
opción reducida sobre la mesa, y por eso los cinco candados son estructurales:

1. Rampa **nunca propone qué objetivos modificar**.
2. **Se niega a redactar** donde no consta que exista evaluación psicopedagógica.
3. Nombra a la **PT como autora** y a Orientación como asesora.
4. Marca el borrador como borrador.
5. Cuando se le pide que decida, **declina en una frase nombrando quién decide**.

**La pregunta concreta:** ¿alguno de esos cinco es insuficiente, y hay un sexto? La
clarificación de la spec dice que este bloqueo aplica «and more so» a US4.

## Las tres opciones, y por qué dos son malas

Está en la spec y se repite aquí porque es lo que el DPO tiene que poder elegir:

| | Qué implica | Por qué |
|---|---|---|
| **A · No leer guías** | Honesto, y tira lo más útil de la petición | Una PT a la que ya le han dado la guía la va a seguir igual. Rampa ignorándola es Rampa contradiciendo el expediente |
| **B · Leer y guardar** | Viola ADR 0002 de plano | No está sobre la mesa |
| **C · Leer, extraer las medidas, quedarse sólo con ésas** | El diseño propuesto | Es el único que sobrevive a la constitución y a la situación real de la maestra |

Y una **cuarta**, que sólo aparece si la respuesta a la pregunta 1 es no:

| **D · Que la teclee ella** | Ya existe (`003` FR-209) | Ninguna página va a ningún proveedor. Cuesta diez minutos de la PT por alumno y por curso, y es lo que hace hoy |

**D es el suelo.** Si la conversación no da permiso para nada más, Rampa no pierde
capacidad: pierde comodidad. Merece decirse en la reunión, porque cambia el tono —
no se está pidiendo permiso para que la herramienta funcione.

## Lo que el DPO puede comprobar, no creer

Cada afirmación de arriba tiene un test público que corre en cada cambio:

| Afirmación | Dónde se comprueba |
|---|---|
| El núcleo no tiene red ni acceso a claves | `npm run test:isolation`, sobre todos los ficheros de `packages/core` |
| Un solo punto de salida, con sustitución de nombres, y bloqueo si sobreviviera uno | `packages/providers/test/chokepoint.test.ts` |
| El nombre no se escribe nunca en el perfil | `packages/core/test/roster-privacy.test.ts` |
| El colegio tampoco sale | el mismo fichero |
| El borrado por alumno borra, y lo dice si algo sobrevive | `record-erasure.test.ts` · e2e `erasure.spec.ts` |
| El material que intenta dar órdenes no se obedece | `untrusted.test.ts`, `injection.test.ts` |

Y [`docs/proteccion-de-datos.md`](proteccion-de-datos.md) es el documento general,
con la lista de comprobación que ya existía.

## Puede que la reunión no toque todavía

Hay un camino que no la necesita, y merece considerarse antes de pedirla.

La **Fase 0** — la validación con la PT identificada — no necesita `017`. Necesita
los momentos 0-4 del escenario, que están construidos. Si el piloto corre con la
**opción D** (ella teclea las medidas del DIAC en `adaptations.md`), **no hay ningún
tratamiento nuevo que autorizar**: ninguna página del DIAC sale de su ordenador, y
lo que sí sale — el material de clase, con códigos en lugar de nombres — es lo que ya
describe `proteccion-de-datos.md`.

Dicho de otro modo: **`017` bloquea `017`, no el proyecto.** Pedir una reunión con un
DPO de la Consejería para desbloquear una comodidad, antes de que una sola PT haya
dicho si lo demás le sirve, es gastar el favor en el momento equivocado.

Lo que sí conviene hacer ya, y es barato: preguntarle **a ella** si su centro le
permite usar una clave de IA propia con material de clase. Si la respuesta es que no
lo sabe — que es la respuesta más frecuente, y el propio
`proteccion-de-datos.md` lo dice — eso es un dato sobre la Fase 0, no sobre `017`.

## Después de la reunión

Lo único que hace falta traer de vuelta para desbloquear `017`:

- [ ] **Con qué DPO se ha hablado** — el del responsable del tratamiento, no otro
- [ ] Respuesta a la pregunta 1 — sí, no, o «sí con condiciones» y cuáles
- [ ] Si es sí: qué proveedores, y si hay restricción de ubicación
- [ ] Si entra en art. 9: la base, y si hace falta EIPD
- [ ] Si hay un sexto candado para la ACS, cuál
- [ ] Quién es la persona con la que se cierra esto, por nombre y cargo

Con eso, `017` se planifica. Sin eso, no — y el estado de la spec sigue diciéndolo.
