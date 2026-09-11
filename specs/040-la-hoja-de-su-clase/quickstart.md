# Quickstart · la hoja se parece a la de su clase

## §1 · La paridad, que es US1

```bash
cd app && npx vitest run packages/core/test/odt-presentation.test.ts
```

| Caso | Esperado |
|---|---|
| `PER-V: 2` | El editable lleva **24pt**, igual que la hoja. Hoy lleva 12 |
| Sin barreras | Sale **exactamente como salía**: nadie pierde nada |
| `DEC: 1` | Doble interlínea también aquí |
| `COG: 2` | Un salto de página por ejercicio |
| `measure` y `wordSpacing` | **No llegan**, y el test lo dice como decisión y no como olvido |

## §2 · Mirarlo, aunque el registro no lo cubra

```bash
cd app && npm run shots
```

**El registro no fotografía el editable** y eso es FR-3617 de `038`, declarado allí. Así
que esta parte se mira abriendo el `.odt` en LibreOffice, a mano, una vez. Que no haya
instrumento es el hueco, y está escrito en `validation.md` en vez de disimulado.

## §3 · Lo que no se puede verificar aquí

Todo US2 y US3, porque **D1 no está respondida**: qué bandas de edad hay y qué cambia en
cada una. No se inventan unas para poder probar — eso sería responder D1 por la vía de
escribir el test.
