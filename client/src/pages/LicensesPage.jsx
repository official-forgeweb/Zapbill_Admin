import { useState, useEffect } from 'react';
import { KeyRound, Search, RefreshCw, Power, Unlink, Copy, Check } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function LicensesPage() {
  const [licenses, setLicenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadLicenses();
  }, [search, page]);

  const loadLicenses = () => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (search) params.search = search;
    api.get('/licenses', { params })
      .then(res => { setLicenses(res.data.licenses); setTotal(res.data.total); })
      .catch(() => toast.error('Failed to load licenses'))
      .finally(() => setLoading(false));
  };

  const handleRegenerate = async (id) => {
    if (!confirm('Regenerate credentials? Old ones stop working immediately.')) return;
    try {
      const res = await api.post(`/licenses/${id}/regenerate`);
      const c = res.data.credentials;
      alert(`NEW CREDENTIALS:\n\nKey: ${c.license_key}\nSecret: ${c.license_secret}`);
      toast.success('Regenerated!');
      loadLicenses();
    } catch { toast.error('Failed'); }
  };

  const handleToggle = async (id) => {
    try {
      await api.post(`/licenses/${id}/toggle`);
      toast.success('License toggled');
      loadLicenses();
    } catch { toast.error('Failed'); }
  };

  const handleUnbind = async (id) => {
    if (!confirm('Unbind device from this license?')) return;
    try {
      await api.post(`/licenses/${id}/unbind`);
      toast.success('Device unbound');
      loadLicenses();
    } catch { toast.error('Failed'); }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <KeyRound size={22} className="text-primary-400" /> Licenses
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">{total} total licenses</p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by license key or business name..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500/50" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">License Key</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Device</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Activated</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>)}</tr>
              )) : licenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No licenses found</td></tr>
              ) : licenses.map(lic => (
                <tr key={lic.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-primary-400 font-mono">{lic.license_key}</code>
                      <button onClick={() => copyKey(lic.license_key)} className="text-slate-400 hover:text-slate-900">
                        {copied === lic.license_key ? <Check size={13} className="text-accent-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{lic.client?.business_name || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{lic.device_name || lic.device_id?.substring(0, 16) || 'Not bound'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${lic.is_active ? 'badge-active' : 'badge-expired'}`}>{lic.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{lic.activated_at ? new Date(lic.activated_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggle(lic.id)} title="Toggle active"
                        className="p-1.5 text-slate-500 hover:text-warn-400 rounded-md hover:bg-warn-500/10 transition-colors"><Power size={14} /></button>
                      <button onClick={() => handleUnbind(lic.id)} title="Unbind device"
                        className="p-1.5 text-slate-500 hover:text-primary-400 rounded-md hover:bg-primary-500/10 transition-colors"><Unlink size={14} /></button>
                      <button onClick={() => handleRegenerate(lic.id)} title="Regenerate"
                        className="p-1.5 text-slate-500 hover:text-danger-400 rounded-md hover:bg-danger-500/10 transition-colors"><RefreshCw size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
