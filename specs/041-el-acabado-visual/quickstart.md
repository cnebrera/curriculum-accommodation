# Quickstart — cómo se verifica esta feature

Todo desde `app/`.

## Antes de tocar nada

```bash
cp -R ../docs/screenshots/latest ../docs/screenshots/041-antes
```

Sin esto no hay SC-3901: la diferencia se juzga contra el antes.

## Después de cada tanda

```bash
npm test                 # typecheck + vitest: styles, contrast, data-layer…
npm run shots            # el registro: mirar TODAS las capturas, no la primera
```

Mirar significa abrir `../docs/screenshots/latest/` y pasar por cada fichero. Los
defectos de esta feature no los ve ningún test: dos `h2` de tamaño distinto, un select de
1000 px, una tarjeta que parece un fieldset, un icono sin palabra.

Anchos y modos que hay que ver siempre: 560, 880, 1024, 1366; claro y oscuro; `xlarge`.
El registro los produce; si una tanda toca el carril, además 892 y 1920.

## Antes de dar la feature por hecha

```bash
npm run test:e2e         # layout, primary-control, a11y (8 cruces), sheet-a11y y el resto
```

Y la lista de [`contracts/states.md`](./contracts/states.md): cada celda rellena tiene
una captura en la que se ve. La revisión la hace un agente de contexto fresco con la
spec, el contrato de estados y las capturas; no quien implementó.

## Lo que no se hace

- No se «arregla» un test para que pase. Su cabecera dice por qué existe.
- No se cambia un texto de `i18n/`.
- No se añade una dependencia.
- No se toca `recipes/`, `instructions/` ni el renderizador de la hoja.
