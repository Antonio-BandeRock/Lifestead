# Sending testers the app (plan)

Nothing here is a public link. Each tester gets the files through a OneDrive share made for their email address alone.

## The folder

One folder in Tony's OneDrive, `Lifestead Test`, holding:

- the Android app, `lifestead-test.apk`, from the EAS build with APP_VARIANT=test
- the Windows installer, `Lifestead Test Setup <version>.exe`, from `desktop/dist-test`
- `lifestead-test-guide-en.pdf` and `lifestead-test-guide-es.pdf` from this folder

When a new installer is built, replace the file in place, keeping the same file name for the APK, so every share link still points at it.

## Sharing it

1. In OneDrive, right-click the folder > Share > the link settings.
2. The first time, choose `Specific people` and type the tester's email; for each later tester, add their email to that same link under Manage access, and keep `Can view`. A link of this kind only opens after OneDrive sends a code to that address, so a forwarded link is no use to anybody else.
3. Copy the link into the invitation (`invitation-draft.md`) and send it from your email.
4. To take someone off, open Manage access on the folder and remove them.

## The in-app "new installer" line

`docs/app-links/public/tester/latest.json` tells the tester version when a new installer is needed. After each tester build:

- `android.version` and `android.runtime`: the version and runtime fingerprint of the new APK. The line only shows when the runtime differs from the phone's, because an update that does not change the runtime arrives by itself.
- `windows.version`: the new installer's version.
- each `downloadUrl`: the folder's specific-people link. Keep ONE such link and add each new tester to it under Manage access, rather than making a link per person, so the one address in latest.json opens for every tester and nobody else.

Then deploy the site (`docs/app-links`) with wrangler.

## Order for the first tester

1. Tony and Lisa install their tester copies first, and Tony approves both from his dev build, so the whole loop is tried once before anybody else sees it.
2. Victor next: share the folder with his address, send the invitation, approve his request when it arrives.
3. The iPhone waits; there is no iPhone tester build yet.
