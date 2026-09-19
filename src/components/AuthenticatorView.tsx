import React, { useState, useEffect } from 'react';
import { Copy, Check, Plus, ShieldCheck, Trash } from 'lucide-react';
import type { CredentialEntry } from '../lib/tauri';
import { generateTotp, isValidBase32 } from '../lib/totp';
import { secureCopy, addCredential, deleteCredential } from '../lib/tauri';

interface AuthenticatorViewProps {
  entries: CredentialEntry[];
  totpTick: number;
}

const TotpCard: React.FC<{ entry: CredentialEntry; tick: number; onRefresh?: () => void }> = ({ entry, tick, onRefresh }) => {
  const [otp, setOtp] = useState<{ code: string; remainingSeconds: number; progress: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (entry.totp_secret) {
      generateTotp(entry.totp_secret).then(setOtp).catch(() => setOtp(null));
    }
  }, [entry.totp_secret, tick]);

  if (!otp) {
    return (
      <div className="bg-gunmetal-800 border border-ops-700/50 rounded-lg p-5 flex items-center justify-between opacity-50">
        <div className="flex flex-col">
          <div className="text-slate-text font-bold text-lg">
            {entry.service}{entry.username ? <span className="text-slate-dim font-normal">: {entry.username}</span> : ""}
          </div>
          <div className="text-ops-500 text-xs mt-2 font-mono">LOADING OR INVALID SECRET</div>
        </div>
      </div>
    );
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await secureCopy(otp.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy TOTP", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this Authenticator code?")) {
      setIsDeleting(true);
      try {
        await deleteCredential(entry.id);
        if (onRefresh) onRefresh();
      } catch (err) {
        console.error("Failed to delete", err);
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={`bg-gunmetal-800 border border-ops-700/50 rounded-lg p-5 flex items-center justify-between hover:border-ops-500 transition-colors ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex flex-col min-w-0">
        <div className="text-slate-text font-bold text-lg truncate">
          {entry.service}{entry.username ? <span className="text-slate-dim font-normal">: {entry.username}</span> : ""}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="font-mono text-3xl tracking-[0.2em] text-cyan-400 font-bold select-all mr-2">
            {otp.code.slice(0, 3)} {otp.code.slice(3)}
          </span>
          <button 
            onClick={handleCopy}
            title="Copy 2FA Code"
            className="p-2 text-ops-500 hover:text-cyan-400 hover:bg-cyan-900/20 rounded transition-colors"
          >
            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
          </button>
          <button 
            onClick={handleDelete}
            title="Delete 2FA Code"
            className="p-2 text-ops-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>
      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
        {/* SVG Circular pie timer style */}
        <svg className="w-full h-full transform -rotate-90 rounded-full bg-ops-800/50">
          {/* Progress pie slice */}
          <circle 
            cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="24" fill="transparent" 
            strokeDasharray="75.4" strokeDashoffset={- (75.4 - (75.4 * otp.progress) / 100)}
            className={`${otp.remainingSeconds <= 5 ? "text-red-500" : "text-cyan-500"} transition-all duration-1000 ease-linear`}
          />
        </svg>
      </div>
    </div>
  );
};



export const AuthenticatorView: React.FC<AuthenticatorViewProps & { onRefresh?: () => void }> = ({ entries, totpTick, onRefresh }) => {
  const totpEntries = entries.filter(e => !!e.totp_secret);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ service: '', username: '', totp_secret: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.service || !form.totp_secret) {
      setError("Service and TOTP secret are required");
      return;
    }
    if (!isValidBase32(form.totp_secret)) {
      setError("Invalid Base32 secret");
      return;
    }
    setLoading(true);
    try {
      await addCredential(form.service, form.username, "", "", "", form.totp_secret);
      setShowModal(false);
      setForm({ service: '', username: '', totp_secret: '' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const modal = showModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gunmetal-900 border border-ops-700 rounded-lg p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-sm font-mono text-slate-text uppercase tracking-widest mb-4">ADD 2FA CODE</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <div className="label-ops mb-1 text-xs">SERVICE</div>
            <input type="text" value={form.service} onChange={e => setForm({...form, service: e.target.value})} className="input-ops" placeholder="e.g. GitHub" autoFocus />
          </div>
          <div>
            <div className="label-ops mb-1 text-xs">ACCOUNT (USERNAME / EMAIL)</div>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="input-ops" placeholder="optional" />
          </div>
          <div>
            <div className="label-ops mb-1 text-xs">TOTP SECRET (BASE32)</div>
            <input type="text" value={form.totp_secret} onChange={e => setForm({...form, totp_secret: e.target.value})} className="input-ops" placeholder="JBSWY3DPEHPK3PXP" />
          </div>
          {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">CANCEL</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "SAVING..." : "SAVE"}</button>
          </div>
        </form>
      </div>
    </div>
  );

  if (totpEntries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-label gap-4 animate-in fade-in relative">
        {modal}
        <ShieldCheck size={48} className="opacity-20" />
        <div className="text-sm font-mono tracking-widest uppercase">No Authenticator Codes</div>
        <button onClick={() => setShowModal(true)} className="btn-primary mt-2 flex items-center gap-2">
          <Plus size={14} /> ADD 2FA CODE
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 animate-in fade-in relative">
      {modal}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-mono text-slate-text uppercase tracking-widest">Auth</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={14} />
          ADD 2FA CODE
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {totpEntries.map(entry => (
          <TotpCard key={entry.id} entry={entry} tick={totpTick} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
};
