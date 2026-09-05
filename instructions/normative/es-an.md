---
id: es-an
label: Andalucía
territory: "España — Andalucía"

# El día en que se leyeron las páginas de la administración, no el día en que se
# editó este fichero. Sale de `docs/normativa-andalucia.md`, que es donde está la
# investigación con sus fuentes.
last_checked: "2026-08-30"

# Falso hasta que una PT o un orientador **que trabaje bajo esta normativa** esté en
# DESACUERDO con algo concreto de aquí. No que lo haya leído: que discrepe.
#
# Aquí importa más que en el resto del corpus, porque esto se imprime dentro de un
# documento que ella va a llevar a la administración. Un fichero de normativa con
# autoridad no ganada es peor que la misma falta en el fichero de ejes.
reviewed_by_teacher: false

# La plataforma de registro. Se usa dentro de las frases de abajo, y en ningún sitio
# más: quien escriba el corpus gallego cambia esta palabra y las frases se ajustan
# solas.
register: Séneca

# Los documentos que nombra esta normativa.
#
# `sections` es la forma que tenía `acns_sections` en `instructions/guide.md`, ahora
# por tipo de documento — porque qué secciones exige un documento es justo lo que
# cambia de un territorio a otro, y era lo que estaba escrito como si fuera de todos.
documents:
  - id: acns
    label: Adaptación curricular no significativa (ACNS)
    touches_objectives: false
    roles: >
      La ACNS la coordina el tutor o la tutora, y la propuesta curricular la completa
      el profesorado del área.
    prerequisites: >
      Un desfase curricular de al menos un curso en esa área.
    sections:
      - id: datos
        label: Datos del alumno y del área
        sourceable: full
        from: El perfil y el curso. Sin el nombre.
      - id: metodologia
        label: Metodología
        sourceable: full
        from: Las recetas aplicadas, agrupadas y con fecha.
      - id: actividades
        label: Actividades y tareas
        sourceable: full
        from: El material adaptado, por tipo y por fecha.
      - id: materiales
        label: Materiales
        sourceable: full
        from: Los tipos de material y las modalidades producidas.
      - id: temporalizacion
        label: Temporalización
        sourceable: partial
        from: >
          Las fechas del registro dicen cuándo se trabajó. No dicen qué tiene
          planificado para el trimestre, y confundir las dos cosas es lo que hace que
          alguien archive el documento.
      - id: evaluacion
        label: Instrumentos de evaluación
        sourceable: partial
        from: >
          Los exámenes adaptados y las adaptaciones de acceso que se declararon. Falta
          lo que ella use y Rampa no haya visto.
      - id: desfase
        label: Desfase curricular
        # `partial` desde 2026-09-05 (032 FR-3004). Antes era `none`, y seguía siéndolo
        # con razón: el desfase de la normativa sale de una evaluación psicopedagógica.
        # Lo que ha cambiado no es eso — es que ahora ella puede tener apuntado en el
        # perfil el nivel curricular **de esa área**, y ese apunte es suyo.
        sourceable: partial
        from: >
          El desfase que pide la normativa sale de una evaluación psicopedagógica y lo
          pones tú. Lo que Rampa puede ordenar es lo que tú misma tengas apuntado en el
          perfil sobre el nivel curricular de esa área, que no es lo mismo y va dicho
          como tuyo.

  - id: acs
    label: Adaptación curricular significativa (ACS)
    touches_objectives: true
    roles: >
      La redacta el PT, con el profesorado del área, asesorado por Orientación.
    prerequisites: >
      Una evaluación psicopedagógica previa.
    # Vacío a propósito. Rampa **ayuda a escribir** una ACS, no la arma con lo
    # registrado: lo que va dentro son objetivos y criterios ya decididos por el
    # equipo docente, y una lista de secciones «armables» invitaría exactamente a lo
    # que `instructions/acs.md` prohíbe.
    sections: []

# Las frases que se IMPRIMEN. Estaban en TypeScript, que es donde no puede corregirlas
# quien sabe si son correctas.
#
# Los saltos de línea son los que se imprimen: lo que escribes aquí es lo que sale, sin
# que nadie lo vuelva a partir (Principio I). Por eso van con `|` y no con `>`.
#
# Lo que NO está aquí, y no puede estar: la palabra BORRADOR, la marca de borrador y su
# marca de agua. Eso es el Principio VII, es una comprobación, y una comprobación que un
# corpus pudiera redactar es una comprobación que un corpus puede vaciar.
phrases:
  # Lo que sigue a «# BORRADOR », que lo pone el código.
  draft-title: "de adaptación curricular NO significativa (ACNS)"
  signed-title: "Adaptación curricular NO significativa (ACNS)"
  not-filed: |
    **Esto no está presentado.** El registro es **Séneca**: esto es material para
    llevar allí.
  authorship-footer: |
    **La ACNS la coordina el tutor o la tutora**, y la propuesta curricular la
    completa el profesorado del área. Rampa no la ha escrito: ha ordenado lo que ya
    había hecho para este alumno.
  name-line: "*lo pones tú en Séneca — yo no lo guardo.*"
  report-note: |
    Lo que hay aquí es una **adaptación curricular no significativa (ACNS)**: he
    cambiado cómo se presenta, en qué orden y cuánto hay por página. **Ningún
    objetivo ni criterio de evaluación cambia** — eso sería una adaptación
    significativa, y no la decide una herramienta.

    Esto no está registrado. El registro es **Séneca**: si esta adaptación va al
    expediente, la ACNS la coordina el tutor o la tutora y se registra allí.
  acs-footer: |
    **Esto es un borrador y no está presentado.** El registro es Séneca.

    Según la normativa, en una adaptación curricular significativa:

    - La **redacta el profesorado especialista en educación especial** (PT).
    - **Colabora** el profesorado del área.
    - **Asesora** el equipo o departamento de orientación.

    Y requiere una **evaluación psicopedagógica previa**. Sin ella es nula de
    procedimiento, por mucho que el documento parezca completo.

# Palabras clínicas que usan los documentos de este territorio y que la lista base de
# `instructions/guide.md` no trae. **Sólo añade**: de la lista base no se puede quitar
# nada desde aquí, y no hay ningún campo para intentarlo.
clinical_terms_extra:
  - DIAC
  - documento individualizado
  - censo de NEAE
  - NEAE
  - modalidad de escolarización
  - ATAL
---

# La adaptación curricular en Andalucía

## De dónde sale esto

De las **Instrucciones de 8 de marzo de 2017** de la Dirección General de Participación
y Equidad, y de cómo se rellena en Séneca. La investigación con sus fuentes está en
`docs/normativa-andalucia.md`; este fichero es lo que Rampa lee.

Es **vocabulario de orientación, no asesoramiento jurídico**, y nada en este formato
puede hacerlo más que eso. Lo que decide si un documento vale es tu equipo de
orientación, no un programa.

## Los dos documentos, que no son lo mismo

|  | **ACNS** — no significativa | **ACS** — significativa |
|---|---|---|
| Qué cambia | Metodología, actividades, temporalización, materiales, instrumentos de evaluación | **Modifica objetivos y criterios de evaluación** |
| Quién la firma | La coordina el **tutor** | La redacta el **PT**, con el profesorado del área, asesorado por Orientación |
| Qué hace falta antes | Un desfase curricular de al menos un curso en esa área | Una **evaluación psicopedagógica previa** |
| Dónde vive | Séneca | Séneca, como DIAC |

Esa tabla es la línea del Principio III convertida en normativa de aquí. **Una ACNS no
toca ningún objetivo**, que es exactamente lo que Rampa lleva haciendo desde el primer
día: por eso puede ayudar a ordenarla. Una ACS sí los toca, y ahí Rampa ayuda a
**escribir** y no decide nunca — eso está en `instructions/acs.md` y no aquí, porque
negarse a decidir objetivos no es una regla andaluza.

## Lo que este fichero no puede hacer

**Las reglas duras mandan sobre cualquier corpus normativo**, incluido este. Un fichero
de normativa que dijera que un examen puede rebajarse, que el nombre puede imprimirse o
que la marca de borrador puede quitarse, no habría dicho nada: no existe ningún campo
por el que eso llegue a ninguna comprobación. Ver `instructions/normative/README.md`.
