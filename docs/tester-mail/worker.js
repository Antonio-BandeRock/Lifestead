// Delivers mail sent to testers@ghostead.com (2026-11-12).
//
// Outlook first. Gmail only when Outlook turns the message away, as it did
// during Microsoft's outage on 2026-11-12, when a tester's access request was
// refused with "421 4.3.2 maximum number of concurrent server connections"
// and lost: Cloudflare does not retry, and the sender gets no bounce. A
// Cloudflare routing rule can forward to one address only, so the fallback
// lives here. Both addresses are verified destinations on the account.
const FIRST = 'tony.rockdaschel@outlook.com';
const FALLBACK = 'tonyrockdaschel@gmail.com';

export default {
  async email(message) {
    try {
      await message.forward(FIRST);
    } catch (err) {
      console.log(`Outlook refused, sending to Gmail: ${err && err.message}`);
      const headers = new Headers({ 'X-Lifestead-Fallback': 'Outlook refused this message' });
      await message.forward(FALLBACK, headers);
    }
  },
};
