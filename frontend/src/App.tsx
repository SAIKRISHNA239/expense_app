import { useState, useEffect } from 'react';
import LogView from './lib/LogView';
import DashboardView from './lib/DashboardView';
import ManageView from './lib/ManageView';
import HistoryView from './lib/HistoryView';
import AuthView from './lib/AuthView';
import AppHeader from './lib/AppHeader';
import OfflineBanner from './lib/OfflineBanner';
import PrivacyPolicy from './lib/PrivacyPolicy';
import { api, initAuth, setAuthToken } from './lib/api';
import { getStoredToken, getStoredUsername, setStoredUsername } from './lib/storage';
import { hydrateQueryCache, cacheFromServer } from './lib/offlineSync';
import { localDb } from './lib/localDb';
import { queryClient } from './lib/queryClient';
import { isOnline } from './lib/network';
import { PenLine, PieChart, Clock3, SlidersHorizontal } from 'lucide-react';

type Tab = 'log' | 'dashboard' | 'history' | 'manage';

const TABS: {
  id: Tab;
  label: string;
  icon: typeof PenLine;
  color: string;
  indicator: string;
}[] = [
  { id: 'log', label: 'Log', icon: PenLine, color: 'text-teal-400', indicator: 'nav-indicator--log' },
  { id: 'dashboard', label: 'Overview', icon: PieChart, color: 'text-rose-400', indicator: 'nav-indicator--dashboard' },
  { id: 'history', label: 'History', icon: Clock3, color: 'text-violet-400', indicator: 'nav-indicator--history' },
  { id: 'manage', label: 'Settings', icon: SlidersHorizontal, color: 'text-amber-400', indicator: 'nav-indicator--manage' },
];

function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden>
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    (async () => {
      await initAuth();
      const token = await getStoredToken();
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      try {
        const user = await api.getMe();
        setUsername(user.username);
        await setStoredUsername(user.username);
        await hydrateQueryCache(queryClient);
        if (isOnline()) await cacheFromServer();
        await hydrateQueryCache(queryClient);
        setIsAuthenticated(true);
      } catch {
        if (token && !isOnline()) {
          const cachedName = (await getStoredUsername()) ?? 'You';
          setUsername(cachedName);
          await hydrateQueryCache(queryClient);
          setIsAuthenticated(true);
          return;
        }
        await setAuthToken(null);
        await setStoredUsername(null);
        setIsAuthenticated(false);
      }
    })();
  }, []);

  const clearSessionData = async () => {
    await localDb.clearAll();
    queryClient.clear();
  };

  useEffect(() => {
    const handleLogout = async () => {
      await clearSessionData();
      setIsAuthenticated(false);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const handleLogout = async () => {
    await setAuthToken(null);
    await setStoredUsername(null);
    await clearSessionData();
    setUsername('');
    setIsAuthenticated(false);
  };

  if (showPrivacy) {
    return (
      <>
        <AmbientBackground />
        <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
      </>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="app-shell flex items-center justify-center relative">
        <AmbientBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="brand-mark scale-125">
            <span className="brand-mark-inner">₹</span>
          </div>
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AmbientBackground />
        <AuthView
          onShowPrivacy={() => setShowPrivacy(true)}
          onAuthenticated={async () => {
            try {
              const user = await api.getMe();
              setUsername(user.username);
              await setStoredUsername(user.username);
              await hydrateQueryCache(queryClient);
              if (isOnline()) await cacheFromServer();
              await hydrateQueryCache(queryClient);
              setIsAuthenticated(true);
            } catch {
              await setAuthToken(null);
              setIsAuthenticated(false);
            }
          }}
        />
      </>
    );
  }

  const tabClass = (tab: Tab) =>
    activeTab === tab ? 'flex flex-col flex-1 min-h-0 overflow-hidden' : 'hidden';

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const activeTabMeta = TABS[activeIndex];

  return (
    <>
      <AmbientBackground />
      <main className="app-shell flex flex-col relative z-10 safe-top safe-bottom">
        <OfflineBanner />
        <AppHeader username={username} onLogout={handleLogout} />

        <div className="flex-1 min-h-0 flex flex-col relative">
          <div className={tabClass('log')}><LogView /></div>
          <div className={tabClass('dashboard')}><DashboardView /></div>
          <div className={tabClass('history')}><HistoryView /></div>
          <div className={tabClass('manage')}>
            <ManageView onShowPrivacy={() => setShowPrivacy(true)} onAccountDeleted={handleLogout} />
          </div>
        </div>

        <nav
          className="absolute left-1/2 -translate-x-1/2 w-[min(94%,24rem)] nav-safe-bottom z-50 glass-card p-1.5"
          style={{ boxShadow: '0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}
        >
          <div className="relative flex h-[56px] sm:h-[60px]">
            <div
              className={`nav-indicator ${activeTabMeta?.indicator ?? ''}`}
              style={{
                width: `${100 / TABS.length}%`,
                left: `${(activeIndex * 100) / TABS.length}%`,
              }}
            />
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`nav-pill z-10 ${isActive ? `nav-pill-active ${tab.color}` : 'text-zinc-500'}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className={`w-[1.125rem] h-[1.125rem] shrink-0 ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[9px] font-bold tracking-wide truncate w-full text-center px-0.5">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </>
  );
}
