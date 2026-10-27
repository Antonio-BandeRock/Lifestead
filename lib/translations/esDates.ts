// How Mexican Spanish writes a date (2026-10-26). The English dates in this
// app are built in roughly fifty places from fixed English lists ("Oct 26",
// "Mon 26 Oct", "October 2026"), so rather than rewrite each of those,
// lib/i18n.ts recognises an English date wherever it is shown and writes it
// again from these: day before month, month and weekday in lower case,
// "de" before a full month's year ("26 de octubre de 2026"), and the short
// forms with no full stop, the way a phone set to es-MX shows them.
export type DateWords = {
  monthsShort: readonly string[];
  monthsLong: readonly string[];
  weekdaysShort: readonly string[];
  weekdaysLong: readonly string[];
};

export const ES_DATES: DateWords = {
  monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  monthsLong: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  weekdaysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
  weekdaysLong: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
};
