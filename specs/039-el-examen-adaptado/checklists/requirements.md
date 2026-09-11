# Specification Quality Checklist: El examen adaptado

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Los tres marcadores que quedan son deliberados y están aislados.** D1, D2 y D3 viven en
su propio apartado, «Decisiones abiertas», y no dentro de ningún FR — así que ningún
requisito depende de una pregunta sin responder. Es la diferencia entre una spec con
agujeros y una spec que sabe dónde están.

Las tres son **criterio pedagógico y no técnico**, y el proyecto ya tiene escrito que no
las decide quien escribe el código: G69 lo dice literalmente de D2 —«es criterio: no la
decide esto»— y la guarda del examen dice de D1 que su segunda lista «no es tuya la
decisión».

**Qué se puede hacer sin ellas.** US1 entera, que es el MVP y la única parte que cierra una
promesa que el corpus ya hace. US2 entera salvo *qué* dispara una escalada, que es el
mecanismo y no la política: el canal, la propuesta de varias líneas y el apartado propio no
dependen de D1. US3 depende de D1 para las medidas nuevas y **no** para el fantasma
`one-task-per-item@1`, que es un defecto del contrato.

**Qué no.** Escribir las recetas de las cuatro medidas en disputa. Y esa espera es una
decisión, no una pausa: el corpus es lo que se le enseña al modelo, y una regla que se
escribe y se revierte produce adaptaciones que se escriben y se revierten.

Bloquea `/speckit-plan` **sólo para US3**. Con D1 respondida, la spec queda cerrada.
