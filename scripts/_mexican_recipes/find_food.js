/* global __dirname */
// Looks up visible foods in the reference database, read only.
// Usage: node scripts/_mexican_recipes/find_food.js tomatillo "pork shoulder" lard
// Prints category | base_name pairs, which are what a recipe ingredient uses,
// and how many shipped recipes already use each pair (a well-used pair is the
// safer choice when several match).
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, '..', '..', 'assets', 'data', 'foods_reference.db'), { readOnly: true });
const q = db.prepare(`
  SELECT f.category, f.base_name, COUNT(DISTINCT f.prep_method) AS preps,
         (SELECT COUNT(*) FROM curated_recipe_ingredients i WHERE i.category = f.category AND i.base_name = f.base_name) AS used
  FROM foods f
  WHERE f.hidden = 0 AND (f.base_name LIKE ?1 OR f.name LIKE ?1)
  GROUP BY f.category, f.base_name
  ORDER BY used DESC, length(f.base_name)
  LIMIT 15`);
for (const term of process.argv.slice(2)) {
  const rows = q.all(`%${term}%`);
  console.log(`\n${term}: ${rows.length === 0 ? 'nothing visible' : ''}`);
  for (const r of rows) console.log(`  ${r.category} | ${r.base_name}${r.used ? `   (used in ${r.used})` : ''}`);
}
