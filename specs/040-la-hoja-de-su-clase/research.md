# Research · La hoja se parece a la de su clase

Tres preguntas medidas antes de planificar. La tercera cambia el alcance de US1.

---

## R1 · ¿Cuánta accesibilidad pierde hoy el documento editable?

**Medido sobre el código.** `render/odt.ts:292` fija `fo:font-size="12pt"` en el estilo
`Cuerpo`, y `OdtOptions` (`:346`) no tiene ningún campo de presentación. No hay forma de
pasarle una.

Así que un alumno `PER-V: 2` —al que `presentationFor` da 24pt, tinta `#000`, línea de
44ch y doble interlínea si además tiene `DEC`— recibe:

| | Hoja impresa | Documento editable |
|---|---|---|
| Cuerpo | **24pt** | **12pt** |
| Interlínea | 2 | 1,5 |
| Tinta | `#000` | la del procesador |
| Una tarea por página | sí | no |

**La mitad exacta del cuerpo de letra.** Y no es un caso raro: es el fichero que ella abre
para cambiar dos palabras antes de imprimir, así que la accesibilidad que recibe el alumno
depende de por qué botón pasó ella.

---

## R2 · ¿Por dónde entra la presentación, y rompe algo?

**No rompe nada, porque es el mismo camino que ya existe.** `jobs/print.ts` resuelve
`presentationFor(levels)` y se lo pasa a `renderHTML`. `OdtOptions` gana el mismo campo y
`jobs/export.ts` hace la misma llamada.

`007` FR-506 no se toca: `presentationFor` toma **niveles de eje**, que es precisamente
«so no caller can accidentally hand the profile to the renderer». Lo que cruza al
renderizador de ODT es lo mismo que ya cruza al de HTML.

---

## R3 · ¿Qué de la presentación se puede expresar en ODF, y qué no?

**Y aquí está lo que cambia el alcance.** No todo se traduce, y FR-3801 exige declarar lo
que no con su motivo en vez de fingir paridad.

| Knob | ¿Llega? | |
|---|---|---|
| `fontSize` | **Sí** | `fo:font-size`, directo |
| `lineHeight` | **Sí** | `fo:line-height`, de proporción a porcentaje |
| `paraGap` | **Sí** | `fo:margin-bottom` |
| `letterSpacing` | **Sí** | `fo:letter-spacing`, convertido de `em` a `pt` contra el cuerpo |
| `ink` | **Sí** | `fo:color` |
| `oneTaskPerPage` | **Sí** | `fo:break-before="page"` en el estilo del ejercicio |
| `measure` | **No** | ↓ |
| `wordSpacing` | **No** | ODF no tiene una propiedad de texto para el espaciado entre palabras. Inventar una aproximación con espacios de más corrompería el texto que ella edita |
| `paper` | **No hace falta** | Es el color del papel, y el papel de una impresora es blanco. El único valor que produce `presentationFor` es `#fff`, que ya es lo que hay |

**Por qué `measure` no, que es la decisión de esta investigación.** Acortar una línea en un
procesador de textos se hace con los márgenes de la página — y **este documento no define
su página**: no hay ningún `page-layout` en él, así que toma la configuración de ella.

Imponerle una sería pisarle su propio ajuste de página para conseguir un efecto
aproximado, en el fichero cuya razón de ser es que ella lo controle. La pérdida es real y
se declara: un alumno que necesita línea corta la tiene en la hoja impresa y no en el
editable. Lo que **no** pierde es el cuerpo de letra, que es la mitad que hoy está mal.

**Alternativa rechazada:** insertar saltos de línea manuales para acortar el renglón.
Rompería el texto en cuanto ella cambiara una palabra, que es lo único que este fichero
existe para permitir.

---

## R4 · ¿Hay algún sitio donde el editable y lo comprobado diverjan?

**Sí, y hay que vigilarlo.** `jobs/export.ts:63` y `:154` renderizan **HTML sin
presentación** sólo para alimentar a `checkOutput`, y luego renderizan el ODT aparte. Hoy
es inocuo porque la presentación no añade texto.

En cuanto algo de presentación añada texto —una etiqueta, un recordatorio— el documento
comprobado y el entregado dejarían de ser el mismo. No pasa con lo de esta feature, y
queda anotado para que no se descubra tarde.
