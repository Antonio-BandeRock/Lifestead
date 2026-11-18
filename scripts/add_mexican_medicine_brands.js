/* global __dirname */
// Mexican brand names on the medicine list, and progesterone (Tony, 2026-11-18).
//
// "Add the names of the brands and their information from Mexico." A person
// in Mexico knows levothyroxine as Eutirox and liothyronine as Triyotex, so
// My Meds' researched list could not find either. This adds three columns to
// common_medications (brand_names_mexico, mexico_notes, mexico_source) and
// fills them only for the medicines a Mexican source confirmed: PLM's
// prescribing information, Vademecum Mexico, or a Mexican pharmacy listing.
// A medicine nothing confirmed is left empty rather than guessed.
//
// It also adds micronized progesterone, which the list did not have at all
// ("Progesteron isn't listed at all").
//
// Idempotent: columns are added only when missing and every row is an upsert.
// Run on the live file with `node scripts/add_mexican_medicine_brands.js`, and
// unified-database/pipeline/merge-candidate.js runs it on every candidate it
// builds, so a rebuild keeps it. Pass another path to run it on that file.

const { execFileSync } = require('child_process');
const path = require('path');

const MEXICO = {
  levothyroxine: {
    brands: 'Eutirox, Synthroid',
    notes: 'Sold as levotiroxina. Eutirox (Merck) and Synthroid (Abbott) are both sold in Mexico, and so is generic levotiroxina. Mexico\'s prescribing information for Eutirox advises against changing from one brand to another, because how much of the dose is absorbed differs between them.',
    source: 'https://www.medicamentosplm.com/Home/productos/eutirox_tabletas/115/101/7592/210 ; https://www.benavides.com.mx/synthroid-50-mcg-levotiroxina-sodica-30-ud-tabletas',
  },
  liothyronine: {
    brands: 'Triyotex',
    notes: 'Sold as liotironina. Triyotex (Medix) comes in 5 mcg capsules and 10 mcg tablets, with a prescription.',
    source: 'https://wecarepharma.mx (Triyotex) ; https://www.medicamentosplm.com (Triyotex)',
  },
  methimazole: {
    brands: 'Tapazol',
    notes: 'Sold as tiamazol. Tapazol (Siegfried Rhein) comes in 5 mg tablets in boxes of 20 or 60, and 10 mg tablets in boxes of 20, with a prescription.',
    source: 'https://wecarepharma.mx/products/tapazol-5mg-con-20-tabletas-tiamazol ; https://www.medicamentosplm.com/home/productos/tapazol-tabletas/170/101/9993/210',
  },
  metformin: {
    brands: 'Dabex, Dabex XR, Glucophage',
    notes: 'Sold as metformina. Dabex (Merck) comes in 500, 850 and 1000 mg tablets, and Dabex XR, the slow-release form, in 500, 750 and 1000 mg. Glucophage and several generics are sold too.',
    source: 'https://wecarepharma.mx/products/dabex-850mg-con-30-tabletas-metformina ; https://actapediatrica.org.mx/descarga/3885',
  },
  acetaminophen: {
    brands: 'Tempra, Tempra Forte, Tylenol',
    notes: 'Sold as paracetamol. Tempra comes in 500 mg tablets and Tempra Forte in 650 mg, without a prescription.',
    source: 'https://www.benavides.com.mx/tempra-500-mg-paracetamol-20-ud-tabletas ; https://www.benavides.com.mx/tempra-forte-650-mg-paracetamol-24-ud-tabletas',
  },
  ibuprofen: {
    brands: 'Advil, Motrin',
    notes: 'Sold as ibuprofeno. Advil comes in tablets, and Motrin also comes as a syrup for children.',
    source: 'https://listado.mercadolibre.com.mx/paracetamol-%2F-ibuprofeno ; https://selecciones.com.mx/ibuprofeno-o-paracetamol-descubre-cual-elegir-segun-tu-tipo-de-dolor/',
  },
  aspirin: {
    brands: 'Aspirina, Aspirina Advanced, Aspirina Protect, Aspirina Junior',
    notes: 'Sold as ácido acetilsalicílico. Bayer\'s Aspirina comes in 500 mg tablets; Aspirina Protect and Aspirina Junior are the 100 mg strengths.',
    source: 'https://wecarepharma.mx/en/products/aspirina-500mg-con-10-tabletas-acido-acetilsalicilico ; https://www.vademecum.es/mexico/mx/alfa/a/s',
  },
  omeprazole: {
    brands: 'Inhibitron, Inhibitron F, Inhibitron Twit',
    notes: 'Sold as omeprazol. Inhibitron (Liomont) comes in 20 mg capsules and Inhibitron F in 40 mg; Inhibitron Twit adds sodium bicarbonate. Sold with a prescription.',
    source: 'https://wecarepharma.mx/en/products/inhibitron-20mg-con-28-duopack-capsulas-omeprazol ; https://www.drugs.com/international/inhibitron.html',
  },
  prednisone: {
    brands: 'Meticorten',
    notes: 'Sold as prednisona. Meticorten comes in 5, 20 and 50 mg tablets.',
    source: 'https://www.bupasalud.com.mx/sites/default/files/documentos/2026-04/central/CUADRO%20B%C3%81SICO%20MEDICAMENTOS%20BNV_ABRIL_2026.pdf',
  },
  hydroxychloroquine: {
    brands: 'Plaquenil',
    notes: 'Sold as hidroxicloroquina. Plaquenil comes in 200 mg tablets, with a prescription.',
    source: 'https://www.benavides.com.mx/plaquenil-200-mg-hidroxicloroquina-20-tabletas ; https://www.vademecum.es/mexico/mx/alfa/p/l',
  },
  methotrexate: {
    brands: 'Ledertrexate',
    notes: 'Sold as metotrexato. Ledertrexate (Pfizer) comes in 2.5 mg tablets, and generic metotrexato in the same strength.',
    source: 'https://labeling.pfizer.com/ShowLabeling.aspx?id=4210 ; https://www.medicamentosplm.com/Home/productos/metotrexato.tabletas/10/101/60153/210',
  },
  atorvastatin: {
    brands: 'Lipitor',
    notes: 'Sold as atorvastatina. Lipitor (Viatris) comes in tablets, with a prescription, and generics are sold too.',
    source: 'https://wecarepharma.mx/en/products/lipitor-atorvastatina-tabletas-20mg-con-30',
  },
  losartan: {
    brands: 'Cozaar',
    notes: 'Sold as losartán. Cozaar (MSD) comes in 50 and 100 mg tablets, and many generic losartán tablets are sold too.',
    source: 'https://www.vademecum.es/cnis/010.000.2520.00/3/losartan+potasico?cc=mx ; https://wecarepharma.mx (Cozaar)',
  },
  allopurinol: {
    brands: 'Zyloprim, Atisuril',
    notes: 'Sold as alopurinol. Zyloprim (Aspen) comes in 100 and 300 mg tablets and Atisuril (Italmex) in 300 mg, with a prescription.',
    source: 'https://medicamentosplm.com/Home/productos/zyloprim.tabletas/2672/101/53926/210 ; https://www.medicamentosplm.com/home/productos/atisuril-tabletas/83/101/6418/210',
  },
  colchicine: {
    brands: 'Colchiquim, Ticolcin',
    notes: 'Sold as colchicina. Colchiquim (Perrigo) comes in 1 mg tablets and Ticolcin (Tecnofarma) is the other brand, both with a prescription.',
    source: 'https://www.medicamentosplm.com/home/productos/colchiquim-tabletas/2798/101/60591/210 ; https://www.medicamentosplm.com/home/productos/ticolcin-tabletas/181/101/12246/210',
  },
  mesalamine: {
    brands: 'Salofalk, Pentasa, Asacol, Musimir',
    notes: 'Sold as mesalazina. Salofalk (Schwabe) comes as tablets, suppositories, an enema and granules; Pentasa (Ferring) as 500 mg slow-release tablets, 1 g suppositories and 2 g granules; Musimir (Siegfried Rhein) as 500 mg tablets.',
    source: 'https://www.vademecum.es/mexico/equivalencias/1220345/salofalk-tableta-con-cubierta-enterica-500-mg ; https://www.vademecum.es/mexico/equivalencias/1139768/pentasa-supositorio-1-g ; https://www.medicamentosplm.com/Home/Medicamentos_Sustancia/mesalazina/825',
  },
  cyclosporine: {
    brands: 'Sandimmun Neoral',
    notes: 'Sold as ciclosporina. Sandimmun Neoral is the brand sold in Mexico, and generics are sold too.',
    source: 'https://wecarepharma.mx/en/products/sandimmun-neoral-vial-100mg-ml-con-50ml-ciclosporina ; https://prixz.com/salud/ciclosporina-que-es-y-para-que-sirve/',
  },
  diphenhydramine: {
    brands: 'Benadryl',
    notes: 'Sold as difenhidramina. Benadryl comes in 25 mg tablets.',
    source: 'https://wecarepharma.mx/en/collections/medicamentos-de-patente/products/benadryl-25mg-con-24-tabletas-difenhidramina',
  },
  tamsulosin: {
    brands: 'Secotex Ocas, Flucisten',
    notes: 'Sold as tamsulosina. Secotex Ocas comes in 0.4 mg slow-release tablets and Flucisten in 0.4 mg capsules, with a prescription.',
    source: 'https://medicamentosplm.com/home/productos/secotex-ocas-tabletas-de-liberacion-prolongada/28/101/9685/216 ; https://www.vademecum.es/mexico/medicamento/1364309/flucisten-capsula-0-4-mg',
  },
  finasteride: {
    brands: 'Proscar',
    notes: 'Sold as finasterida. Proscar (MSD) comes in 5 mg tablets, and generics are sold too.',
    source: 'https://www.benavides.com.mx/proscar-5-mg-finasterida-30-tabletas ; https://www.medicamentosplm.com/home/productos/proscar-tabletas/128/101/69739/210',
  },
  sumatriptan: {
    brands: 'Imigran',
    notes: 'Sold as sumatriptán. Imigran (GSK) comes in 50 mg tablets, with a prescription.',
    source: 'https://medicamentosplm.com/Home/productos/imigran.cincuenta.comprimidos/64/101/33424/25 ; https://wecarepharma.mx/products/imigran-50mg-con-2-comprimidos-sumatriptan',
  },
  glyburide: {
    brands: 'Daonil',
    notes: 'Sold as glibenclamida. Daonil comes in 5 mg tablets in boxes of 50, and generic glibenclamida is sold too.',
    source: 'https://www.vademecum.es/cnis/010.000.1042.00/5/Glibenclamida?cc=mx',
  },
  dapagliflozin: {
    brands: 'Forxiga',
    notes: 'Sold as dapagliflozina. Forxiga comes in 10 mg tablets in boxes of 28.',
    source: 'Mexican online pharmacy listing, Forxiga 10 mg with 28 tablets',
  },
  semaglutide: {
    brands: 'Ozempic, Rybelsus',
    notes: 'Sold as semaglutida, with a prescription. In 2026 COFEPRIS, Mexico\'s health regulator, warned about counterfeit Ozempic and Rybelsus, and asks people to buy them only with a prescription from an established pharmacy.',
    source: 'https://politica.expansion.mx/mexico/2026/03/27/cofepris-alerta-sanitaria-ozempic-falsificado ; https://mexiconewsdaily.com/news/health-regulator-counterfeit-ozempic-mexico/',
  },
  adalimumab: {
    brands: 'Humira',
    notes: 'Humira (AbbVie) comes as a 40 mg prefilled syringe, with a prescription.',
    source: 'https://www.datos.economia.gob.mx/IndustriayComercio/Listas%20de%20precios%20de%20medicamentos%202005-2022.pdf',
  },
  infliximab: {
    brands: 'Remicade',
    notes: 'Remicade comes as a 100 mg vial and is on Mexico\'s list of reference biotech medicines.',
    source: 'https://www.gob.mx/cms/uploads/attachment/file/303243/Relacion_de_Medicamentos_Biotecnologicos_de_referencia__versi_n_5__02-03-2016.pdf',
  },
  tofacitinib: {
    brands: 'Xeljanz',
    notes: 'Xeljanz comes in 5 mg tablets in boxes of 56, with a prescription.',
    source: 'https://wecarepharma.mx/en/collections/all/products/xeljanz-5mg-con-56-tabletas-tofacitinib',
  },
  secukinumab: {
    brands: 'Cosentyx',
    notes: 'Cosentyx comes as 150 mg prefilled syringes, with a prescription.',
    source: 'https://wecarepharma.mx/products/cosentyx-jeringa-150mg-ml-con-2-secukinumab',
  },
  progesterone: {
    brands: 'Utrogestan, Geslutin',
    notes: 'Sold as progesterona. Utrogestan (Cyndea Pharma) comes in 100 mg capsules (boxes of 15 or 30) and 200 mg (boxes of 14), and Geslutin (Asofarma) in 100, 200 and 400 mg capsules, all with a prescription. Utrogestan\'s capsules hold sunflower oil and soy lecithin, so its leaflet rules it out for anyone allergic to soy or peanut.',
    source: 'https://medicamentosplm.com/Home/productos/utrogestan_capsulas/2848/101/64486/14 ; https://medicamentosplm.com/Home/productos/geslutin.capsulas/13/101/7914/14 ; Utrogestan UK SmPC (excipients, contraindications)',
  },
};

// Micronized progesterone: the list had no row for it.
const PROGESTERONE = {
  id: 'progesterone',
  generic_name: 'Progesterone (micronized)',
  common_brand_names: 'Prometrium',
  drug_class: 'progestogen (body-identical progesterone)',
  treatment_type: 'prescription',
  common_use: 'The same hormone the ovaries make after ovulation. Taken with estrogen in menopause hormone therapy to protect the lining of the womb, to bring on a period after periods have stopped, and to support the second half of the cycle in fertility treatment.',
  thyroid_relevant_notes: 'No direct effect on thyroid hormone or on how levothyroxine is absorbed is documented for progesterone. Estrogen taken alongside it raises the protein that carries thyroid hormone in the blood, which is why a thyroid check after starting combined hormone therapy is common.',
  timing_guidance: 'Usually taken once a day at bedtime, because it can cause drowsiness and dizziness. Taken by mouth or vaginally, as the prescriber says.',
  key_interactions: 'Medicines that block the liver enzyme CYP3A4, such as ketoconazole, can raise the amount in the blood. Prometrium capsules contain peanut oil, so the US label rules it out for anyone allergic to peanuts.',
  common_side_effects: 'Drowsiness, dizziness, headache, breast tenderness, bloating and mood changes.',
  evidence_strength: 'strong',
  citation: 'Prometrium (progesterone, USP) capsules, US prescribing information; The 2022 hormone therapy position statement of The North American Menopause Society, Menopause 2022;29(7):767-794.',
  notes: '',
};

function sqlText(value) {
  if (value === null || value === undefined) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSql(existingColumns) {
  const sql = ['BEGIN;'];
  for (const column of ['brand_names_mexico', 'mexico_notes', 'mexico_source']) {
    if (!existingColumns.includes(column)) sql.push(`ALTER TABLE common_medications ADD COLUMN ${column} TEXT;`);
  }
  const p = PROGESTERONE;
  const cols = Object.keys(p);
  sql.push(
    `INSERT INTO common_medications (${cols.join(', ')}) VALUES (${cols.map((c) => sqlText(p[c])).join(', ')})` +
      ` ON CONFLICT(id) DO UPDATE SET ${cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ')};`,
  );
  for (const [id, row] of Object.entries(MEXICO)) {
    sql.push(
      `UPDATE common_medications SET brand_names_mexico = ${sqlText(row.brands)}, mexico_notes = ${sqlText(row.notes)}, mexico_source = ${sqlText(row.source)} WHERE id = ${sqlText(id)};`,
    );
  }
  sql.push('COMMIT;');
  return sql.join('\n');
}

function applyMexicanMedicines(dbPath) {
  const columns = execFileSync('sqlite3', [dbPath, "SELECT name FROM pragma_table_info('common_medications');"])
    .toString()
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (columns.length === 0) throw new Error(`${dbPath} has no common_medications table`);
  execFileSync('sqlite3', [dbPath], { input: buildSql(columns) });
  const missing = Object.keys(MEXICO).filter(
    (id) => execFileSync('sqlite3', [dbPath, `SELECT count(*) FROM common_medications WHERE id = ${sqlText(id)};`]).toString().trim() !== '1',
  );
  if (missing.length) throw new Error(`No medicine row for: ${missing.join(', ')}`);
  return { mexicanBrandRows: Object.keys(MEXICO).length };
}

module.exports = { applyMexicanMedicines, MEXICO, PROGESTERONE };

if (require.main === module) {
  const target = process.argv[2] || path.resolve(__dirname, '..', 'assets', 'data', 'foods_reference.db');
  console.log(JSON.stringify({ target, ...applyMexicanMedicines(target) }));
}
