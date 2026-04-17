import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, IndianRupee, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function AmcPage() {
  const [payments, setPayments] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [expired, setExpired] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, ex, exp] = await Promise.all([
        api.get('/amc/payments', { params: { limit: 50 } }),
        api.get('/amc/expiring'),
        api.get('/amc/expired'),
      ]);
      setPayments(p.data.payments || []);
      setExpiring(ex.data.clients || []);
      setExpired(exp.data.clients || []);
    } catch { toast.error('Failed to load AMC data'); }
    finally { setLoading(false); }
  };

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);

  const tabs = [
    { key: 'payments', label: 'Payment History', icon: IndianRupee },
    { key: 'expiring', label: `Expiring (${expiring.length})`, icon: AlertTriangle },
    { key: 'expired', label: `Expired (${expired.length})`, icon: XCircle },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-primary-400" /> AMC Management
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">Track and manage Annual Maintenance Contracts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Payments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{payments.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-accent-400 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Needs Attention</p>
          <p className="text-2xl font-bold text-warn-400 mt-1">{expiring.length + expired.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/50 p-1 rounded-xl border border-slate-200/50 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === t.key ? 'bg-primary-500/15 text-primary-400' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'payments' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Period</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">TXN ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>)}</tr>
                )) : payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No payments recorded</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/clients/${p.client?.id}`} className="text-sm text-primary-400 hover:underline">{p.client?.business_name}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-accent-400">₹{p.amount.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{p.payment_mode}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(p.period_start).toLocaleDateString('en-IN')} → {new Date(p.period_end).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{p.transaction_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'expiring' && (
        <div className="space-y-3">
          {expiring.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <ShieldCheck size={40} className="mx-auto text-accent-400 mb-3" />
              <p className="text-slate-600">No AMCs expiring in the next 30 days 🎉</p>
            </div>
          ) : expiring.map(c => {
            const days = Math.ceil((new Date(c.amc_end_date) - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <Link key={c.id} to={`/clients/${c.id}`} className="glass-card p-4 flex items-center justify-between hover:border-warn-500/30 transition-all block">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${days <= 7 ? 'bg-danger-500/15 text-danger-400' : 'bg-warn-500/15 text-warn-400'}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.business_name}</p>
                    <p className="text-xs text-slate-400">{c.owner_name} • {c.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${days <= 7 ? 'text-danger-400' : 'text-warn-400'}`}>{days} days left</p>
                  <p className="text-xs text-slate-400">Expires {new Date(c.amc_end_date).toLocaleDateString('en-IN')}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {activeTab === 'expired' && (
        <div className="space-y-3">
          {expired.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <ShieldCheck size={40} className="mx-auto text-accent-400 mb-3" />
              <p className="text-slate-600">No expired AMCs!</p>
            </div>
          ) : expired.map(c => (
            <Link key={c.id} to={`/clients/${c.id}`} className="glass-card p-4 flex items-center justify-between hover:border-danger-500/30 transition-all border-l-4 border-l-danger-500/50 block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger-500/15 flex items-center justify-center text-danger-400">
                  <XCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.business_name}</p>
                  <p className="text-xs text-slate-400">{c.owner_name} • {c.email}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="badge badge-expired">Expired</span>
                <p className="text-xs text-slate-400 mt-1">
                  {c.amc_end_date ? `Expired ${new Date(c.amc_end_date).toLocaleDateString('en-IN')}` : 'No AMC date'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
