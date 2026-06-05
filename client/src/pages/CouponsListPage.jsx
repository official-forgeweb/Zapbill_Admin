import { useState, useEffect } from 'react';
import { Ticket, Plus, Search, Filter, AlertCircle, Copy, Share, Mail, MessageSquare, Printer, QrCode, Download, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function CouponsListPage() {
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, [statusFilter]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/coupons', {
        params: { status: statusFilter, search: search.length > 2 ? search : '' }
      });
      setCoupons(res.data.coupons);
      setStats(res.data.stats);
    } catch (error) {
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCoupons();
  };

  const calculateExpiry = (activatedAt, validityDays) => {
    if (!activatedAt) return 'Never';
    const d = new Date(activatedAt);
    d.setDate(d.getDate() + validityDays);
    return d.toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="text-primary-500" />
            Coupons & Licenses
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage offline POS activation coupons</p>
        </div>
        <Link 
          to="/coupons/new" 
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Generate New Coupon
        </Link>
      </div>

      {/* Filters and Stats */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by license key, client name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </form>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-4 py-2 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="issued">🟡 Issued (Not Activated)</option>
            <option value="activated">🟢 Activated</option>
            <option value="expired">🔴 Expired</option>
            <option value="revoked">⚫ Revoked</option>
          </select>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.total_issued}</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wilder mt-1">Total Issued</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-xs font-medium text-green-600 uppercase tracking-wilder mt-1">Active</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <div className="text-xs font-medium text-red-600 uppercase tracking-wilder mt-1">Expired</div>
            </div>
             <div className="p-3 bg-yellow-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.trial}</div>
              <div className="text-xs font-medium text-yellow-600 uppercase tracking-wilder mt-1">Trial</div>
            </div>
             <div className="p-3 bg-slate-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-300">{stats.revoked}</div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wilder mt-1">Revoked</div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading coupons...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <div className="text-xs font-mono text-slate-400 mb-1">{coupon.coupon_id}</div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {coupon.client_name}
                    {coupon.coupon_type === 'trial' ? (
                      <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Trial</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Plan</span>
                    )}
                  </h3>
                </div>
                {coupon.status === 'activated' && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">🟢 Activated</span>}
                {coupon.status === 'issued' && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">🟡 Issued</span>}
                {coupon.status === 'expired' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">🔴 Expired</span>}
                {coupon.status === 'revoked' && <span className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full font-medium">⚫ Revoked</span>}
              </div>
              
              <div className="p-4 flex-1 space-y-3 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">License Key</span>
                  <span className="font-mono font-medium text-slate-800 select-all">{coupon.license_key}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-medium text-slate-800 capitalize">{coupon.plan_type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-bold text-slate-800">
                    {coupon.coupon_type === 'trial' ? 'Free (Trial)' : `₹${(coupon.price || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Validity</span>
                  <span className="font-medium text-slate-800">{coupon.validity_days} days</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Devices</span>
                  <span className="font-medium text-slate-800">{coupon.current_device_count} / {coupon.max_devices}</span>
                </div>
                 <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Expires</span>
                  <span className="font-medium text-slate-800">{calculateExpiry(coupon.activated_at, coupon.validity_days)}</span>
                </div>

                {coupon.activations?.length > 0 && (
                  <div className="mt-4 pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Active Devices</span>
                    <div className="mt-2 space-y-2">
                       {coupon.activations.map((act) => (
                           <div key={act.id} className="flex justify-between text-xs bg-slate-50 p-2 rounded">
                               <span className="text-slate-700 truncate mr-2" title={act.device_name || act.hardware_id}>
                                  {act.device_name || act.hardware_id.substring(0, 10) + '...'}
                               </span>
                               <span className="text-slate-500">{new Date(act.activation_date).toLocaleDateString()}</span>
                           </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 p-3 flex gap-2 border-t border-slate-200">
                <button 
                   onClick={() => setSelectedCoupon(coupon)}
                   className="flex-1 bg-white border border-slate-300 text-slate-700 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                   Details
                </button>
                {(coupon.status === 'issued' || coupon.status === 'activated') && (
                     <button 
                         onClick={() => {
                             if(window.confirm('Are you sure you want to completely revoke this coupon? Active POS systems will be locked out on next sync.')){
                                 api.post(`/admin/coupons/${coupon.license_key}/revoke`, { reason: 'Admin revoked' })
                                  .then(() => { toast.success('Revoked'); fetchCoupons(); })
                                  .catch(() => toast.error('Failed to revoke'));
                             }
                         }}
                         className="flex-1 bg-red-50 border border-red-200 text-red-600 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                     >
                         Revoke
                     </button>
                )}
              </div>
            </div>
          ))}
          {coupons.length === 0 && <div className="col-span-full text-center py-8 text-slate-500">No coupons found matching criteria</div>}
        </div>
      )}

      {/* Details Modal */}
      {selectedCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Ticket className="text-primary-500" /> Coupon Settings & Structure
              </h3>
              <button 
                onClick={() => setSelectedCoupon(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">License Profile</label>
                  <div className="font-medium text-slate-800">{selectedCoupon.client_name}</div>
                  <div className="text-sm text-slate-500">{selectedCoupon.issued_to_email || 'No email provided'}</div>
                  <div className="mt-2 text-xs flex items-center gap-1.5">
                    <span className="font-bold text-slate-500 uppercase">Type:</span>
                    {selectedCoupon.coupon_type === 'trial' ? (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">Trial / Demo</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">Plan Activation</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Architecture</label>
                  <div className="flex gap-2">
                      <span className="bg-slate-100 px-2 py-1 rounded text-sm text-slate-700 capitalize font-medium">{selectedCoupon.plan_type} Plan</span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-medium">{selectedCoupon.validity_days} Days Max</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Enabled Edge Features</label>
                 <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedCoupon.features) && selectedCoupon.features.map(f => (
                       <span key={f} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize border border-green-200">
                          {f.replace(/_/g, ' ')}
                       </span>
                    ))}
                    {(!selectedCoupon.features || selectedCoupon.features.length === 0) && (
                       <span className="text-sm text-slate-400 italic">No features appended in encrypted payload.</span>
                    )}
                 </div>
              </div>

               <div className="mb-6">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Trial Appended Features</label>
                 <div className="flex flex-wrap gap-2">
                    {Array.isArray(selectedCoupon.trial_features) && selectedCoupon.trial_features.map(f => (
                       <span key={f} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize border border-purple-200">
                          {f.replace(/_/g, ' ')}
                       </span>
                    ))}
                    {(!selectedCoupon.trial_features || selectedCoupon.trial_features.length === 0) && (
                       <span className="text-sm text-slate-400 italic">No trial features appended.</span>
                    )}
                 </div>
              </div>

               <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center px-2">
                     <span className="text-sm text-slate-500">Internal Coupon UID</span>
                     <code className="text-sm text-slate-700">{selectedCoupon.coupon_id}</code>
                  </div>
                  <div className="flex justify-between items-center px-2">
                     <span className="text-sm text-slate-500">Amount Paid / Price</span>
                     <span className="text-sm font-bold text-slate-800">
                       {selectedCoupon.coupon_type === 'trial' ? 'Free (Trial)' : `₹${(selectedCoupon.price || 0).toLocaleString()}`}
                     </span>
                  </div>
                   <div className="flex justify-between items-center px-2">
                     <span className="text-sm text-slate-500">Device Fleet Allocation</span>
                     <span className="text-sm font-medium text-slate-700">{selectedCoupon.max_devices} computers authorized</span>
                  </div>
                 {selectedCoupon.notes && (
                   <div className="pt-2 px-2 border-t border-slate-200">
                      <span className="text-sm text-slate-500 block mb-1">Administrative Notes:</span>
                      <p className="text-sm text-slate-700">{selectedCoupon.notes}</p>
                   </div>
                 )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
