import { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit3, Trash2, Save, X, Check } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    plan_key: '', plan_name: '', description: '',
    one_time_price: 0, amc_price_per_year: 0, max_devices: 1, features: [],
  });

  useEffect(() => { loadPlans(); loadFeatures(); }, []);

  const loadPlans = () => {
    setLoading(true);
    api.get('/plans').then(res => setPlans(res.data.plans)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  };

  const loadFeatures = () => {
    api.get('/features').then(res => setFeatures(res.data.features)).catch(console.error);
  };

  const resetForm = () => {
    setForm({ plan_key: '', plan_name: '', description: '', one_time_price: 0, amc_price_per_year: 0, max_devices: 1, features: [] });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/plans/${editing}`, form);
        toast.success('Plan updated');
      } else {
        await api.post('/plans', form);
        toast.success('Plan created');
      }
      resetForm();
      loadPlans();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleEdit = (p) => {
    setForm({
      plan_key: p.plan_key, plan_name: p.plan_name, description: p.description || '',
      one_time_price: p.one_time_price, amc_price_per_year: p.amc_price_per_year,
      max_devices: p.max_devices, features: p.features || [],
    });
    setEditing(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this plan?')) return;
    try { await api.delete(`/plans/${id}`); toast.success('Deleted'); loadPlans(); }
    catch { toast.error('Failed'); }
  };

  const toggleFeature = (fKey) => {
    setForm(f => ({
      ...f,
      features: f.features.includes(fKey) ? f.features.filter(k => k !== fKey) : [...f.features, fKey],
    }));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard size={22} className="text-primary-400" /> Plans
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage pricing plans</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/20">
          <Plus size={15} /> Add Plan
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">{editing ? 'Edit Plan' : 'New Plan'}</h3>
            <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-900"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Plan Key *</label>
              <input type="text" value={form.plan_key} onChange={e => setForm(f => ({ ...f, plan_key: e.target.value }))}
                disabled={!!editing} placeholder="e.g. one_time_premium"
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Plan Name *</label>
              <input type="text" value={form.plan_name} onChange={e => setForm(f => ({ ...f, plan_name: e.target.value }))}
                placeholder="Premium"
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Max Devices</label>
              <input type="number" value={form.max_devices} onChange={e => setForm(f => ({ ...f, max_devices: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">One-Time Price (₹)</label>
              <input type="number" value={form.one_time_price} onChange={e => setForm(f => ({ ...f, one_time_price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">AMC Price/Year (₹)</label>
              <input type="number" value={form.amc_price_per_year} onChange={e => setForm(f => ({ ...f, amc_price_per_year: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div className="lg:col-span-3">
              <label className="block text-xs text-slate-500 mb-1.5">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
          </div>

          {/* Feature selection */}
          <div className="mt-4">
            <label className="block text-xs text-slate-500 mb-2">Included Features</label>
            <div className="flex flex-wrap gap-2">
              {features.map(f => (
                <button key={f.id} type="button" onClick={() => toggleFeature(f.feature_key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    form.features.includes(f.feature_key)
                      ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                      : 'bg-slate-50/50 text-slate-500 border border-slate-300/50 hover:border-slate-400'
                  }`}>
                  {form.features.includes(f.feature_key) && <Check size={12} />}
                  {f.feature_name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg text-sm font-semibold">
              <Save size={15} /> {editing ? 'Update' : 'Create'} Plan
            </button>
          </div>
        </form>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-6"><div className="skeleton h-40 w-full" /></div>
        )) : plans.map(p => (
          <div key={p.id} className="glass-card p-6 hover:border-primary-500/20 transition-all group relative">
            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(p)} className="p-1.5 text-slate-500 hover:text-primary-400 rounded-md hover:bg-primary-500/10"><Edit3 size={13} /></button>
              <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-500 hover:text-danger-400 rounded-md hover:bg-danger-500/10"><Trash2 size={13} /></button>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{p.plan_name}</h3>
            <code className="text-xs text-slate-400 font-mono">{p.plan_key}</code>
            <p className="text-xs text-slate-500 mt-2">{p.description || 'No description'}</p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">One-Time Price</span>
                <span className="text-sm font-bold text-slate-900">₹{p.one_time_price?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">AMC/Year</span>
                <span className="text-sm font-semibold text-primary-400">₹{p.amc_price_per_year?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-400">Max Devices</span>
                <span className="text-sm text-slate-700">{p.max_devices}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/50">
              <p className="text-xs text-slate-400 mb-2">Features ({p.features?.length || 0})</p>
              <div className="flex flex-wrap gap-1">
                {(p.features || []).map(fk => (
                  <span key={fk} className="px-2 py-0.5 bg-slate-50/60 text-slate-500 rounded text-[10px] font-mono">{fk}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
