# Data model · La hoja se parece a la de su clase

## US1 · lo que cambia de forma

`OdtOptions` gana **el mismo campo** que `RenderOptions` ya tiene:

```
OdtOptions {
  signedOff?, lang?, pictogramImages?, pictogramCredits?,
  presentation?   ← lo nuevo, y es el mismo tipo que el otro renderizador
}
```

El mismo tipo a propósito: dos formas de decir «cómo se ve esto» serían dos sitios que
acabarían discrepando, que es el generador de defectos de este repositorio.

### La traducción, y lo que no se traduce

| Knob | ODF | |
|---|---|---|
| `fontSize` | `fo:font-size` | Directo |
| `lineHeight` | `fo:line-height` | `2` → `200%` |
| `paraGap` | `fo:margin-bottom` | De `em` a `cm` contra el cuerpo |
| `letterSpacing` | `fo:letter-spacing` | De `em` a `pt` contra el cuerpo |
| `ink` | `fo:color` | Directo |
| `oneTaskPerPage` | `fo:break-before="page"` | En el estilo del ejercicio |
| **`measure`** | **no llega** | Este documento **no define su página**: toma la de ella. Acortar la línea exigiría imponerle un `page-layout`, o sea pisarle su ajuste, en el fichero cuya razón de ser es que ella lo controle |
| **`wordSpacing`** | **no llega** | ODF no tiene propiedad de texto para ello, y aproximarlo con espacios corrompería el texto que ella edita |
| `paper` | no hace falta | El único valor que se produce es `#fff`, que es el papel |

**La pérdida se declara y no se disimula**: un alumno que necesita línea corta la tiene en
la hoja impresa y no en el editable. Lo que deja de perder es el cuerpo de letra, que es
la mitad que hoy está mal y la que se ve desde el otro lado del aula.

## US2 y US3 · bloqueadas por D1

La forma está en la spec (FR-3802…FR-3815). No se escribe aquí un modelo de datos para
unas bandas cuyo contenido no se ha decidido: sería inventar la respuesta a D1 por la vía
de la estructura.
