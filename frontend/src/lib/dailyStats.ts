import type { Transaction } from './api';
import { formatDate, INCOME_CATEGORY, AUTO_PAY_CATEGORY } from './utils';

export function getTodaySpend(transactions: Transaction[]): number {
  const today = formatDate(new Date());
  return transactions
    .filter(
      (tx) =>
        tx.date === today &&
        !tx.is_income &&
        tx.category !== INCOME_CATEGORY &&
        tx.category !== AUTO_PAY_CATEGORY,
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}

/** Consecutive days (ending today) with at least one logged transaction. */
export function getLogStreak(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;

  const loggedDays = new Set(transactions.map((tx) => tx.date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = formatDate(cursor);
    if (!loggedDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Night owl mode';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

export function getLogPrompt(hasAmount: boolean): string {
  if (hasAmount) return 'Where did it go?';
  const prompts = [
    'What did you spend?',
    'Quick log — stay on track',
    'Every rupee counts',
    'Tap amount, pick category',
  ];
  return prompts[new Date().getDate() % prompts.length];
}

const SUCCESS_MESSAGES = [
  'Logged! You\'re on it 🔥',
  'Nice — wallet updated ✓',
  'Tracked. Small wins add up',
  'Got it. Keep the streak going',
  'Saved. You\'re building the habit',
];

export function getSuccessMessage(): string {
  return SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
}

export function getSafeMessage(safe: number): string {
  if (safe < 0) return 'Over budget — review upcoming bills';
  if (safe < 500) return 'Running tight this month';
  if (safe < 2000) return 'Spend mindfully — you\'ve got room';
  return 'Looking healthy — spend with intention';
}
