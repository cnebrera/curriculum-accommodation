import { app } from 'electron';
import { join } from 'node:path';

/**
 * Where the rehearsal lives (035 T004).
 *
 * ## One line, and its own file
 *
 * `app.getPath('userData')` is the only thing about the rehearsal that needs Electron, and
 * `boundary.test.ts` bounds how much Electron-touching code this package may have — a
 * bound the store's hundred-odd lines pushed past. Moved out rather than raising the
 * bound, which is the same call `031` made and for the same reason: the bound is doing its
 * job when it hurts, and what it is asking for is that the platform-specific part be
 * small enough to see.
 *
 * Never inside her vault, and never configurable. A rehearsal root she could point at her
 * own folder is a fictional child one setting away from a real caseload.
 */
export const ensayoRoot = (): string => join(app.getPath('userData'), 'ensayo');
