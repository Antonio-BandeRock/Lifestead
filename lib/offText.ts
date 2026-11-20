// Reading a text field from an Open Facts product in whatever language it
// was typed in (1.0.95.2, Tony 2026-11-20). Many products sold in Mexico
// were entered with only product_name_es filled and the plain product_name
// left empty, so a scan that read only the plain field counted them as
// missing. Kept free of runtime imports so the tests can load it.

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.replace(/\s+/g, ' ').trim();
  return null;
}

/**
 * A product's text field in the best language there is: the app's language,
 * the plain field, English, then any other language it was typed in.
 */
export function localizedField(product: Record<string, unknown>, field: string, language: string): string | null {
  const first = text(product[`${field}_${language}`]) ?? text(product[field]) ?? text(product[`${field}_en`]);
  if (first) return first;
  const prefix = `${field}_`;
  for (const key of Object.keys(product).sort()) {
    if (!key.startsWith(prefix)) continue;
    // Only a language code (es, fr, pt_br), never a field like product_name_image.
    if (!/^[a-z]{2}(_[a-z]{2})?$/.test(key.slice(prefix.length))) continue;
    const found = text(product[key]);
    if (found) return found;
  }
  return null;
}

/** The first brand, whether the service sent a list or a comma-separated string. */
export function firstBrand(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const b of value) {
      const t = text(b);
      if (t) return t;
    }
    return null;
  }
  const s = text(value);
  return s ? s.split(',')[0].trim() || null : null;
}

/** The fields to ask for so a name typed in any of the app's planned languages comes back. */
export function localizedFieldList(field: string): string {
  return [field, ...['es', 'en', 'fr', 'de', 'fi', 'no', 'nb', 'sv', 'ja', 'pt'].map((l) => `${field}_${l}`)].join(',');
}
