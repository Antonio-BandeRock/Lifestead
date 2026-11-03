package expo.modules.contactaccounts

import android.content.Context
import android.provider.ContactsContract
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Which accounts on the phone hold one contact (2026-11-02). Android keeps a
// contact as several raw contacts, one per account that knows the person, and
// each says which account it belongs to: com.google, com.whatsapp,
// org.thoughtcrime.securesms for Signal, or none for one saved on the phone
// itself. Only the contact the person just picked is read, only its account
// types are returned, and nothing is ever written. READ_CONTACTS is already
// asked for before the picker opens.
class ContactAccountsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("ContactAccounts")

    AsyncFunction("accountTypes") { contactId: String ->
      val types = mutableListOf<String>()
      context.contentResolver.query(
        ContactsContract.RawContacts.CONTENT_URI,
        arrayOf(ContactsContract.RawContacts.ACCOUNT_TYPE),
        "${ContactsContract.RawContacts.CONTACT_ID} = ? AND ${ContactsContract.RawContacts.DELETED} = 0",
        arrayOf(contactId),
        null,
      )?.use { cursor ->
        while (cursor.moveToNext()) {
          types.add(if (cursor.isNull(0)) "" else cursor.getString(0))
        }
      }
      types
    }
  }
}
