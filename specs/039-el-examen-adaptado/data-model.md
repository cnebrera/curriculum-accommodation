# Data model · El examen adaptado

Tres cosas cambian de forma. Ninguna toca el esquema del vault: la vía de respuesta ya está
guardada y el eje ya existe.

---

## 1 · El espacio de respuesta

Hoy es un booleano disfrazado: `data-answer-space` está o no está, y si está salen dos
rayas de `1.9em`. Pasa a resolverse de **dos fuentes que no se mezclan**:

| Fuente | Qué aporta | De dónde sale |
|---|---|---|
| **El documento** | Qué pide la tarea: una palabra, un texto, una elección, un dibujo | `data-response`, que el modelo escribe desde el material original |
| **El perfil** | Cómo puede responder él | Nivel de `MOT`, resuelto a presentación **antes** de cruzar al renderizador |

La separación es el diseño y no un detalle de implementación: el renderizador combina las
dos **sin saber de quién es ninguna**, que es lo que mantiene `007` FR-506 intacto sin
ningún canal nuevo.

### Resolución

| `data-response` | Sin `MOT` observado | Con la vía que no es escritura |
|---|---|---|
| `short` | espacio de una línea | sin rayas, con la frase |
| `long` | espacio de varias líneas | sin rayas, con la frase |
| `choice` | opciones separadas para poder señalar | igual, y más separadas |
| `draw` / `manipulative` | recuadro | recuadro |
| `oral` | sin rayas, con la frase | sin rayas, con la frase |
| ausente | como hoy | como hoy |

**«Como hoy» para el caso ausente no es pereza: es la garantía de que nadie pierde nada.**
Un material sin `data-response` es todo el material que ya existe en el vault de alguien.

---

## 2 · La escalada

```
Escalada {
  qué        — la adaptación que no se aplicó
  por qué    — la regla que la retiene, nombrada
  propuesta? — el texto redactado, tal cual, con sus saltos de línea
}
```

Hoy es `string[]`. Tres campos y no una cadena con formato, porque el informe tiene que
poder **presentarlos distinto**: el qué y el porqué son del sistema, y la propuesta es
texto de un modelo. Mezclados en una cadena, esa distinción se pierde en el momento en que
alguien cambia el formato.

**La propuesta es opcional y tiene que serlo.** Hay adaptaciones que se escalan y no se
pueden redactar —«reducir el número de ítems» no tiene un texto que proponer— y una
propuesta obligatoria invitaría a inventar una.

---

## 3 · El informe

Gana un apartado, y **deja de meter esto en «Lo que NO he hecho»**. Los dos hechos son
verdad y no son el mismo hecho:

- «No he hecho X» — una acción que no ocurrió.
- «Esto lo decides tú, y aquí tienes el texto» — una decisión pendiente, con material.

Y gana una entrada más: **el documento original**, para que «toda numeración del origen
sigue encabezando una tarea» sea comprobable (FR-3709). Hoy el informe sólo ve el adaptado,
así que no existe nada contra lo que comprobar nada.

---

## Lo que NO cambia, y conviene decirlo

- **`report/notes.ts` y su normalizador.** Aplana espacios y quita viñetas, y para lo suyo
  —las notas que ella escribe a mano— está bien. La propuesta no pasa por ahí.
- **`data-answer-space`.** Se queda significando «este bloque lleva espacio». Lo que
  cambia es que deja de ser el único que decide cuánto.
- **El esquema del alumno.** Ni un campo.
