/**
 * The interface speaks the teacher's language (006 FR-406).
 *
 * No project jargon anywhere a teacher can see it: no "IR", no "corpus", no
 * "axis", no "harness", no "ingest". She says ficha, adaptación, informe, alumno.
 */
export const es = {
  app: 'Rampa',
  nav: { learners: 'Mis alumnos', adapt: 'Adaptar una ficha', notes: 'Mis notas', about: 'Acerca de' },

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
    'render-learner-data': 'Iba a aparecer información de tu alumno en su propia ficha. Lo he parado.',
    'render-undescribed': 'Hay una imagen imprescindible sin describir. Sin ella, el ejercicio no se puede resolver.',
    'input-too-large': 'Esta ficha es muy larga. Pártela en dos y lo hacemos por trozos.',
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
