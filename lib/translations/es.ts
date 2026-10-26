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
import { ES_FOODS, ES_PARTS } from './es/index';

export { ES_FOODS };

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
};

export const ES: Readonly<Record<string, string>> = { ...ES_PARTS, ...BY_HAND };
