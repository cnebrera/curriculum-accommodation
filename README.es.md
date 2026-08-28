<div align="right"><a href="README.md">English</a></div>

# Rampa

**Adapta material de aula al perfil de un alumno con discapacidad.**

Una rampa no lleva a otro sitio. Lleva a la misma puerta, por una vía que la
persona sí puede recorrer. Eso es lo que hace este proyecto con fichas,
ejercicios y exámenes.

Rampa es una aplicación de escritorio. Los ficheros de la maestra se quedan en su
ordenador, en una carpeta de markdown que es suya; las recetas de adaptación van
dentro de la aplicación, en markdown que cualquiera puede leer; la cuenta de IA
es la suya.

El docente revisa y firma siempre. Esto quita el trabajo mecánico, no el criterio
profesional.

> **Estado: inicial, y honesto al respecto.** La aplicación está construida y su
> suite de tests pasa offline, pero **ninguna maestra la ha usado todavía y no
> hay instaladores firmados.** La Fase 0 existe para responder a una sola
> pregunta: ¿una PT encuentra el resultado utilizable con retoques menores?
> Hasta que eso esté respondido, lo demás no importa. En
> [`specs/006-desktop-app/validation.md`](specs/006-desktop-app/validation.md)
> está exactamente qué se ha verificado y qué no.

## Cómo funciona

```
tu material     →  leer  →  adaptado  →  impreso
                     ↑          ↑           ↑
                tú verificas  perfil     revisas
                            + recetas   y firmas
                                            │
                                    lo que corregiste
                                            └──→ la próxima vez
```

El material se normaliza **una sola vez** a un documento intermedio. Cada salida
—HTML accesible, PDF imprimible y más adelante texto para braille y audio— es un
renderizado del mismo documento adaptado. Eso es lo que hace abordable cubrir
discapacidades muy distintas en lugar de cinco proyectos separados.

La última flecha es lo importante. Una corrección que hagas al revisar se
recuerda, para que la semana que viene no salga la misma adaptación mal hecha.

## Cómo ejecutarlo

Todavía no hay instaladores firmados, así que hoy significa compilarlo:

```bash
git clone https://github.com/cnebrera/curriculum-accommodation.git rampa
cd rampa/app
npm ci
npm test        # la suite entera, offline, sin ninguna clave
npm run dev
```

`npm run dist` genera instaladores en `release/`. En Windows y macOS irán sin
firmar y el sistema operativo avisará de ello — por eso las publicaciones
públicas esperan a los certificados. En Linux el AppImage no necesita instalador,
ni firma, ni permisos de administrador.

La clave de IA la pones tú. La aplicación te guía y te dice lo que cuesta una
ficha — unos tres céntimos. Uno de los proveedores soportados tiene capa gratuita
y no pide tarjeta.

## Los perfiles describen barreras, no diagnósticos

Un perfil dice qué le cuesta al alumno y cómo responde mejor, en diez ejes
—decodificación, carga cognitiva, función ejecutiva, acceso visual…—. No lleva
nombre ni etiqueta clínica.

Dos niños con el mismo diagnóstico necesitan cosas distintas. Además, las
barreras son la única representación que se puede seudonimizar sin perder
utilidad. Ver [`docs/profile-schema.md`](docs/profile-schema.md) y
[`docs/axis-calibration.md`](docs/axis-calibration.md).

## Las recetas son el proyecto

Cada decisión de adaptación vive en una receta en markdown que una PT puede leer
y corregir — no en el código. Si sabes adaptar material pero no programar, eres
exactamente quien hace falta aquí.

Las recetas llevan ejemplos antes/después y, sobre todo, **antipatrones**: lo que
hace mal quien adapta con buena intención. *No sustituyas el término técnico
sobre el que se va a evaluar al niño.* Esa es la línea que separa una buena
adaptación de una que le roba el currículo a la ficha sin que se note.

Lo mismo vale para las instrucciones que la aplicación envía al modelo: están en
[`instructions/`](instructions/), no en TypeScript, por la misma razón.

Ver [`recipes/`](recipes/) y [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Salvaguardas

- **Nada es definitivo sin una persona.** La salida lleva marca visible de
  borrador hasta que un docente firma, y hay exactamente una acción que la quita.
- **El nombre del alumno no llega al modelo.** Escribes "Lucía" porque así piensas
  tú; se guarda cifrado en tu ordenador y se sustituye por un código en cada
  envío. Si escribes un nombre que el sistema no conoce, te pregunta antes de
  enviar nada.
- **Cambia la vía, no el contenido.** Sin inventar datos, sin sinónimos fáciles
  para términos curriculares, sin eliminar en silencio.
- **La adaptación significativa se escala, no se decide.** Cambiar objetivos o
  criterios de evaluación es del equipo docente y del expediente del alumno.
- **Un examen adaptado que además es más fácil es otro examen.** Las recetas de
  examen cambian el acceso y la respuesta, nunca lo que se evalúa.
- **Nada del alumno puede acabar en su propia ficha.** Está garantizado por
  construcción: el renderizador no tiene acceso al perfil.
- **El material son datos, nunca instrucciones.** Una ficha con texto dirigido al
  programa se adapta como contenido, se te avisa, y no se obedece. Ver
  [`specs/007-untrusted-content`](specs/007-untrusted-content/spec.md).
- **Tus ficheros son tuyos.** Markdown plano en la carpeta que elijas, legible con
  cualquier editor o con Obsidian, con copia de seguridad copiando la carpeta, y
  completo si desinstalas.
- **El material fuente nunca entra en el repositorio.** Adaptar una obra para una
  persona con discapacidad está amparado por el Tratado de Marrakech y el
  art. 31 bis TRLPI. Redistribuirla, no.

## La historia entera en un fichero

Para qué sirve esto, contado como el trimestre de una maestra, momento a
momento, con la especificación que cubre cada uno: [`docs/escenario.md`](docs/escenario.md).
Es el documento contra el que se revisa toda especificación, y el guion de la
observación de la Fase 0.

## Qué existe ya

El estudio de herramientas comparables y dónde están los huecos está en
[`docs/market-landscape.md`](docs/market-landscape.md).

## Licencia

- Código — **Apache-2.0** ([`LICENSE`](LICENSE))
- Recetas, instrucciones, checklists, documentación — **CC BY-SA 4.0** ([`LICENSE-CONTENT.md`](LICENSE-CONTENT.md))

Código permisivo para que un centro, una consejería o una editorial puedan
integrarlo sin revisión legal. Contenido con ShareAlike para que el común
pedagógico que construya la comunidad siga siendo común.

## Contribuir

Las especificaciones se gestionan con [Spec Kit](https://github.com/github/spec-kit);
los principios que gobiernan el proyecto están en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

La contribución más valiosa ahora mismo no es código. Es una maestra diciéndonos
dónde está mal el resultado.
