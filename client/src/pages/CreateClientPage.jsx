import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Copy, Check, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function CreateClientPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState({ key: false, secret: false });

  const [form, setForm] = useState({
    business_name: '', owner_name: '', email: '', phone: '',
    address: '', city: '', state: '', gst_number: '',
    plan_type: 'one_time_basic', plan_id: '',
    amc_status: 'active',
    amc_start_date: new Date().toISOString().split('T')[0],
    amc_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    api.get('/plans').then(res => setPlans(res.data.plans)).catch(console.error);
  }, []);

  const handlePlanSelect = (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setForm(f => ({
        ...f,
        plan_id: planId,
        plan_type: plan.plan_key,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.business_name || !form.owner_name || !form.email) {
      return toast.error('Please fill required fields');
    }
    setLoading(true);
    try {
      const res = await api.post('/clients', form);
      setCredentials(res.data.credentials);
      toast.success('Client created successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(c => ({ ...c, [field]: true }));
    toast.success('Copied!');
    setTimeout(() => setCopied(c => ({ ...c, [field]: false })), 2000);
  };

  // Show credentials modal after creation
  if (credentials) {
    return (
      <div className="max-w-lg mx-auto mt-8 animate-fade-in">
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-accent-500/15 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-accent-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Client Created!</h2>
            <p className="text-slate-500 text-sm mt-1">Save these credentials now — the secret won't be shown again.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50/80 border border-slate-300/50 rounded-xl p-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">License Key</label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-sm text-primary-400 font-mono bg-white/50 px-3 py-2 rounded-lg">{credentials.license_key}</code>
                <button
                  onClick={() => copyToClipboard(credentials.license_key, 'key')}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-slate-200/50 rounded-lg transition-colors"
                >
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
                <button
                  onClick={() => copyToClipboard(credentials.license_secret, 'secret')}
                  className="p-2 text-slate-500 hover:text-slate-900 bg-slate-200/50 rounded-lg transition-colors shrink-0"
                >
                  {copied.secret ? <Check size={16} className="text-accent-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                const text = `License Key: ${credentials.license_key}\nLicense Secret: ${credentials.license_secret}`;
                copyToClipboard(text, 'both');
              }}
              className="flex-1 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-300/50"
            >
              Copy Both
            </button>
            <button
              onClick={() => navigate('/clients')}
              className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all"
            >
              Go to Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
          <UserPlus size={20} className="text-primary-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create New Client</h2>
          <p className="text-slate-500 text-sm">Register a new FlashBill POS client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Business Information */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Business Name *</label>
              <input type="text" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="Restaurant name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Owner Name *</label>
              <input type="text" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="Owner's full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="+91 98765 43210" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Address</label>
              <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="Full address" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">City</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="City" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">State</label>
              <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="State" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">GST Number</label>
              <input type="text" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors" placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Plan Selection</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {plans.filter(p => p.is_active).map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => handlePlanSelect(plan.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.plan_id === plan.id
                    ? 'border-primary-500/50 bg-primary-500/10 shadow-lg shadow-primary-500/5'
                    : 'border-slate-300/50 bg-slate-50/50 hover:border-slate-400/50'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{plan.plan_name}</p>
                <p className="text-lg font-bold text-primary-400 mt-1">₹{plan.one_time_price?.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-400 mt-0.5">AMC: ₹{plan.amc_price_per_year?.toLocaleString('en-IN')}/yr</p>
                <p className="text-xs text-slate-400">{plan.max_devices} device{plan.max_devices > 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        </div>

        {/* AMC Settings */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">AMC Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">AMC Status</label>
              <select value={form.amc_status} onChange={e => setForm(f => ({ ...f, amc_status: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors">
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">AMC Start Date</label>
              <input type="date" value={form.amc_start_date} onChange={e => setForm(f => ({ ...f, amc_start_date: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">AMC End Date</label>
              <input type="date" value={form.amc_end_date} onChange={e => setForm(f => ({ ...f, amc_end_date: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Additional Notes</h3>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3} placeholder="Any notes about this client..."
            className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50 transition-colors resize-none" />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/clients')} className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-sm hover:bg-slate-200 transition-colors border border-slate-300/50">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Client & Generate License'}
          </button>
        </div>
      </form>
    </div>
  );
}
