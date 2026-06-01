import { useState, useEffect } from 'react';
import type { Transaction, TransactionCreate } from './api';
import { INCOME_CATEGORY, AUTO_PAY_CATEGORY } from './utils';

interface EditTransactionModalProps {
  transaction: Transaction;
  categories: string[];
  onSave: (data: TransactionCreate) => void;
  onClose: () => void;
  isPending: boolean;
}

export default function EditTransactionModal({
  transaction,
  categories,
  onSave,
  onClose,
  isPending,
}: EditTransactionModalProps) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [date, setDate] = useState(transaction.date);
  const [durationMonths, setDurationMonths] = useState(transaction.duration_months);
  const isAutoPay = transaction.category === AUTO_PAY_CATEGORY;

  useEffect(() => {
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setDate(transaction.date);
    setDurationMonths(transaction.duration_months);
  }, [transaction]);

  const allCategories = transaction.is_income || category === INCOME_CATEGORY
    ? [INCOME_CATEGORY, ...categories]
    : categories;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;
    onSave({
      amount: amt,
      category,
      date,
      time: transaction.time,
      duration_months: durationMonths,
      is_income: category === INCOME_CATEGORY || transaction.is_income,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm safe-bottom">
      <form
        onSubmit={handleSubmit}
        className="glass-card rounded-t-3xl sm:rounded-2xl p-5 w-full max-w-md shadow-2xl border-t border-white/10 sm:border"
      >
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" aria-hidden />
        <h2 className="text-lg font-black text-white mb-4">Edit Transaction</h2>

        {isAutoPay && (
          <p className="text-xs text-yellow-400 font-bold mb-3">Auto-Pay entries cannot be edited.</p>
        )}

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1 block">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isAutoPay}
              className="input-field disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isAutoPay}
              className="input-field disabled:opacity-50"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isAutoPay}
              className="input-field disabled:opacity-50"
            />
          </div>
          {!transaction.is_income && category !== INCOME_CATEGORY && (
            <div>
              <label className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1 block">Spread (months)</label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                disabled={isAutoPay}
                className="input-field disabled:opacity-50"
              >
                {[1, 2, 3, 6, 12].map((n) => (
                  <option key={n} value={n}>{n} month{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold"
          >
            Cancel
          </button>
          {!isAutoPay && (
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 rounded-xl btn-primary disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
