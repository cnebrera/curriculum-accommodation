# Las hojas que el registro fotografía

Cuatro clases de material que **renderizan distinto**, escritas a mano (`038` FR-3606).

La ficha no está aquí: es `corpus/sample/ensayo/material/ensayo-1/E00/adapted.md`, que ya
existe revisada como corpus y que el ensayo de `035` usa. Estas tres son las otras, y
viven fuera del corpus a propósito — no son material de ejemplo que una maestra vaya a
ver, son fixtures del registro, y meterlas en `sample/` las metería en el ensayo.

Ninguna sale de un modelo. Eso no es una comodidad: una hoja generada cambia entre
ejecuciones, y el registro tiene que poder decir «esto es lo que cambió en el
renderizador» sin la duda de si cambió el texto (FR-3614).

| Fichero | Qué prueba que las demás no |
|---|---|
| `examen.md` | `.assessment`, `data-points`, `data-response` y la vía de respuesta |
| `pictogramas.md` | `data-picto` **sin ningún set instalado**, que es el estado normal |
| `agenda.md` | `.agenda-moment`: la tira de `028`, con celdas de 35 mm y su propia rejilla |

Todas llevan `material_de_ejemplo: true` y `draft: true`, así que salen con su banner y
su marca de agua como cualquier borrador — Principio VII, y el registro no tiene ninguna
puerta para saltárselo.

## El separador de `data-picto` es un espacio, y esta nota existe porque me equivoqué

Los pares van `palabra=id`, **separados por espacios**:

```
data-picto="leer=leer lapiz=lapiz"
```

Escribí `leer=leer;lápiz=lápiz` con punto y coma, que es lo que un humano supone. No falla:
`parsePicto` parte por espacios y busca el **último** `=`, así que el valor entero se
convierte en una sola *palabra* llamada `leer=leer;lápiz` — y eso se imprimió en negrita
debajo del dibujo, en la hoja de un niño. Lo vio el registro en su primera pasada, y está
anotado como G79 porque el atributo no está en `docs/ir.md` y nadie valida su forma.
