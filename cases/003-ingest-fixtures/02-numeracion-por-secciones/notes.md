# Qué falla aquí

**La numeración va 1, 2, 1, 2.** Es correcto: la ficha tiene dos partes y cada
una empieza a contar de nuevo.

## Qué se mide

Que la validación **marca y no rechaza**. `validate.ts` produce un flag de tipo
`numbering` para el segundo «1», y la extracción se acepta.

Las dos formas de equivocarse aquí son simétricas y las dos son malas:

- **Rechazar** la página tira una extracción perfectamente buena y le cobra a la
  profesora un segundo intento que dará el mismo resultado.
- **No decir nada** deja pasar una renumeración de verdad, que es el error que se
  lee bien y se descubre cuando un niño pregunta por el ejercicio 4.

Así que se acepta, y se le dice. Ella es quien sabe si su ficha tiene dos partes.

## Lo que falta

La foto. Como en el fixture 01.
