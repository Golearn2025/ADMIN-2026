export function formatPenceGBP(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "—";
  return `£${(pence / 100).toFixed(2)}`;
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function sumNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return nums.reduce((acc, v) => acc + v, 0);
}
