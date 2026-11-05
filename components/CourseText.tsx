// A course's words, drawn as written (2026-11-05). Every other Text in the app
// goes through the language's table in components/EditableText.tsx, so a card
// reading "Home" in an English course would come out in Spanish with the app in
// Spanish, which is the one place a translation does harm. A course's names,
// units, groups and card faces follow the course; the labels and buttons around
// them stay ordinary Text and follow the app.

export { Text as CourseText } from './reactNativeText';
