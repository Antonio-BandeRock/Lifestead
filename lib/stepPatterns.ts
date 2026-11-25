// Break it into small steps (Q61, 1.0.96.4): where the steps come from. A
// task's words are matched against lists kept here, and the person's routines
// and tasks already broken down are offered beside them. Nothing is sent
// anywhere and no model reads the task; a list is only a place to start, and
// nothing is saved until the person says so.
//
// Pure, with no imports, so scripts/test_step_patterns.js runs it without a
// phone. Every step is English here and shown through t().

export type StepPattern = {
  id: string;
  label: string;
  /** Whole words, English and Spanish, lower case and without accents. */
  words: readonly string[];
  steps: readonly string[];
};

export const STEP_PATTERNS: readonly StepPattern[] = [
  {
    id: 'cleanRoom',
    label: 'Cleaning a room',
    words: ['clean', 'cleaning', 'tidy', 'tidying', 'bedroom', 'bathroom', 'vacuum', 'mop', 'limpiar', 'limpieza', 'ordenar', 'recamara', 'bano', 'trapear', 'aspirar'],
    steps: [
      'Open a window or turn on a light',
      'Put the trash in a bag',
      'Take dishes and cups to the kitchen',
      'Put clothes in the laundry basket',
      'Put away what belongs in another room',
      'Wipe one surface',
      'Sweep or vacuum the floor',
      'Take the trash out',
    ],
  },
  {
    id: 'kitchen',
    label: 'Cleaning the kitchen',
    words: ['kitchen', 'dishes', 'fridge', 'oven', 'cocina', 'trastes', 'platos', 'refrigerador', 'refri', 'horno'],
    steps: [
      'Put food away that needs to be cold',
      'Throw away scraps and packaging',
      'Put the dishes by the sink',
      'Wash the dishes or load the dishwasher',
      'Wipe the counter',
      'Wipe the stove',
      'Sweep the floor',
    ],
  },
  {
    id: 'laundry',
    label: 'Doing the laundry',
    words: ['laundry', 'washing', 'clothes', 'sheets', 'towels', 'lavar', 'ropa', 'sabanas', 'toallas', 'lavanderia'],
    steps: [
      'Gather the clothes into one pile',
      'Check the pockets',
      'Put one load in and start it',
      'Set a timer for when it ends',
      'Move the load to dry',
      'Fold or hang what is dry',
      'Put it away',
    ],
  },
  {
    id: 'phoneCall',
    label: 'Making a phone call',
    words: ['call', 'phone', 'ring', 'telephone', 'llamar', 'llamada', 'telefono', 'marcar'],
    steps: [
      'Find the number',
      'Write down what the call is for, in one line',
      'Put any account or reference number in front of you',
      'Write down the first sentence to say',
      'Make the call',
      'Write down what was said and who said it',
      'Put any date it gave into the app',
    ],
  },
  {
    id: 'email',
    label: 'Writing a message or an email',
    words: ['email', 'emails', 'mail', 'reply', 'message', 'letter', 'write', 'correo', 'correos', 'responder', 'mensaje', 'carta', 'escribir'],
    steps: [
      'Open the message you are answering, or start a new one',
      'Write one line that says what you need',
      'Add the details they will ask for',
      'Attach what goes with it',
      'Read it once',
      'Send it',
    ],
  },
  {
    id: 'bill',
    label: 'Handling a bill',
    words: ['bill', 'bills', 'pay', 'payment', 'invoice', 'rent', 'pagar', 'pago', 'factura', 'recibo', 'renta', 'cuenta'],
    steps: [
      'Find the bill',
      'Read the amount and the date it is due',
      'Check it is right',
      'Find how it can be paid',
      'Pay it',
      'Write down the confirmation number',
      'Put the bill where you keep them',
    ],
  },
  {
    id: 'paperwork',
    label: 'Filling in a form',
    words: ['form', 'forms', 'paperwork', 'application', 'apply', 'tax', 'taxes', 'insurance', 'claim', 'renew', 'documents', 'formulario', 'tramite', 'solicitud', 'impuestos', 'seguro', 'renovar', 'documentos', 'papeles'],
    steps: [
      'Find the form',
      'Read through it once without filling anything in',
      'List the papers it asks for',
      'Gather those papers in one place',
      'Fill in the parts you know',
      'Find out the parts you do not know',
      'Sign and date it',
      'Keep a copy or a photo of it',
      'Send it',
    ],
  },
  {
    id: 'packing',
    label: 'Packing for a trip',
    words: ['pack', 'packing', 'trip', 'travel', 'suitcase', 'holiday', 'vacation', 'empacar', 'maleta', 'viaje', 'viajar', 'equipaje', 'vacaciones'],
    steps: [
      'Check the weather where you are going',
      'Put the bag somewhere open',
      'Set out what you take for your health',
      'Count out clothes for each day',
      'Put in toiletries',
      'Put in chargers',
      'Put documents and cards together',
      'Write down what can only go in on the last morning',
      'Close the bag and put it by the door',
    ],
  },
  {
    id: 'appointment',
    label: 'Getting to an appointment',
    words: ['appointment', 'doctor', 'dentist', 'clinic', 'hospital', 'cita', 'medico', 'doctora', 'dentista', 'clinica', 'consulta'],
    steps: [
      'Check the time and the address',
      'Work out when to leave',
      'Write down what to ask',
      'Put papers and cards in one place',
      'Set out what to wear',
      'Leave',
      'Write down what was said',
    ],
  },
  {
    id: 'booking',
    label: 'Booking something',
    words: ['book', 'booking', 'reserve', 'schedule', 'agendar', 'reservar', 'reservacion', 'apartar'],
    steps: [
      'Pick two or three days that would work',
      'Find how to book it',
      'Put any number they will ask for in front of you',
      'Book it',
      'Put the day and time into the app',
    ],
  },
  {
    id: 'shopping',
    label: 'Going shopping',
    words: ['shop', 'shopping', 'store', 'buy', 'groceries', 'grocery', 'errand', 'errands', 'comprar', 'compras', 'tienda', 'super', 'mandado', 'mercado'],
    steps: [
      'Look at what you already have',
      'Write the list',
      'Check when it is open',
      'Put bags, keys and a card by the door',
      'Go',
      'Put cold things away first',
      'Put away the rest',
    ],
  },
  {
    id: 'cooking',
    label: 'Making a meal',
    words: ['cook', 'cooking', 'dinner', 'lunch', 'bake', 'recipe', 'cocinar', 'cena', 'comida', 'hornear', 'receta', 'preparar'],
    steps: [
      'Read the recipe through once',
      'Take everything out',
      'Clear a space to work in',
      'Wash and cut what needs it',
      'Cook it',
      'Put the pan in water while you eat',
    ],
  },
  {
    id: 'repair',
    label: 'Fixing something',
    words: ['fix', 'repair', 'broken', 'replace', 'install', 'arreglar', 'reparar', 'reparacion', 'instalar', 'cambiar', 'componer'],
    steps: [
      'Look at what is wrong and take a photo of it',
      'Find out what it needs',
      'List the tools and parts',
      'Get what is missing',
      'Clear a space to work in',
      'Do the first part',
      'Finish it and check that it works',
      'Put the tools away',
    ],
  },
  {
    id: 'declutter',
    label: 'Clearing out a cupboard or a closet',
    words: ['declutter', 'closet', 'cupboard', 'garage', 'drawer', 'drawers', 'sort', 'attic', 'shed', 'closets', 'armario', 'cajon', 'cajones', 'cochera', 'alacena', 'bodega'],
    steps: [
      'Pick one shelf or one drawer',
      'Get a bag for trash and a box for giving away',
      'Take everything out of that one place',
      'Sort it into keep, give away and trash',
      'Wipe the empty place',
      'Put back what stays',
      'Take the bag and the box out of the room',
    ],
  },
  {
    id: 'study',
    label: 'Studying or reading for something',
    words: ['study', 'studying', 'homework', 'exam', 'test', 'read', 'learn', 'estudiar', 'tarea', 'examen', 'leer', 'aprender'],
    steps: [
      'Pick the one part to do now',
      'Put what you need on the table',
      'Put the phone out of reach',
      'Set a timer for 20 minutes',
      'Do that one part',
      'Write down where you stopped',
      'Take a break',
    ],
  },
  {
    id: 'garden',
    label: 'Working in the garden',
    words: ['garden', 'plant', 'planting', 'weed', 'weeding', 'prune', 'yard', 'lawn', 'jardin', 'sembrar', 'plantar', 'deshierbar', 'podar', 'pasto', 'huerto'],
    steps: [
      'Put on shoes and gloves',
      'Take out the tools',
      'Pick one bed or one patch',
      'Do that one patch',
      'Put what was pulled in the compost',
      'Water what needs it',
      'Put the tools away',
    ],
  },
  {
    id: 'guests',
    label: 'Having people over',
    words: ['guests', 'party', 'visitors', 'host', 'hosting', 'birthday', 'invitados', 'fiesta', 'visitas', 'cumpleanos', 'reunion'],
    steps: [
      'Write down who is coming and when',
      'Ask what they cannot eat',
      'Decide what to serve',
      'Write the shopping list',
      'Shop',
      'Clear the room they will sit in',
      'Make what can be made the day before',
      'Set out plates and glasses',
    ],
  },
  {
    id: 'putOff',
    label: 'Something that has been waiting a long time',
    words: ['start', 'finally', 'finish', 'empezar', 'terminar', 'pendiente'],
    steps: [
      'Write down what done would look like',
      'Write down the very first thing',
      'Put what that needs in front of you',
      'Do only that for 10 minutes',
      'Write down the next thing',
    ],
  },
];

/** Lower case, no accents, split into words. */
export function wordsOf(title: string): string[] {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** The lists whose words are in the title, the closest first, three at most.
 *  A title nothing matches gets none: every list is still there to pick. */
export function patternsFor(title: string): StepPattern[] {
  const words = new Set(wordsOf(title));
  return STEP_PATTERNS.map((pattern) => ({ pattern, hits: pattern.words.filter((word) => words.has(word)).length }))
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3)
    .map((entry) => entry.pattern);
}

export type StepSource = { id: string; label: string; steps: string[] };

/** Everything to start from: the kept lists, the person's routines, and
 *  other tasks already broken down, each named for what it is. A routine or
 *  task with no steps is left out, and so is the task being broken down. */
export function stepSources(
  routines: readonly { id: string; name: string; steps: readonly { text: string }[] }[],
  earlier: readonly { id: string; title: string; steps: readonly string[] }[],
  todoId: string,
  tr: (english: string, values?: Readonly<Record<string, string | number>>) => string,
): StepSource[] {
  const sources: StepSource[] = STEP_PATTERNS.map((pattern) => ({
    id: `list:${pattern.id}`,
    label: tr(pattern.label),
    steps: pattern.steps.map((step) => tr(step)),
  }));
  for (const routine of routines) {
    if (routine.steps.length === 0) continue;
    sources.push({ id: `routine:${routine.id}`, label: tr('Routine: {name}', { name: routine.name }), steps: routine.steps.map((step) => step.text) });
  }
  for (const task of earlier) {
    if (task.id === todoId || task.steps.length === 0) continue;
    sources.push({ id: `task:${task.id}`, label: tr('Earlier task: {name}', { name: task.title }), steps: [...task.steps] });
  }
  return sources;
}
