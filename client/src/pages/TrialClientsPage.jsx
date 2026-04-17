import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, Copy, Check, AlertTriangle, Clock, Users, Trash2,
  Eye, Ban, Power, Search, RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function TrialClientsPage() {
  const [trialClients, setTrialClients] = useState([]);
  const [allFeatures, setAllFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState({});
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    business_name: '', owner_name: '', email: '', phone: '',
    city: '', state: '', trial_days: 7, features_to_grant: [], notes: '',
  });

  useEffect(() => { fetchTrialClients(); fetchFeatures(); }, []);

  const fetchTrialClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients', { params: { search: '', limit: 200 } });
      const trials = (res.data.clients || []).filter(c => c.plan_type === 'trial');
      setTrialClients(trials);
    } catch { toast.error('Failed to fetch trial clients'); }
    finally { setLoading(false); }
  };

  const fetchFeatures = async () => {
    try {
      const res = await api.get('/features');
      setAllFeatures(res.data.features || []);
    } catch { /* ignore */ }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.business_name || !form.owner_name || !form.email) {
      return toast.error('Please fill required fields');
    }
    setCreating(true);
    try {
      const res = await api.post('/clients/create-trial', form);
      setCredentials(res.data.credentials);
      toast.success('Trial client created!');
      fetchTrialClients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const handleSuspend = async (clientId) => {
    if (!confirm('Suspend this trial client?')) return;
    try {
      await api.post(`/clients/${clientId}/suspend`);
      toast.success('Client suspended');
      fetchTrialClients();
    } catch { toast.error('Failed'); }
  };

  const handleActivate = async (clientId) => {
    try {
      await api.post(`/clients/${clientId}/activate`);
      toast.success('Client activated');
      fetchTrialClients();
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (clientId) => {
    if (!confirm('DELETE this trial client permanently?')) return;
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success('Deleted');
      fetchTrialClients();
    } catch { toast.error('Failed'); }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(c => ({ ...c, [field]: true }));
    toast.success('Copied!');
    setTimeout(() => setCopied(c => ({ ...c, [field]: false })), 2000);
  };

  const toggleFeatureSelection = (featureId) => {
    setForm(f => ({
      ...f,
      features_to_grant: f.features_to_grant.includes(featureId)
        ? f.features_to_grant.filter(id => id !== featureId)
        : [...f.features_to_grant, featureId],
    }));
  };

  const getDaysLeft = (license) => {
    if (!license?.expires_at) return null;
    const diff = Math.ceil((new Date(license.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filtered = trialClients.filter(c =>
    c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    c.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Success Credentials Modal
  if (credentials) {
    return (
      <div className="max-w-lg mx-auto mt-8 animate-fade-in">
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-accent-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Trial Client Created!</h2>
            <p className="text-slate-500 text-sm mt-1">Save these credentials — the secret won't be shown again.</p>
            <p className="text-xs text-warn-600 mt-2 bg-warn-50 border border-warn-200 rounded-lg px-3 py-2">
              ⏰ Expires: {new Date(credentials.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50/80 border border-slate-300/50 rounded-xl p-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Key</label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-sm text-primary-400 font-mono bg-white/50 px-3 py-2 rounded-lg">{credentials.license_key}</code>
                <button onClick={() => copyToClipboard(credentials.license_key, 'key')}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-slate-200/50 rounded-lg transition-colors">
                  {copied.key ? <Check size={16} className="text-accent-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-danger-500/30 rounded-xl p-4">
              <label className="text-xs font-semibold text-danger-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} /> License Secret (shown once!)
              </label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-xs text-danger-400 font-mono bg-white/50 px-3 py-2 rounded-lg break-all">{credentials.license_secret}</code>
                <button onClick={() => copyToClipboard(credentials.license_secret, 'secret')}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-slate-200/50 rounded-lg transition-colors shrink-0">
                  {copied.secret ? <Check size={16} className="text-accent-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                const text = `License Key: ${credentials.license_key}\nLicense Secret: ${credentials.license_secret}\nExpires: ${new Date(credentials.expires_at).toLocaleDateString('en-IN')}`;
                copyToClipboard(text, 'all');
              }}
              className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-300/50">
              Copy All
            </button>
            <button
              onClick={() => { setCredentials(null); setShowCreateForm(false); setForm({ business_name: '', owner_name: '', email: '', phone: '', city: '', state: '', trial_days: 7, features_to_grant: [], notes: '' }); }}
              className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="text-warn-500" /> Trial Clients
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage guest/demo clients with auto-expiring licenses</p>
        </div>
        <button onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-warn-600 to-warn-500 text-white rounded-xl text-sm font-semibold hover:from-warn-500 hover:to-warn-400 transition-all shadow-lg shadow-warn-500/20">
          <UserPlus size={16} /> {showCreateForm ? 'Cancel' : 'Create Trial Client'}
        </button>
      </div>

      {/* Create Trial Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="glass-card p-6 animate-fade-in border-l-4 border-l-warn-500">
          <h3 className="text-sm font-bold text-slate-900 mb-4">New Trial Client</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Business Name *</label>
              <input type="text" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" placeholder="Restaurant name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Owner Name *</label>
              <input type="text" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" placeholder="Owner's name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" placeholder="+91 ..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">City</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Trial Duration *</label>
              <select value={form.trial_days} onChange={e => setForm(f => ({ ...f, trial_days: parseInt(e.target.value) }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50">
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
              </select>
            </div>
          </div>

          {/* Feature Selection */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Features to Grant (trial)</label>
            <div className="flex flex-wrap gap-2">
              {allFeatures.map(f => (
                <button key={f.id} type="button" onClick={() => toggleFeatureSelection(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.features_to_grant.includes(f.id)
                      ? 'bg-primary-500/15 border-primary-500/50 text-primary-600'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400'
                  }`}>
                  {f.feature_name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Optional notes..." className="w-full px-3 py-2 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 resize-none" />
          </div>

          <button type="submit" disabled={creating}
            className="px-6 py-2.5 bg-gradient-to-r from-warn-600 to-warn-500 text-white rounded-lg text-sm font-semibold hover:from-warn-500 hover:to-warn-400 transition-all disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Trial & Generate License'}
          </button>
        </form>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 border-b-4 border-b-warn-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Trials</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{trialClients.length}</p>
        </div>
        <div className="glass-card p-5 border-b-4 border-b-accent-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Trials</p>
          <p className="text-3xl font-bold text-accent-600 mt-2">{trialClients.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="glass-card p-5 border-b-4 border-b-danger-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired / Suspended</p>
          <p className="text-3xl font-bold text-danger-600 mt-2">{trialClients.filter(c => c.status !== 'active').length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input type="text" placeholder="Search trial clients..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" />
      </div>

      {/* Trial Clients Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
              <tr>
                <th className="px-5 py-4">Client</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Expires</th>
                <th className="px-5 py-4">Days Left</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                    <Users className="mx-auto mb-2 opacity-20" size={32} />
                    No trial clients found
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const primaryLic = c.licenses?.find(l => l.is_primary) || c.licenses?.[0];
                  const daysLeft = getDaysLeft(primaryLic);
                  const expired = daysLeft !== null && daysLeft <= 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <Link to={`/clients/${c.id}`} className="font-semibold text-primary-600 hover:text-primary-800 transition-colors">
                          {c.business_name}
                        </Link>
                        <p className="text-xs text-slate-400">{c.owner_name}</p>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-500">{c.email}</td>
                      <td className="px-5 py-4">
                        {c.status === 'active' && !expired ? (
                          <span className="badge badge-active">Active</span>
                        ) : c.status === 'suspended' ? (
                          <span className="badge badge-warning">Suspended</span>
                        ) : (
                          <span className="badge badge-expired">Expired</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {primaryLic?.expires_at ? new Date(primaryLic.expires_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {daysLeft !== null ? (
                          <span className={`text-sm font-bold ${
                            daysLeft <= 0 ? 'text-danger-600' : daysLeft <= 3 ? 'text-warn-600' : 'text-accent-600'
                          }`}>
                            {daysLeft <= 0 ? 'EXPIRED' : `${daysLeft} days`}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/clients/${c.id}`}
                            className="p-1.5 text-slate-400 hover:text-primary-600 rounded-md hover:bg-slate-100 transition-colors" title="View">
                            <Eye size={15} />
                          </Link>
                          {c.status === 'active' ? (
                            <button onClick={() => handleSuspend(c.id)}
                              className="p-1.5 text-slate-400 hover:text-warn-600 rounded-md hover:bg-slate-100 transition-colors" title="Suspend">
                              <Ban size={15} />
                            </button>
                          ) : (
                            <button onClick={() => handleActivate(c.id)}
                              className="p-1.5 text-slate-400 hover:text-accent-600 rounded-md hover:bg-slate-100 transition-colors" title="Activate">
                              <Power size={15} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(c.id)}
                            className="p-1.5 text-slate-400 hover:text-danger-600 rounded-md hover:bg-slate-100 transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
