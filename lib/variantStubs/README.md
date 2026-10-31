These files stand in for the developer-only modules in the tester and store
versions of the app (tester plan T2, 2026-10-31). metro.config.js swaps them
in when APP_VARIANT is test or store, so the developer tools are not in those
bundles at all. scripts/audit_tester_bundle.js checks an exported bundle.
