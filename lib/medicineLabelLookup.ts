// Asking openFDA for a medicine label (A11, Phase 2). Everything that
// decides anything is in lib/medicineLabel.ts; this file sends the one
// request and reports what came back. The request carries only the code,
// the name or the document number, never anything about the person.
//
// Since 1.0.95.2 a name openFDA does not know goes to RxNorm for its U.S.
// ingredient name, and a Spanish national code goes to CIMA, Spain's
// register (Tony, 2026-11-20). Both are free, need no key and are open to a
// browser, and both receive only the name or the code.

import {
  bestRxcui,
  cimaByCodeUrl,
  codeQueryUrl,
  crossedName,
  crossingSent,
  ingredientNames,
  matchLabels,
  nameQueryUrl,
  rxnavApproximateUrl,
  rxnavIngredientsUrl,
  setIdQueryUrl,
  toSpanishMedicine,
  whatWasSent,
  type LabelDocument,
  type LookupAsk,
  type SpanishMedicine,
} from './medicineLabel';

/** When a name was crossed to its U.S. ingredient name through RxNorm. */
export type Crossing = { typed: string; usName: string };

export type LookupOutcome =
  | { kind: 'found'; labels: LabelDocument[]; total: number; sent: string; retrievedAt: string; crossing?: Crossing }
  | { kind: 'not_found'; sent: string; retrievedAt: string; crossing?: Crossing }
  | { kind: 'unreachable'; status: number | null };

function urlFor(ask: LookupAsk): string {
  if (ask.kind === 'code') return codeQueryUrl(ask.reading);
  if (ask.kind === 'name') return nameQueryUrl(ask.name);
  return setIdQueryUrl(ask.setId);
}

async function askOpenFda(ask: LookupAsk): Promise<LookupOutcome> {
  const sent = whatWasSent(ask);
  let response: Response;
  try {
    response = await fetch(urlFor(ask), { headers: { Accept: 'application/json' } });
  } catch {
    return { kind: 'unreachable', status: null };
  }
  const retrievedAt = new Date().toISOString();
  // openFDA answers a search that matches nothing with 404 and NOT_FOUND.
  if (response.status === 404) return { kind: 'not_found', sent, retrievedAt };
  if (!response.ok) return { kind: 'unreachable', status: response.status };
  let body: { meta?: { results?: { total?: number } }; results?: unknown[] };
  try {
    body = await response.json();
  } catch {
    return { kind: 'unreachable', status: response.status };
  }
  const results = Array.isArray(body.results) ? body.results : [];
  const total = typeof body.meta?.results?.total === 'number' ? body.meta.results.total : results.length;
  const matched = matchLabels(ask, results, total);
  if (matched.kind === 'not_found') return { kind: 'not_found', sent, retrievedAt };
  return { kind: 'found', labels: matched.labels, total: matched.total, sent, retrievedAt };
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** The U.S. ingredient name RxNorm gives a name from anywhere, or null. */
export async function usIngredientName(name: string): Promise<string | null> {
  const rxcui = bestRxcui(await getJson(rxnavApproximateUrl(name)));
  if (!rxcui) return null;
  return crossedName(name, ingredientNames(await getJson(rxnavIngredientsUrl(rxcui))));
}

export async function lookUpLabel(ask: LookupAsk): Promise<LookupOutcome> {
  const first = await askOpenFda(ask);
  if (ask.kind !== 'name' || first.kind !== 'not_found') return first;
  const usName = await usIngredientName(ask.name);
  if (!usName) return first;
  const crossing: Crossing = { typed: ask.name, usName };
  const second = await askOpenFda({ kind: 'name', name: usName });
  if (second.kind === 'unreachable') return second;
  return { ...second, sent: crossingSent(ask.name, usName), crossing };
}

export type SpainOutcome =
  | { kind: 'found'; medicine: SpanishMedicine; retrievedAt: string }
  | { kind: 'not_found'; cn: string }
  | { kind: 'unreachable' };

/** Asks CIMA, Spain's register of medicines, for one national code (C.N.). */
export async function lookUpSpainByCode(cn: string): Promise<SpainOutcome> {
  let response: Response;
  try {
    response = await fetch(cimaByCodeUrl(cn), { headers: { Accept: 'application/json' } });
  } catch {
    return { kind: 'unreachable' };
  }
  if (response.status === 204 || response.status === 404) return { kind: 'not_found', cn };
  if (!response.ok) return { kind: 'unreachable' };
  let body: unknown = null;
  try {
    const text = await response.text();
    body = text.trim() ? JSON.parse(text) : null;
  } catch {
    return { kind: 'unreachable' };
  }
  const medicine = toSpanishMedicine(cn, body);
  return medicine ? { kind: 'found', medicine, retrievedAt: new Date().toISOString() } : { kind: 'not_found', cn };
}
