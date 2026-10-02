const spanishNameOrder = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** Orden alfabético español, sin diferencias por mayúsculas o tildes. */
export function compareCandidateNames(left: string, right: string): number {
  return spanishNameOrder.compare(left.trim(), right.trim());
}
