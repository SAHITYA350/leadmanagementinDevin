/** +919876543210 -> +91 98765 43210 */
export function formatPhone(normalized: string | null | undefined): string {
  if (!normalized) return '-';
  const m = /^\+91(\d{5})(\d{5})$/.exec(normalized);
  return m ? `+91 ${m[1]} ${m[2]}` : normalized;
}
