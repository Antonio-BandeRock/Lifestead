import { requireOptionalNativeModule } from 'expo';

// Which accounts on the phone hold one picked contact, from
// modules/contact-accounts (2026-11-02). That module rides the next rebuild,
// so this is null on every binary built before it, on iPhone and on the
// desktop app, and the caller records only that the person came from the
// phone's contacts. Looked up by name here rather than imported from the
// module folder, so this file ships over the air before the module exists.
export type ContactAccountsModule = {
  accountTypes(contactId: string): Promise<string[]>;
};

export default requireOptionalNativeModule<ContactAccountsModule>('ContactAccounts');
