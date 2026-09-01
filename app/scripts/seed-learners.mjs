/**
 * Seven learners to try the application with (from use, 2026-09-01).
 *
 * Carlos: «me puedes generar 6 o 7 alumnos con distintas necesidades y características
 * para tenerlo de prueba?» — and the request is more useful than it looks, because a
 * caseload of two hides most of what this application does. Filters, grouping, the
 * narrow layout and the whole shape of the list only mean anything at a realistic size.
 *
 * ## These children do not exist, and that is a requirement
 *
 * ADR 0002 forbids clinical material in this repository, and the same reasoning applies
 * to anything shaped like a real caseload: **a synthetic profile can be argued about in
 * public, and a real one cannot.** So the names are ordinary given names with no surname,
 * the schools are invented, and every profile was written to exercise a *combination of
 * barriers* rather than to resemble anybody.
 *
 * They are also deliberately **not** diagnoses. Principle V: a profile says what a child
 * finds hard and how he responds best, never what he is called by a report. The comment
 * beside each one describes the classroom situation it is meant to produce, which is the
 * only thing these numbers are for.
 *
 * ## What it writes
 *
 * Profiles, names and notes, into the vault the application currently has open. Nothing
 * else — no jobs, no adapted sheets, no journal. Those come from using it, and a seeded
 * history would be a history nobody can explain.
 *
 * Usage:
 *   node scripts/seed-learners.mjs           # into the vault the app has open
 *   node scripts/seed-learners.mjs --dry     # print what it would write
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Axes: PER-V, PER-A, DEC, LIN, COG, ATE, EJE, MOT, REG, CUR — 0 to 3, or absent.
 *
 * **Absent is not zero.** `018`/`010` are explicit about this: an unobserved axis is
 * unobserved, and recording a 0 she never checked is a fact she did not establish. So
 * every profile here leaves out what a teacher would not have looked at yet.
 */
const LEARNERS = [
  {
    name: 'Lucía',
    // Reads fluently, loses the thread past two instructions. The commonest case in an
    // aula de apoyo and the one the recipes were first written for.
    year: 'es:primaria-4', age: 9, school: 'CEIP Los Almendros',
    axes: { COG: 2, ATE: 2, EJE: 1 },
    interests: ['caballos', 'dibujar'],
    works: ['Una instrucción por línea', 'Sabe pedir ayuda si el enunciado es corto'],
    avoid: ['Enunciados con dos preguntas dentro'],
    response: { default: 'Escribe poco pero bien. Mejor pocas preguntas abiertas.' },
    notes: 'Se bloquea si la hoja está muy llena. Con la mitad de ejercicios por página termina.',
  },
  {
    name: 'Marco',
    // Low vision. The presentation axes are what matter and the cognitive ones are
    // untouched — the case that catches an application which confuses «needs adaptation»
    // with «needs less content».
    year: 'es:primaria-5', age: 10, school: 'CEIP Los Almendros',
    axes: { 'PER-V': 3, ATE: 1 },
    interests: ['dinosaurios', 'trenes'],
    works: ['Letra de 16 puntos', 'Mucho espacio entre líneas', 'Nada de gris sobre blanco'],
    avoid: ['Fotocopias de fotocopias', 'Ejercicios de unir con flechas'],
    response: { default: 'Contesta de viva voz mejor que por escrito.' },
    notes: 'Ve mejor por la mañana. No usa braille: lo suyo es tamaño y contraste.',
  },
  {
    name: 'Aitana',
    // Dyslexia-shaped: decoding is the barrier and content is not. Exists here so
    // «adapt the how, never the what» (Principle III) has something to be tested against.
    year: 'es:primaria-6', age: 11, school: 'CEIP Los Almendros',
    axes: { DEC: 3, LIN: 1, REG: 1 },
    interests: ['fútbol', 'cocina'],
    works: ['Leerle el enunciado en voz alta', 'Tipografía sin serifa', 'Texto en trozos cortos'],
    avoid: ['Copiar del libro', 'Textos largos sin apartados'],
    response: { default: 'Sabe mucho más de lo que escribe. Preguntar en voz alta.' },
    notes: 'Con el enunciado leído hace lo mismo que el resto. El problema es la lectura, no el contenido.',
  },
  {
    name: 'Iker',
    // Communicates with pictograms as his main route. The least frequent case and the
    // one 018 is about — kept in the set so the pictogram path has somebody real-shaped.
    year: 'es:especial', age: 12, school: 'CEE Vega Baja',
    axes: { LIN: 3, DEC: 3, COG: 3, MOT: 2, REG: 2 },
    interests: ['agua', 'música'],
    works: ['Pictogramas en todo', 'Una acción por imagen', 'Rutina siempre igual'],
    avoid: ['Cambios sin avisar', 'Hojas con más de dos elementos'],
    response: { default: 'Señala. No escribe.' },
    notes: 'Usa ARASAAC en clase desde infantil: el vocabulario ya lo tiene aprendido.',
  },
  {
    name: 'Noa',
    // Attention and self-regulation, nothing else. The case where the right adaptation is
    // about the shape of the session rather than about the text.
    year: 'es:primaria-2', age: 7, school: 'CEIP Miguel Hernández',
    axes: { ATE: 3, REG: 2, EJE: 2 },
    interests: ['gatos', 'pintar'],
    works: ['Tandas de cinco minutos', 'Saber cuánto queda', 'Empezar por lo que sabe hacer'],
    avoid: ['Hojas de veinte cuentas', 'Cronómetros a la vista'],
    response: { default: 'Oral, y en cuanto lo sabe. Si espera, se le va.' },
    notes: 'Tres ejercicios y descanso funciona mejor que diez seguidos.',
  },
  {
    name: 'Hugo',
    // Two years behind in mathematics and at course level in language. Here because it is
    // the case FR-129 was written for: his enrolled course is not the level of his
    // material, and only she knows which.
    year: 'es:eso-1', age: 12, school: 'IES Cabo de Palos',
    axes: { COG: 2, CUR: 3, ATE: 1 },
    interests: ['videojuegos', 'baloncesto'],
    works: ['Volver a lo de 4.º en mates', 'Ejemplos antes de la regla'],
    avoid: ['Material que parezca de pequeños'],
    response: { default: 'Bien por escrito. Le da vergüenza preguntar en voz alta.' },
    notes: 'En lengua va con su curso. En mates necesita material de dos cursos antes, y le importa mucho que no lo parezca.',
  },
  {
    name: 'Sara',
    // Motor: she knows it and cannot write it. The case that makes the response route
    // (`019`'s MOT axis) matter, and the one where a worksheet with small boxes is the
    // whole barrier.
    year: 'es:primaria-3', age: 8, school: 'CEIP Miguel Hernández',
    axes: { MOT: 3, 'PER-V': 1 },
    interests: ['perros', 'cuentos'],
    works: ['Contestar señalando o marcando', 'Casillas grandes', 'Ordenador cuando hay que escribir'],
    avoid: ['Escribir a mano párrafos', 'Rellenar huecos pequeños'],
    response: { default: 'Marca la opción correcta. Escribir a mano la agota antes de acabar.' },
    notes: 'Lo sabe todo; el cuello de botella es la mano. Con opciones marcables rinde como cualquiera.',
  },
];

const dry = process.argv.includes('--dry');

/**
 * The vault the application currently has open, from its own settings.
 *
 * `settings.json` in the OS application-data directory, which is where `006` FR-401 put
 * it deliberately: **never inside the vault**, because the vault has to stay portable and
 * a copied folder must not carry another machine's paths.
 */
async function currentVault() {
  for (const dir of ['rampa', 'Rampa']) {
    const settings = join(homedir(), 'Library', 'Application Support', dir, 'settings.json');
    try {
      const raw = JSON.parse(await readFile(settings, 'utf8'));
      if (raw?.vaultRoot) return raw.vaultRoot;
    } catch { /* try the next one */ }
  }
  throw new Error(
    'No encuentro la carpeta que tiene abierta la aplicación. Ábrela una vez y vuelve a ejecutar esto.');
}

const yaml = (learner, code) => [
  `code: "${code}"`,
  `year: "${learner.year}"`,
  `age: ${learner.age}`,
  `school: "${learner.school}"`,
  'axes:',
  ...Object.entries(learner.axes).map(([k, v]) => `  "${k}": ${v}`),
  'interests:',
  ...learner.interests.map((i) => `  - "${i}"`),
  'works:',
  ...learner.works.map((w) => `  - "${w}"`),
  'avoid:',
  ...learner.avoid.map((a) => `  - "${a}"`),
  'response:',
  ...Object.entries(learner.response).map(([k, v]) => `  ${k}: "${v}"`),
  'language:',
  '  instruction: "es"',
  '',
].join('\n');

const root = await currentVault();
console.log(`Carpeta: ${root}\n`);

/*
 * Codes are sequential and boring on purpose. `newCode()` in the application derives one
 * from a counter; here the point is that a seeded caseload is recognisable as seeded — if
 * these ever sat beside real learners, «S1» is a clue and a plausible code is not.
 */
const lines = [];
for (const [i, learner] of LEARNERS.entries()) {
  const code = `S${i + 1}`;
  const dir = join(root, 'profiles', code);
  lines.push(`${code}  ${learner.name.padEnd(7)} ${learner.year.padEnd(18)} ${learner.age} años`);
  if (dry) continue;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'profile.yaml'), yaml(learner, code), 'utf8');
  await writeFile(join(dir, 'notes.md'), `# Notas\n\n${learner.notes}\n`, 'utf8');
}

console.log(lines.join('\n'));

if (dry) {
  console.log('\n(--dry: no he escrito nada)');
} else {
  /*
   * The names are **not** written here, and that is the one thing this script cannot do.
   *
   * They live encrypted in `.rampa/names.enc`, behind the OS keychain, which only the
   * application can open (`003`). So it prints them for her to type once — seven names —
   * rather than writing a plaintext name map beside the profiles, which is exactly the
   * file this project is built to not have.
   */
  console.log('\nHecho: siete perfiles escritos.\n');
  console.log('Los nombres no los escribe este script y no puede: van cifrados en el');
  console.log('llavero del sistema (`003`), y esa puerta sólo la abre la aplicación.');
  console.log('Un fichero de nombres en claro junto a los perfiles es exactamente el');
  console.log('fichero que este proyecto existe para no tener.\n');
  console.log('Pega esto en la consola de Rampa (Ver → Herramientas de desarrollo) y ya:\n');
  /*
   * A line to paste rather than a file to import, and rather than a dev-only IPC channel.
   *
   * It uses the same `names:set` a screen uses, so the names end up encrypted by the same
   * path with no new surface — and there is no mechanism left behind that somebody could
   * later point at real children.
   */
  const pairs = LEARNERS.map((l, i) => `['S${i + 1}','${l.name}']`).join(',');
  console.log(`  for (const [c,n] of [${pairs}]) await window.rampa.names.set(c,n)\n`);
}
