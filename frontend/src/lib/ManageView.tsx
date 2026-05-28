import { useState, useRef, useEffect } from 'react';
import { Settings, Save, Trash2, Download, Upload, Plus, Tag, TriangleAlert } from 'lucide-react';
import { useCategories, useAutoPays, useTransactions } from './hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './hooks';
import { api } from './api';

export default function ManageView() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const { data: autoPays = [] } = useAutoPays();
  const { data: transactions = [] } = useTransactions();

  // Fetch budget config directly
  const { data: budgetState } = useQuery({
    queryKey: queryKeys.budgetConfig,
    queryFn: api.getBudgetConfig,
  });

  const updateBudgetConfig = useMutation({
    mutationFn: api.updateBudgetConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetConfig });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary });
    }
  });

  const addAutoPay = useMutation({
    mutationFn: api.addAutoPay,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.autoPays })
  });

  const deleteAutoPay = useMutation({
    mutationFn: api.deleteAutoPay,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.autoPays })
  });

  const addCategory = useMutation({
    mutationFn: api.addCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories })
  });

  const deleteCategory = useMutation({
    mutationFn: ({ name, reassignTo }: { name: string, reassignTo?: string }) => api.deleteCategory(name, reassignTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary });
    }
  });

  // Local state for Budget form
  const [incomeInput, setIncomeInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [rolloverInput, setRolloverInput] = useState('');

  useEffect(() => {
    if (budgetState) {
      setIncomeInput(budgetState.monthly_income.toString());
      setBudgetInput(budgetState.base_budget.toString());
      setRolloverInput(budgetState.rollover_amount.toString());
    }
  }, [budgetState]);

  // Auto-Pay form
  const [apName, setApName] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDay, setApDay] = useState('1');

  // Category form
  const [newCategory, setNewCategory] = useState('');
  const [catError, setCatError] = useState('');

  // Category removal modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryToRemove, setCategoryToRemove] = useState('');
  const [replacementCategory, setReplacementCategory] = useState('');
  const [affectedTxsCount, setAffectedTxsCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveBudgetSettings = () => {
    updateBudgetConfig.mutate({
      monthly_income: parseFloat(incomeInput) || 0,
      base_budget: parseFloat(budgetInput) || 0,
      rollover_amount: parseFloat(rolloverInput) || 0,
    });
  };

  const handleAddAutoPay = () => {
    const amt = parseFloat(apAmount);
    const day = parseInt(apDay);
    if (!apName.trim() || isNaN(amt) || amt <= 0 || isNaN(day) || day < 1 || day > 31) return;
    
    addAutoPay.mutate({
      name: apName.trim(),
      amount: amt,
      billing_day: day
    });
    
    setApName('');
    setApAmount('');
    setApDay('1');
  };

  const handleAddCategory = () => {
    setCatError('');
    if (!newCategory.trim() || categories.includes(newCategory.trim())) {
      setCatError('Already exists or empty');
      return;
    }
    addCategory.mutate(newCategory.trim(), {
      onSuccess: () => setNewCategory(''),
      onError: () => setCatError('Failed to add category')
    });
  };

  const initiateRemoveCategory = (cat: string) => {
    const affected = transactions.filter(t => t.category === cat).length;
    if (affected > 0) {
      setCategoryToRemove(cat);
      setAffectedTxsCount(affected);
      setReplacementCategory(categories.filter(c => c !== cat)[0] || 'Misc');
      setShowCategoryModal(true);
    } else {
      deleteCategory.mutate({ name: cat });
    }
  };

  const confirmRemoveCategory = () => {
    deleteCategory.mutate({ name: categoryToRemove, reassignTo: replacementCategory });
    setShowCategoryModal(false);
    setCategoryToRemove('');
  };

  const ordinal = (n: number) =>
    n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-6 pb-32 h-full text-[#e4e4e7]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pt-2">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
          <Settings className="w-6 h-6 text-zinc-300" />
        </div>
        <h1 className="text-[28px] font-black tracking-tighter text-white">Manage</h1>
      </div>

      {/* Budget Variables */}
      <section className="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-5 mb-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none -z-10"></div>
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Global Math Variables</h2>
        <div className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="incomeInput" className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1.5 ml-1">Assumed Monthly Income</label>
            <div className="relative group-focus-within:drop-shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-shadow">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
              <input id="incomeInput" type="number" value={incomeInput} onChange={e => setIncomeInput(e.target.value)}
                className="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 pl-9 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50 focus:bg-[#0b0c10] transition-colors"
                style={{ touchAction: 'auto' }} />
            </div>
          </div>

          <div className="flex flex-col">
            <label htmlFor="budgetInput" className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1.5 ml-1">Budget Cap (for chart scaling)</label>
            <div className="relative group-focus-within:drop-shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-shadow">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
              <input id="budgetInput" type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                className="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 pl-9 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50 focus:bg-[#0b0c10] transition-colors"
                style={{ touchAction: 'auto' }} />
            </div>
          </div>

          <div className="flex flex-col">
            <label htmlFor="rolloverInput" className="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1.5 ml-1">Initial Rollover</label>
            <div className="relative group-focus-within:drop-shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-shadow">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
              <input id="rolloverInput" type="number" value={rolloverInput} onChange={e => setRolloverInput(e.target.value)}
                className="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 pl-9 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50 focus:bg-[#0b0c10] transition-colors"
                style={{ touchAction: 'auto' }} />
            </div>
          </div>

          <button
            className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 py-3 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 shadow-inner hover:bg-blue-500/20"
            onClick={saveBudgetSettings}
          >
            <Save className="w-4 h-4" /> Save Variables
          </button>
        </div>
      </section>

      {/* Categories CRUD */}
      <section className="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-5 mb-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none -z-10"></div>
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-zinc-500" />
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Expense Categories</h2>
        </div>

        <div className="flex flex-wrap gap-2.5 mb-5">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1.5 bg-white/5 border border-white/5 shadow-inner rounded-full px-3.5 py-1.5">
              <span className="text-[13px] font-bold text-white tracking-tight">{cat}</span>
              <button
                className="text-rose-500 ml-0.5 hover:text-white hover:bg-rose-500/80 rounded-full p-1 active:scale-75 transition-all"
                onClick={() => initiateRemoveCategory(cat)}
                aria-label={`Remove ${cat}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {showCategoryModal && (
          <div className="bg-rose-500/5 p-4 rounded-xl mb-5 border border-rose-500/10 shadow-inner">
            <p className="text-[13px] text-white mb-3 font-semibold leading-relaxed">This category is used in <span className="text-rose-400 font-bold">{affectedTxsCount}</span> transactions. Reassign them to:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={replacementCategory} onChange={e => setReplacementCategory(e.target.value)} className="flex-1 bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-lg py-2.5 px-3 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors">
                {categories.filter(c => c !== categoryToRemove).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <button onClick={confirmRemoveCategory} className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-4 py-2.5 rounded-lg font-bold active:scale-95 transition-all w-full sm:w-auto text-[13px]">Apply & Delete</button>
              <button onClick={() => setShowCategoryModal(false)} className="bg-white/5 text-white border border-white/5 px-4 py-2.5 rounded-lg font-bold active:scale-95 transition-all w-full sm:w-auto text-[13px]">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="flex-1 bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors text-[14px]"
            style={{ touchAction: 'auto' }}
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
          />
          <button
            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:bg-blue-500/20"
            onClick={handleAddCategory}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {catError && <p className="text-rose-400 text-xs mt-2.5 font-bold tracking-wide">{catError}</p>}
      </section>

      {/* Add Auto-Pay */}
      <section className="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-5 mb-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Add Auto-Pay</h2>
        <p className="text-[11px] text-zinc-500/70 mb-4 font-bold tracking-wide">Auto-logged when billing day arrives.</p>
        <div className="space-y-3 mb-5">
          <input
            type="text"
            value={apName}
            onChange={e => setApName(e.target.value)}
            placeholder="Name (e.g. Netflix)"
            className="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3.5 px-4 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
            style={{ touchAction: 'auto' }}
          />
          <div className="flex gap-3 relative">
            <div className="relative flex-[2]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
              <input type="number" value={apAmount} onChange={e => setApAmount(e.target.value)} placeholder="Amount"
                className="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3.5 pl-9 pr-4 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
                style={{ touchAction: 'auto' }} />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-[9px] uppercase tracking-widest">Day</span>
              <input type="number" value={apDay} onChange={e => setApDay(e.target.value)} min="1" max="31"
                className="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3.5 pl-11 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
                style={{ touchAction: 'auto' }} />
            </div>
          </div>
        </div>
        <button
          className="w-full bg-white/5 text-white border border-white/10 py-3.5 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-all shadow-inner hover:bg-white/10"
          onClick={handleAddAutoPay}
        >
          Save Auto-Pay Rule
        </button>
      </section>

      {/* Active Auto-Pays */}
      {autoPays.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 px-1">Active Auto-Pays</h2>
          <div className="space-y-3">
            {autoPays.map(ap => (
              <div key={ap.id} className="flex items-center justify-between bg-[#111216]/80 backdrop-blur-xl p-4 rounded-[1.2rem] border border-white/5 shadow-lg group">
                <div>
                  <p className="font-bold text-[15px] text-white tracking-tight">{ap.name}</p>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Bills on the {ordinal(ap.billing_day)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-rose-400">₹{Number(ap.amount).toLocaleString('en-IN')}</span>
                  <button
                    className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full border border-white/5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all"
                    onClick={() => deleteAutoPay.mutate(ap.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Management (Omitted file upload as backend manages state now, unless API endpoint added) */}
      <section className="bg-rose-950/20 backdrop-blur-xl rounded-[1.5rem] p-5 border border-rose-900/50 shadow-2xl mt-12">
        <div className="flex items-center gap-2 mb-3">
          <TriangleAlert className="w-5 h-5 text-rose-500" />
          <h2 className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Danger Zone</h2>
        </div>
        <p className="text-[11px] text-zinc-400 mb-5 font-bold leading-relaxed pr-4">Data is stored securely on the server. If you wish to wipe it, use the backend database tooling or future API endpoints.</p>
      </section>

    </div>
  );
}
