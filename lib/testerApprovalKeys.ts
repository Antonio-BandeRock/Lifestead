// The keys whose approvals the tester version accepts (tester plan T12).
//
// Public keys only. Each private seed stays where it was made: pc-1 in
// _backups/tester-approval on the developer's PC, used by
// scripts/approve_tester.js, and one per developer device in that device's
// secure store, sent here by Developer Tools > Send My Approval Key to
// Claude. Removing a key here ends every approval it signed at the next
// update.
import type { ApprovalKey } from './testerApproval';

export const TRUSTED_APPROVAL_KEYS: readonly ApprovalKey[] = [
  { id: 'pc-1', label: 'The PC (scripts/approve_tester.js)', publicKey: '1pb+xl5wjh7PLx/mfIRnSnwPIhkmm7KzJmMKCe2w97U=' },
];
