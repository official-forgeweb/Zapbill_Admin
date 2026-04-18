import { useState, useEffect } from 'react';
import { Globe, ShieldCheck, Mail, Save, StopCircle, RefreshCw, Activity, Copy, Eye, EyeOff, Ban, Key, Check } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function WebsiteOrdersTab({ clientId, clientName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    polling_interval_seconds: 10,
    order_timeout_minutes: 30,
    max_orders_per_day: 500,
    order_prefix: 'WEB-',
  });

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/website-orders/clients/${clientId}`);
      setData(res.data);
      if (res.data?.config) {
        setFormData({
          polling_interval_seconds: res.data.config.polling_interval_seconds || 10,
          order_timeout_minutes: res.data.config.order_timeout_minutes || 30,
          max_orders_per_day: res.data.config.max_orders_per_day || 500,
          order_prefix: res.data.config.order_prefix || 'WEB-',
        });
      }
    } catch (err) {
      toast.error('Failed to load website orders config');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success('Copied!');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleEnable = async () => {
    if (!confirm('Enable Website Orders Integration? This will generate new API credentials.')) return;
    setIsUpdating(true);
    try {
      const res = await api.post(`/website-orders/clients/${clientId}/enable`, formData);
      setData(prev => ({
        ...prev,
        enabled: true,
        feature_exists: true,
        config: { ...(prev?.config || {}), ...formData, ...res.data.credentials },
        newCredentials: res.data.credentials
      }));
      toast.success('Website Orders Enabled Successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enable feature');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('DISABLE Website Orders? The client\'s website will stop accepting orders immediately.')) return;
    setIsUpdating(true);
    try {
      await api.post(`/website-orders/clients/${clientId}/disable`);
      fetchData();
      toast.success('Website orders disabled');
    } catch (err) {
      toast.error('Failed to disable website orders');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!prompt('Type "REGENERATE" to confirm API key rotation:') === 'REGENERATE') return;
    setIsUpdating(true);
    try {
      const res = await api.post(`/website-orders/clients/${clientId}/regenerate-credentials`);
      setData(prev => ({
        ...prev,
        config: { ...prev.config, ...res.data.credentials },
        newCredentials: res.data.credentials
      }));
      toast.success('Credentials regenerated. Update your website!');
    } catch (err) {
      toast.error('Failed to regenerate credentials');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsUpdating(true);
    try {
      await api.post(`/website-orders/clients/${clientId}/settings`, formData);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestOrder = async () => {
    setIsUpdating(true);
    try {
      await api.post(`/website-orders/clients/${clientId}/test-order`);
      toast.success('Test order sent successfully!');
      fetchData(); // Refresh counts
    } catch (err) {
      toast.error('Failed to send test order');
    } finally {
      setIsUpdating(false);
    }
  };

  const openStats = async () => {
    try {
      const res = await api.get(`/website-orders/clients/${clientId}/stats`);
      setStatsData(res.data);
      setShowStats(true);
    } catch (error) {
      toast.error('Failed to load stats');
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4 mb-4" />
        <div className="h-24 bg-slate-200 rounded w-full" />
      </div>
    );
  }

  // Not granted the feature
  if (!data?.feature_exists) {
    return (
      <div className="glass-card p-6 border-l-4 border-slate-300">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={20} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Website Orders Integration</h3>
        </div>
        <div className="mb-4">
          <span className="badge badge-neutral">Status: ❌ Not Enabled</span>
        </div>
        <p className="text-sm text-slate-600 mb-4 max-w-2xl">
          This feature allows the client to connect their own website to FlashBill for receiving online orders.
          Orders will appear directly in the FlashBill POS application.
        </p>
        <ul className="text-sm text-slate-600 list-disc list-inside mb-4 space-y-1">
          <li>Client's website sends orders to our API</li>
          <li>Orders appear in FlashBill's Website Orders tab</li>
          <li>Menu and coupons sync automatically</li>
          <li>We provide the API infrastructure, the client provides their website</li>
        </ul>
        <div className="bg-warn-50/50 p-4 rounded-lg flex items-start gap-3 border border-warn-200/50">
          <Ban size={18} className="text-warn-500 mt-0.5" />
          <p className="text-sm text-warn-800">
            Client does not have the "website_orders" feature enabled in their current plan.
            Please enable it from the Features tab first.
          </p>
        </div>
      </div>
    );
  }

  // Granted but not enabled
  if (!data?.enabled) {
    return (
      <div className="glass-card p-6 border-l-4 border-primary-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-primary-400" />
            <h3 className="text-sm font-semibold text-slate-900">Website Orders Integration</h3>
          </div>
          <button
            onClick={handleEnable}
            disabled={isUpdating}
            className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg text-sm font-semibold opacity-90 hover:opacity-100 transition-opacity"
          >
            {isUpdating ? 'Enabling...' : 'Enable Website Orders'}
          </button>
        </div>
        <div className="mb-4">
          <span className="badge badge-neutral">Status: ⏸️ Feature Granted but Inactive</span>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl">
          The feature is available for this client. Click to generate API credentials and enable connections from their website.
        </p>
      </div>
    );
  }

  // Active Connection Status Logic
  const lastPollAt = data.config?.last_poll_at ? new Date(data.config.last_poll_at) : null;
  const now = new Date();
  const pollDiffSecs = lastPollAt ? Math.floor((now - lastPollAt) / 1000) : null;
  
  let connectionStatus = 'never';
  let connectionText = '🟡 Never Connected (FlashBill hasn\'t polled yet)';
  let connectionColor = 'text-warn-500';

  if (pollDiffSecs !== null) {
    if (pollDiffSecs < 60) {
      connectionStatus = 'online';
      connectionText = `🟢 FlashBill Connected (last poll: ${pollDiffSecs} seconds ago)`;
      connectionColor = 'text-accent-500';
    } else {
      connectionStatus = 'offline';
      connectionText = `🔴 FlashBill Disconnected (last poll: ${Math.floor(pollDiffSecs/60)} minutes ago)`;
      connectionColor = 'text-danger-500';
    }
  }

  const { config, stats } = data;
  const credentials = data.newCredentials || config; // Show new secret if just generated

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="glass-card p-6 border-l-4 border-l-accent-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={20} className="text-accent-500" />
              <h3 className="text-sm font-semibold text-slate-900">Website Orders Integration</h3>
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 w-24">Status:</span>
                <span className="badge badge-active">🟢 Enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 w-24">Connection:</span>
                <span className={`text-sm font-semibold ${connectionColor}`}>{connectionText}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
             <button onClick={handleTestOrder} disabled={isUpdating} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
               <Activity size={16} /> Send Test Order
             </button>
             <button onClick={handleDisable} disabled={isUpdating} className="flex items-center justify-center gap-2 px-4 py-2 bg-danger-50 hover:bg-danger-100 text-danger-600 rounded-lg text-sm font-medium transition-colors">
               <Ban size={16} /> Disable Feature
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Credentials View */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
             <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Key size={16}/> API CREDENTIALS</h3>
             <button onClick={handleRegenerate} className="text-xs flex items-center gap-1 text-warn-600 hover:text-warn-700 focus:outline-none">
               <RefreshCw size={12}/> Regenerate
             </button>
          </div>
          <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">
            Share these with the client's website developer to authenticate API requests.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="font-semibold text-slate-700">API Key (Public)</label>
                <button onClick={() => handleCopy(credentials.api_key, 'key')} className="text-primary-600 hover:text-primary-800 flex items-center gap-1">
                   {copiedSection === 'key' ? <Check size={12}/> : <Copy size={12}/>} Copy
                </button>
              </div>
              <code className="block p-2 bg-slate-800 text-green-400 rounded-md text-xs font-mono break-all">
                {credentials.api_key}
              </code>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="font-semibold text-slate-700 flex items-center gap-2">
                   API Secret
                   {data.newCredentials && <span className="bg-warn-100 text-warn-700 px-1.5 py-0.5 rounded text-[10px]">Show Once</span>}
                </label>
                <div className="flex gap-3">
                  {data.newCredentials && (
                    <>
                      <button onClick={() => setShowSecret(!showSecret)} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
                        {showSecret ? <EyeOff size={12}/> : <Eye size={12}/>} {showSecret ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={() => handleCopy(credentials.api_secret, 'secret')} className="text-primary-600 hover:text-primary-800 flex items-center gap-1">
                         {copiedSection === 'secret' ? <Check size={12}/> : <Copy size={12}/>} Copy
                      </button>
                    </>
                  )}
                </div>
              </div>
              <code className="block p-2 bg-slate-800 text-green-400 rounded-md text-xs font-mono break-all">
                {data.newCredentials ? (showSecret ? credentials.api_secret : '••••••••••••••••••••••••••••••••••••••••••••••') : '•••••••• (Stored Hashed)'}
              </code>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="font-semibold text-slate-700">Restaurant ID</label>
                <button onClick={() => handleCopy(credentials.restaurant_id, 'restId')} className="text-primary-600 hover:text-primary-800 flex items-center gap-1">
                   {copiedSection === 'restId' ? <Check size={12}/> : <Copy size={12}/>} Copy
                </button>
              </div>
              <code className="block p-2 bg-slate-800 text-green-400 rounded-md text-xs font-mono break-all">
                {credentials.restaurant_id}
              </code>
            </div>
            
            <div className="pt-2">
               <button onClick={() => setShowDocs(true)} className="w-full py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded border border-primary-200 text-sm font-medium transition-colors">
                 📄 View API Documentation
               </button>
            </div>
          </div>
        </div>

        {/* Stats and Settings */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Activity size={16}/> QUICK STATS (TODAY)
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Orders Received</p>
                  <p className="text-xl font-bold text-slate-800">{stats.todayStats.orders_received}</p>
               </div>
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Orders Accepted</p>
                  <p className="text-xl font-bold text-accent-600">{stats.todayStats.orders_accepted}</p>
               </div>
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Pending Sync</p>
                  <p className="text-xl font-bold text-warn-600">{stats.pendingCount}</p>
               </div>
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-primary-600 font-mono">₹{stats.todayStats.total_amount}</p>
               </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1 mb-4 bg-slate-50 p-3 rounded-lg">
               <div><span className="font-semibold text-slate-700">Menu items synced:</span> {config.menu_item_count} {config.last_menu_sync_at ? `(${new Date(config.last_menu_sync_at).toLocaleString()})` : ''}</div>
               <div><span className="font-semibold text-slate-700">Coupons synced:</span> {config.active_coupon_count} {config.last_coupon_sync_at ? `(${new Date(config.last_coupon_sync_at).toLocaleString()})` : ''}</div>
            </div>

            <button onClick={openStats} className="w-full text-center text-sm font-semibold text-primary-600 hover:text-primary-800 p-2">
              📊 View Detailed Stats
            </button>
          </div>
          
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>SETTINGS</span>
              <button disabled={isUpdating} onClick={handleSaveSettings} className="text-xs font-semibold bg-accent-50 text-accent-700 px-3 py-1 rounded border border-accent-200">
                 {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Polling Interval (s)</label>
                <input type="number" min="5" max="60" value={formData.polling_interval_seconds} onChange={e => setFormData({...formData, polling_interval_seconds: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order Timeout (m)</label>
                <input type="number" min="5" max="120" value={formData.order_timeout_minutes} onChange={e => setFormData({...formData, order_timeout_minutes: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Max Orders/Day</label>
                <input type="number" min="10" max="5000" value={formData.max_orders_per_day} onChange={e => setFormData({...formData, max_orders_per_day: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order Prefix</label>
                <input type="text" maxLength="10" value={formData.order_prefix} onChange={e => setFormData({...formData, order_prefix: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:border-primary-500 focus:outline-none" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Docs Modal */}
      {showDocs && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                 <h2 className="text-lg font-bold text-slate-800">API Documentation</h2>
                 <button onClick={() => setShowDocs(false)} className="text-slate-500 hover:text-slate-800 p-1"><StopCircle size={20}/></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                 <div>
                    <h3 className="font-bold text-slate-800 mb-2 border-b pb-1">Base URL</h3>
                    <code className="p-2 block bg-slate-800 text-green-400 rounded-md text-sm">https://api.flashbill.com/v1/wo</code>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 mb-2 border-b pb-1">Authentication Header</h3>
                    <pre className="p-3 bg-slate-800 text-green-400 rounded-md text-sm font-mono whitespace-pre-wrap">
X-API-Key: {credentials.api_key}
X-Restaurant-ID: {credentials.restaurant_id}
                    </pre>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-800 border-b pb-1">Endpoints</h3>
                    
                    <div className="mt-4 bg-white border rounded-lg overflow-hidden">
                       <div className="bg-slate-50 p-2 font-mono text-sm border-b font-bold text-primary-700">GET /menu</div>
                       <div className="p-4 text-sm text-slate-700">Fetch restaurant's current menu synced from FlashBill POS.</div>
                    </div>
                    
                    <div className="mt-4 bg-white border rounded-lg overflow-hidden">
                       <div className="bg-slate-50 p-2 font-mono text-sm border-b font-bold text-primary-700">POST /orders</div>
                       <div className="p-4 text-sm text-slate-700">
                         Create a new order. Payload should be JSON formatted containing customer, delivery_address, items, and totals.
                       </div>
                    </div>

                    <div className="mt-4 bg-white border rounded-lg overflow-hidden">
                       <div className="bg-slate-50 p-2 font-mono text-sm border-b font-bold text-primary-700">GET /orders/:id/status</div>
                       <div className="p-4 text-sm text-slate-700">Get order tracking status.</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
              <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
                 <h2 className="text-lg font-bold text-slate-800">Stats: {clientName}</h2>
                 <button onClick={() => setShowStats(false)} className="text-slate-500 hover:text-slate-800 p-1"><StopCircle size={20}/></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                 {statsData.length === 0 ? (
                    <p className="text-center text-slate-500 py-10">No recent stats available.</p>
                 ) : (
                    <table className="w-full text-sm text-left">
                       <thead className="bg-slate-50 text-slate-600 border-b">
                          <tr>
                             <th className="p-3">Date</th>
                             <th className="p-3 text-center">Received</th>
                             <th className="p-3 text-center">Accepted</th>
                             <th className="p-3 text-center">Rejected</th>
                             <th className="p-3 text-right">Revenue</th>
                          </tr>
                       </thead>
                       <tbody>
                          {statsData.map(s => (
                             <tr key={s.id} className="border-b hover:bg-slate-50">
                                <td className="p-3">{new Date(s.date).toLocaleDateString()}</td>
                                <td className="p-3 text-center">{s.orders_received}</td>
                                <td className="p-3 text-center text-accent-600 font-medium">{s.orders_accepted}</td>
                                <td className="p-3 text-center text-warn-600">{s.orders_rejected}</td>
                                <td className="p-3 text-right font-mono">₹{s.total_amount}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
