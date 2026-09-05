/**
 * The interface speaks the teacher's language (006 FR-406).
 *
 * No project jargon anywhere a teacher can see it: no "IR", no "corpus", no
 * "axis", no "harness", no "ingest". She says examen, ficha, apuntes, adaptación,
 * informe, alumno — and «ficha» is one kind of material among four (012 FR-1011),
 * not the word for all of it.
 */
export const es = {
  app: 'Rampa',
  // 012 FR-1011. It used to say «Adaptar una ficha» here and on four more
  // screens, so a teacher who reads it everywhere concludes the application does
  // not do exams — which was true of the interface and never of the pipeline.
  /*
   * `work` replaced `adapt` (016 FR-1402). «Adaptar material» named one of the two
   * things this application does, on the control that leads to both — and `012`
   * FR-1011 forbids exactly that: the interface must stop using one word for
   * several things.
   */
  /*
   * `settings` and `pictograms` added by `025`: «Mi servicio de IA» and «Acerca de»
   * became sections of Configuración rather than siblings of «Mis alumnos», so their
   * keys stay and gain two neighbours. The rail reads all of them from here — a label
   * hardcoded in a component is a label the locale sweep cannot reach.
   */
  nav: { learners: 'Mis alumnos', work: 'Preparar material', notes: 'Mis notas',
         connection: 'Mi servicio de IA', about: 'Acerca de y licencias',
         settings: 'Configuración', pictograms: 'Pictogramas',
         // `029`: which normativa her documents are written in. A fact about her
         // school, not about a child — so it lives beside the pictogram set.
         normative: 'Normativa' },

  onboarding: {
    welcome: 'Vamos a dejarlo listo',
    intro: 'Tres pasos. Puedes cerrar y seguir mañana: no se pierde nada.',
    vaultTitle: '¿Dónde guardo tus cosas?',
    vaultWhy: 'Aquí se quedan tus alumnos y tus notas. Son tuyas: puedes abrirlas con cualquier editor y hacer copia copiando la carpeta.',
    vaultChoose: 'Elegir otra carpeta',
    vaultAccept: 'Usar esta carpeta',
    connectTitle: 'Conectar con tu servicio de IA',
    connectWhy: 'Rampa usa tu propia cuenta de IA. Necesita una clave, que es como una contraseña que le das tú.',
    connectGet: 'Abrir la página para conseguir la clave',
    connectPaste: 'Pega aquí la clave',
    connectCheck: 'Comprobar',
    /*
     * `connectOk` used to live here — a **third** wording of the same sentence
     * («por documento»), written by nobody and read by nobody: `009` replaced the
     * onboarding paste box with its own wizard, and `connect.connectedCost` is the
     * sentence that actually reaches her. Removed rather than left, because the
     * amendment P36 just made to that sentence would have had a stale twin sitting
     * beside it waiting for somebody to reach for it.
     */
    noCard: 'sin tarjeta',
    learnerTitle: 'Tu primer alumno',
    learnerWhy: 'Cuéntame cómo va en clase. No hace falta ningún diagnóstico: con lo que ves tú es suficiente.',
    done: '¡Listo! Ya puedes adaptar tu primer material.',
  },

  /**
   * Connecting (009). Every fact about a service comes from the catalogue in
   * `instructions/providers/`; only the words that are about *the interface*
   * live here. A cost figure or a jurisdiction claim in this file would be the
   * Principle I leak the whole feature exists to prevent.
   */
  connect: {
    cardQuestion: '¿Puedes usar una tarjeta para esto?',
    cardWhy: 'Es lo único que necesito saber para recomendarte uno. Muchos centros no dejan, y hay opciones gratis.',
    cardYes: 'Sí, puedo',
    cardNo: 'No, o prefiero que no',
    cardNoHint: 'Te recomendaré uno gratuito que además lea fotos.',

    locationQuestion: '¿Te ha dicho tu centro dónde pueden procesarse los datos?',
    locationWhy: 'Si no lo sabes, no pasa nada: no cambia lo que te recomiendo.',
    locationEu: 'Sí, tiene que ser en la Unión Europea',
    locationAny: 'No me han dicho nada',
    locationUnknown: 'No lo sé',
    locationHelp: 'Leer sobre protección de datos',

    /**
     * FR-708a. This sentence must never claim that nothing personal leaves the
     * machine, because that would be false: a name handwritten on a photographed
     * worksheet travels inside the image.
     */
    residual: 'Rampa cambia los nombres de tus alumnos por códigos antes de enviar nada, y sus barreras y tus notas viajan sin nombre. Lo que no puede cambiar es lo que va dentro de una foto: si en la hoja que fotografías hay un nombre escrito a mano, ese nombre llega al servicio.',

    recommendTitle: 'Te recomiendo este',
    recommendWhy: '¿Por qué este?',
    recommendUse: 'Usar este',
    recommendCompare: 'Ver todos y comparar',
    recommendBack: 'Volver a la recomendación',

    conflictTitle: 'No puedo recomendarte ninguno',

    compareTitle: 'Todos los servicios',
    compareIntro: 'Lo que de verdad decide, con la fecha en que lo comprobamos. Ninguno está aprobado ni certificado por nosotros: son datos suyos, con su fecha.',
    colService: 'Servicio',
    colCard: '¿Tarjeta?',
    colFree: '¿Hay algo gratis?',
    colCost: 'Coste por hoja adaptada',
    colWhere: '¿Dónde se procesa?',
    colTrains: '¿Entrena con lo que envías?',
    colPhotos: '¿Lee fotos?',
    colSuits: '¿Para quién?',
    yes: 'Sí', no: 'No',
    cardNeeded: 'Pide tarjeta', cardNotNeeded: 'Sin tarjeta',
    photosYes: 'Lee fotos', photosNo: 'No lee fotos',
    trains: {
      no: 'Dicen que no',
      yes: 'Sí',
      'opt-out': 'Sí, salvo que lo desactives en tu cuenta',
      unclear: 'Sus condiciones no lo dejan claro',
    } as Record<string, string>,
    estimate: 'estimado',
    estimateWhy: 'De momento por lo que sabemos, no por lo que hemos medido.',
    provisional: 'provisional',
    provisionalWhy: 'Todavía no hemos comparado a fondo la calidad de las adaptaciones. El orden es provisional.',
    checkedOn: (date: string) => `comprobado el ${date}`,
    checkedAgo: (months: number) => `comprobado hace ${months} ${months === 1 ? 'mes' : 'meses'}`,
    /** FR-706: past 180 days she is told, because a fact has a shelf life. */
    ageingWhy: 'Estos datos llevan un tiempo sin comprobarse. Míralos en la página del servicio antes de decidir algo importante.',
    aggregator: 'Este servicio puede reenviar la petición a otro, así que «dónde se procesa» depende de cada petición. Si en tu centro necesitan una respuesta concreta, esta no lo es.',

    walkthroughTitle: (label: string) => `Cómo conseguir tu clave de ${label}`,
    beforeYouStart: 'Antes de empezar',
    stepsTitle: 'Pasos',
    openPage: 'Abrir la página',
    openPageHint: 'Se abre en tu navegador, fuera de Rampa.',
    cantFind: 'No encuentro eso',
    otherService: 'Prefiero otro servicio',

    pasteLabel: 'Pega aquí la clave',
    pasteHint: 'No se muestra mientras escribes, y se guarda cifrada en este ordenador.',
    checking: 'Comprobando…',

    /* The five failure sentences (T031). Each one names a different next step. */
    errEmpty: 'No has pegado nada. Copia la clave de la página que has abierto y pégala aquí.',
    errPage: 'Eso parece la página entera, no la clave. Busca la cadena de letras y números y copia solo esa.',
    errWrongService: (owner: string, current: string) =>
      `Esa clave es de ${owner}, no de ${current}. Puedo cambiar a ${owner}, o pega la clave de ${current}.`,
    errSwitchTo: (owner: string) => `Cambiar a ${owner}`,
    errTooShort: 'Parece que se ha copiado a medias. Vuelve a copiarla entera.',
    errExpired: 'La clave no es válida o ha caducado. Crea otra en la página del servicio y pégala aquí.',
    errNoCredit: 'La clave es correcta, pero la cuenta no tiene saldo. Añade saldo en la página del servicio y vuelve a probar.',
    errNetwork: 'No hay conexión, así que no he podido comprobarla. Tu clave puede estar bien: inténtalo cuando vuelva la conexión.',
    errUnknown: 'No he podido comprobar la clave y no sé por qué. Inténtalo otra vez en un minuto.',

    /** FR-724: the cost comes from the entry, never from a hardcoded three. */
    connectedFree: '✓ Conectado. Este servicio es gratis dentro de su límite.',
    /*
     * «Por hoja adaptada», not «por ficha» (decision P36, review CONS-34).
     *
     * `012` FR-1011 says the interface must stop calling everything «una ficha»,
     * because a teacher who reads it everywhere concludes the application does not
     * do exams and never tries. This sentence is on the **first** screen she sees,
     * so it was the loudest place the two MUSTs contradicted each other. Resolved
     * by changing the copy, with no exception to the rule.
     */
    connectedCost: (cost: string) => `✓ Conectado. ${cost} por hoja adaptada, estimado.`,
  },

  learner: {
    codeExplain: 'Le pongo un código en vez del nombre. El nombre se queda cifrado en tu ordenador y nunca sale de aquí.',
    nameLabel: '¿Cómo se llama? (solo lo verás tú)',
    newCode: 'Generar código',
    axesTitle: 'Qué le cuesta',
    axesHelp: 'Puntúa solo lo que hayas visto. Lo que no hayas observado, déjalo en blanco: en blanco no es lo mismo que cero.',
    unobserved: 'sin observar',
    works: 'Lo que ya te funciona con él',
    avoid: 'Lo que hay que evitar',
    save: 'Guardar',
  },

  adapt: {
    title: 'Adaptar material',
    paste: 'O pega aquí el texto',
    forWhom: '¿Para quién?',
    verifyTitle: 'Comprueba que lo he leído bien',
    verifyWhy: 'Si aquí hay un error, se cuela en todo lo demás y luego no se nota, porque el documento se lee perfectamente.',
    verifyOk: 'Está bien leído, sigue',
    run: 'Adaptar',
    working: 'Trabajando',
    report: 'Qué he cambiado y por qué',
    print: 'Guardar como PDF',
  },

  review: {
    title: 'Revisar y firmar',
    lead: 'Empieza por esto, que es donde suele estar el problema.',
    signOff: 'Lo he mirado y lo doy por bueno',
    signedOff: 'Firmado. La marca de borrador ya no aparece.',
    scopeQuestion: '¿Esto es de este alumno, de cómo trabajas tú, o de la regla?',
    scopeLearner: 'De este alumno',
    scopePractice: 'De cómo trabajo yo',
    scopeCorpus: 'De la regla',
    scopeWhy: 'Lo pregunto porque solo tú lo sabes, y si me lo invento puedo acabar mandando algo de tu alumno a un sitio compartido.',
    captured: 'Apuntado. No te lo volveré a hacer igual.',
  },

  errors: {
    'vault-path-escape': 'He intentado escribir fuera de tu carpeta y lo he parado. Es un fallo mío, no tuyo.',
    'vault-unreadable': 'No he podido leer ese fichero.',
    'ir-unverified': 'Antes de adaptar, comprueba que he leído bien el material.',
    'ir-no-provenance': 'Algo ha cambiado sin que yo pueda decirte por qué. No te lo enseño así.',
    /*
     * Absent: the thrown message distinguishes «llegó a medias» from «faltaban 3 trozos
     * sin decir por qué», which are different situations with different next steps. A
     * single template collapses them.
     */
    /*
     * **Deliberately absent**, and this is the entry that used to be here.
     *
     * The error this kind carries names the word it found — «Hay un posible nombre en tus
     * notas: Marta» — and a generic translation **replaced** that with «puede que haya un
     * nombre», deleting the one thing she needs to act on. Carlos hit it: «no entiendo
     * este mensaje».
     *
     * Same mechanism as the `unknown` defect fixed on 2026-09-01, in the other direction:
     * there a translation existed for «we have no idea» and beat a message that did; here
     * a translation exists for a message that carries data the template cannot have.
     *
     * The rule, asserted in `ui/test/error-text.test.ts`: **a kind whose message carries
     * a specific value gets no translation.** The message from the main process is
     * already her language — `013` FR-1109 requires that — so passing it through is not
     * a fallback, it is the correct answer.
     */
    'corpus-missing': 'No encuentro las reglas de adaptación. Es un problema de la instalación, no tuyo: vuelve a instalar Rampa.',
    /*
     * PROD-01, decision P1. The thrown message names the axes, so this is the
     * fallback and not the sentence she normally reads — same arrangement as
     * `name-unconfirmed`, where the value she needs is in the message.
     */
    'no-recipes-apply': 'Con lo que sé de este alumno no tengo ninguna adaptación que aplicar. No he enviado nada ni te he cobrado.',
    'render-learner-data': 'Iba a aparecer información de tu alumno en su propia ficha. Lo he parado.',
    'render-undescribed': 'Hay una imagen imprescindible sin describir. Sin ella, el ejercicio no se puede resolver.',
    'input-too-large': 'Esta ficha es muy larga. Pártela en dos y lo hacemos por trozos.',
    // 012 FR-1003. Deliberately not "algo ha ido mal": the fix is one click and
    // she is the only one who knows the answer.
    'material-kind-missing': 'Dime primero qué es esto: una ficha, un examen, apuntes o una hoja de problemas.',
    /*
     * Composing (002). Neither is a fault: the first is an empty form and the
     * second is a perfectly good objective that needs the other route.
     */
    'compose-no-objective': 'Dime primero qué quieres que aprenda.',
    'compose-needs-anchor': 'Eso es contenido, no una destreza que yo pueda comprobar. Necesito algo en lo que apoyarlo: la página del libro, tus apuntes, o las tres frases que dirías en clase.',
    /*
     * The guide (017). Neither is a fault: the first is a learner Rampa has not
     * worked with yet, and the second is a procedural requirement that exists to
     * protect the child rather than the file.
     */
    'guide-no-work': 'Todavía no he adaptado nada para este alumno, así que no tengo con qué redactar su adaptación. Adapta algo primero y vuelve.',
    'guide-no-evaluation': 'Sin evaluación psicopedagógica una adaptación significativa no puede seguir adelante: es nula de procedimiento. Si existe y no lo he visto, dímelo.',
    /*
     * Deliberately short here (`027` FR-2509). The sentence that carries the argument
     * lives in `instructions/material-kinds.md` — a PT has to be able to correct it —
     * and the job throws it as the message, so this catch-all is only reached if that
     * corpus file is missing.
     */
    /*
     * The two the conversation adds. Both are short here because the job throws the
     * sentence that carries the argument; this is the fallback if it ever does not.
     */
    'stale-reading': 'Esa hoja se hizo con una lectura que ha cambiado. Vuelve a adaptarla y seguimos desde ahí.',
    'turn-in-flight': 'Todavía estoy con el cambio anterior de este documento. Espera a que termine.',
    'revision-missing': 'Ya no encuentro esa versión en tu carpeta. Las que quedan siguen ahí.',
    'compose-exam-other-course': 'Un examen de otro curso evalúa otras cosas, y eso lo decide el equipo docente. Tráeme su adaptación curricular y lo compongo a ese nivel.',
    /*
     * `pictogram-language` has **no** entry here, deliberately.
     *
     * Its message names the publisher and the language — «ARASAAC no tiene
     * pictogramas en este idioma (eu)» — and a template here would beat it, which is
     * the inversion this project fixed twice on 2026-09-01 in both directions.
     */
    'pictogram-not-accepted': 'Todavía no has aceptado la licencia de los pictogramas, así que no he pedido ninguno. La tienes justo arriba.',
    'pictogram-no-publisher': 'No tengo de dónde traer pictogramas. Puedes seguir usando una carpeta que ya tengas.',
    /* Reading the material (008). Each one says what she does next. */
    'ingest-empty': 'No has añadido ningún fichero.',
    /*
     * Absent for the same reason as `name-unconfirmed`: the thrown message names **which**
     * file type it could not read, or says the drop was mixed and why the order is
     * unknowable. This template said «ese tipo de fichero» and deleted the answer to the
     * only question she has.
     */
    'ingest-unusable': 'La foto no se puede leer. Vuelve a hacerla con más luz, y con la hoja lo más plana y recta que puedas.',
    'ingest-many-sheets': 'Parece que hay más de una hoja en la misma foto. Haz una foto de cada hoja por separado.',
    'ingest-no-vision': 'El servicio que tienes conectado no lee fotos. Cámbialo en «Mi servicio de IA», o pega el texto a mano.',
    'ingest-failed': 'No he podido leer ninguna página. Mira los avisos de cada una: casi siempre es la luz o el encuadre.',
    'key-missing': 'Todavía no has conectado Rampa con tu servicio de IA.',
    'key-invalid': 'La clave ya no vale. Habrá que ponerla otra vez.',
    'key-no-credit': 'La clave es correcta pero la cuenta no tiene saldo.',
    'key-wrong-provider': 'Esa clave es de otro servicio.',
    offline: 'No hay conexión. Todo lo demás sigue funcionando: puedes leer tus notas y volver a imprimir.',
    'rate-limited': 'El servicio está ocupado. No es culpa tuya: espera un poco y vuelve a intentarlo.',
    'provider-failed': 'El servicio ha fallado. Vuelve a intentarlo en un momento.',
    /*
     * A retired model, and the two things she needs to know: it is not her fault,
     * and there is something she can do right now. No version number and no status
     * code — «404» in front of a teacher is our problem wearing her clothes.
     */
    'provider-model-gone': 'Ese servicio ya no ofrece el modelo con el que Rampa habla '
      + 'con él. No es tu clave ni tu material, es cosa mía. Mientras lo arreglo, '
      + 'puedes cambiar de servicio en «Mi servicio de IA».',
    unknown: 'Algo ha ido mal. No he perdido nada de lo tuyo.',
  } as Record<string, string>,
};

export type Strings = typeof es;
