import { useState, useEffect } from 'react';
import { Ticket, ArrowLeft, Copy, Save, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ALL_FEATURES = [
  'billing', 'offline_mode', 'local_storage', 'menu_management',
  'inventory', 'table_management', 'wastage_management', 'expense_management', 
  'staff_management', 'kitchen_display', 'email_reports', 'qr_order', 
  'website_orders', 'auto_email_reports', 'custom_dev', 'multi_outlet', 
  'whatsapp_integration', 'analytics'
];

const PLAN_PRESETS = {
  basic: ['billing', 'menu_management', 'offline_mode', 'local_storage'],
  standard: ['billing', 'menu_management', 'inventory', 'table_management', 'wastage_management', 'expense_management', 'offline_mode', 'local_storage', 'email_reports'],
  premium: ['billing', 'menu_management', 'inventory', 'table_management', 'wastage_management', 'expense_management', 'staff_management', 'kitchen_display', 'email_reports', 'qr_order', 'website_orders', 'auto_email_reports', 'custom_dev', 'multi_outlet', 'whatsapp_integration', 'analytics', 'offline_mode', 'local_storage'],
  trial: ['billing', 'menu_management', 'inventory', 'table_management', 'wastage_management', 'expense_management', 'offline_mode', 'local_storage']
};

export default function GenerateCouponPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    email: '',
    phone: '',
    coupon_type: 'plan', // 'plan' | 'trial'
    plan_type: 'premium',
    validity_days: 365,
    max_devices: 1,
    price: 0,
    notes: '',
    features: ['billing', 'menu_management', 'expense_management', 'offline_mode']
  });

  useEffect(() => {
    api.get('/clients').then(res => setClients(res.data.clients || [])).catch(console.error);
  }, []);

  const handleClientSelect = (e) => {
    const id = e.target.value;
    const client = clients.find(c => c.id === id);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_id: id,
        client_name: client.business_name,
        email: client.email,
        phone: client.phone || '',
        max_devices: client.max_devices || 1
      }));
    } else {
      setFormData(prev => ({ ...prev, client_id: '', client_name: '', email: '', phone: '' }));
    }
  };

  const toggleFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature) 
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.client_name) return toast.error('Client name is required');
    if (formData.features.length === 0) return toast.error('Select at least one feature');

    try {
      setLoading(true);
      const payload = {
        ...formData,
        validity_days: parseInt(formData.validity_days),
        max_devices: parseInt(formData.max_devices),
        price: parseFloat(formData.price) || 0
      };
      const res = await api.post('/admin/coupons/generate', payload);
      setGeneratedCredentials(res.data);
      toast.success('Successfully generated encrypted coupon!');
    } catch (error) {
       toast.error(error.response?.data?.error || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (generatedCredentials) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        <div className="bg-white rounded-xl shadow p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Coupon Generated Successfully</h2>
            <p className="text-slate-500 mt-2">These credentials activate the completely offline POS</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
             <div className="flex gap-3">
               <AlertTriangle className="text-amber-500 shrink-0" />
               <div>
                  <h4 className="font-bold text-amber-800">IMPORTANT: Save these credentials now!</h4>
                  <p className="text-sm text-amber-700 mt-1">The Secret Key will <b>never</b> be shown again down the line.</p>
               </div>
             </div>
          </div>

          <div className="space-y-4">
            {/* PRIMARY: Combined Activation Code */}
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-300">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-sm font-bold text-green-800">🔑 Combined Activation Code (Paste this in the POS)</span>
                 <button onClick={() => copyToClipboard(generatedCredentials.combined_activation_code)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-1 text-sm font-bold transition-colors"><Copy size={14}/> Copy Code</button>
              </div>
              <textarea 
                readOnly 
                value={generatedCredentials.combined_activation_code} 
                className="block w-full bg-white border border-green-200 p-3 rounded font-mono text-xs text-slate-700 break-all select-all resize-none"
                rows={5}
                onClick={e => e.target.select()}
              />
              <p className="text-xs text-green-700 mt-2">⚡ This single code contains everything needed for activation. Just paste it into the POS software. <b>No internet required.</b></p>
            </div>

            {/* REFERENCE: Individual keys (collapsed by default) */}
            <details className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <summary className="text-sm font-semibold text-slate-600 cursor-pointer">📋 Individual Keys (for reference only)</summary>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-500">License Key</span>
                    <button onClick={() => copyToClipboard(generatedCredentials.credentials.license_key)} className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs"><Copy size={12}/> Copy</button>
                  </div>
                  <code className="block w-full bg-white border border-slate-200 p-2 rounded font-mono text-sm text-slate-800 break-all select-all">
                    {generatedCredentials.credentials.license_key}
                  </code>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-500">Secret Key</span>
                    <button onClick={() => copyToClipboard(generatedCredentials.credentials.secret_key)} className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-xs"><Copy size={12}/> Copy</button>
                  </div>
                  <code className="block w-full bg-white border border-slate-200 p-2 rounded font-mono text-xs text-slate-800 break-all select-all">
                    {generatedCredentials.credentials.secret_key}
                  </code>
                </div>
              </div>
            </details>
             
            <div className="bg-primary-50 rounded-lg p-4 border border-primary-200 mt-6">
               <h4 className="font-semibold text-primary-900 mb-2">YOUR CREDENTIALS (Admin Master Key)</h4>
               <p className="text-sm text-primary-800">
                 During step 2 of the offline installation, you must input your <b>Software Secret</b>. 
                 This is stored in your private password manager and the backend <code>.env</code> file. Do not give it to the client.
               </p>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
             <button onClick={() => navigate('/coupons')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 rounded-xl transition-colors">
               Done
             </button>
             <button onClick={() => copyToClipboard(generatedCredentials.combined_activation_code)} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-primary-500/30">
               Copy Activation Code
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-6 pb-20">
       <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="text-primary-500" />
            Generate Complete Offline Coupon
          </h1>
          <p className="text-slate-500 mt-1">Deploy a new cryptographically signed license payload.</p>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Client Connection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Existing Client</label>
                    <select value={formData.client_id} onChange={handleClientSelect} className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 text-slate-800">
                       <option value="">-- Create for new unlisted client --</option>
                       {clients.map(c => <option key={c.id} value={c.id}>{c.business_name} ({c.email})</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
                    <input type="text" required value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2" />
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Plan Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Type</label>
                    <select 
                       value={formData.coupon_type} 
                       onChange={e => {
                         const val = e.target.value;
                         setFormData(prev => ({
                           ...prev,
                           coupon_type: val,
                           price: val === 'trial' ? 0 : prev.price,
                           validity_days: val === 'trial' ? 30 : prev.validity_days
                         }));
                       }} 
                       className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white"
                    >
                       <option value="plan">Plan Activation (Paid)</option>
                       <option value="trial">Trial / Demo (Free)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plan Features Preset</label>
                    <select 
                       value={formData.plan_type} 
                       onChange={e => {
                         const val = e.target.value;
                         setFormData(prev => ({
                           ...prev,
                           plan_type: val,
                           features: PLAN_PRESETS[val] || prev.features
                         }));
                       }} 
                       className="w-full border border-slate-300 rounded-lg px-4 py-2 bg-white"
                    >
                       <option value="basic">Basic Plan</option>
                       <option value="standard">Standard Plan</option>
                       <option value="premium">Premium Plan</option>
                       <option value="trial">Trial Preset</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Validity Period (Days)</label>
                    <input type="number" required min="1" value={formData.validity_days} onChange={e => setFormData({...formData, validity_days: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2" />
                    <p className="text-xs text-slate-400 mt-1">Will not expire until activated.</p>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Devices</label>
                    <input type="number" required min="1" value={formData.max_devices} onChange={e => setFormData({...formData, max_devices: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid (₹)</label>
                    <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2" disabled={formData.coupon_type === 'trial'} />
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Enabled Local Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 {ALL_FEATURES.map(f => (
                    <label key={f} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.features.includes(f) ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                       <input type="checkbox" checked={formData.features.includes(f)} onChange={() => toggleFeature(f)} className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"/>
                       <span className="text-sm font-medium text-slate-700 capitalize">{f.replace(/_/g, ' ')}</span>
                    </label>
                 ))}
              </div>
           </div>

           <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate(-1)} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-8 rounded-lg transition-colors shadow-lg shadow-primary-500/30 flex items-center gap-2 disabled:opacity-70">
                 {loading ? 'Generating...' : <><Save size={18}/> Generate Encrypted Package</>}
              </button>
           </div>
        </form>
    </div>
  );
}
