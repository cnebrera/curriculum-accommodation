/**
 * The note Rampa leaves in the vault when a pictogram set is in use
 * (018 T014, US1 scenario 3).
 *
 * In `core` rather than in the IPC file it is written from, for two reasons and
 * both were found by a failing test: the Electron boundary test counts the lines
 * that know they are inside a window, and 170 lines of Spanish prose is not one of
 * them. And this text is **content** — a description of what a licence requires of
 * whoever opens the folder — which Principle I says does not live in a file whose
 * job is wiring.
 *
 * It is also now testable without a temp directory.
 */
/**
 * The note in the vault. For a colleague, and for her in three years.
 *
 * The folder's **name** rather than its path: recognisable to her, and it does not
 * put a machine-specific absolute path into a folder that syncs to somebody else's
 * laptop.
 */
export function pictogramVaultNote(a: {
  folder: string; summary: string; licence?: string; configuredOn: string;
}): string {
  return [
    '# Pictogramas',
    '',
    'Este material usa un juego de pictogramas que **no viene con Rampa**. Lo trae',
    'quien lo usa, y la licencia la acepta esa persona directamente.',
    '',
    `- Carpeta: \`${a.folder}\` (en el ordenador de quien lo configuró)`,
    `- Lo que encontró: ${a.summary}`,
    `- Configurado el ${a.configuredOn}`,
    '',
    '## Lo que exige la licencia',
    '',
    'Los pictogramas de ARASAAC son propiedad del **Gobierno de Aragón**, creados por',
    '**Sergio Palao**, con licencia **CC BY-NC-SA**. Eso quiere decir:',
    '',
    '- Toda hoja que lleve un pictograma lleva la atribución. Rampa la pone y no se',
    '  puede quitar: si se cayera, la hoja infractora sería la tuya.',
    '- **No se puede usar con fines comerciales.**',
    '- Una hoja con un pictograma incrustado es obra derivada, así que hereda la',
    '  misma licencia. Eso afecta a lo que puedes hacer con tu propio material.',
    '',
    'Si abres esta carpeta y no tienes el juego de pictogramas, las hojas se siguen',
    'viendo: donde iba el dibujo aparece la palabra y un hueco marcado.',
    ...(a.licence ? ['', '## El fichero de licencia del juego', '', '```', a.licence.trim(), '```'] : []),
    '',
  ].join('\n');
}
