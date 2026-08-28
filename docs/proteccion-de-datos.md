# Rampa y los datos — para el equipo directivo y el DPO

> **Qué es esto.** Una página honesta para que un centro pueda hacer su propia
> valoración antes de que nadie use Rampa con datos reales. Informa; no decide.
> **La decisión es del centro y de su delegado de protección de datos**, y este
> documento debe revisarlo esa persona — no es un dictamen jurídico y no
> sustituye al registro de actividades de tratamiento del centro.
>
> Borrador del 2026-08-28, pendiente de revisión por un DPO en ejercicio. Si algo
> de aquí no encaja con la realidad de un centro, eso es un defecto nuestro:
> abrid una incidencia.

## Qué es Rampa, en una frase

Una aplicación de escritorio que adapta material de aula al perfil de un alumno
con discapacidad. Los ficheros viven en el ordenador de la maestra; la cuenta de
IA es la suya; no hay servidor nuestro, ni cuenta nuestra, ni base de datos
nuestra en ningún sitio.

## Qué datos existen y dónde viven

| Dato | Dónde | Sale del ordenador |
|---|---|---|
| Perfil del alumno: **barreras funcionales**, nunca nombre ni diagnóstico | Carpeta local de la maestra, con un código opaco (`A3`) | Solo hacia el proveedor de IA de la maestra, ya seudonimizado |
| Correspondencia código ↔ nombre | Cifrada, en su ordenador, ligada a su usuario | **Nunca.** Excluida de toda exportación, copia compartida o traspaso |
| Notas de la maestra sobre el alumno | Carpeta local | Hacia el proveedor, con los nombres conocidos sustituidos por códigos |
| Material de clase (fotos, PDF) y sus adaptaciones | Carpeta local | Hacia el proveedor, para leerlo y adaptarlo |
| Coste de uso | Fichero local | Nunca |
| Registro de diagnóstico (errores) | Fuera de la carpeta de la maestra | Nunca automáticamente; por diseño **no puede contener** nombres, material ni datos de alumnos |

El perfil no dice "TEA" ni "dislexia": dice qué le cuesta al alumno y qué le
funciona, en diez ejes. Es la única representación que se puede seudonimizar sin
volverse inútil, y es una decisión de arquitectura, no una configuración.

## Qué se envía al proveedor de IA, paso a paso

El único destino de red de toda la aplicación es el proveedor de IA que la
maestra ya tiene contratado (con su clave). No hay ningún otro envío.

| Paso | Qué viaja |
|---|---|
| **Leer el material** | Las páginas (imagen o texto) y las instrucciones de lectura. **Atención al residuo:** si la ficha lleva el nombre del alumno escrito, ese nombre llega al proveedor dentro de la imagen — la aplicación avisa antes y sugiere tapar o recortar, pero no puede borrarlo de una foto |
| **Adaptar** | Las instrucciones y recetas pedagógicas (públicas), los niveles de barrera y apoyos del perfil (sin identidad), las notas relevantes **con los nombres conocidos sustituidos por códigos**, y el texto del material |
| **Nunca** | La correspondencia de nombres, el fichero de grupo/curso, el registro de diagnóstico, ningún fichero que la maestra no haya metido en ese trabajo |

Dos salvaguardas se aplican por código, no por confianza en el modelo: la
sustitución de nombres ocurre en un único punto de salida y **si un nombre
conocido sobreviviera, el envío se bloquea**; y si la aplicación detecta un
probable nombre que no conoce, **pregunta antes de enviar**.

## El marco, dicho claro

- **Naturaleza de los datos.** Barreras funcionales de menores: datos que un DPO
  debe tratar como categoría especial (art. 9 RGPD) aunque viajen seudonimizados.
  La seudonimización reduce el riesgo; no convierte el dato en anónimo.
- **Quién trata.** El centro (o la maestra, según cómo se despliegue) es el
  responsable; el proveedor de IA actúa bajo el contrato que la maestra o el
  centro ya tienen con él. **Rampa no es parte:** no recibe, no almacena y no
  puede acceder a nada.
- **El proveedor importa, y la aplicación os da los datos para valorarlo.** No
  todos dan las mismas garantías (retención, uso para entrenamiento, ubicación).
  La pantalla de conexión muestra, por cada servicio y **con fecha de última
  comprobación**: si pide tarjeta, lo que cuesta una ficha, dónde se procesa y qué
  dicen sus términos sobre entrenar con lo que se les envía. Son datos, no un
  visto bueno: **Rampa no califica a ningún proveedor como conforme, seguro o
  aprobado.** Esa comprobación es del centro, sobre el proveedor elegido, y ningún
  texto nuestro la sustituye.

- **Hay una opción en la que nada sale del ordenador.** Un modelo local
  (Ollama y similares) hace que no haya ninguna petición hacia fuera. Necesita
  instalación y un equipo capaz, y la calidad es menor — pero si el centro no
  autoriza salida de datos, es la única respuesta honesta, y está contemplada.

- **Derechos.** Supresión: la aplicación tiene un borrado completo por alumno que
  lista lo que va a eliminar, exige confirmación y verifica que no queda nada
  (las copias de seguridad hechas por la maestra quedan fuera de su alcance, y se
  lo dice). Portabilidad: la carpeta es texto plano; copiar la carpeta es la
  exportación.
- **Propiedad intelectual.** Adaptar una obra para una persona con discapacidad
  está amparado (Tratado de Marrakech; art. 31 bis TRLPI). Redistribuir la
  adaptación, no — y por eso ningún material entra jamás en el proyecto público.
- **Nada es definitivo sin firma.** Todo material sale marcado como borrador
  hasta que una docente lo revisa y firma. La herramienta propone; la
  profesional decide y responde.

### Qué se puede seudonimizar y qué no

Conviene ser exactos, porque es la pregunta que decide el análisis:

| Qué viaja | Estado |
|---|---|
| Perfil de barreras, notas, estilo de casa | **Seudonimizado.** Los nombres conocidos se sustituyen por códigos en un único punto de salida, y si alguno sobreviviera el envío se bloquea |
| Texto del material | Tal cual. Es la ficha |
| **Foto de la ficha** | Tal cual, como imagen. **Si lleva el nombre del alumno escrito a mano, ese nombre llega al proveedor** — la aplicación avisa antes y sugiere taparlo o recortarlo, y no puede borrarlo de una imagen |

Y una precisión legal que un DPO aplicará de todas formas: **seudonimizado no es
anónimo**. El docente conserva la correspondencia código↔nombre —tiene que
conservarla, da clase a ese niño—, así que sigue siendo dato personal
(considerando 26 RGPD) y le siguen aplicando las reglas de transferencia. La
seudonimización reduce el riesgo de forma real; no hace desaparecer el análisis.

## Lista de comprobación para el DPO

- [ ] Proveedor de IA elegido y su contrato/condiciones revisados (retención,
      entrenamiento, transferencias)
- [ ] Base jurídica y encaje en el registro de actividades del centro
- [ ] Ubicación de la carpeta de trabajo (equipo del centro vs. personal; si hay
      sincronización en nube, valorada como cualquier otro fichero del centro)
- [ ] Pauta interna comunicada: tapar el nombre en la foto antes de leer material
- [ ] Decidido si hay restricción sobre dónde pueden procesarse los datos, y
      comunicado al docente — la aplicación lo pregunta, y «no lo sé» es la
      respuesta más frecuente
- [ ] Valorado si el caso de uso justifica un modelo local (sin salida de datos)
- [ ] Periodo de retención decidido y el borrado por alumno probado una vez
- [ ] Este documento revisado y, donde no encaje, corregido

---

*Rampa es software libre (código Apache-2.0, contenido pedagógico CC BY-SA 4.0).
Todo lo afirmado aquí es verificable en el código y está cubierto por tests
públicos: la ausencia de red en el núcleo, el punto único de salida con
sustitución de nombres y el bloqueo si fallara no son promesas, son comprobaciones
que se ejecutan en cada cambio.*
