import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, Users, Filter } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const amcFilter = searchParams.get('amc_status') || '';
  const planFilter = searchParams.get('plan_type') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (search) params.search = search;
    if (amcFilter) params.amc_status = amcFilter;
    if (planFilter) params.plan_type = planFilter;

    api.get('/clients', { params })
      .then(res => {
        setClients(res.data.clients);
        setTotal(res.data.total);
      })
      .catch(() => toast.error('Failed to load clients'))
      .finally(() => setLoading(false));
  }, [search, amcFilter, planFilter, page]);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const exportCSV = () => {
    window.open('http://localhost:5000/api/clients/export/csv', '_blank');
  };

  const totalPages = Math.ceil(total / 15);

  const getAmcBadge = (status, endDate) => {
    if (status === 'active') {
      if (endDate) {
        const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (days <= 30) return <span className="badge badge-warning">Expiring ({days}d)</span>;
      }
      return <span className="badge badge-active">Active</span>;
    }
    if (status === 'expired') return <span className="badge badge-expired">Expired</span>;
    return <span className="badge badge-neutral">N/A</span>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-primary-400" /> Clients
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">{total} total clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition-colors border border-slate-300/50">
            <Download size={15} /> Export
          </button>
          <Link to="/clients/new" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/20">
            <Plus size={15} /> Add Client
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={e => updateParam('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={amcFilter}
              onChange={e => updateParam('amc_status', e.target.value)}
              className="px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
            >
              <option value="">All AMC Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="not_applicable">N/A</option>
            </select>
            <select
              value={planFilter}
              onChange={e => updateParam('plan_type', e.target.value)}
              className="px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50 transition-colors"
            >
              <option value="">All Plans</option>
              <option value="one_time_basic">Basic</option>
              <option value="one_time_standard">Standard</option>
              <option value="one_time_premium">Premium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Business</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">AMC Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">AMC Expiry</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Devices</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 text-sm">No clients found</p>
                    <Link to="/clients/new" className="text-primary-400 text-sm hover:underline mt-1 inline-block">Create your first client</Link>
                  </td>
                </tr>
              ) : (
                clients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <Link to={`/clients/${c.id}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-50 group-hover:bg-primary-500/15 flex items-center justify-center text-xs font-bold text-primary-400 transition-colors">
                          {c.business_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors">{c.business_name}</p>
                          <p className="text-xs text-slate-400">{c.owner_name}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-600">{c.email}</p>
                      <p className="text-xs text-slate-400">{c.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600 capitalize">{c.plan_type?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-5 py-3.5">{getAmcBadge(c.amc_status, c.amc_end_date)}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-500">
                        {c.amc_end_date ? new Date(c.amc_end_date).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">
                        {c.devices?.filter(d => d.is_active).length || 0}/{c.max_devices}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${c.status === 'active' ? 'badge-active' : c.status === 'suspended' ? 'badge-warning' : 'badge-expired'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/50">
            <p className="text-xs text-slate-400">Page {page} of {totalPages} ({total} results)</p>
            <div className="flex gap-1">
              {page > 1 && (
                <button onClick={() => updateParam('page', String(page - 1))} className="px-3 py-1.5 text-xs bg-slate-50 text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
                  Prev
                </button>
              )}
              {page < totalPages && (
                <button onClick={() => { const p = new URLSearchParams(searchParams); p.set('page', String(page + 1)); setSearchParams(p); }} className="px-3 py-1.5 text-xs bg-slate-50 text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
