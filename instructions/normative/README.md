# Normativa: un fichero por territorio

Un fichero por normativa. Dicen qué documentos de adaptación existen en ese
territorio, quién los firma, qué hace falta antes, qué secciones piden, y **las frases
exactas que Rampa imprime dentro de esos documentos**.

**El contrato está en
[`specs/029-la-normativa-es-un-corpus/contracts/normative-corpus.md`](../../specs/029-la-normativa-es-un-corpus/contracts/normative-corpus.md).**
Léelo antes de escribir el gallego, el madrileño o el de tu comunidad.

## Por qué existe esta carpeta

Porque durante un año Rampa dijo «Séneca» a todo el mundo.

Séneca es la plataforma de Andalucía. La pareja ACNS/ACS y las Instrucciones de 8 de
marzo de 2017 son el marco de Andalucía. Una maestra de Vigo o de Zaragoza leía frases
sobre una plataforma que no tiene y una pareja de documentos que su normativa no usa, y
concluía —con razón— que esto no estaba hecho para ella.

Era además el fallo más difícil de ver desde dentro: quien lo escribió trabaja bajo ese
marco, así que «España» y «Andalucía» se leían como sinónimos y en ningún sitio decía
lo contrario.

## Sin corpus también se trabaja, y eso es el producto

Si no eliges ninguna normativa, Rampa funciona en **modo genérico**: habla del
«documento de adaptación vigente en tu territorio» y de «tu plataforma de registro», y
dice por escrito que el procedimiento concreto lo verificas tú con tu orientador.

El genérico **no es un fichero de esta carpeta**. Es `instructions/guide.md` y
`instructions/acs.md`, la capa base que siempre viaja. Un corpus se **añade** encima;
nunca sustituye a la base. Por eso el genérico no se puede borrar, ni suplantar, ni
editar en hostil: no hay nada que borrar.

## Lo que este fichero es, y lo que no

**Es** vocabulario de orientación: cómo se llama aquí el documento, quién lo coordina,
qué secciones lleva, cómo se dice que algo no está presentado.

**No es** asesoramiento jurídico, y nada en el formato puede hacerlo pasar por tal. No
hay campo para declarar un fichero «válido», «oficial» o «aprobado». Lo que hay es
`reviewed_by_teacher`, que dice quién discrepó y cuándo, y una línea de procedencia que
se imprime dentro de cada documento diciendo de qué corpus salió, de dónde viene el
fichero y si está revisado.

## Lo primero que hay que entender

**Las reglas duras mandan sobre cualquier corpus.** No es una advertencia al pie: es
estructura. En el contrato **no existe ningún campo** que llegue a ninguna comprobación
— ni para las recetas, ni para las reglas de examen, ni para la marca de borrador, ni
para el filtro clínico, ni para la negativa de la ACS. Un corpus que *diga* que un
examen puede rebajarse no ha dicho nada que la aplicación pueda obedecer: el conflicto
se te enseña al importarlo, y el texto se queda inerte.

Si algún día un campo nuevo le diera a un corpus ese alcance, **el campo está mal, no
la regla**.

La jerarquía, de arriba abajo:

1. `instructions/hard-rules.md` — las reglas duras. Ningún corpus las toca.
2. Lo que tú escribes y corriges: el perfil, tus notas, tus correcciones.
3. El corpus normativo que hayas elegido — o el genérico, si no has elegido.

## `reviewed_by_teacher`

Empieza en `false` y **sigue en `false` hasta que alguien que trabaje bajo esa
normativa esté en desacuerdo con algo concreto.**

No hasta que lo lea. Hasta que discrepe. Es la misma regla que
`instructions/education/README.md`, y aquí pesa más: lo de este fichero se imprime
dentro de un documento que alguien va a llevar a la administración.

## Añadir uno

1. Copia `es-an.md`, conserva la estructura, cambia el contenido. Las etiquetas, los
   roles, la plataforma de registro, las secciones y las frases son exactamente lo que
   varía entre territorios.
2. Elige un `id` estable que no choque (`es-md`, `es-ct`, `es-ga`…). La selección va
   **por id, nunca por el nombre del territorio**: dos ficheros pueden decir «Madrid».
3. `sourceable` honesto. `none` significa que Rampa nombra la sección como que falta en
   vez de rellenarla de forma verosímil. Marcar `full` una sección de juicio no hace que
   Rampa sepa armarla: hace que el borrador mienta.
4. `clinical_terms_extra` sólo añade. Tus documentos usarán palabras clínicas que la
   lista base no conoce; ponlas, para que se queden fuera del vault.
5. `last_checked` = el día que leíste las páginas de la administración. No el día que
   editaste el fichero.
6. Busca a alguien que trabaje bajo esa normativa y consigue que te discuta algo.
   Entonces, y sólo entonces, `reviewed_by_teacher: true` con quién y cuándo.
