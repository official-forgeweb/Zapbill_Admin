import { useState, useEffect } from 'react';
import { ScrollText, Search, Filter } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  CREATE: 'text-accent-400',
  UPDATE: 'text-primary-400',
  DELETE: 'text-danger-400',
  SUSPEND: 'text-warn-400',
  ACTIVATE: 'text-accent-400',
  ENABLE: 'text-accent-400',
  DISABLE: 'text-danger-400',
  GRANT: 'text-primary-400',
  REGENERATE: 'text-warn-400',
  RECORD: 'text-accent-400',
  DEACTIVATE: 'text-danger-400',
  UNBIND: 'text-warn-400',
};

function getActionColor(action) {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action?.includes(key)) return color;
  }
  return 'text-slate-500';
}

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadLogs(); }, [search, entityType, page]);

  const loadLogs = () => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (search) params.action = search;
    if (entityType) params.entity_type = entityType;
    api.get('/audit', { params })
      .then(res => { setLogs(res.data.logs); setTotal(res.data.total); })
      .catch(() => toast.error('Failed to load logs'))
      .finally(() => setLoading(false));
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ScrollText size={22} className="text-primary-400" /> Audit Logs
        </h2>
        <p className="text-slate-500 text-sm mt-0.5">{total} total log entries</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Filter by action (e.g. CREATE, UPDATE)..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-500/50" />
          </div>
          <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-slate-50/80 border border-slate-300/50 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary-500/50">
            <option value="">All Entities</option>
            <option value="client">Client</option>
            <option value="license">License</option>
            <option value="device">Device</option>
            <option value="feature">Feature</option>
            <option value="plan">Plan</option>
            <option value="client_feature">Client Feature</option>
            <option value="amc_payment">AMC Payment</option>
          </select>
        </div>
      </div>

      {/* Logs */}
      <div className="glass-card overflow-hidden">
        <div className="divide-y divide-slate-200">
          {loading ? [...Array(8)].map((_, i) => (
            <div key={i} className="px-5 py-4"><div className="skeleton h-5 w-full max-w-lg" /></div>
          )) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No audit logs found</div>
          ) : logs.map(log => (
            <div key={log.id} className="px-5 py-3.5 hover:bg-slate-50/20 transition-colors cursor-pointer"
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${getActionColor(log.action).replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${getActionColor(log.action)}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                      <span className="badge badge-neutral text-[10px]">{log.entity_type}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      by <span className="text-slate-600">{log.admin?.name}</span> • {new Date(log.created_at).toLocaleString()}
                      {log.ip_address && ` • ${log.ip_address}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === log.id && (log.old_data || log.new_data) && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                  {log.old_data && (
                    <div className="bg-danger-500/5 border border-danger-500/10 rounded-lg p-3">
                      <p className="text-xs font-semibold text-danger-400 mb-2">Old Data</p>
                      <pre className="text-xs text-slate-500 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                        {JSON.stringify(log.old_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_data && (
                    <div className="bg-accent-500/5 border border-accent-500/10 rounded-lg p-3">
                      <p className="text-xs font-semibold text-accent-400 mb-2">New Data</p>
                      <pre className="text-xs text-slate-500 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                        {JSON.stringify(log.new_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/50">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              {page > 1 && <button onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs bg-slate-50 text-slate-600 rounded-md hover:bg-slate-200">Prev</button>}
              {page < totalPages && <button onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs bg-slate-50 text-slate-600 rounded-md hover:bg-slate-200">Next</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
