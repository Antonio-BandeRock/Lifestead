// The app's words in Spanish (2026-10-26). See lib/i18n.ts for how a table
// is read.
//
// Written for Mexico first, which also reads naturally across Latin
// America: tú rather than usted, súper for the grocery store, platillo for a
// dish, composta, licuado, padecimiento for a health condition, reporte.
// Spain's Spanish, when it comes, is a second table that holds only the
// entries that differ (supermercado, informe, zumo) and falls back to this
// one.
//
// Headings and names are in sentence case, the way Spanish writes them,
// rather than the English Title Case.
//
// The same rules as the English: no dashes in place of punctuation, no
// filler words (realmente, genuinamente, verdadero used to sound sincere),
// and nothing that diagnoses, claims a cause or tells anybody to change a
// medication. A {name} in the English is kept, untranslated, in the Spanish;
// scripts/i18n_coverage.js fails when they differ.
//
// Every entry here was translated by Claude and has not yet been checked by
// a native speaker. Health wording above all needs that check before the
// app is offered in Spanish to anybody but Tony and Lisa.
//
// Most of the table lives in lib/translations/es/part-NNN.ts, written a
// batch at a time by scripts/i18n_batch.js; the entries below were written
// by hand and win over a part file. Food names are a table of their own,
// ES_FOODS, keyed by the parts of a name between its commas.
import { ES_FOODS, ES_PARTS, ES_READING } from './es/index';

export { ES_FOODS, ES_READING };

const BY_HAND: Readonly<Record<string, string>> = {
  // ---- The tabs (constants/tabs.ts) and TabHub's two extra tiles.
  Home: 'Inicio',
  Life: 'Vida',
  Food: 'Comida',
  Garden: 'Huerto',
  Schedules: 'Agenda',
  Signals: 'Señales',
  Insights: 'Análisis',
  Trends: 'Tendencias',
  Reports: 'Reportes',
  Profile: 'Perfil',

  // ---- Lenses on Home.
  'Your Usual Meals': 'Tus comidas de siempre',
  'Log a Meal': 'Registrar una comida',
  'Your Day': 'Tu día',
  Timeline: 'Línea de tiempo',
  "Today's Reminders": 'Recordatorios de hoy',
  'Symptom Check-In': 'Revisión de síntomas',
  'Morning Check-In': 'Revisión de la mañana',
  'One Question at a Time': 'Una pregunta a la vez',
  "Today's Check-In": 'Revisión de hoy',
  "How You're Feeling": 'Cómo te sientes',
  'Log a Flare': 'Registrar un brote',
  'Log Blood Pressure': 'Registrar la presión',
  'Log Exercise': 'Registrar ejercicio',
  'Since Your Last Meal': 'Desde tu última comida',
  'Meals Logged Today': 'Comidas registradas hoy',
  'Worth a Look': 'Vale la pena ver',
  "Today's Fuel": 'Nutrientes de hoy',
  "This Week's Trend": 'Tendencia de la semana',
  'Variety This Week': 'Variedad esta semana',
  'Keeping Up': 'Al día',
  'Outside Your Usual': 'Fuera de lo habitual',
  'Pacing Today': 'Tu ritmo hoy',
  'Your Week': 'Tu semana',
  'Your Life in Squares': 'Tu vida en cuadros',
  'Garden Yield': 'Cosecha del huerto',
  'Make a Report': 'Hacer un reporte',
  'Garden Tasks': 'Tareas del huerto',
  'Log a Harvest': 'Registrar una cosecha',
  'Add to the Grocery List': 'Agregar a la lista del súper',
  'Today I Want To': 'Hoy quiero',
  'Start a Workout': 'Empezar un entrenamiento',
  Capture: 'Captura',
  'Waiting for an Answer': 'Esperando respuesta',
  'One Next Thing': 'Lo siguiente',
  'Your Guide': 'Tu guía',
  Library: 'Biblioteca',

  // ---- Lenses on Life.
  'Grocery List': 'Lista del súper',
  Conditions: 'Padecimientos',
  'Health Literacy': 'Conocimiento de salud',
  'Earth Matters': 'La Tierra importa',
  'Search Reading': 'Buscar en las lecturas',
  Finances: 'Finanzas',
  Work: 'Trabajo',
  Upkeep: 'Mantenimiento',
  Emergency: 'Emergencia',
  'My Meds': 'Mis medicamentos',
  Kitchen: 'Cocina',
  Movement: 'Movimiento',
  Routines: 'Rutinas',
  'Did I Do It': '¿Ya lo hice?',
  'Days Until': 'Cuenta regresiva',
  Accounts: 'Cuentas',
  'Bills & Income': 'Pagos e ingresos',
  Spending: 'Gastos',
  Goals: 'Metas',
  Health: 'Salud',
  Overview: 'Resumen',
  Workouts: 'Entrenamientos',
  'To-Do': 'Pendientes',
  'Coming Up': 'Próximamente',
  Today: 'Hoy',
  Tomorrow: 'Mañana',
  Yesterday: 'Ayer',

  // ---- Lenses on Food.
  'Log or Schedule': 'Registrar o programar',
  'Scan a Product': 'Escanear un producto',
  'Import a Recipe': 'Importar una receta',
  Meal: 'Platillo',
  Sides: 'Guarniciones',
  'Salads & Bowls': 'Ensaladas y tazones',
  Smoothies: 'Licuados',
  Fermentation: 'Fermentación',
  Beverages: 'Bebidas',
  Snacks: 'Botanas',
  'Baked Goods': 'Pan y horneados',
  Soups: 'Sopas',
  Sauces: 'Salsas',
  Handhelds: 'Tortas, tacos y más',
  Desserts: 'Postres',

  // ---- Lenses on Garden.
  'My Zone': 'Mi zona',
  'Plots & Plantings': 'Parcelas y siembras',
  'Sowing Calendar': 'Calendario de siembra',
  'Harvest Log': 'Registro de cosechas',
  'Upcoming Tasks': 'Próximas tareas',
  Compost: 'Composta',
  'Growing Conditions': 'Condiciones de cultivo',
  Seeds: 'Semillas',
  'Growing Costs': 'Costos de cultivo',
  Horticulture: 'Horticultura',

  // ---- Lenses on Schedules.
  Meals: 'Comidas',
  "Today's Meals": 'Comidas de hoy',
  'Past Meals': 'Comidas anteriores',
  'Meal Plan': 'Plan de comidas',
  Hydration: 'Hidratación',
  Meds: 'Medicamentos',
  Appointments: 'Citas',
  Exercise: 'Ejercicio',

  // ---- Lenses on Signals.
  Flares: 'Brotes',
  'Food Reactions': 'Reacciones a alimentos',
  'New Foods & Experiments': 'Alimentos nuevos y pruebas',
  'Blood Pressure': 'Presión arterial',
  'Hands-On Therapies': 'Terapias manuales',
  'General Note': 'Nota general',
  Nocturia: 'Nicturia',
  'Bowel Movements': 'Evacuaciones',
  'Microbiome Tests': 'Pruebas de microbioma',
  Cycle: 'Ciclo',
  Calm: 'Calma',
  'My Trackers': 'Mis registros',

  // ---- Lenses on Insights.
  Nutrients: 'Nutrientes',
  'Condition Scores': 'Puntajes por padecimiento',
  'Cooking & Prep': 'Cocina y preparación',
  "Today's Advisories": 'Avisos de hoy',
  'Signals Today': 'Señales de hoy',
  'Food Lookup': 'Buscar un alimento',
  'Check a Label': 'Revisar una etiqueta',
  'Nutrient Ranking': 'Clasificación por nutriente',
  'Cooking Impact': 'Efecto de la cocción',
  'Safe Foods': 'Alimentos seguros',
  'Healing Stage': 'Etapa de sanación',
  Labs: 'Laboratorios',
  'My Meds & Interactions': 'Mis medicamentos e interacciones',
  'Energy & Portions': 'Energía y porciones',
  'Before Your Appointment': 'Antes de tu cita',
  'Money This Month': 'Dinero este mes',
  'What the Kitchen Holds': 'Lo que hay en la cocina',
  'From the Garden': 'Del huerto',

  // ---- Lenses on Trends.
  'What You Eat': 'Lo que comes',
  'Symptoms & Flares': 'Síntomas y brotes',
  'Eating Window': 'Ventana de alimentación',
  Weight: 'Peso',
  Pacing: 'Ritmo',
  'Grocery Prices': 'Precios del súper',
  'What It Costs': 'Lo que cuesta',
  'Therapy Response': 'Respuesta a terapias',
  'Body Signals': 'Señales del cuerpo',
  'Doses Over Time': 'Dosis a lo largo del tiempo',
  'Appointments & Care': 'Citas y atención',
  'Reactions & New Foods': 'Reacciones y alimentos nuevos',
  Nights: 'Noches',
  'Compare Two': 'Comparar dos',
  Ferments: 'Fermentos',
  'Planned and Eaten': 'Planeado y comido',
  'Pattern Finder': 'Buscador de patrones',

  // ---- Words on buttons everywhere.
  Save: 'Guardar',
  Cancel: 'Cancelar',
  Done: 'Listo',
  Delete: 'Eliminar',
  Remove: 'Quitar',
  Add: 'Agregar',
  Edit: 'Editar',
  Close: 'Cerrar',
  OK: 'Aceptar',
  Back: 'Atrás',
  Next: 'Siguiente',
  Yes: 'Sí',
  No: 'No',
  'Not Now': 'Ahora no',
  Rename: 'Cambiar nombre',
  Search: 'Buscar',
  Clear: 'Borrar',
  Shown: 'Visible',
  Hidden: 'Oculto',
  On: 'Activado',
  Off: 'Desactivado',
  More: 'Más',
  Less: 'Menos',

  // ---- Profile > Appearance & Navigation.
  'Appearance & Navigation': 'Apariencia y navegación',
  'Navigation Hand': 'Mano para navegar',
  'Navigation hand': 'Mano para navegar',
  'Left Hand': 'Mano izquierda',
  'Right Hand': 'Mano derecha',
  'Which thumb works the menu buttons. They sit in the bottom corner on that side, and the small switch tab just above the footer sits on the other side. Holding that tab switches sides from any screen.':
    'Con qué pulgar usas los botones de menú. Quedan en la esquina inferior de ese lado, y la pestaña pequeña para cambiar de lado, justo arriba del pie de página, queda del otro. Si mantienes presionada esa pestaña cambias de lado desde cualquier pantalla.',
  'Same as the phone': 'Igual que el teléfono',
  'The language the app shows its words in. Spanish is being added screen by screen, so anything not translated yet still shows in English. The reading on Life and Garden comes after the screens. Kept on this device only.':
    'El idioma en que la app muestra sus palabras. El español se está agregando pantalla por pantalla, así que lo que todavía no está traducido se ve en inglés. Las lecturas de Vida y Huerto vienen después de las pantallas. Se guarda solo en este dispositivo.',

  // ---- Notifications, one sentence at a time, since a notification's body
  // is put together from these and the lookup splits it between sentences.
  'every day': 'todos los días',
  weekdays: 'entre semana',
  weekends: 'los fines de semana',
  'The daily check-in you asked for.': 'La revisión diaria que pediste.',
  'About {value} hours since you ate.': 'Más o menos {value} horas desde que comiste.',
  'Tap to walk it one step at a time, {reminderDays}.': 'Toca para recorrerla un paso a la vez, {reminderDays}.',
  '{title} at {time}': '{title} a las {time}',
  '1 minute': '1 minuto',
  '{n} minutes': '{n} minutos',
  ', about {n} minutes': ', unos {n} minutos',
  ', about 1 minute': ', más o menos 1 minuto',
  'with {name}': 'con {name}',
  '{hour}:{value} am': '{hour}:{value} a. m.',
  '{hour}:{value} pm': '{hour}:{value} p. m.',
  'Starts in about an hour.': 'Empieza en una hora más o menos.',
  '{clock} home time ({zone})': '{clock} hora de casa ({zone})',
  '{dose}, due {due} on your Meds schedule.': '{dose}, para las {due} en tu agenda de medicamentos.',
  'Due {due} on your Meds schedule.': 'Para las {due} en tu agenda de medicamentos.',
  '{dose}, due {due} here, {home}, on your Meds schedule.': '{dose}, para las {due} aquí, {home}, en tu agenda de medicamentos.',
  'Due {due} here, {home}, on your Meds schedule.': 'Para las {due} aquí, {home}, en tu agenda de medicamentos.',
  '{title}: step {n} of {m}': '{title}: paso {n} de {m}',
  'Schedule as of {freshness}.': 'Agenda revisada: {freshness}.',
  'Records as of {freshness}.': 'Registros revisados: {freshness}.',
  'Routines as of {freshness}.': 'Rutinas revisadas: {freshness}.',
  'Did I Do It as of {freshness}.': 'Marcas revisadas: {freshness}.',
  'Check-ins as of {freshness}.': 'Datos revisados: {freshness}.',
  'Meals as of {freshness}.': 'Comidas revisadas: {freshness}.',
  'The words could not be sealed on this phone.': 'Las palabras no se pudieron sellar en este teléfono.',

  // ---- Reports and their PDF, in the shapes the sentences arrive in once filled.
  'Self-reported, not verified': 'Lo dice la persona, sin verificar',
  '(last {days} days). Generated {when}.': '(últimos {days} días). Generado el {when}.',
  'flagged items': 'elementos señalados',
  steps: 'pasos',
  hours: 'horas',
  '1 flagged item': '1 elemento señalado',
  '{n} flagged items': '{n} elementos señalados',
  '{items} logged across {days} with meals.': '{items} registrados en {days} con comidas.',
  '1 recorded night': '1 noche registrada',
  '{n} recorded nights': '{n} noches registradas',
  '{rule} (an instruction from a clinician)': '{rule} (indicación de un profesional de salud)',
  "{rule} (the person's observation)": '{rule} (observación de la persona)',
  '{names}, and 1 other symptom': '{names} y 1 síntoma más',
  '{names}, and {count} other symptoms': '{names} y {count} síntomas más',
  '{label} (part week)': '{label} (semana incompleta)',
  '{start} through today, {days} days.': 'Del {start} a hoy, {days} días.',
  '{start} through today, 1 day.': 'Del {start} a hoy, 1 día.',
  'your appointment': 'tu cita',
  '{title} with {provider}': '{title} con {provider}',
  '{shown} of {total} sections': '{shown} de {total} secciones',
  '{name}, one section left out': '{name}, se dejó fuera una sección',
  '{name}, {count} sections left out': '{name}, se dejaron fuera {count} secciones',
  'Nothing recorded on any of the {days}.': 'No hay nada registrado en ninguno de los {days}.',
  'from {low} to {high} {unit}': 'de {low} a {high} {unit}',
  'A blank slot is a day with nothing recorded, not a zero.': 'Un espacio vacío es un día sin nada registrado, no un cero.',
  '1 day recorded across {days}, {span}.': '1 día registrado en {days}, {span}.',
  '{count} days recorded across {days}, {span}.': '{count} días registrados en {days}, {span}.',
  '1 night recorded across {days}, {span}.': '1 noche registrada en {days}, {span}.',
  '{count} nights recorded across {days}, {span}.': '{count} noches registradas en {days}, {span}.',
  'Made with Lifestead {app}, using food reference data and interaction rules dated {date} (build {build}).':
    'Hecho con Lifestead {app}, con datos de referencia de alimentos y reglas de interacción con fecha {date} (compilación {build}).',
  // Cook mode lists each step's ingredients (2026-10-30).
  'In this step': 'En este paso',
  'All ingredients': 'Todos los ingredientes',
  'Hide all ingredients': 'Ocultar todos los ingredientes',
  'Made first. Tap for its steps.': 'Se prepara antes. Toca para ver sus pasos.',
  'half of it': 'la mitad',
  'the rest of it': 'el resto',
  'a third of it': 'un tercio',
  'a quarter of it': 'un cuarto',
  'Open {title} in cook mode': 'Abrir {title} en modo cocina',
  'Back to {title}': 'Volver a {title}',
  'Cook a recipe one step at a time': 'Cocinar una receta paso a paso',
  // Builders open a recipe for reading, with a Done button (2026-10-30).
  'Done Adding Ingredients': 'Terminé de agregar ingredientes',
  'Back to Overview': 'Regresar al resumen',
  'The recipe opens for reading, with Add Ingredients above it for anything more. When it is right, tap Done Adding Ingredients.':
    'La receta se abre para leerla, con Agregar ingredientes arriba para lo que falte. Cuando esté lista, toca Terminé de agregar ingredientes.',
  'What the squares mean:\nEach red square under an ingredient is one serious concern this food carries, such as high sodium, high saturated fat or gluten. Tap a square to see which one. An ingredient with no squares has no serious concern recorded, or has not been rated yet. Milder concerns are left off so the squares stay worth noticing.':
    'Qué significan los cuadros:\nCada cuadro rojo debajo de un ingrediente es una preocupación seria de ese alimento, como mucho sodio, mucha grasa saturada o gluten. Toca un cuadro para ver cuál es. Un ingrediente sin cuadros no tiene ninguna preocupación seria registrada, o todavía no se ha calificado. Las preocupaciones menores se dejan fuera para que los cuadros sigan valiendo la pena.',
};

export const ES: Readonly<Record<string, string>> = { ...ES_PARTS, ...BY_HAND };
