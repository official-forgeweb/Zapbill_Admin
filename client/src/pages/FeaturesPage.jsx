import { useState, useEffect } from 'react';
import { Puzzle, Plus, Edit3, Trash2, Save, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function FeaturesPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    feature_key: '', feature_name: '', description: '', version: '1.0.0',
    is_free: false, monthly_price: 0, yearly_price: 0,
  });

  useEffect(() => { loadFeatures(); }, []);

  const loadFeatures = () => {
    setLoading(true);
    api.get('/features')
      .then(res => setFeatures(res.data.features))
      .catch(() => toast.error('Failed to load features'))
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ feature_key: '', feature_name: '', description: '', version: '1.0.0', is_free: false, monthly_price: 0, yearly_price: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/features/${editing}`, form);
        toast.success('Feature updated');
      } else {
        await api.post('/features', form);
        toast.success('Feature created');
      }
      resetForm();
      loadFeatures();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleEdit = (f) => {
    setForm({
      feature_key: f.feature_key, feature_name: f.feature_name,
      description: f.description || '', version: f.version || '1.0.0',
      is_free: f.is_free, monthly_price: f.monthly_price, yearly_price: f.yearly_price,
    });
    setEditing(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this feature?')) return;
    try {
      await api.delete(`/features/${id}`);
      toast.success('Feature deleted');
      loadFeatures();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Puzzle size={22} className="text-primary-400" /> Features
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Master list of all ZapBill features</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/20">
          <Plus size={15} /> Add Feature
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">{editing ? 'Edit Feature' : 'New Feature'}</h3>
            <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-900"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Feature Key *</label>
              <input type="text" value={form.feature_key} onChange={e => setForm(f => ({ ...f, feature_key: e.target.value }))}
                placeholder="e.g. qr_order" disabled={!!editing}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Feature Name *</label>
              <input type="text" value={form.feature_name} onChange={e => setForm(f => ({ ...f, feature_name: e.target.value }))}
                placeholder="QR Code Ordering"
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Version</label>
              <input type="text" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1.5">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 cursor-pointer">
                <input type="checkbox" checked={form.is_free} onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))}
                  className="rounded accent-primary-500" /> Free Feature
              </label>
            </div>
            {!form.is_free && (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Monthly Price (₹)</label>
                  <input type="number" value={form.monthly_price} onChange={e => setForm(f => ({ ...f, monthly_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Yearly Price (₹)</label>
                  <input type="number" value={form.yearly_price} onChange={e => setForm(f => ({ ...f, yearly_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg text-sm font-semibold">
              <Save size={15} /> {editing ? 'Update' : 'Create'} Feature
            </button>
          </div>
        </form>
      )}

      {/* Feature List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="glass-card p-5"><div className="skeleton h-24 w-full" /></div>
        )) : features.map(f => (
          <div key={f.id} className="glass-card p-5 hover:border-primary-500/20 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{f.feature_name}</h4>
                <code className="text-xs text-slate-400 font-mono">{f.feature_key}</code>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-500 hover:text-primary-400 rounded-md hover:bg-primary-500/10">
                  <Edit3 size={13} />
                </button>
                <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-500 hover:text-danger-400 rounded-md hover:bg-danger-500/10">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{f.description || 'No description'}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/50">
              <span className={`badge ${f.is_free ? 'badge-active' : 'badge-warning'}`}>
                {f.is_free ? 'Free' : `₹${f.yearly_price}/yr`}
              </span>
              <span className="text-xs text-slate-400">{f._count?.client_features || 0} clients</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
