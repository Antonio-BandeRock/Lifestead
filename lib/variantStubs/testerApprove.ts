// Stands in for lib/testerApprove.ts in the tester and store versions
// (metro.config.js, tester plan T12), so neither carries a way to approve a
// tester. Nothing reaches these: the approve screen says the link is for the
// developer version before it would call one.
import type { AccessRequest } from '../testerApproval';

const NOT_HERE = 'Approving testers is only in the developer version.';

export type MyApprovalKey = { id: string; label: string; publicKey: string; trusted: boolean };

export type Approved =
  | { ok: true; recordId: string | null; request: AccessRequest; link: string; until: string; trusted: boolean; code: string | null; pickup: boolean }
  | { ok: false; reason: string };

export type TesterApprovalRecord = {
  id: string;
  approvedAt: string;
  name: string;
  device: string;
  platform: string;
  app: string | null;
  renewal: boolean;
  untilDay: string;
  code: string | null;
};

export async function listTesterApprovals(): Promise<TesterApprovalRecord[]> {
  return [];
}

export async function getMyApprovalKey(): Promise<MyApprovalKey> {
  throw new Error(NOT_HERE);
}

export async function approveRequest(): Promise<Approved> {
  return { ok: false, reason: NOT_HERE };
}

export async function sendMyApprovalKey(): Promise<string | null> {
  return NOT_HERE;
}
