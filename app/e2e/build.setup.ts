import { execFileSync } from 'node:child_process';

/**
 * Build before every e2e run (013 T028).
 *
 * `npm run test:e2e` always built first. `npx playwright test` did not, and the
 * difference is invisible: the suite launches `out/main/main.js`, so a stale
 * build produces a full green run against the code as it was some commits ago.
 *
 * That is not hypothetical. Two real defects — a rail unreadable in dark mode
 * because `--ground` was added to `:root` and to no other theme, and an About
 * screen with two `<h1>`s after it was recomposed onto the page shell — were
 * both introduced, reported green, and committed on the strength of a run
 * against the previous build. They surfaced only when something else forced a
 * rebuild.
 *
 * A convention that only holds when you remember the longer command is not a
 * defence (Principle IX). This is the same guarantee, moved into the config.
 */
export default function build(): void {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
}
