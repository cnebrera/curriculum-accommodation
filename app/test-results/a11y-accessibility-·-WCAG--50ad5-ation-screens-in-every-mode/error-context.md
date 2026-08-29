# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> accessibility · WCAG 2.2 AA >> the ingest and verification screens, in every mode
- Location: e2e/a11y.spec.ts:309:7

# Error details

```
Error: axe violations on ingest · oscuro · normal:
  color-contrast (serious) — Elements must meet minimum color contrast ratio thresholds
      .stack > span
      button:nth-child(2)
      button:nth-child(3)

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 6

- Array []
+ Array [
+   "color-contrast (serious) — Elements must meet minimum color contrast ratio thresholds
+       .stack > span
+       button:nth-child(2)
+       button:nth-child(3)",
+ ]
```

# Test source

```ts
  40  |   await page.evaluate((c) => window.rampa.learners.save({
  41  |     code: c, axes: { COG: 3, EJE: 3, DEC: 2, ATE: 2 },
  42  |     works: ['Le funciona hacer el primer ejercicio conmigo, en voz alta, antes de empezar sola'],
  43  |     avoid: ['Nada con cuenta atrás'], interests: ['dinosaurios', 'trenes'],
  44  |     response: { default: 'short' }, language: { instruction: 'es' },
  45  |   }), code);
  46  |   await page.evaluate((c) => window.rampa.names.set(c, 'Lucía'), code);
  47  |   // `detectStep()` asks the system rather than trusting a flag, so getting past
  48  |   // onboarding means genuinely satisfying it: a vault, a learner, and a
  49  |   // configured provider. The key below is deliberately not a key. `providers:save`
  50  |   // does not validate — validation is a separate, explicit step in the wizard —
  51  |   // so this configures the provider without a single byte leaving the machine,
  52  |   // and without adding a test-only bypass to the application.
  53  |   await page.evaluate(() =>
  54  |     window.rampa.providers.save('anthropic', 'sk-ant-e2e-not-a-real-key'));
  55  |   await page.reload();
  56  |   await page.waitForLoadState('domcontentloaded');
  57  |   await page.getByRole('navigation', { name: /Secciones/ }).waitFor({ timeout: 15000 });
  58  |   return code;
  59  | }
  60  | 
  61  | /**
  62  |  * An extraction on disk, so the verification screen has something to render.
  63  |  *
  64  |  * Written through the vault rather than produced by a real ingest, because a real
  65  |  * ingest needs a key — and adding a test-only path that fakes one would weaken
  66  |  * exactly the guarantees this project enforces structurally.
  67  |  */
  68  | async function seedExtraction(page: Page): Promise<void> {
  69  |   await page.evaluate(async () => {
  70  |     await window.rampa.vault.write('material/job-a11y/ir.md',
  71  |       '---\nsource: "photos"\nextraction: {"verified": false, "pages": 1}\n---\n\n'
  72  |       + '::: {#p1-b1 .exercise data-page="1" data-source-id="b1" data-number="3"}\n'
  73  |       + '¿Qué come el búho?\n:::\n');
  74  |     await window.rampa.vault.write('material/job-a11y/extraction.json', JSON.stringify({
  75  |       source: 'photos', boundReached: false, cutPages: [], costCents: 4, verified: false,
  76  |       pages: [{ page: 1, verified: false, problems: [], attempts: 1, flags: [
  77  |         { kind: 'unreadable', message: 'Hay algo que no se ha podido leer.', blockId: 'p1-b1' },
  78  |       ] }],
  79  |     }, null, 2));
  80  |   });
  81  | }
  82  | 
  83  | const MODES = [
  84  |   { name: 'claro · normal',     theme: null,     text: null },
  85  |   { name: 'oscuro · normal',    theme: 'dark',   text: null },
  86  |   { name: 'claro · muy grande', theme: 'light',  text: 'xlarge' },
  87  |   { name: 'oscuro · muy grande', theme: 'dark',  text: 'xlarge' },
  88  | ] as const;
  89  | 
  90  | async function setMode(page: Page, m: typeof MODES[number]): Promise<void> {
  91  |   await page.evaluate(({ theme, text }) => {
  92  |     const r = document.documentElement;
  93  |     if (theme) r.setAttribute('data-theme', theme); else r.removeAttribute('data-theme');
  94  |     if (text) r.setAttribute('data-text', text); else r.removeAttribute('data-text');
  95  |   }, { theme: m.theme, text: m.text });
  96  |   await page.waitForTimeout(120);
  97  | }
  98  | 
  99  | /**
  100 |  * axe-core, injected into the page rather than driven through
  101 |  * `@axe-core/playwright`.
  102 |  *
  103 |  * That wrapper opens a second page to reach cross-origin frames, and Electron's
  104 |  * protocol answers `Target.createTarget: Not supported` — so the recommended
  105 |  * integration cannot run against this application at all. Injecting the library
  106 |  * is the same engine and the same ruleset; what is lost is frame traversal,
  107 |  * which costs nothing here because this window has no frames and, being an
  108 |  * offline desktop application, never will.
  109 |  */
  110 | const axeSource = readFileSync(
  111 |   join(appRoot, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
  112 | 
  113 | interface AxeViolation {
  114 |   id: string; impact: string | null; help: string;
  115 |   nodes: { target: string[] }[];
  116 | }
  117 | 
  118 | async function scan(page: Page, where: string): Promise<void> {
  119 |   if (!(await page.evaluate(() => 'axe' in window))) {
  120 |     await page.evaluate((src) => {
  121 |       // eslint-disable-next-line no-eval
  122 |       (0, eval)(src);
  123 |     }, axeSource);
  124 |   }
  125 |   const violations = await page.evaluate(async () => {
  126 |     const result = await (window as unknown as {
  127 |       axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: AxeViolation[] }> };
  128 |     }).axe.run(document, {
  129 |       runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  130 |       resultTypes: ['violations'],
  131 |     });
  132 |     return result.violations.map((v) => ({
  133 |       id: v.id, impact: v.impact, help: v.help,
  134 |       nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  135 |     }));
  136 |   });
  137 | 
  138 |   const described = violations.map((v) =>
  139 |     `${v.id} (${v.impact}) — ${v.help}\n      ${v.nodes.join('\n      ')}`);
> 140 |   expect(described, `axe violations on ${where}:\n  ${described.join('\n  ')}`).toEqual([]);
      |                                                                                 ^ Error: axe violations on ingest · oscuro · normal:
  141 | }
  142 | 
  143 | test.describe('accessibility · WCAG 2.2 AA', () => {
  144 |   test('onboarding, in every mode', async () => {
  145 |     const { app, page } = await launch();
  146 |     for (const m of MODES) {
  147 |       await setMode(page, m);
  148 |       await scan(page, `onboarding · ${m.name}`);
  149 |     }
  150 |     await app.close();
  151 |   });
  152 | 
  153 |   test('every screen, in every mode', async () => {
  154 |     const { app, page, vault } = await launch();
  155 |     await seed(page, vault);
  156 | 
  157 |     // Navigate by the rail, which is how she does it.
  158 |     const screens = ['Adaptar una ficha', 'Mis alumnos', 'Mis notas', 'Mi servicio de IA', 'Acerca de'];
  159 |     for (const label of screens) {
  160 |       await page.getByRole('button', { name: label }).click();
  161 |       await page.waitForTimeout(200);
  162 |       for (const m of MODES) {
  163 |         await setMode(page, m);
  164 |         await scan(page, `${label} · ${m.name}`);
  165 |       }
  166 |     }
  167 |     await app.close();
  168 |   });
  169 | 
  170 |   /**
  171 |    * FR-809, asserted so that a well-meaning future addition trips it. An
  172 |    * accessibility toggle at first run would mean the default is the
  173 |    * inaccessible one, in an application that adapts material for learners with
  174 |    * disabilities.
  175 |    */
  176 |   test('no accessibility question is asked at first run', async () => {
  177 |     const { app, page } = await launch();
  178 |     const body = (await page.textContent('body'))?.toLowerCase() ?? '';
  179 |     for (const phrase of ['modo accesibilidad', 'accesibilidad?', 'alto contraste?']) {
  180 |       expect(body, `first run asks about "${phrase}"`).not.toContain(phrase);
  181 |     }
  182 |     await app.close();
  183 |   });
  184 | 
  185 |   test('the preferences are reachable and change the whole interface', async () => {
  186 |     const { app, page, vault } = await launch();
  187 |     await seed(page, vault);
  188 | 
  189 |     await page.getByRole('button', { name: /Cómo se ve/i }).click();
  190 |     await page.getByRole('group', { name: 'Tamaño de la letra' })
  191 |       .getByRole('button', { name: 'Muy grande' }).click();
  192 |     await page.waitForTimeout(200);
  193 | 
  194 |     expect(await page.evaluate(() => document.documentElement.getAttribute('data-text')))
  195 |       .toBe('xlarge');
  196 | 
  197 |     // And it survives a reload, because it is persisted outside the vault.
  198 |     await page.reload();
  199 |     await page.waitForLoadState('domcontentloaded');
  200 |     await page.waitForTimeout(400);
  201 |     expect(await page.evaluate(() => document.documentElement.getAttribute('data-text')))
  202 |       .toBe('xlarge');
  203 | 
  204 |     await app.close();
  205 |   });
  206 | 
  207 |   /**
  208 |    * T020. Heading order, landmarks and live regions.
  209 |    *
  210 |    * axe tags `heading-order` and `region` as best practice rather than WCAG, so
  211 |    * the filter above deliberately excludes them and they would go unchecked.
  212 |    * They are checked here instead, because a screen whose headings jump from h1
  213 |    * to h3 is a screen a screen-reader user cannot skim, whatever the tag says.
  214 |    */
  215 |   test('headings step by one and every screen has its landmarks', async () => {
  216 |     const { app, page, vault } = await launch();
  217 |     await seed(page, vault);
  218 | 
  219 |     for (const label of ['Adaptar una ficha', 'Mis alumnos', 'Mis notas', 'Mi servicio de IA', 'Acerca de']) {
  220 |       await page.getByRole('button', { name: label }).click();
  221 |       await page.waitForTimeout(200);
  222 | 
  223 |       const problems = await page.evaluate(() => {
  224 |         const out: string[] = [];
  225 |         const heads = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
  226 |           .filter((h) => (h as HTMLElement).offsetParent !== null || h.tagName === 'H1');
  227 |         if (heads.length === 0) out.push('no headings at all');
  228 |         if (heads[0] && heads[0].tagName !== 'H1') out.push(`starts at ${heads[0].tagName}, not H1`);
  229 |         if (document.querySelectorAll('h1').length > 1) out.push('more than one H1');
  230 |         let prev = 0;
  231 |         for (const h of heads) {
  232 |           const level = Number(h.tagName[1]);
  233 |           if (prev && level > prev + 1) {
  234 |             out.push(`${h.tagName} "${(h.textContent ?? '').slice(0, 30)}" follows H${prev}`);
  235 |           }
  236 |           prev = level;
  237 |         }
  238 |         // The two landmarks that make the window navigable: the rail and the page.
  239 |         if (!document.querySelector('nav[aria-label]')) out.push('no labelled nav landmark');
  240 |         if (!document.querySelector('main')) out.push('no main landmark');
```