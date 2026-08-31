---
id: audio
label: Para escuchar
last_checked: "2026-08-31"

# Igual que el resto del corpus: falso hasta que alguien que trabaje con un alumno
# ciego o con baja visión esté en DESACUERDO con algo concreto de aquí.
#
# Lo que más falta revisar es la lista de `spatial_phrases`. Sale de razonar sobre
# enunciados, no de escuchar una hoja leída.
reviewed_by_teacher: false

# Enunciados en los que **la disposición en la página es el ejercicio**.
#
# Cuando uno de éstos aparece, el bloque no se lee en un orden inventado: se
# anuncia lo que hay y se dice que no se puede leer en orden. Ver
# specs/019-modalidades/research.md.
#
# Está aquí y no en el código porque qué frases españolas significan «la
# disposición es el ejercicio» es juicio pedagógico, y quien lo corrija no debería
# tener que tocar TypeScript.
spatial_phrases:
  - une con flechas
  - une cada
  - unir con flechas
  - relaciona
  - relacionar
  - coloca en la recta
  - en la recta numérica
  - completa el esquema
  - completa el mapa
  - completa la tabla
  - rodea en el dibujo
  - señala en el dibujo
  - señala en el mapa
  - ordena las viñetas
  - según el dibujo
  - fíjate en el dibujo
  - observa la imagen
  - mira el esquema

# Cómo se anuncia un espacio de respuesta. El silencio donde la hoja tiene una
# caja es una pregunta que se pierde.
answer_space: Aquí hay un espacio para contestar.
---

# Para escuchar

Esto **no genera audio**. Genera un documento pensado para ser leído en voz alta —
por un lector de pantalla, por un sintetizador, o por una persona.

Que no traiga un motor de voz es una decisión, no una carencia: un motor bueno pesa
mucho y su calidad depende del idioma de una forma que aquí nadie puede juzgar.

## El orden de lectura

Casi todo se lee en el orden en que está. Lo interesante son los tres casos:

1. **Orden del documento.** Lo normal, y es casi todo.
2. **Orden explícito**, cuando una receta ha reordenado la página. Quien reordena
   sabe en qué orden lo quería.
3. **No se puede decir en orden.** Un ejercicio de unir con flechas, una recta
   numérica, una tabla de dos columnas de datos, un esquema.

## El tercer caso, que es el que importa

Se anuncia lo que hay y **se para ahí**.

No se parafrasea, no se leen las partes en un orden inventado, y **no se salta en
silencio**. Un salto en silencio es un alumno que termina un ejercicio de once
preguntas convencido de que tenía diez.

Y leer un ejercicio de unir con flechas como pares **da la respuesta**: «uno: rana
— a: anfibio» ya está contestado. La linealización es la solución.

## Lo que siempre se dice

- **El borrador, primero.** Si la hoja no está revisada, quien la escuche tiene que
  saberlo antes que nada — un borrador que sólo se anuncia por escrito no se anuncia
  a este alumno.
- **Una imagen sin describir, como lo que es.** «Hay una imagen sin describir» y no
  silencio. Si tiene descripción, se lee la descripción: eso es la imagen.
- **El espacio de respuesta.** Donde la hoja tiene una caja, aquí hay una frase.
- **El número del ejercicio.** Sin él no se puede volver a uno.

## Lo que nunca se dice

- **El código del alumno.** Un código leído en voz alta en una clase deja de ser un
  código. Es la única cosa que la hoja escrita lleva y ésta no.
- **Nada del perfil.** Ni ejes, ni barreras, ni notas. Igual que en la hoja escrita.
- **Lo que no se puede leer en orden, leído en un orden cualquiera.**
