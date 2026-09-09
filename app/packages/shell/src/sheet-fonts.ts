import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * La fuente accesible de las hojas, como `data:` URIs para `renderHTML` (backlog G76).
 *
 * La hoja declaraba `"Atkinson Hyperlegible"` y no la incrustaba, así que el PDF —hecho
 * en una ventana sin pantalla donde la fuente no está instalada— salía en Verdana. La cara
 * elegida por legibilidad en `010`, la que la aplicación lleva para su propia interfaz, no
 * llegaba nunca al papel.
 *
 * Sin Electron a propósito: toma la ruta como argumento, que es la forma que
 * `boundary.test.ts` lleva siete veces empujando. Quien sabe dónde está la fuente es
 * `fontsRoot()` en `corpus/bundle.ts`; quien la lee es esto, y se puede probar sin ventana.
 */
export interface SheetFontFace { family: string; weight: number; dataUri: string }

const FACES = [
  { file: 'AtkinsonHyperlegible-Regular.woff2', weight: 400 },
  { file: 'AtkinsonHyperlegible-Bold.woff2', weight: 700 },
] as const;

const cache = new Map<string, Promise<SheetFontFace[]>>();

/**
 * Leídas una vez por ruta y cacheadas: son ~24 KB cada una y no cambian mientras la
 * aplicación corre. Si faltan se devuelve lo que haya — una hoja en Verdana es peor que
 * una en Atkinson y mejor que ninguna hoja, y el test hace visible la ausencia.
 */
export function sheetFontFaces(root: string): Promise<SheetFontFace[]> {
  let p = cache.get(root);
  if (!p) { p = readFaces(root); cache.set(root, p); }
  return p;
}

async function readFaces(root: string): Promise<SheetFontFace[]> {
  const out: SheetFontFace[] = [];
  for (const f of FACES) {
    try {
      const bytes = await readFile(join(root, f.file));
      out.push({ family: 'Atkinson Hyperlegible', weight: f.weight,
                 dataUri: `data:font/woff2;base64,${bytes.toString('base64')}` });
    } catch { /* la hoja cae a Verdana */ }
  }
  return out;
}
