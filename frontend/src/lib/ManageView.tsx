import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  SlidersHorizontal,
  Save,
  Trash2,
  Download,
  Upload,
  Plus,
  Tag,
  TriangleAlert,
  Wallet,
  CalendarClock,
  Shield,
  FileJson,
  Repeat,
} from 'lucide-react';
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
import { formatINR, getErrorMessage } from './utils';
import { getCategoryEmoji } from './categoryIcons';
import { getCategoryAccent } from './categoryColors';
import {
  formatBillingDay,
  parseMoneyInput,
  isValidAutoPayDay,
  isValidAutoPayAmount,
} from './manageUtils';
import type { AutoPay } from './api';

interface ManageViewProps {
  onShowPrivacy: () => void;
  onAccountDeleted: () => void;
}

/* ─── Shared UI ─────────────────────────────────────────────────────────────── */

const SetSection = memo(function SetSection({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
  variant = 'default',
}: {
  id?: string;
  icon: typeof Wallet;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  return (
    <section
      id={id}
      className={`set-section ${variant === 'danger' ? 'set-section--danger' : ''}`}
    >
      <div className="set-section-head">
        <div className={`set-section-icon ${variant === 'danger' ? 'set-section-icon--danger' : ''}`}>
          <Icon className="w-4 h-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="set-section-title">{title}</h2>
          {subtitle && <p className="set-section-sub">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
});

const MoneyField = memo(function MoneyField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="set-field">
      <label htmlFor={id} className="set-label">
        {label}
      </label>
      {hint && <p className="set-hint">{hint}</p>}
      <div className="set-money-wrap">
        <span className="set-money-prefix" aria-hidden>
          ₹
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field set-money-input"
        />
      </div>
    </div>
  );
});

const CategoryChip = memo(function CategoryChip({
  name,
  onRemove,
}: {
  name: string;
  onRemove: (name: string) => void;
}) {
  const accent = getCategoryAccent(name);
  const emoji = getCategoryEmoji(name);

  return (
    <div
      className="set-cat-chip"
      style={{ background: accent.bg, borderColor: accent.border }}
    >
      <span className="set-cat-emoji" aria-hidden>
        {emoji}
      </span>
      <span className="set-cat-name">{name}</span>
      <button
        type="button"
        className="set-cat-remove"
        onClick={() => onRemove(name)}
        aria-label={`Remove category ${name}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

const AutoPayRow = memo(function AutoPayRow({
  ap,
  onDelete,
}: {
  ap: AutoPay;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="set-ap-row">
      <div className="set-ap-icon" aria-hidden>
        <Repeat className="w-4 h-4" />
      </div>
      <div className="set-ap-body min-w-0">
        <p className="set-ap-name">{ap.name}</p>
        <p className="set-ap-meta">
          <CalendarClock className="w-3 h-3 inline -mt-0.5" />
          Bills on the {formatBillingDay(ap.billing_day)}
        </p>
      </div>
      <span className="set-ap-amt">{formatINR(Number(ap.amount))}</span>
      <button
        type="button"
        className="set-ap-delete"
        onClick={() => onDelete(ap.id)}
        aria-label={`Remove auto-pay ${ap.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});

/* ─── Main view ─────────────────────────────────────────────────────────────── */

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

  const saveBudgetSettings = useCallback(() => {
    updateBudgetConfig.mutate(
      {
        monthly_income: parseMoneyInput(incomeInput),
        base_budget: parseMoneyInput(budgetInput),
        rollover_amount: parseMoneyInput(rolloverInput),
      },
      {
        onSuccess: () => showToast('Budget settings saved', 'success'),
        onError: (err) => showToast(getErrorMessage(err, 'Failed to save budget'), 'error'),
      }
    );
  }, [incomeInput, budgetInput, rolloverInput, updateBudgetConfig, showToast]);

  const handleAddAutoPay = useCallback(() => {
    const amt = parseFloat(apAmount);
    const day = parseInt(apDay, 10);
    if (!apName.trim() || !isValidAutoPayAmount(amt) || !isValidAutoPayDay(day)) {
      showToast('Enter a name, amount, and billing day (1–31)', 'error');
      return;
    }

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
  }, [apName, apAmount, apDay, addAutoPay, showToast]);

  const handleAddCategory = useCallback(() => {
    setCatError('');
    const name = newCategory.trim();
    if (!name) {
      setCatError('Enter a category name');
      return;
    }
    if ((categories ?? []).includes(name)) {
      setCatError('Category already exists');
      return;
    }
    addCategory.mutate(name, {
      onSuccess: () => {
        setNewCategory('');
        showToast('Category added', 'success');
      },
      onError: (err) => setCatError(getErrorMessage(err, 'Failed to add category')),
    });
  }, [newCategory, categories, addCategory, showToast]);

  const initiateRemoveCategory = useCallback(
    (cat: string) => {
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
    },
    [transactions, categories, deleteCategory, showToast]
  );

  const confirmRemoveCategory = useCallback(() => {
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
  }, [categoryToRemove, replacementCategory, deleteCategory, showToast]);

  const handleExport = useCallback(async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spendly-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Export failed'), 'error');
    }
  }, [showToast]);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [confirm, queryClient, showToast]
  );

  const handleDeleteAutoPay = useCallback(
    async (id: string) => {
      const ok = await confirm('Remove this auto-pay rule? Past bills stay in history.');
      if (!ok) return;
      deleteAutoPay.mutate(id, {
        onSuccess: () => showToast('Auto-pay removed', 'success'),
        onError: (err) => showToast(getErrorMessage(err, 'Failed to remove'), 'error'),
      });
    },
    [confirm, deleteAutoPay, showToast]
  );

  const handleDeleteAccount = useCallback(async () => {
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
  }, [confirm, onAccountDeleted, showToast]);

  if (catsLoading || apLoading || budgetLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen message="Could not load settings." onRetry={() => refetch()} />;

  const catList = categories ?? [];
  const apList = autoPays ?? [];
  const reassignOptions = catList.filter((c) => c !== categoryToRemove);

  return (
    <div className="page-scroll h-full set-page">
      {dialog}

      <header className="set-header content-pad">
        <div className="set-header-top">
          <div>
            <h1 className="set-title">Settings</h1>
            <p className="set-header-sub">
              {catList.length} categories · {apList.length} auto-pay{apList.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="set-header-icon" aria-hidden>
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>
      </header>

      <div className="set-content content-pad pb-8">
        <SetSection
          id="budget"
          icon={Wallet}
          title="Budget & income"
          subtitle="Powers safe-to-spend on your Overview tab"
        >
          <div className="set-fields">
            <MoneyField
              id="incomeInput"
              label="Monthly income"
              hint="Used to calculate how much you can safely spend"
              value={incomeInput}
              onChange={setIncomeInput}
            />
            <MoneyField
              id="budgetInput"
              label="Monthly budget cap"
              hint="Optional ceiling for charts and planning"
              value={budgetInput}
              onChange={setBudgetInput}
            />
            <MoneyField
              id="rolloverInput"
              label="Starting rollover"
              hint="Balance carried into this month"
              value={rolloverInput}
              onChange={setRolloverInput}
            />
          </div>
          <button
            type="button"
            className="set-save-btn btn-primary"
            onClick={saveBudgetSettings}
            disabled={updateBudgetConfig.isPending}
          >
            <Save className="w-4 h-4" />
            {updateBudgetConfig.isPending ? 'Saving…' : 'Save budget'}
          </button>
        </SetSection>

        <SetSection icon={Tag} title="Categories" subtitle="Used when logging expenses">
          {catList.length > 0 ? (
            <div className="set-cat-grid">
              {catList.map((cat) => (
                <CategoryChip key={cat} name={cat} onRemove={initiateRemoveCategory} />
              ))}
            </div>
          ) : (
            <p className="set-empty-inline">No categories yet — add one below.</p>
          )}

          {showCategoryModal && (
            <div className="set-reassign-panel" role="dialog" aria-labelledby="reassign-title">
              <p id="reassign-title" className="set-reassign-text">
                <span className="set-reassign-count">{affectedTxsCount}</span> transactions use{' '}
                <strong>{categoryToRemove}</strong>. Reassign them to:
              </p>
              <select
                value={replacementCategory}
                onChange={(e) => setReplacementCategory(e.target.value)}
                className="input-field"
              >
                {reassignOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <div className="set-reassign-actions">
                <button type="button" className="set-btn-ghost" onClick={() => setShowCategoryModal(false)}>
                  Cancel
                </button>
                <button type="button" className="set-btn-danger" onClick={confirmRemoveCategory}>
                  Reassign & remove
                </button>
              </div>
            </div>
          )}

          <div className="set-add-row">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                if (catError) setCatError('');
              }}
              placeholder="New category"
              className={`input-field flex-1 ${catError ? 'input-field--error' : ''}`}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button
              type="button"
              className="set-add-btn"
              onClick={handleAddCategory}
              disabled={addCategory.isPending}
              aria-label="Add category"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {catError && <p className="set-field-error">{catError}</p>}
        </SetSection>

        <SetSection
          icon={Repeat}
          title="Auto-pay"
          subtitle="Recurring bills logged automatically each month"
        >
          <div className="set-fields set-fields--compact">
            <input
              type="text"
              value={apName}
              onChange={(e) => setApName(e.target.value)}
              placeholder="Name (e.g. Netflix)"
              className="input-field"
            />
            <div className="set-ap-form-row">
              <div className="set-money-wrap flex-1">
                <span className="set-money-prefix" aria-hidden>
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={apAmount}
                  onChange={(e) => setApAmount(e.target.value)}
                  placeholder="Amount"
                  className="input-field set-money-input"
                />
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={apDay}
                onChange={(e) => setApDay(e.target.value)}
                min={1}
                max={31}
                placeholder="Day"
                className="input-field set-ap-day"
                aria-label="Billing day of month"
              />
            </div>
          </div>
          <button
            type="button"
            className="set-save-btn set-save-btn--secondary"
            onClick={handleAddAutoPay}
            disabled={addAutoPay.isPending}
          >
            {addAutoPay.isPending ? 'Adding…' : 'Add auto-pay'}
          </button>

          {apList.length > 0 && (
            <div className="set-ap-list">
              <p className="set-list-label">Active rules</p>
              {apList.map((ap) => (
                <AutoPayRow key={ap.id} ap={ap} onDelete={handleDeleteAutoPay} />
              ))}
            </div>
          )}
        </SetSection>

        <SetSection
          icon={FileJson}
          title="Backup & restore"
          subtitle="Export regularly; import merges a JSON backup"
        >
          <div className="set-backup-actions">
            <button type="button" className="set-backup-btn set-backup-btn--export" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button
              type="button"
              className="set-backup-btn set-backup-btn--import"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing…' : 'Import'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </SetSection>

        <SetSection
          icon={Shield}
          title="Account & privacy"
          subtitle="Your data stays on your account only"
          variant="danger"
        >
          <p className="set-danger-copy">
            Export a backup before switching devices. Deleting your account removes all transactions,
            categories, and settings permanently.
          </p>
          <button type="button" className="set-btn-ghost set-btn-full" onClick={onShowPrivacy}>
            Privacy policy
          </button>
          <button type="button" className="set-btn-danger set-btn-full" onClick={handleDeleteAccount}>
            <TriangleAlert className="w-4 h-4" />
            Delete account & all data
          </button>
        </SetSection>
      </div>
    </div>
  );
}
