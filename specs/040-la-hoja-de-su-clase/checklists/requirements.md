# Specification Quality Checklist: La hoja se parece a la de su clase

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

**El marcador que queda es el contenido de la feature, y está aislado a propósito.** D1
pregunta qué bandas hay y qué cambia en cada una. La **arquitectura** está decidida y
especificada entera —lo manda la edad, desde el corpus, con anulación por alumno que es un
id del corpus y no estilo libre— y catorce de los quince FR no dependen de la respuesta.

**US1 es entregable hoy**, sin D1 y sin discusión: un alumno que ve muy poco recibe 24pt en
su hoja impresa y 12pt en el documento editable del mismo material. No es estética, es un
fallo de accesibilidad vivo, y la spec lo pone primero por eso.

**Por qué D1 no se rellena con una propuesta del autor.** Sería fácil y sería el defecto que
`010` ya cometió: una interfaz que pasaba todos los tests y era fea. ADR 0009 prohíbe el
pixel-diff con el argumento de que «acabaría afirmando lo que produjo el último commit», y
unas bandas inventadas aquí serían la misma trampa un piso más arriba — el corpus afirmando
lo que se le ocurrió al autor, con tests verdes debajo.

**Un riesgo que el plan tiene que recoger y que no es obvio**: la comprobación que protege
la hoja de datos del alumno quita las etiquetas pero **no** el contenido de la hoja de
estilo, y la presentación viaja justo por ahí. Un identificador de banda es corto, y los
valores cortos colisionan con la fuente incrustada — medido en `038`: un dato de cuatro
caracteres colisiona el 6,5% de las veces. FR-3811 lo exige; el plan tiene que decir cómo.

Bloquea `/speckit-plan` **sólo para US2 y US3**.
