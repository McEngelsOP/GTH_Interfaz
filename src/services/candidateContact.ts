import type { Candidate } from '../types/index.ts';

/** Celular peruano local o número internacional explícito. No adivina países de otros números locales. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  // Las letras/extensiones o varios números no forman un destinatario inequívoco.
  if (!/^[+\d\s().-]+$/.test(phone.trim())) return null;
  let digits = phone.replace(/\D/g, '');
  if (/^9\d{8}$/.test(digits)) return `51${digits}`;
  if (/^519\d{8}$/.test(digits)) return digits;
  const explicitInternational = phone.trim().startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('51')) return /^519\d{8}$/.test(digits) ? digits : null;
  return explicitInternational && /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function candidateWhatsappUrl(candidate: Pick<Candidate, 'name' | 'phone'>, jobTitle: string): string | null {
  const number = whatsappNumber(candidate.phone);
  if (!number) return null;
  const message = `Hola, ${candidate.name}. Le escribimos del equipo de Gestión del Talento Humano de la Universidad ESAN por su postulación a la convocatoria «${jobTitle}». ¿Tiene unos minutos para conversar?`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
