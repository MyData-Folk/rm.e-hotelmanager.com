/**
 * Converts DD/MM/YYYY to YYYY-MM-DD
 */
export function ddmmyyyyToYyyymmdd(dStr: string): string {
  if (!dStr || typeof dStr !== "string") return "";
  const parts = dStr.split("/");
  if (parts.length === 3) {
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  return dStr;
}

/**
 * Converts YYYY-MM-DD to DD/MM/YYYY
 */
export function yyyymmddToDdmmyyyy(ymd: string): string {
  if (!ymd || typeof ymd !== "string") return "";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return ymd;
}
