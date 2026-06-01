import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Trash2, Download, Upload, Plus, Tag, TriangleAlert } from 'lucide-react';
import {
  useCategories,
  useAutoPays,
  useTransactions,
  useBudgetConfig,
  useUpdateBudgetConfig,
  useAddAutoPay,
  useDeleteAutoPay,
  useAddCategory,
  useDeleteCategory,
  invalidateAllData,
} from './hooks';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useToast } from './Toast';
import { useConfirm } from './useConfirm';
import { LoadingScreen, ErrorScreen } from './LoadingScreen';
import { getErrorMessage } from './utils';

interface ManageViewProps {
  onShowPrivacy: () => void;
  onAccountDeleted: () => void;
}

export default function ManageView({ onShowPrivacy, onAccountDeleted }: ManageViewProps) {
  const queryClient = useQueryClient();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: autoPays, isLoading: apLoading } = useAutoPays();
  const { data: transactions } = useTransactions();
  const { data: budgetState, isLoading: budgetLoading, isError, refetch } = useBudgetConfig();
  const updateBudgetConfig = useUpdateBudgetConfig();
  const addAutoPay = useAddAutoPay();
  const deleteAutoPay = useDeleteAutoPay();
  const addCategory = useAddCategory();
  const deleteCategory = useDeleteCategory();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [incomeInput, setIncomeInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [rolloverInput, setRolloverInput] = useState('');
  const [apName, setApName] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDay, setApDay] = useState('1');
  const [newCategory, setNewCategory] = useState('');
  const [catError, setCatError] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryToRemove, setCategoryToRemove] = useState('');
  const [replacementCategory, setReplacementCategory] = useState('');
  const [affectedTxsCount, setAffectedTxsCount] = useState(0);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (budgetState) {
      setIncomeInput(String(budgetState.monthly_income));
      setBudgetInput(String(budgetState.base_budget));
      setRolloverInput(String(budgetState.rollover_amount));
    }
  }, [budgetState]);

  const saveBudgetSettings = () => {
    updateBudgetConfig.mutate(
      {
        monthly_income: parseFloat(incomeInput) || 0,
        base_budget: parseFloat(budgetInput) || 0,
        rollover_amount: parseFloat(rolloverInput) || 0,
      },
      {
        onSuccess: () => showToast('Budget saved', 'success'),
        onError: (err) => showToast(getErrorMessage(err, 'Failed to save budget'), 'error'),
      }
    );
  };

  const handleAddAutoPay = () => {
    const amt = parseFloat(apAmount);
    const day = parseInt(apDay);
    if (!apName.trim() || isNaN(amt) || amt <= 0 || isNaN(day) || day < 1 || day > 31) return;

    addAutoPay.mutate(
      { name: apName.trim(), amount: amt, billing_day: day },
      {
        onSuccess: () => {
          setApName('');
          setApAmount('');
          setApDay('1');
          showToast('Auto-pay added', 'success');
        },
        onError: (err) => showToast(getErrorMessage(err, 'Failed to add auto-pay'), 'error'),
      }
    );
  };

  const handleAddCategory = () => {
    setCatError('');
    const name = newCategory.trim();
    if (!name || (categories ?? []).includes(name)) {
      setCatError('Already exists or empty');
      return;
    }
    addCategory.mutate(name, {
      onSuccess: () => {
        setNewCategory('');
        showToast('Category added', 'success');
      },
      onError: (err) => setCatError(getErrorMessage(err, 'Failed to add category')),
    });
  };

  const initiateRemoveCategory = (cat: string) => {
    const affected = (transactions ?? []).filter((t) => t.category === cat).length;
    if (affected > 0) {
      setCategoryToRemove(cat);
      setAffectedTxsCount(affected);
      const others = (categories ?? []).filter((c) => c !== cat);
      setReplacementCategory(others[0] ?? 'Misc');
      setShowCategoryModal(true);
    } else {
      deleteCategory.mutate(
        { name: cat },
        {
          onSuccess: () => showToast('Category removed', 'success'),
          onError: (err) => showToast(getErrorMessage(err, 'Failed to remove category'), 'error'),
        }
      );
    }
  };

  const confirmRemoveCategory = () => {
    deleteCategory.mutate(
      { name: categoryToRemove, reassignTo: replacementCategory },
      {
        onSuccess: () => {
          setShowCategoryModal(false);
          setCategoryToRemove('');
          showToast('Category removed', 'success');
        },
        onError: (err) => showToast(getErrorMessage(err, 'Failed to remove category'), 'error'),
      }
    );
  };

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Export failed'), 'error');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ok = await confirm('Import will merge this backup into your account. Continue?');
    if (!ok) return;

    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await api.importData(payload);
      invalidateAllData(queryClient);
      showToast('Import complete', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Import failed — check file format'), 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteAutoPay = async (id: string) => {
    const ok = await confirm('Remove this auto-pay rule? Past bills stay in history.');
    if (!ok) return;
    deleteAutoPay.mutate(id, {
      onSuccess: () => showToast('Auto-pay removed', 'success'),
      onError: (err) => showToast(getErrorMessage(err, 'Failed to remove'), 'error'),
    });
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm(
      'Permanently delete your account and ALL data? This cannot be undone. Export a backup first if needed.'
    );
    if (!ok) return;
    try {
      await api.deleteAccount();
      showToast('Account deleted', 'success');
      onAccountDeleted();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete account'), 'error');
    }
  };

  const ordinal = (n: number) =>
    n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

  if (catsLoading || apLoading || budgetLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen message="Could not load settings." onRetry={() => refetch()} />;

  const catList = categories ?? [];
  const apList = autoPays ?? [];

  return (
    <div className="page-scroll h-full">
      {dialog}

      <div className="content-pad pt-2 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-white/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-amber-400" />
        </div>
        <h1 className="section-title text-white">Manage</h1>
      </div>

      <section className="glass-card p-5 mb-6">
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Global Math Variables</h2>
        <div className="space-y-4">
          {[
            { id: 'incomeInput', label: 'Assumed Monthly Income', value: incomeInput, set: setIncomeInput },
            { id: 'budgetInput', label: 'Budget Cap (chart scaling)', value: budgetInput, set: setBudgetInput },
            { id: 'rolloverInput', label: 'Initial Rollover', value: rolloverInput, set: setRolloverInput },
          ].map(({ id, label, value, set }) => (
            <div key={id} className="flex flex-col">
              <label htmlFor={id} className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
                <input
                  id={id}
                  type="number"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full bg-[#0b0c10]/80 border border-white/5 rounded-xl py-3 pl-9 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          ))}
          <button
            className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            onClick={saveBudgetSettings}
            disabled={updateBudgetConfig.isPending}
          >
            <Save className="w-4 h-4" /> {updateBudgetConfig.isPending ? 'Saving…' : 'Save Variables'}
          </button>
        </div>
      </section>

      <section className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-zinc-500" />
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Expense Categories</h2>
        </div>
        <div className="flex flex-wrap gap-2.5 mb-5">
          {catList.map((cat) => (
            <div key={cat} className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-full px-3.5 py-1.5">
              <span className="text-[13px] font-bold text-white">{cat}</span>
              <button className="text-rose-500 hover:bg-rose-500/80 rounded-full p-1" onClick={() => initiateRemoveCategory(cat)}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {showCategoryModal && (
          <div className="bg-rose-500/5 p-4 rounded-xl mb-5 border border-rose-500/10">
            <p className="text-[13px] text-white mb-3">Reassign <span className="text-rose-400 font-bold">{affectedTxsCount}</span> transactions to:</p>
            <div className="flex flex-col gap-2">
              <select value={replacementCategory} onChange={(e) => setReplacementCategory(e.target.value)} className="bg-[#0b0c10] border border-white/5 rounded-lg py-2.5 px-3 text-white font-bold">
                {catList.filter((c) => c !== categoryToRemove).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={confirmRemoveCategory} className="flex-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 py-2.5 rounded-lg font-bold">Apply & Delete</button>
                <button onClick={() => setShowCategoryModal(false)} className="flex-1 bg-white/5 text-white border border-white/5 py-2.5 rounded-lg font-bold">Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="flex-1 bg-[#0b0c10]/80 border border-white/5 rounded-xl py-3 px-4 text-white font-bold"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 rounded-xl" onClick={handleAddCategory}>
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {catError && <p className="text-rose-400 text-xs mt-2 font-bold">{catError}</p>}
      </section>

      <section className="glass-card p-5 mb-6">
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Add Auto-Pay</h2>
        <div className="space-y-3 mb-5">
          <input type="text" value={apName} onChange={(e) => setApName(e.target.value)} placeholder="Name (e.g. Netflix)"
            className="w-full bg-[#0b0c10]/80 border border-white/5 rounded-xl py-3.5 px-4 text-white font-bold" />
          <div className="flex gap-3">
            <input type="number" value={apAmount} onChange={(e) => setApAmount(e.target.value)} placeholder="Amount"
              className="flex-[2] bg-[#0b0c10]/80 border border-white/5 rounded-xl py-3.5 px-4 text-white font-bold" />
            <input type="number" value={apDay} onChange={(e) => setApDay(e.target.value)} min={1} max={31} placeholder="Day"
              className="flex-1 bg-[#0b0c10]/80 border border-white/5 rounded-xl py-3.5 px-4 text-white font-bold" />
          </div>
        </div>
        <button className="w-full bg-white/5 text-white border border-white/10 py-3.5 rounded-xl font-bold" onClick={handleAddAutoPay}>
          Save Auto-Pay Rule
        </button>
      </section>

      {apList.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Active Auto-Pays</h2>
          <div className="space-y-3">
            {apList.map((ap) => (
              <div key={ap.id} className="flex items-center justify-between glass-card p-4">
                <div>
                  <p className="font-bold text-[15px] text-white">{ap.name}</p>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase">Bills on the {ordinal(ap.billing_day)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-rose-400">₹{Number(ap.amount).toLocaleString('en-IN')}</span>
                  <button className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-zinc-500 hover:text-rose-500" onClick={() => handleDeleteAutoPay(ap.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="glass-card p-5 mb-6">
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Backup & Restore</h2>
        <p className="text-[11px] text-zinc-500 mb-4">Export your data regularly. Import merges a backup into your account.</p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {importing ? 'Importing…' : 'Import'}
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />
        </div>
      </section>

      <section className="bg-rose-950/20 rounded-[1.5rem] p-5 border border-rose-900/50 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <TriangleAlert className="w-5 h-5 text-rose-500" />
          <h2 className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Account</h2>
        </div>
        <p className="text-[11px] text-zinc-400 font-medium mb-4">Your data is private to your account. Export backups before switching devices.</p>
        <button
          onClick={onShowPrivacy}
          className="w-full mb-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-[13px] font-bold"
        >
          Privacy Policy
        </button>
        <button
          onClick={handleDeleteAccount}
          className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[13px] font-bold"
        >
          Delete Account & All Data
        </button>
      </section>
      </div>
    </div>
  );
}
