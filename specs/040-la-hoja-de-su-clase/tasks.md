# Tasks: La hoja se parece a la de su clase

**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [research.md](./research.md) ·
[data-model.md](./data-model.md) · [contracts/presentacion-odt.md](./contracts/presentacion-odt.md)

**Prefijo**: FR-38xx · SC-38xx

> **D1 está abierta** —qué bandas de edad hay y qué cambia en cada una— y bloquea US2 y
> US3. **No bloquea US1**, que es un fallo de accesibilidad vivo y se entrega sola.

---

## Phase 1: User Story 1 - La paridad del editable (Priority: P1) 🎯

- [ ] T001 [US1] Escribir `app/packages/core/test/odt-presentation.test.ts` **en rojo**,
      con el caso `PER-V: 2` exigiendo 24pt y con el caso «sin barreras» exigiendo salida
      **idéntica a hoy**. (FR-3801, SC-3801)
- [ ] T002 [US1] Dar a `OdtOptions` el campo `presentation`, **del mismo tipo** que usa el
      otro renderizador. Dos tipos para una cosa serían dos sitios que discrepan. (FR-3801)
- [ ] T003 [US1] Traducir la presentación a las propiedades ODF que la expresan: cuerpo,
      interlineado, aire entre párrafos, espaciado de letra, tinta y una tarea por página.
      (FR-3801)
- [ ] T004 [US1] Declarar en el código, donde alguien iría a buscarlo, que **la longitud de
      línea y el espaciado entre palabras no llegan**, con sus motivos medidos. (FR-3801)
- [ ] T005 [US1] En `app/packages/shell/src/jobs/export.ts`, resolver la misma presentación
      que resuelve la vía de impresión y pasarla. Sin esto lo anterior es una capacidad sin
      cablear. (FR-3801)
- [ ] T006 [US1] Comprobar que `untrusted.test.ts` FR-506 sigue verde **sin tocarlo**.
      (FR-3806)
- [ ] T007 [P] [US1] Anotar en `specs/006-desktop-app/validation.md` que el editable deja de
      ser menos accesible, **y que sigue sin tener superficie de revisión**: el registro de
      `038` no lo fotografía y eso no cambia aquí. (FR-3801 · su límite declarado)

**Checkpoint**: un alumno recibe la misma accesibilidad por las dos puertas, salvo en dos
cosas enumeradas y con motivo.

---

## Bloqueado por D1

- [ ] T008 **[BLOQUEADO · D1]** El corpus de bandas de aspecto. No se escriben unas
      provisionales: un corpus provisional se convierte en el definitivo por inercia, y
      éste es el que le dice al modelo cómo hablarle a un niño.
- [ ] T009 **[BLOQUEADO · D1]** La anulación por alumno, los dos knobs muertos, el
      endurecimiento del test de FR-506 y la cardinalidad. Todo depende de que existan
      bandas.

## Cobertura

Una fila por requisito, y no un rango: un rango no es una cuenta, y la guarda de
cobertura tiene razón al no aceptarlo.

| FR | Dónde |
|---|---|
| FR-3801 | T001, T002, T003, T004, T005, T007 |
| FR-3802 | T008 — **bloqueado por D1**: no hay bandas que derivar hasta que se decida cuáles |
| FR-3803 | T008 — bloqueado por D1: el orden entre barrera y edad no existe sin edad |
| FR-3804 | T009 — bloqueado por D1: no se puede elegir una banda de un conjunto vacío |
| FR-3805 | T009 — bloqueado por D1: un id de banda necesita bandas |
| FR-3806 | T006 · y se cumple **por no añadir nada nuevo que cruce** al renderizador |
| FR-3807 | T009 — bloqueado por D1: los campos que habría que prohibir no existen aún |
| FR-3808 | T009 — bloqueado por D1: la cardinalidad se compara contra el número de bandas |
| FR-3809 | T008 — bloqueado por D1: el suelo se comprueba sobre cada banda |
| FR-3810 | T009 — bloqueado por D1: el barrido recorre las bandas |
| FR-3811 | T009 — bloqueado por D1, y es el de más riesgo: un id de banda es corto, y `038` midió que un dato de cuatro caracteres colisiona el 6,5% con la fuente incrustada |
| FR-3812 | T009 — bloqueado por D1: los dos knobs muertos se producen desde una banda o se retiran |
| FR-3813 | T009 — bloqueado por D1: un id de cara sólo tiene sentido si una banda lo declara |
| FR-3814 | T008 — bloqueado por D1: la frase de `instructions/render.md` se cambia **con** el corpus que la contradice, no antes |
| FR-3815 | T008 — bloqueado por D1: no hay color nuevo que pueda dar falsos avisos hasta que una banda lo introduzca |
