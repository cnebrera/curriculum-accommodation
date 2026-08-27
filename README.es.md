<div align="right"><a href="README.md">English</a></div>

# Rampa

**Adapta material de aula al perfil de un alumno con discapacidad, usando el
agente de IA que ya tienes.**

Una rampa no lleva a otro sitio. Lleva a la misma puerta, por una vía que la
persona sí puede recorrer. Eso es lo que hace este proyecto con fichas,
ejercicios y exámenes.

Rampa es un *harness*: lo clonas, lo abres con tu propio agente de IA y ya está
preparado — instrucciones, recetas de adaptación, plantillas de salida y
salvaguardas. Sin servidor, sin cuenta, sin API key, y sin que los datos del
alumno salgan de tu ordenador.

El docente revisa y firma siempre. Esto quita el trabajo mecánico, no el criterio
profesional.

> **Estado: inicial. Todavía no se ha validado con ninguna maestra real.** La
> Fase 0 existe para responder a una sola pregunta: ¿una PT encuentra el
> resultado utilizable con retoques menores? Ver
> [`docs/ESPECIFICACION-V0.md`](docs/ESPECIFICACION-V0.md).

## Cómo funciona

```
material/          →  DIE  →  DIE adaptado  →  output/
tus ficheros          ↑            ↑              ↑
                   ingest        adapt         render
                      ↑            ↑
                 tú verificas  perfil + recetas
```

El material se normaliza **una sola vez** a un documento intermedio. Cada salida
—HTML accesible, PDF imprimible, ODT editable, texto para braille, audio— es un
renderizado del mismo documento adaptado. Eso es lo que hace abordable cubrir
discapacidades muy distintas en lugar de cinco proyectos separados.

## Empezar

```bash
git clone https://github.com/cnebrera/curriculum-accommodation.git rampa
cd rampa
scripts/setup-hooks.sh     # bloquea commits accidentales de datos del alumno
scripts/doctor.sh          # te dice qué herramientas opcionales tienes
```

Abre la carpeta con tu agente de IA y ejecuta, en orden:

| Comando | Qué hace |
|---|---|
| `/rampa-profile` | Construye un perfil seudonimizado de las barreras del alumno |
| `/rampa-ingest` | Lee tu material —escaneo, foto, DOCX, texto pegado— y tú lo verificas |
| `/rampa-compose` | La otra entrada: genera material a partir de lo que el alumno tiene que aprender, cuando no hay nada que adaptar |
| `/rampa-adapt` | Aplica las recetas y escribe un informe de cada cambio |
| `/rampa-render` | Genera los formatos que ese alumno necesita |
| `/rampa-review` | Tu checklist de revisión y la firma — y recoge lo que has corregido |
| `/rampa-memory` | Cada pocas semanas: consolida lo que ha aprendido de ti |

No hace falta nada más que un agente. `pandoc`, un navegador headless y un TTS
offline desbloquean un formato de salida cada uno; sin ellos sigues teniendo HTML.

## Los perfiles describen barreras, no diagnósticos

Un perfil dice qué le cuesta al alumno y cómo responde mejor, en diez ejes
—decodificación, carga cognitiva, función ejecutiva, acceso visual…—. No lleva
nombre ni etiqueta clínica.

Dos niños con el mismo diagnóstico necesitan cosas distintas. Además, las
barreras son la única representación que se puede seudonimizar sin perder
utilidad. Ver [`docs/profile-schema.md`](docs/profile-schema.md).

## Las recetas son el proyecto

Cada decisión de adaptación vive en una receta en markdown que una PT puede leer
y corregir — no en el código. Si sabes adaptar material pero no programar, eres
exactamente quien hace falta aquí.

Las recetas llevan ejemplos antes/después y, sobre todo, **antipatrones**: lo que
hace mal quien adapta con buena intención. *No sustituyas el término técnico
sobre el que se va a evaluar al niño.* Esa es la línea que separa una buena
adaptación de una que le roba el currículo a la ficha sin que se note.

Ver [`recipes/`](recipes/) y [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Salvaguardas

- **Nada es definitivo sin una persona.** La salida lleva marca visible de
  borrador hasta que un docente firma.
- **Cambia la vía, no el contenido.** Sin inventar datos, sin sinónimos fáciles
  para términos curriculares, sin eliminar en silencio.
- **La adaptación significativa se escala, no se decide.** Cambiar objetivos o
  criterios de evaluación es del equipo docente y del expediente del alumno.
- **Un examen adaptado que además es más fácil es otro examen.** Las recetas de
  examen cambian el acceso y la respuesta, nunca lo que se evalúa.
- **Los datos del alumno se quedan en local.** `profiles/`, `material/` y
  `output/` están en `.gitignore` y bloqueados por un hook.
- **El material fuente nunca entra en el repositorio.** Adaptar una obra para una
  persona con discapacidad está amparado por el Tratado de Marrakech y el
  art. 31 bis TRLPI. Redistribuirla, no.

## Licencia

- Código, scripts, configuración — **Apache-2.0** ([`LICENSE`](LICENSE))
- Recetas, checklists, plantillas, documentación — **CC BY-SA 4.0** ([`LICENSE-CONTENT.md`](LICENSE-CONTENT.md))

Código permisivo para que un centro, una consejería o una editorial puedan
integrarlo sin revisión legal. Contenido con ShareAlike para que el común
pedagógico que construya la comunidad siga siendo común.

## Contribuir

Las especificaciones se gestionan con [Spec Kit](https://github.com/github/spec-kit);
los principios que gobiernan el proyecto están en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md).

La contribución más valiosa ahora mismo no es código. Es una maestra diciéndonos
dónde está mal el resultado.
