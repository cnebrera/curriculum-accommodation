# What already exists

Landscape review from August 2026, before the project's first line was written.
It is here so that a contributor can argue with the reasoning behind Rampa's
positioning instead of guessing at it, and so nobody repeats the search.

**Short version:** tools exist, they are fragmented across four categories, and
none covers what this project sets out to do end to end.

---

## 1 · Generating the document (US market, built around the IEP)

| Tool | What it does |
|---|---|
| **MagicSchool AI** | The most mature. 80+ teacher tools; its IEP generator produces SMART goals, suggested accommodations and progress checkpoints from disability category, year and performance data |
| **Brisk Teaching** | Chrome extension; generates IEP goals and how to measure them |
| **IEPWriter, SpedTrack, SPEDAssist** | Compliance and case-management software with emerging AI |

**Limitation.** All of it is built on IDEA/FERPA. It knows nothing of ACI/DIAC,
LOMLOE, or competencias específicas and criterios de evaluación.

## 2 · Adapting content

- **Diffit** — paste a text, URL or topic and it rewrites to a reading level
  while preserving meaning. The closest thing to automatic material adaptation,
  but a single axis: reading.
- **Microsoft Immersive Reader**, **Goblin Tools** (task decomposition, ADHD/autism),
  **Twee**.

## 3 · Accessibility and communication

- **ARASAAC** — pictogram set, widely used in Spanish schools, CC BY-NC-SA.
- **Cboard** — AAC boards for learners without speech.
- Easy-read, text-to-speech, automatic captioning.

Loose pieces. Nobody orchestrates them against a learner profile.

## 4 · School management platforms with AI (Spain)

- **Alexia / AlexIA** (Educaria, ~1,400 schools) — automates assessment,
  invoicing, alerts. Management, not pedagogy.
- **Additio** — documents and explains significant and non-significant
  adaptations; the intellectual work stays with the teacher.

## 5 · Adaptive content

**DreamBox, MATHia, Knewton Alta** personalise pace in maths and reading. Built
for attainment, not for disability.

---

## The gaps this project is aimed at

1. **Nobody does the Spanish framework.** No AI product found generates a
   complete DIAC traced to the official curriculum. Existing generators emit
   generic US IEP text.
2. **They generate the paperwork, not the material.** MagicSchool produces the
   legal document; Diffit adapts a text. Nobody takes *this worksheet, for this
   learner, under their active adaptation* — with traceability to the adapted
   assessment criterion.
3. **"Any disability" is covered by nobody.** Almost everything assumes reading
   difficulty, ADHD or autism. Visual (braille, image description, tactile),
   hearing (sign language, glossing), motor and multiple disability are largely
   outside.
4. **No closed loop.** Adapt → apply → gather evidence → readjust. The market
   stops at the first step.
5. **Privacy as a barrier to entry.** This is health data about minors
   (GDPR art. 9). Most US tools are not straightforwardly deployable in a Spanish
   school, which is a moat if designed for from day one and a wall if left late.
6. **An underserved market, not a saturated one.** AI for special populations
   receives roughly 7% of edtech investment while serving about 15% of learners.

## Where the sector agrees, and what it means for us

Every source agrees that AI **drafts and the teaching team decides**. No serious
tool positions itself as an autonomous generator of adaptations. That is a legal
and ethical requirement rather than a technical limitation, and it is why human
sign-off is non-negotiable here (Principle VII) rather than a feature that could
be traded away later.

## How Rampa is positioned

Not competing with MagicSchool on document generation. The differentiator is
**day-to-day material adapted by barrier profile, anchored to the curriculum,
with a feedback loop, and GDPR-native** — plus two things nothing above does:

- **Handover** ([`specs/004`](../specs/004-handover/spec.md)). The official
  document transfers each June; the practical knowledge does not, and is rebuilt
  from scratch every September.
- **The corpus is the product** ([ADR 0001](decisions/0001-recipes-are-guardrails.md)).
  Every tool above keeps its adaptation logic proprietary and invisible. Here it
  is Markdown a teacher can read, correct and contribute to — which is also the
  only reason this can be given away rather than sold.

## Caveats

Desk research from vendor material, sector press and blogs. **No tool here was
trialled.** Vendor claims are reported as claims. Prices and free tiers move, so
re-check before quoting any of it. The strongest claim — that nobody covers the
Spanish framework end to end — is an absence of evidence from this search rather
than proof of absence.

## Sources

- [AI Tools for Special Education Teachers — OpenEducat](https://openeducat.org/articles/ai-tools-special-education-teachers/)
- [9 AI Tools for Special Education Teachers — EdTech Institute](https://edtechinstitute.com/2026/02/24/ai-tools-for-special-education-teachers-a-practical-guide/)
- [Top AI Tools for Special Education Due Process — Cool Tools](https://cool-tools.blog/2026/07/07/top-ai-tools-for-special-education-due-process/)
- [Alexia: la plataforma con IA que usan 1.400 centros — Educación 3.0](https://www.educaciontrespuntocero.com/recursos/alexia-suite-educativa-de-educaria/)
- [AlexIA — Alexia Suite Educativa](https://www.alexiaeducaria.com/alex-ia/)
- [Additio — Adaptaciones curriculares significativas y no significativas](https://additioapp.com/en/what-are-significant-and-non-significant-curricular-adaptations/)
- [Qué son las ACI — Fundación CADAH](https://www.fundacioncadah.org/web/articulo/que-son-las-adaptaciones-curriculares-individualizadas-aci.html)
- [ACI — Junta de Andalucía](https://www.juntadeandalucia.es/educacion/portals/ishare-servlet/content/06bd5c2d-4691-4172-a25e-d7c4d594c346)
- [AI in Education Startup Funding 2025-2026 — New Market Pitch](https://newmarketpitch.com/blogs/news/ai-education-funding-analysis)
- [Short on resources, special educators are using AI — The Conversation](https://theconversation.com/short-on-resources-special-educators-are-using-ai-with-little-knowledge-of-the-effects-259110)
- [IA Educativa para la Inclusión y Adaptación NEE — Megaprofe](https://megaprofe.es/ia-educativa-inclusion-nee/)
- [La IA al servicio de la educación inclusiva — UNIR](https://www.unir.net/revista/educacion/inteligencia-artificial-al-servicio-educacion-inclusiva/)
