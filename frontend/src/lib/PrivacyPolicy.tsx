import { X } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export default function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 z-[95] bg-[#0b0c10] flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <h1 className="text-lg font-black text-white">Privacy Policy</h1>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-400">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6 text-zinc-300 text-sm leading-relaxed space-y-4">
        <p><strong className="text-white">Last updated:</strong> May 2026</p>

        <section>
          <h2 className="text-white font-bold mb-2">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account username and hashed password</li>
            <li>Financial data you enter: transactions, categories, budget settings, auto-pays</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">How we use it</h2>
          <p>Your data is used solely to provide the expense tracking service — calculating Safe-to-Spend, storing your ledger, and syncing across your devices when signed in.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Storage & security</h2>
          <p>Data is stored on our secure server, associated with your account. Passwords are hashed with bcrypt. API communication uses HTTPS in production.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Sharing</h2>
          <p>We do not sell or share your personal or financial data with third parties.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Your rights</h2>
          <p>You can export your data anytime from Settings → Backup & Restore. You can permanently delete your account and all associated data from Settings → Delete Account.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Contact</h2>
          <p>For privacy questions, contact the app developer via the email listed on the Play Store listing.</p>
        </section>
      </div>
    </div>
  );
}
