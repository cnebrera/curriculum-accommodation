# El catálogo de servicios

Un fichero por servicio. Cada uno describe lo que una PT necesita saber para
decidir y para conseguir su clave, y **la aplicación no contiene ninguno de esos
datos**: cambiar un coste, un plan gratuito o un paso del proceso es editar un
fichero de aquí, sin release.

**El contrato está en
[`specs/009-connect-wizard/contracts/provider-catalogue.md`](../../specs/009-connect-wizard/contracts/provider-catalogue.md).**
Léelo antes de añadir el séptimo servicio: dice qué campos son obligatorios, qué
promete quien escribe una entrada, y qué promete la aplicación a cambio.

El significado de cada campo está en
[`specs/009-connect-wizard/data-model.md`](../../specs/009-connect-wizard/data-model.md).

## Lo que hay que saber antes de tocar esto

- **`last_checked` es la fecha en la que comprobaste los datos leyendo las
  páginas del proveedor**, no la fecha en que copiaste la entrada de otra. Pasado
  un año, la aplicación deja de ofrecer el servicio: una afirmación de hace un
  año sobre dónde se procesan los datos de un niño no es un dato actual. CI avisa
  a los 300 días para que lo arregles antes de que lo vea una profesora.
- **`jurisdiction` y `trains_on_input` recogen lo que dicen las condiciones**, no
  si nos parece aceptable. Si no está claro, el valor es `unclear`, que es una
  respuesta legítima y más útil que una suposición.
- **Ni un nombre de modelo, ni un número de tokens, ni un tamaño de contexto** en
  nada que ella pueda leer. «Muy rápido» vale; «500 tok/s» no.
- **Los pasos dicen lo que va a VER.** «Busca el botón azul que dice *Create API
  key*» le sirve a alguien que no lee inglés. «Autentícate en la consola» no, por
  correcto que sea.
- **Nada de esto es una aprobación.** La aplicación muestra estos datos con su
  fecha y apunta a `docs/proteccion-de-datos.md`. No describe ningún servicio
  como conforme, seguro ni aprobado.
