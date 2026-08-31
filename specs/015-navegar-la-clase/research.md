# Research: navigating a caseload

## What forty means

A PT in a Spanish state school carries roughly fifteen to forty learners. Forty is
the working ceiling for **this** screen.

That is a small number, and it decides most of the design:

- Search runs over forty rows in memory. No index, no debounce strategy, no
  pagination. Anything cleverer is complexity bought with a risk (a name cache)
  to solve a problem that does not exist.
- The filter can be a pure function returning a new array. Forty × nine axes is
  nothing.
- **Four hundred** is the ceiling for the *record* (`014`), which is a different
  screen and a different number. Conflating them would put pagination on a list
  of children.

## Why there is no table

Not a style preference. The available columns are the nine axis values, and a
sortable grid of those, one row per child, is a ranking of disability. It reads as
a score, it invites comparison between children who have nothing to do with each
other, and the tool that produced it is one a teacher would be right to distrust.

The alternative that keeps the value: **group, do not rank.** Grouping by course
answers "who am I preparing for tomorrow", which is the actual question, and
carries no ordering between children.

This is Principle V, and `013`'s plan had already flagged the axis strip as "the
one screen where layout carries an ethical risk". This feature is that screen
multiplied, so the risk is designed out rather than reviewed.

## What was NOT researched

**Whether she wants a group or class concept.** `005` decided that choosing
several learners for one worksheet does not declare a persistent group, and this
spec inherits that. Whether a persistent «clase» is worth having is a question for
a teacher, not for this pass — and building one here would be inventing the
school's data model on the way past.
