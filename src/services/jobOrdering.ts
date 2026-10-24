import type { JobPosting } from '../types/index.ts';

const alphabetical = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Un mismo orden por puesto en el listado y el selector; el código desempata. */
export function compareJobTitles(a: JobPosting, b: JobPosting): number {
  return alphabetical.compare(a.title.trim(), b.title.trim())
    || alphabetical.compare(a.code, b.code)
    || alphabetical.compare(a.id, b.id);
}
