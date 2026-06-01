/** Settings helpers — billing labels, numeric parsing. */

export function formatBillingDay(day: number): string {
  const n = Math.floor(day);
  if (n < 1 || n > 31) return `Day ${day}`;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function parseMoneyInput(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

export function isValidAutoPayDay(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

export function isValidAutoPayAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0;
}
