// The "In short" line on every reading entry (1.0.87.7): one or two plain
// sentences, written for about a grade 6 to 8 reader, shown first on the
// card in place of the teaser. The teaser and the full text sit below it
// once the entry is open, so nothing is taken away and nobody has to ask
// for an easier version. One file per category so the lines can be written
// shelf by shelf; scripts/test_in_short.js keeps every line at grade 8 or
// under and checks every id.
import { LINES as basicHealth } from './basicHealth';
import { LINES as hashimotos } from './hashimotos';
import { LINES as graves } from './graves';
import { LINES as fattyLiverDisease } from './fattyLiverDisease';
import { LINES as lupus } from './lupus';
import { LINES as prostateHealth } from './prostateHealth';
import { LINES as rheumatoidArthritis } from './rheumatoidArthritis';
import { LINES as migraine } from './migraine';
import { LINES as type1Diabetes } from './type1Diabetes';
import { LINES as type2Diabetes } from './type2Diabetes';
import { LINES as pcos } from './pcos';
import { LINES as cardiovascularDisease } from './cardiovascularDisease';
import { LINES as psoriasis } from './psoriasis';
import { LINES as ibd } from './ibd';
import { LINES as celiac } from './celiac';
import { LINES as multipleSclerosis } from './multipleSclerosis';
import { LINES as sjogrens } from './sjogrens';
import { LINES as ibs } from './ibs';
import { LINES as chronicKidneyDisease } from './chronicKidneyDisease';
import { LINES as gout } from './gout';
import { LINES as earthMatters } from './earthMatters';
import { LINES as homeGardening } from './homeGardening';
import { LINES as makingItPay } from './makingItPay';

export const IN_SHORT: Readonly<Record<string, string>> = {
  ...basicHealth,
  ...hashimotos,
  ...graves,
  ...fattyLiverDisease,
  ...lupus,
  ...prostateHealth,
  ...rheumatoidArthritis,
  ...migraine,
  ...type1Diabetes,
  ...type2Diabetes,
  ...pcos,
  ...cardiovascularDisease,
  ...psoriasis,
  ...ibd,
  ...celiac,
  ...multipleSclerosis,
  ...sjogrens,
  ...ibs,
  ...chronicKidneyDisease,
  ...gout,
  ...earthMatters,
  ...homeGardening,
  ...makingItPay,
};

export function inShortOf(entry: { id: string; inShort?: string }): string | undefined {
  return entry.inShort ?? IN_SHORT[entry.id];
}
