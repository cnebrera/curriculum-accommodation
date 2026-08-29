/**
 * The interface speaks the teacher's language (006 FR-406).
 *
 * No project jargon anywhere a teacher can see it: no "IR", no "corpus", no
 * "axis", no "harness", no "ingest". She says ficha, adaptación, informe, alumno.
 */
export const es = {
  app: 'Rampa',
  nav: { learners: 'Mis alumnos', adapt: 'Adaptar una ficha', notes: 'Mis notas',
         connection: 'Mi servicio de IA', about: 'Acerca de' },

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
    connectOk: (cost: string) => `✓ Conectado. ${cost} por ficha.`,
    noCard: 'sin tarjeta',
    learnerTitle: 'Tu primer alumno',
    learnerWhy: 'Cuéntame cómo va en clase. No hace falta ningún diagnóstico: con lo que ves tú es suficiente.',
    done: '¡Listo! Ya puedes adaptar tu primera ficha.',
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
    residual: 'Rampa cambia los nombres de tus alumnos por códigos antes de enviar nada, y sus barreras y tus notas viajan sin nombre. Lo que no puede cambiar es lo que va dentro de una foto: si en la ficha que fotografías hay un nombre escrito a mano, ese nombre llega al servicio.',

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
    colCost: 'Coste por ficha',
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
    errBadPrefix: (prefix: string) =>
      `Las claves de este servicio empiezan por «${prefix}». Comprueba que la has copiado entera, desde el principio.`,
    errTooShort: 'Parece que se ha copiado a medias. Vuelve a copiarla entera.',
    errExpired: 'La clave no es válida o ha caducado. Crea otra en la página del servicio y pégala aquí.',
    errNoCredit: 'La clave es correcta, pero la cuenta no tiene saldo. Añade saldo en la página del servicio y vuelve a probar.',
    errNetwork: 'No hay conexión, así que no he podido comprobarla. Tu clave puede estar bien: inténtalo cuando vuelva la conexión.',
    errUnknown: 'No he podido comprobar la clave y no sé por qué. Inténtalo otra vez en un minuto.',

    /** FR-724: the cost comes from the entry, never from a hardcoded three. */
    connectedFree: '✓ Conectado. Este servicio es gratis dentro de su límite.',
    connectedCost: (cost: string) => `✓ Conectado. ${cost} por ficha, estimado.`,
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
    title: 'Adaptar una ficha',
    paste: 'Pega aquí el texto de la ficha',
    forWhom: '¿Para quién?',
    verifyTitle: 'Comprueba que lo he leído bien',
    verifyWhy: 'Si aquí hay un error, se cuela en todo lo demás y luego no se nota, porque la ficha se lee perfectamente.',
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
    'output-incomplete': 'La adaptación ha vuelto incompleta dos veces, así que no te la enseño. Tu última versión buena sigue intacta.',
    'name-unconfirmed': 'Puede que haya un nombre en tus notas. No he enviado nada: dime si es de un alumno y lo sustituyo por su código.',
    'corpus-missing': 'No encuentro las reglas de adaptación. Es un problema de la instalación, no tuyo: vuelve a instalar Rampa.',
    'render-learner-data': 'Iba a aparecer información de tu alumno en su propia ficha. Lo he parado.',
    'render-undescribed': 'Hay una imagen imprescindible sin describir. Sin ella, el ejercicio no se puede resolver.',
    'input-too-large': 'Esta ficha es muy larga. Pártela en dos y lo hacemos por trozos.',
    /* Reading the material (008). Each one says what she does next. */
    'ingest-empty': 'No has añadido ningún fichero.',
    'ingest-format': 'No sé leer ese tipo de fichero. Fotos (JPG, PNG, HEIC), PDF, Word (.docx) o texto.',
    'ingest-unusable': 'La foto no se puede leer. Vuelve a hacerla con más luz, y con la hoja lo más plana y recta que puedas.',
    'ingest-many-sheets': 'Parece que hay más de una hoja en la misma foto. Haz una foto de cada hoja por separado.',
    'ingest-no-vision': 'El servicio que tienes conectado no lee fotos. Cámbialo en «Mi servicio de IA», o pega el texto de la ficha.',
    'ingest-failed': 'No he podido leer ninguna página. Mira los avisos de cada una: casi siempre es la luz o el encuadre.',
    'key-missing': 'Todavía no has conectado Rampa con tu servicio de IA.',
    'key-invalid': 'La clave ya no vale. Habrá que ponerla otra vez.',
    'key-no-credit': 'La clave es correcta pero la cuenta no tiene saldo.',
    'key-wrong-provider': 'Esa clave es de otro servicio.',
    offline: 'No hay conexión. Todo lo demás sigue funcionando: puedes leer tus notas y volver a imprimir.',
    'rate-limited': 'El servicio está ocupado. No es culpa tuya: espera un poco y vuelve a intentarlo.',
    'provider-failed': 'El servicio ha fallado. Vuelve a intentarlo en un momento.',
    unknown: 'Algo ha ido mal. No he perdido nada de lo tuyo.',
  } as Record<string, string>,
};

export type Strings = typeof es;
