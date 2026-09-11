# Content licence — CC BY-SA 4.0

The **pedagogical content** of Rampa is licensed under
[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)
(CC BY-SA 4.0).

Canonical legal text: <https://creativecommons.org/licenses/by-sa/4.0/legalcode>

## What this covers

| Path | Licence |
|---|---|
| `recipes/**` | CC BY-SA 4.0 |
| `checklists/**` | CC BY-SA 4.0 |
| `instructions/**` | CC BY-SA 4.0 |
| `templates/**` | CC BY-SA 4.0 |
| `profiles.example/**` | CC BY-SA 4.0 |
| `docs/**` | CC BY-SA 4.0 |
| `scripts/**` | Apache-2.0 (see `LICENSE`) |
| `app/ui/src/assets/fonts/**` | **Not ours.** SIL Open Font License 1.1 — see `app/ui/src/assets/fonts/OFL.txt` |
| `outreach/**` | Apache-2.0. **Not pedagogical content** — it is fundraising material, and ShareAlike has nothing to do there. The VASS brand artwork inside it is **not ours and not licensed here** — see `NOTICE` |
| everything else | Apache-2.0 (see `LICENSE`) |

## Why the split

The recipes are the accumulated professional judgement of the special-education
teachers who write them. ShareAlike keeps that a commons: improvements travel
back, and nobody can enclose the corpus.

The code is permissive on purpose. A school, an education authority or a
publisher must be able to integrate it without a legal review, because that is
how this reaches children at scale.

## In short

You may share and adapt the content, including commercially, provided you give
appropriate credit and license your adaptations under the same terms.

## The one third-party asset in here

`app/ui/src/assets/fonts/` holds **Atkinson Hyperlegible**, Copyright 2020 Braille
Institute of America, Inc., under the SIL Open Font License 1.1. It is neither
Apache-2.0 nor CC BY-SA, and the OFL requires its copyright notice and licence to
accompany the files — so `OFL.txt` sits in the same directory rather than in a
central licence folder, because a licence that can be separated from what it
licenses is a licence that will be.

It was missing until 2026-08-31, when `018`'s check for third-party image assets
found it. That is worth saying plainly: this repository was distributing a font
without its licence while carrying a document explaining how careful it is about
licences.

**And what is deliberately not here**: ARASAAC's pictograms. CC BY-NC-SA is
incompatible with Apache-2.0 on NonCommercial and cannot be merged into CC BY-SA
content at all — and a worksheet with one embedded is a derivative work, so a
teacher's own material would inherit the restriction. She fetches the set herself;
Rampa reads it from where she put it (spec `018` FR-1601).

## What you may not contribute

Neither licence grants you the right to contribute material you do not own.
**Do not add copyrighted classroom material to this repository**, adapted or not,
and never add real learner data. See `CONTRIBUTING.md`.
