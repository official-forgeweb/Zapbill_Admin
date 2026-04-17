import { useState, useEffect } from 'react';
import { Monitor, Search, Power } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadDevices(); }, [search]);

  const loadDevices = () => {
    setLoading(true);
    const params = { limit: 50 };
    if (search) params.search = search;
    api.get('/devices', { params })
      .then(res => { setDevices(res.data.devices); setTotal(res.data.total); })
      .catch(() => toast.error('Failed to load devices'))
      .finally(() => setLoading(false));
  };

  const toggleDevice = async (id, isActive) => {
    try {
      await api.post(`/devices/${id}/${isActive ? 'deactivate' : 'activate'}`);
      toast.success(isActive ? 'Device deactivated' : 'Device activated');
      loadDevices();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Monitor size={22} className="text-primary-400" /> Devices
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">{total} registered devices</p>
      </div>

      <div className="glass-card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by device name, hardware ID, or business..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500/50" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Device</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Client</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Hardware ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">OS</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Last Seen</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-20" /></td>)}</tr>
              )) : devices.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No devices found</td></tr>
              ) : devices.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Monitor size={16} className={d.is_active ? 'text-accent-400' : 'text-slate-400'} />
                      <span className="text-sm text-slate-800">{d.device_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link to={`/clients/${d.client?.id}`} className="text-sm text-primary-400 hover:underline">{d.client?.business_name}</Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <code className="text-xs text-slate-400 font-mono">{d.hardware_id?.substring(0, 20)}...</code>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{d.os_info || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${d.is_active ? 'badge-active' : 'badge-expired'}`}>{d.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {d.last_seen ? new Date(d.last_seen).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => toggleDevice(d.id, d.is_active)}
                      className={`p-1.5 rounded-md transition-colors ${d.is_active ? 'text-danger-400 hover:bg-danger-500/10' : 'text-accent-400 hover:bg-accent-500/10'}`}>
                      <Power size={14} />
                    </button>
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
