import { useState, useEffect } from 'react';
import { Globe, Search, RefreshCw, AlertTriangle, Monitor, Power, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function WebsiteOrdersOverviewPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, online, offline, pending
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get('/website-orders/overview');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to fetch website orders overview');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return `${Math.floor(diff / 3600)} hr ago`;
  };

  const getFilteredData = () => {
    return data.filter(d => {
      // Apply status filter
      if (filter === 'online' && d.status !== 'online') return false;
      if (filter === 'offline' && d.status !== 'offline') return false;
      if (filter === 'pending' && d.pending_count === 0) return false;
      
      // Apply search
      if (search && !d.business_name.toLowerCase().includes(search.toLowerCase())) return false;
      
      return true;
    });
  };

  const filteredData = getFilteredData();

  // Summary Metrics
  const summary = {
    active_clients: data.filter(d => d.is_enabled && d.status !== 'disabled').length,
    total_orders_today: data.reduce((sum, d) => sum + (d.orders_today || 0), 0),
    total_pending: data.reduce((sum, d) => sum + (d.pending_count || 0), 0),
    total_revenue_today: data.reduce((sum, d) => sum + Number(d.revenue_today || 0), 0)
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="text-primary-500" /> Website Orders
          </h2>
          <p className="text-sm text-slate-500 mt-1">Overview of all clients using website orders</p>
        </div>
        <button onClick={fetchOverview} disabled={loading} className="flex flex-row items-center gap-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-sm border font-medium transition-colors">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border-b-4 border-b-primary-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Clients</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{summary.active_clients}</p>
        </div>
        <div className="glass-card p-5 border-b-4 border-b-accent-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders Today</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{summary.total_orders_today}</p>
        </div>
        <div className="glass-card p-5 border-b-4 border-b-warn-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Now</p>
          <p className="text-3xl font-bold text-warn-600 mt-2">{summary.total_pending}</p>
        </div>
        <div className="glass-card p-5 border-b-4 border-b-green-500">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Today</p>
          <p className="text-3xl font-bold text-green-600 mt-2">₹{summary.total_revenue_today.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Alerts Section */}
      {data.some(d => d.status === 'offline' && d.pending_count > 0 || d.status === 'never_polled' && d.is_enabled) && (
        <div className="bg-warn-50 border border-warn-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-warn-800 flex items-center gap-2 mb-3">
             <AlertTriangle size={16}/> ACTION REQUIRED ALERTS
          </h3>
          <div className="space-y-2">
             {data.filter(d => d.status === 'offline' && d.pending_count > 0).map(d => (
                <div key={d.id} className="text-xs bg-white text-warn-700 py-2 px-3 rounded border border-warn-100 flex gap-2 items-center shadow-sm">
                   <AlertTriangle size={14} className="text-warn-500"/>
                   <strong>{d.business_name}:</strong> {d.pending_count} pending order(s), ZapBill is OFFLINE (last poll: {getTimeAgo(d.last_poll_at)}). Contact client immediately.
                </div>
             ))}
             {data.filter(d => d.status === 'never_polled' && d.is_enabled).map(d => (
                <div key={d.id} className="text-xs bg-white text-slate-600 py-2 px-3 rounded border border-slate-200 flex gap-2 items-center shadow-sm">
                   <Monitor size={14} className="text-slate-400"/>
                   <strong>{d.business_name}:</strong> Feature is enabled but ZapBill has NEVER polled. Client might be on an older software version or hasn't restarted yet.
                </div>
             ))}
          </div>
        </div>
      )}

      {/* Main Table Area */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/50">
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            {['all', 'online', 'offline', 'pending'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 sticky top-0">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Orders Today</th>
                <th className="px-6 py-4 text-center">Pending Now</th>
                <th className="px-6 py-4">Last Poll</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Loading data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Globe size={32} className="opacity-20 mb-3" />
                    No website orders data found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/clients/${client.id}`} className="font-semibold text-primary-600 hover:text-primary-800 transition-colors">
                        {client.business_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {client.is_enabled ? (
                         client.status === 'online' ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online</span> :
                         client.status === 'offline' ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Offline</span> :
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Waiting</span>
                      ) : (
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"><Power size={10}/> Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-medium {client.orders_today > 0 ? 'text-slate-900' : 'text-slate-400'}">
                       {client.orders_today}
                    </td>
                    <td className="px-6 py-4 text-center">
                       {client.pending_count > 0 ? (
                         <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded text-xs font-bold ${client.status === 'offline' ? 'bg-warn-100 text-warn-700 animate-pulse' : 'bg-primary-100 text-primary-700'}`}>
                           {client.pending_count}
                         </span>
                       ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                       <Clock size={12}/> {getTimeAgo(client.last_poll_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
