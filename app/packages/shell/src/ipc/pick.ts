import { dialog, BrowserWindow } from 'electron';

/**
 * «Elige un fichero», and nothing else (029 T020).
 *
 * ## Why this is its own file
 *
 * `packages/shell/test/boundary.test.ts` bounds how much code imports Electron by
 * value, because ADR 0008 wants «what a migration would have to rewrite» to be a number
 * somebody can quote. `corpus/normative.ts` is 260 lines of loading, hashing, resolving
 * and scanning — and adding one file dialog to it put all 260 on that surface.
 *
 * The bound refused it, and the bound was right: what is Electron-specific here is
 * fifteen lines. Same move `035` had to make when a hundred lines of rehearsal store sat
 * behind one `app.getPath` call and became `ensayo/root.ts`.
 *
 * ## The renderer never composes a path
 *
 * It asks for a dialog and gets back what the operating system says she picked. That is
 * what keeps the vault's rule — a path from content is **refused**, never sanitised —
 * true for this input too, and it is why the handlers that act take the content this
 * produced rather than strings the renderer assembled.
 *
 * ## And `ipc/ingest.ts` uses it too, which is why the bound did not have to move
 *
 * The worksheet picker was the same fifteen lines, written first. Extracting one and
 * leaving the other would have been a second copy of the one rule that matters here —
 * that the renderer never composes a path — and a rule with two implementations is a
 * rule with one place to forget it. Two callers, one dialog, and the Electron surface
 * came out where it was.
 */
export async function pickFiles(args: {
  title: string;
  /** Extensions without the dot, as Electron wants them. */
  extensions: string[];
  filterName: string;
  many?: boolean;
}): Promise<string[]> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const options = {
    title: args.title,
    properties: args.many ? ['openFile' as const, 'multiSelections' as const] : ['openFile' as const],
    filters: [{ name: args.filterName, extensions: args.extensions }],
  };
  const result = await (win
    ? dialog.showOpenDialog(win, options)
    : dialog.showOpenDialog(options));
  return result.canceled ? [] : result.filePaths;
}

/** One file, or nothing. The ordinary case. */
export const pickFile = async (args: Parameters<typeof pickFiles>[0]): Promise<string | null> =>
  (await pickFiles(args))[0] ?? null;
