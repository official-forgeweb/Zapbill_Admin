import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, ShieldCheck, KeyRound, Monitor,
  Puzzle, CreditCard, Copy, Check, AlertTriangle, Ban, Trash2,
  RefreshCw, Power, ToggleLeft, ToggleRight, Clock, Plus, ArrowUpCircle, Link2Off
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import WebsiteOrdersTab from '../components/WebsiteOrdersTab';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [features, setFeatures] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [newCredentials, setNewCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAmcForm, setShowAmcForm] = useState(false);
  const [showUpgradePlan, setShowUpgradePlan] = useState(false);

  const [amcForm, setAmcForm] = useState({
    amount: '', payment_mode: 'UPI', transaction_id: '',
    period_start: '', period_end: '', notes: '',
  });

  const [trialForm, setTrialForm] = useState({ feature_id: '', days: 7 });
  const [addFeatureForm, setAddFeatureForm] = useState({ feature_id: '' });
  const [featureLoading, setFeatureLoading] = useState({}); // track per-feature loading

  useEffect(() => { loadClient(); loadFeatures(); loadPlans(); }, [id]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/clients/${id}`);
      setClient(res.data.client);
      setAuditLogs(res.data.auditLogs || []);
      setEditForm(res.data.client);
    } catch { toast.error('Client not found'); navigate('/clients'); }
    finally { setLoading(false); }
  };

  const loadFeatures = async () => {
    try {
      const res = await api.get('/features');
      setFeatures(res.data.features || []);
    } catch { /* ignore */ }
  };

  const loadPlans = async () => {
    try {
      const res = await api.get('/plans');
      setPlans(res.data.plans || []);
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    try {
      await api.put(`/clients/${id}`, editForm);
      toast.success('Client updated');
      setEditing(false);
      loadClient();
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed'); }
  };

  const handleSuspend = async () => {
    if (!confirm('Suspend this client? Their software will show a suspended message.')) return;
    try {
      await api.post(`/clients/${id}/suspend`);
      toast.success('Client suspended');
      loadClient();
    } catch { toast.error('Failed to suspend'); }
  };

  const handleActivate = async () => {
    try {
      await api.post(`/clients/${id}/activate`);
      toast.success('Client activated');
      loadClient();
    } catch { toast.error('Failed to activate'); }
  };

  const handleDelete = async () => {
    if (!confirm('DELETE this client? This is irreversible!')) return;
    if (!confirm('Are you ABSOLUTELY sure? All data will be lost.')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Client deleted');
      navigate('/clients');
    } catch { toast.error('Failed to delete'); }
  };

  const handleRegenerateLicense = async (licenseId) => {
    if (!confirm('Regenerate credentials? The old ones will stop working immediately.')) return;
    try {
      const res = await api.post(`/licenses/${licenseId}/regenerate`);
      toast.success('Credentials regenerated!');
      const creds = res.data.credentials;
      setNewCredentials(creds);
      loadClient();
    } catch { toast.error('Failed to regenerate'); }
  };

  const handleAddLicense = async () => {
    if (!confirm('Generate a new license for this client (for an additional device)?')) return;
    if (client.licenses?.length >= client.max_devices) {
      if (!confirm(`Warning: This client only has a limit of ${client.max_devices} devices but currently has ${client.licenses.length} licenses. Generating another license exceeds their plan limit. Continue anyway?`)) return;
    }
    try {
      const res = await api.post(`/clients/${id}/licenses`);
      toast.success('License generated successfully!');
      const creds = res.data.credentials;
      setNewCredentials(creds);
      loadClient();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add license'); }
  };

  const handleUnbindDevice = async (licenseId) => {
    if (!confirm('Unbind the device from this license? Current device will be logged out, letting them use these same credentials on a new computer.')) return;
    try {
      await api.post(`/licenses/${licenseId}/unbind`);
      toast.success('Device unbound successfully!');
      loadClient();
    } catch { toast.error('Failed to unbind device'); }
  };

  const handleToggleDevice = async (deviceId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this device?`)) return;
    try {
      await api.post(`/devices/${deviceId}/${action}`);
      toast.success(`Device ${action}d successfully`);
      loadClient();
    } catch { toast.error(`Failed to ${action} device`); }
  };

  const handleAmcPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/amc/payments', { client_id: id, ...amcForm });
      toast.success('AMC payment recorded!');
      setShowAmcForm(false);
      setAmcForm({ amount: '', payment_mode: 'UPI', transaction_id: '', period_start: '', period_end: '', notes: '' });
      loadClient();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // FIX: Toggle feature WITHOUT full page reload — update state in-place
  const toggleFeature = async (featureId, currentEnabled) => {
    setFeatureLoading(prev => ({ ...prev, [featureId]: true }));
    try {
      await api.post(`/clients/${id}/features`, { feature_id: featureId, is_enabled: !currentEnabled });
      toast.success(currentEnabled ? 'Feature disabled' : 'Feature enabled');
      // Update client_features in local state instead of full reload
      setClient(prev => ({
        ...prev,
        client_features: prev.client_features.map(cf =>
          cf.feature_id === featureId ? { ...cf, is_enabled: !currentEnabled } : cf
        )
      }));
    } catch { toast.error('Failed to toggle feature'); }
    finally { setFeatureLoading(prev => ({ ...prev, [featureId]: false })); }
  };

  // DELETE a feature assignment (trial or permanent)
  const deleteFeature = async (featureId) => {
    if (!confirm('Remove this feature from the client? This cannot be undone.')) return;
    setFeatureLoading(prev => ({ ...prev, [featureId]: true }));
    try {
      await api.delete(`/clients/${id}/features/${featureId}`);
      toast.success('Feature removed');
      setClient(prev => ({
        ...prev,
        client_features: prev.client_features.filter(cf => cf.feature_id !== featureId)
      }));
    } catch { toast.error('Failed to remove feature'); }
    finally { setFeatureLoading(prev => ({ ...prev, [featureId]: false })); }
  };

  // Grant trial feature
  const grantTrial = async () => {
    if (!trialForm.feature_id) return toast.error('Select a feature');
    try {
      const res = await api.post(`/clients/${id}/features`, {
        feature_id: trialForm.feature_id, is_enabled: true, is_trial: true, trial_days: trialForm.days,
      });
      toast.success('Trial granted!');
      // Add to local state
      setClient(prev => ({
        ...prev,
        client_features: [...prev.client_features, res.data.client_feature]
      }));
      setTrialForm({ feature_id: '', days: 7 });
    } catch { toast.error('Failed to grant trial'); }
  };

  // Add permanent (purchased) feature
  const addPermanentFeature = async () => {
    if (!addFeatureForm.feature_id) return toast.error('Select a feature');
    try {
      const res = await api.post(`/clients/${id}/features`, {
        feature_id: addFeatureForm.feature_id, is_enabled: true, is_trial: false,
      });
      toast.success('Feature added (permanent)!');
      setClient(prev => ({
        ...prev,
        client_features: [...prev.client_features, res.data.client_feature]
      }));
      setAddFeatureForm({ feature_id: '' });
    } catch { toast.error('Failed to add feature'); }
  };

  // Upgrade plan
  const handleUpgradePlan = async (planId) => {
    if (!confirm('Upgrade client to this plan? New features will be automatically enabled.')) return;
    try {
      const res = await api.post(`/clients/${id}/upgrade-plan`, { plan_id: planId });
      toast.success(res.data.message || 'Plan upgraded!');
      setClient(res.data.client);
      setEditForm(res.data.client);
      setShowUpgradePlan(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to upgrade plan'); }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) return null;

  const amcDaysLeft = client.amc_end_date
    ? Math.ceil((new Date(client.amc_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Features not yet assigned to this client
  const unassignedFeatures = features.filter(
    f => !client.client_features?.find(cf => cf.feature_id === f.id)
  );

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'amc', label: 'AMC' },
    { key: 'features', label: 'Features' },
    { key: 'licenses', label: 'Licenses' },
    { key: 'devices', label: 'Devices' },
    { key: 'website_orders', label: 'Website Orders' },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50/60 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center text-lg font-bold text-primary-400 border border-primary-500/20">
            {client.business_name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{client.business_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-500">{client.owner_name}</span>
              <span className={`badge ${client.status === 'active' ? 'badge-active' : client.status === 'suspended' ? 'badge-warning' : 'badge-expired'}`}>
                {client.status}
              </span>
              {client.plan_type === 'trial' && <span className="badge badge-warning">Trial</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.status === 'active' ? (
            <button onClick={handleSuspend} className="flex items-center gap-1.5 px-3 py-2 text-warn-400 bg-warn-500/10 rounded-lg text-xs font-medium hover:bg-warn-500/20 transition-colors">
              <Ban size={14} /> Suspend
            </button>
          ) : (
            <button onClick={handleActivate} className="flex items-center gap-1.5 px-3 py-2 text-accent-400 bg-accent-500/10 rounded-lg text-xs font-medium hover:bg-accent-500/20 transition-colors">
              <Power size={14} /> Activate
            </button>
          )}
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 text-danger-400 bg-danger-500/10 rounded-lg text-xs font-medium hover:bg-danger-500/20 transition-colors">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/50 p-1 rounded-xl border border-slate-200/50 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === t.key ? 'bg-primary-500/15 text-primary-400' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Client Information</h3>
              {editing ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"><X size={16} /></button>
                  <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-accent-500/15 text-accent-400 rounded-md text-xs font-medium"><Save size={14} /> Save</button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-md text-xs hover:bg-slate-200"><Edit3 size={14} /> Edit</button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['Business Name', 'business_name'],
                ['Owner Name', 'owner_name'],
                ['Email', 'email'],
                ['Phone', 'phone'],
                ['Address', 'address'],
                ['City', 'city'],
                ['State', 'state'],
                ['GST Number', 'gst_number'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs text-slate-400">{label}</label>
                  {editing ? (
                    <input value={editForm[key] || ''} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
                  ) : (
                    <p className="text-sm text-slate-700 mt-0.5 capitalize">{client[key]?.replace(/_/g, ' ') || '—'}</p>
                  )}
                </div>
              ))}
            </div>
            {client.notes && (
              <div className="mt-4 pt-4 border-t border-slate-200/50">
                <label className="text-xs text-slate-400">Notes</label>
                <p className="text-sm text-slate-600 mt-1">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Plan Card with Upgrade */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard size={16} className="text-primary-400" /> Current Plan
              </h3>
              <button onClick={() => setShowUpgradePlan(!showUpgradePlan)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/15 text-primary-600 rounded-lg text-xs font-semibold hover:bg-primary-500/25 transition-colors">
                <ArrowUpCircle size={14} /> {showUpgradePlan ? 'Cancel' : 'Upgrade Plan'}
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="px-4 py-2 bg-primary-500/10 rounded-lg border border-primary-500/20">
                <p className="text-lg font-bold text-primary-600 capitalize">{client.plan_type?.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-sm text-slate-500">
                Max Devices: <span className="font-semibold text-slate-700">{client.max_devices}</span>
              </div>
            </div>

            {showUpgradePlan && (
              <div className="mt-4 pt-4 border-t border-slate-200/50 animate-fade-in">
                <p className="text-xs text-slate-500 mb-3">Select a plan to upgrade to. New plan features will be automatically enabled.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {plans.filter(p => p.is_active).map(plan => {
                    const isCurrent = plan.plan_key === client.plan_type;
                    return (
                      <div key={plan.id} className={`p-4 rounded-xl border transition-all ${
                        isCurrent ? 'border-primary-500/50 bg-primary-500/5 opacity-60' : 'border-slate-300/50 bg-white hover:border-primary-400/50 hover:shadow-md cursor-pointer'
                      }`}>
                        <p className="text-sm font-semibold text-slate-900">{plan.plan_name}</p>
                        <p className="text-lg font-bold text-primary-500 mt-1">₹{plan.one_time_price?.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{plan.max_devices} device{plan.max_devices > 1 ? 's' : ''} • {plan.features?.length} features</p>
                        {isCurrent ? (
                          <p className="mt-3 text-xs text-primary-500 font-semibold">Current Plan</p>
                        ) : (
                          <button onClick={() => handleUpgradePlan(plan.id)}
                            className="mt-3 w-full py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 transition-colors">
                            Upgrade to {plan.plan_name}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'amc' && (
        <div className="space-y-4">
          {/* AMC Status Card */}
          <div className={`glass-card p-6 border-l-4 ${
            client.amc_status === 'active' ? (amcDaysLeft <= 30 ? 'border-l-warn-500' : 'border-l-accent-500') : client.amc_status === 'expired' ? 'border-l-danger-500' : 'border-l-slate-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className={client.amc_status === 'active' ? 'text-accent-400' : 'text-danger-400'} />
                  <h3 className="text-sm font-semibold text-slate-900">AMC Status</h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2 capitalize">{client.amc_status?.replace(/_/g, ' ')}</p>
                {client.amc_end_date && (
                  <p className="text-sm text-slate-500 mt-1">
                    Expires: {new Date(client.amc_end_date).toLocaleDateString('en-IN')}
                    {amcDaysLeft > 0 ? ` (${amcDaysLeft} days left)` : ' (EXPIRED)'}
                  </p>
                )}
              </div>
              <button onClick={() => setShowAmcForm(!showAmcForm)}
                className="px-4 py-2 bg-gradient-to-r from-accent-600 to-accent-500 text-white rounded-lg text-sm font-semibold hover:from-accent-500 hover:to-accent-400 transition-all">
                {showAmcForm ? 'Cancel' : 'Record Payment'}
              </button>
            </div>
          </div>

          {/* AMC Payment Form */}
          {showAmcForm && (
            <form onSubmit={handleAmcPayment} className="glass-card p-6 animate-fade-in">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Record AMC Payment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Amount (₹) *</label>
                  <input type="number" value={amcForm.amount} onChange={e => setAmcForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" placeholder="3999" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Payment Mode *</label>
                  <select value={amcForm.payment_mode} onChange={e => setAmcForm(f => ({ ...f, payment_mode: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50">
                    <option value="UPI">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Period Start *</label>
                  <input type="date" value={amcForm.period_start} onChange={e => setAmcForm(f => ({ ...f, period_start: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Period End *</label>
                  <input type="date" value={amcForm.period_end} onChange={e => setAmcForm(f => ({ ...f, period_end: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Transaction ID</label>
                  <input type="text" value={amcForm.transaction_id} onChange={e => setAmcForm(f => ({ ...f, transaction_id: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-primary-500/50" />
                </div>
              </div>
              <button type="submit" className="mt-4 px-5 py-2.5 bg-gradient-to-r from-accent-600 to-accent-500 text-white rounded-lg text-sm font-semibold">
                Record Payment
              </button>
            </form>
          )}

          {/* Payment History */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Payment History</h3>
            {client.amc_payments?.length > 0 ? (
              <div className="space-y-3">
                {client.amc_payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">₹{p.amount.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-slate-400">{p.payment_mode} • {p.transaction_id || 'No TXN ID'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-600">{new Date(p.period_start).toLocaleDateString('en-IN')} → {new Date(p.period_end).toLocaleDateString('en-IN')}</p>
                      <p className="text-xs text-slate-400">{new Date(p.payment_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-6">No payments recorded</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-4">
          {/* Current Features */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Puzzle size={16} className="text-primary-400" /> Assigned Features
            </h3>
            <div className="space-y-2">
              {client.client_features?.length > 0 ? client.client_features.map(cf => (
                <div key={cf.id} className="flex items-center justify-between p-3 bg-slate-50/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleFeature(cf.feature_id, cf.is_enabled)}
                      disabled={featureLoading[cf.feature_id]}
                      className="disabled:opacity-50"
                    >
                      {cf.is_enabled
                        ? <ToggleRight size={24} className="text-accent-400" />
                        : <ToggleLeft size={24} className="text-slate-400" />
                      }
                    </button>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{cf.feature?.feature_name}</p>
                      <p className="text-xs text-slate-400">{cf.feature?.feature_key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cf.is_trial && (
                      <span className="badge badge-warning">
                        Trial {cf.trial_end_date ? `(ends ${new Date(cf.trial_end_date).toLocaleDateString('en-IN')})` : ''}
                      </span>
                    )}
                    {!cf.is_trial && cf.is_enabled && (
                      <span className="text-[10px] uppercase font-bold text-accent-500 bg-accent-50 px-2 py-0.5 rounded">Permanent</span>
                    )}
                    <button
                      onClick={() => deleteFeature(cf.feature_id)}
                      disabled={featureLoading[cf.feature_id]}
                      className="p-1.5 text-slate-400 hover:text-danger-600 rounded-md hover:bg-danger-50 transition-colors disabled:opacity-50"
                      title="Remove feature"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )) : <p className="text-slate-400 text-sm text-center py-4">No features assigned</p>}
            </div>
          </div>

          {/* Add Permanent Feature (Purchased) */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-accent-400" /> Add Purchased Feature
            </h3>
            <p className="text-xs text-slate-500 mb-3">Permanently grant a feature that the client has purchased.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={addFeatureForm.feature_id} onChange={e => setAddFeatureForm({ feature_id: e.target.value })}
                className="flex-1 px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50">
                <option value="">Select feature...</option>
                {unassignedFeatures.map(f => (
                  <option key={f.id} value={f.id}>{f.feature_name} — ₹{f.monthly_price}/mo</option>
                ))}
              </select>
              <button onClick={addPermanentFeature}
                className="px-4 py-2.5 bg-accent-500/15 text-accent-600 rounded-lg text-sm font-medium hover:bg-accent-500/25 transition-colors">
                Add Feature
              </button>
            </div>
          </div>

          {/* Grant Trial */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-warn-400" /> Grant Feature Trial
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={trialForm.feature_id} onChange={e => setTrialForm(f => ({ ...f, feature_id: e.target.value }))}
                className="flex-1 px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50">
                <option value="">Select feature...</option>
                {unassignedFeatures.map(f => (
                  <option key={f.id} value={f.id}>{f.feature_name}</option>
                ))}
              </select>
              <select value={trialForm.days} onChange={e => setTrialForm(f => ({ ...f, days: parseInt(e.target.value) }))}
                className="px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none">
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
              <button onClick={grantTrial} className="px-4 py-2.5 bg-warn-500/15 text-warn-400 rounded-lg text-sm font-medium hover:bg-warn-500/25 transition-colors">
                Grant Trial
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'licenses' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <KeyRound size={16} className="text-primary-400" /> License Keys ({client.licenses?.length || 0}/{client.max_devices})
            </h3>
            <button onClick={handleAddLicense}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/10 text-primary-600 rounded-md text-xs font-semibold hover:bg-primary-500/20 transition-colors">
              <Plus size={14} /> Add License
            </button>
          </div>
          <div className="space-y-3">
            {client.licenses?.map(lic => (
              <div key={lic.id} className="p-4 bg-slate-50/30 rounded-xl border border-slate-300/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${lic.is_active ? 'badge-active' : 'badge-expired'}`}>
                      {lic.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {lic.is_primary && <span className="badge badge-neutral">Primary</span>}
                    {lic.expires_at && (
                      <span className={`text-xs font-medium ${new Date(lic.expires_at) < new Date() ? 'text-danger-500' : 'text-warn-500'}`}>
                        Expires: {new Date(lic.expires_at).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {lic.device_id && (
                      <button onClick={() => handleUnbindDevice(lic.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-danger-500 bg-danger-500/10 rounded-md hover:bg-danger-500/20 transition-colors" title="Disconnect device from this license">
                        <Link2Off size={12} /> Unbind
                      </button>
                    )}
                    <button onClick={() => handleRegenerateLicense(lic.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-warn-500 bg-warn-500/10 rounded-md hover:bg-warn-500/20 transition-colors" title="Generate a new key/secret and disconnect any device">
                      <RefreshCw size={12} /> Regenerate
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-primary-400 font-mono bg-white/50 px-3 py-2 rounded-lg">{lic.license_key}</code>
                  <button onClick={() => copyText(lic.license_key)} className="p-2 text-slate-500 hover:text-slate-900 bg-slate-200/50 rounded-lg">
                    {copied ? <Check size={14} className="text-accent-400" /> : <Copy size={14} />}
                  </button>
                </div>
                {lic.device_id && (
                  <p className="text-xs text-slate-400 mt-2">Bound to Device: {lic.device_name || lic.device_id}</p>
                )}
                {lic.activated_at && (
                  <p className="text-xs text-slate-400">Activated: {new Date(lic.activated_at).toLocaleString()}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Monitor size={16} className="text-primary-400" /> Registered Devices ({client.devices?.length || 0}/{client.max_devices})
          </h3>
          {client.devices?.length > 0 ? (
            <div className="space-y-3">
              {client.devices.map(d => (
                <div key={d.id} className="flex items-center justify-between p-4 bg-slate-50/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Monitor size={18} className={d.is_active ? 'text-accent-400' : 'text-slate-400'} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.device_name || 'Unknown Device'}</p>
                      <p className="text-xs text-slate-400 font-mono">{d.hardware_id?.substring(0, 24)}...</p>
                      {d.os_info && <p className="text-xs text-slate-400">{d.os_info}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${d.is_active ? 'badge-active' : 'badge-expired'}`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button onClick={() => handleToggleDevice(d.id, d.is_active)}
                        className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${d.is_active ? 'bg-danger-500/10 text-danger-600 hover:bg-danger-500/20' : 'bg-accent-500/10 text-accent-600 hover:bg-accent-500/20'}`}>
                        {d.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                    {d.last_seen && (
                      <p className="text-xs text-slate-400 mt-1">Last: {new Date(d.last_seen).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No devices registered yet</p>
          )}
        </div>
      )}

      {activeTab === 'website_orders' && (
        <WebsiteOrdersTab clientId={id} clientName={client.business_name} />
      )}

      {activeTab === 'activity' && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-warn-400" /> Activity Log
          </h3>
          {auditLogs.length > 0 ? (
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50/30">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700">{log.action?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No activity recorded</p>
          )}
        </div>
      )}

      {/* New Credentials Modal */}
      {newCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary-500/10 p-6 flex flex-col items-center justify-center border-b border-primary-500/10">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <KeyRound size={32} className="text-primary-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Credentials Generated!</h2>
              <p className="text-sm text-slate-500 text-center mt-2 max-w-xs">
                {newCredentials.message || 'IMPORTANT: Save these credentials now. The secret will NOT be shown again.'}
              </p>
            </div>
            
            <div className="p-6 space-y-4 bg-slate-50">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">License Key</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-800 break-all shadow-sm">
                    {newCredentials.license_key}
                  </div>
                  <button onClick={() => copyText(newCredentials.license_key)} 
                    className="p-3 bg-white border border-slate-200 hover:border-primary-400 hover:text-primary-600 text-slate-500 rounded-xl shadow-sm transition-all">
                    {copied ? <Check size={18} className="text-accent-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">License Secret</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-800 break-all shadow-sm">
                    {newCredentials.license_secret}
                  </div>
                  <button onClick={() => copyText(newCredentials.license_secret)} 
                    className="p-3 bg-white border border-slate-200 hover:border-primary-400 hover:text-primary-600 text-slate-500 rounded-xl shadow-sm transition-all">
                    {copied ? <Check size={18} className="text-accent-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <button onClick={() => setNewCredentials(null)} 
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow-md transition-all active:scale-[0.98]">
                  I Have Saved These Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
