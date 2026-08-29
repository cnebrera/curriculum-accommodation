# Qué falla aquí

**Una captura de pantalla con la interfaz de la plataforma alrededor de la ficha.**
Es el caso que la spec 008 llama la vía común: el material está en la plataforma
de la editorial y no se puede exportar, así que lo que tiene la profesora es una
captura — con el menú, las pestañas, el aviso de cookies y el nombre de la unidad
alrededor del contenido.

## Qué se mide

Que la extracción **saca la ficha e ignora el chrome**, y que lo que no puede
decidir va a `notes[]` en vez de decidirse.

`instructions/ingest.md` lo dice así: «Si no puedes distinguir si algo es parte de
la hoja o parte de la web, ponlo en notes. No decidas.» Un menú extraído como si
fuera un enunciado es una hoja con «Unidad 4 · Actividades · Corregir» impreso en
medio, y una profesora que se fía de la verificación no lo pilla si está abajo.

## Cómo hacer esta captura

Cualquier plataforma con material propio, capturando pantalla completa. **No se
comparte la captura en el repositorio**: el contenido es de la editorial. Lo que
se comparte es este `notes.md` y la verdad de referencia de la parte que se
escriba a mano.

Es un límite real de este fixture y está dicho: se puede verificar localmente y no
se puede publicar.

## Lo que falta

**La captura, y la verdad de referencia.** Y a diferencia de los otros dos, aquí
la captura **no puede ir en el repositorio**: el contenido es de una editorial.

Lo que sí puede escribirse es la verdad de referencia de una hoja propia
*rodeada de chrome inventado* — un menú y unas pestañas escritos por nosotros,
que se comportan igual para lo que se está midiendo. Eso está pendiente y es la
forma de cerrar este fixture sin publicar material de nadie.
