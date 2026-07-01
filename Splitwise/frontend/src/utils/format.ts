export function formatMoney(v: string | number) {
  const n = typeof v === 'string' ? Number(v) : v
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(n)
}
