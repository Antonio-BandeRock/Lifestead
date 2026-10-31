// Stands in for lib/devSeed.ts in the tester and store versions
// (metro.config.js, tester plan T2). Nothing reaches these, since Developer
// Tools is not drawn there; each refuses rather than touching a record.

function notHere(): never {
  throw new Error('Developer Tools are only in the developer version.');
}

export async function seedTest90Days(): Promise<void> {
  notHere();
}

export async function seedHealthTestData(): Promise<never> {
  notHere();
}

export async function clearSeededTestData(): Promise<{ deletedCount: number }> {
  notHere();
}
