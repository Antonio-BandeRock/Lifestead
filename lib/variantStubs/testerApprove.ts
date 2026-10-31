// Stands in for lib/testerApprove.ts in the tester and store versions
// (metro.config.js, tester plan T12), so neither carries a way to approve a
// tester. Nothing reaches these: the approve screen says the link is for the
// developer version before it would call one.
import type { AccessRequest } from '../testerApproval';

const NOT_HERE = 'Approving testers is only in the developer version.';

export type MyApprovalKey = { id: string; label: string; publicKey: string; trusted: boolean };

export type Approved =
  | { ok: true; request: AccessRequest; link: string; until: string; trusted: boolean }
  | { ok: false; reason: string };

export async function getMyApprovalKey(): Promise<MyApprovalKey> {
  throw new Error(NOT_HERE);
}

export async function approveRequest(): Promise<Approved> {
  return { ok: false, reason: NOT_HERE };
}

export async function sendMyApprovalKey(): Promise<string | null> {
  return NOT_HERE;
}
