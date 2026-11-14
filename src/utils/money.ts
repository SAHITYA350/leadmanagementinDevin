const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrCompact = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Money is stored as integer paise. Display: Rs 1,23,456.00 */
export function formatINR(paise: number): string {
  return `Rs ${inr.format(paise / 100)}`;
}

export function formatINRShort(paise: number): string {
  const rs = paise / 100;
  if (rs >= 1_00_00_000) return `Rs ${(rs / 1_00_00_000).toFixed(2)} Cr`;
  if (rs >= 1_00_000) return `Rs ${(rs / 1_00_000).toFixed(2)} L`;
  return `Rs ${inrCompact.format(rs)}`;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
