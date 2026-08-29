# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> accessibility · WCAG 2.2 AA >> headings step by one and every screen has its landmarks
- Location: e2e/a11y.spec.ts:215:7

# Error details

```
Error: Acerca de: document structure

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "more than one H1",
+ ]
```

# Test source

```ts
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
  241 |         if (document.querySelectorAll('main').length > 1) out.push('more than one main');
  242 |         return out;
  243 |       });
> 244 |       expect(problems, `${label}: document structure`).toEqual([]);
      |                                                        ^ Error: Acerca de: document structure
  245 |     }
  246 |     await app.close();
  247 |   });
  248 | 
  249 |   /**
  250 |    * T021 · SC-803, quickstart §4. Every action reachable from the keyboard, the
  251 |    * ring visible at every stop, and focus never silently lost.
  252 |    *
  253 |    * The last of those is the one a manual pass misses: focus lands on `<body>`
  254 |    * after a re-render and Tab restarts from the top of the window, which for a
  255 |    * keyboard user in the middle of a form is the whole form again.
  256 |    */
  257 |   test('the keyboard reaches everything and never loses the ring', async () => {
  258 |     const { app, page, vault } = await launch();
  259 |     await seed(page, vault);
  260 | 
  261 |     const focusable = await page.evaluate(() =>
  262 |       document.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length);
  263 |     expect(focusable, 'nothing focusable on the screen').toBeGreaterThan(3);
  264 | 
  265 |     const seen: string[] = [];
  266 |     for (let i = 0; i < focusable + 2; i++) {
  267 |       await page.keyboard.press('Tab');
  268 |       const stop = await page.evaluate(() => {
  269 |         const el = document.activeElement as HTMLElement | null;
  270 |         if (!el || el === document.body) return { lost: true, ring: false, id: 'body' };
  271 |         const s = getComputedStyle(el);
  272 |         // A stop with no visible ring is a stop the user cannot see they are on.
  273 |         const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  274 |         return {
  275 |           lost: false, ring,
  276 |           id: `${el.tagName}"${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 20)}"`,
  277 |         };
  278 |       });
  279 |       expect(stop.lost, `Tab ${i + 1} landed on <body>: focus was lost`).toBe(false);
  280 |       expect(stop.ring, `${stop.id} has no visible focus ring`).toBe(true);
  281 |       seen.push(stop.id);
  282 |     }
  283 | 
  284 |     // It went somewhere rather than sticking on one control.
  285 |     expect(new Set(seen).size).toBeGreaterThan(3);
  286 | 
  287 |     // And a state change keeps focus inside the application. Opening the
  288 |     // preferences panel re-renders the rail; the button that opened it must
  289 |     // still be where the user left their hands.
  290 |     const prefs = page.getByRole('button', { name: /Cómo se ve/i });
  291 |     await prefs.focus();
  292 |     await page.keyboard.press('Enter');
  293 |     await page.waitForTimeout(200);
  294 |     const stillThere = await page.evaluate(() =>
  295 |       (document.activeElement?.textContent ?? '').includes('Cómo se ve'));
  296 |     expect(stillThere, 'focus was lost when the preferences panel opened').toBe(true);
  297 | 
  298 |     await app.close();
  299 |   });
  300 |   /**
  301 |    * T026 · the ingest and verification screens.
  302 |    *
  303 |    * Not reachable from the rail — ingest is behind a button on the adapt screen
  304 |    * and verification is behind a completed extraction — so a suite that walks the
  305 |    * rail misses both. They are the two screens most likely to fail: one is a drop
  306 |    * target with a warning, the other is a page image beside a column of editable
  307 |    * textareas.
  308 |    */
  309 |   test('the ingest and verification screens, in every mode', async () => {
  310 |     const { app, page, vault } = await launch();
  311 |     await seed(page, vault);
  312 | 
  313 |     await page.getByRole('button', { name: 'Adaptar una ficha' }).click();
  314 |     await page.getByRole('button', { name: /Traer una foto/ }).click();
  315 |     await page.getByRole('heading', { name: /Adaptar una ficha/ }).waitFor();
  316 |     for (const m of MODES) { await setMode(page, m); await scan(page, `ingest · ${m.name}`); }
  317 | 
  318 |     /*
  319 |      * And the verification screen, reached the way she reaches it.
  320 |      *
  321 |      * The first version of this test seeded an extraction, reloaded, and closed
  322 |      * the window — it passed while never rendering the screen it was named
  323 |      * after. There was no way to reach it: the verification screen could only be
  324 |      * opened by the ingest that produced it, so an extraction she did not finish
  325 |      * confirming was lost along with what it cost. Writing this test is what
  326 |      * found that, and "Seguir con esto" is what fixed it.
  327 |      */
  328 |     await seedExtraction(page);
  329 |     await page.reload();
  330 |     await page.waitForLoadState('domcontentloaded');
  331 |     await page.getByRole('button', { name: 'Adaptar una ficha' }).click();
  332 |     await page.getByRole('button', { name: /Traer una foto/ }).click();
  333 |     await page.getByRole('button', { name: 'Seguir con esto' }).click();
  334 |     await page.getByRole('heading', { name: /Comprueba que lo he leído bien/ })
  335 |       .waitFor({ timeout: 15000 });
  336 | 
  337 |     for (const m of MODES) { await setMode(page, m); await scan(page, `verificación · ${m.name}`); }
  338 | 
  339 |     // The order FR-608 requires, asserted where it is actually rendered: the
  340 |     // unreadable flag before the prose she would otherwise start reading.
  341 |     const html = await page.innerHTML('main');
  342 |     expect(html.indexOf('no se ha podido leer'))
  343 |       .toBeLessThan(html.indexOf('Lo que he leído'));
  344 | 
```