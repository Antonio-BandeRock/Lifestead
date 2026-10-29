// Checks the Mexican recipe files. Since 2026-10-29 the checks are shared
// by every cuisine and live in scripts/validate_cuisine_recipes.js.
//
// Usage:
//   node scripts/_mexican_recipes/validate.js            (every recipe file)
//   node scripts/_mexican_recipes/validate.js b_dishes.json
const { validate } = require('../validate_cuisine_recipes');

process.exit(validate('mexican', process.argv.slice(2)) ? 0 : 1);
