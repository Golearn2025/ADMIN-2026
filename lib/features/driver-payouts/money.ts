export function penceToGbp(pence: number | null | undefined): number {
  return (Number(pence) || 0) / 100;
}

export function formatGbp(pence: number | null | undefined): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(penceToGbp(pence));
}

export function formatLondonDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  });
}
