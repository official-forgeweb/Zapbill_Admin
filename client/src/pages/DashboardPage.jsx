import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShieldCheck, AlertTriangle, XCircle, Monitor, IndianRupee, TrendingUp, Clock, Plus, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatCard({ icon: Icon, label, value, color, subtext, gradient }) {
  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-2 tracking-tight">{value}</p>
          {subtext && <p className="text-xs font-medium text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm ring-1 ring-slate-100 ${color} transform group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="skeleton w-20 h-3" />
          <div className="skeleton w-16 h-7" />
        </div>
        <div className="skeleton w-10 h-10 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-xl font-bold text-slate-900">Dashboard</h2></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-0.5">Overview of your FlashBill business</p>
        </div>
        <Link
          to="/clients/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus size={16} /> New Client
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={Users} label="Total Clients" value={stats.totalClients || 0}
          color="text-primary-500" gradient="from-primary-400 to-primary-600"
          subtext={`${stats.activeClients || 0} active`}
        />
        <StatCard
          icon={ShieldCheck} label="Active AMCs" value={stats.activeAmcs || 0}
          color="text-emerald-500" gradient="from-emerald-400 to-emerald-600"
        />
        <StatCard
          icon={AlertTriangle} label="Expiring (30d)" value={stats.expiringAmcs || 0}
          color="text-amber-500" gradient="from-amber-400 to-amber-600"
          subtext="Needs attention"
        />
        <StatCard
          icon={XCircle} label="Expired AMCs" value={stats.expiredAmcs || 0}
          color="text-rose-500" gradient="from-rose-400 to-rose-600"
        />
        <StatCard
          icon={Monitor} label="Total Devices" value={stats.totalDevices || 0}
          color="text-indigo-500" gradient="from-indigo-400 to-indigo-600"
          subtext={`${stats.activeDevices || 0} online`}
        />
        <StatCard
          icon={IndianRupee} label="AMC Revenue (Mo)" value={`₹${(stats.amcRevenueThisMonth || 0).toLocaleString('en-IN')}`}
          color="text-emerald-500" gradient="from-emerald-400 to-emerald-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary-400" /> Monthly AMC Revenue
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthlyRevenue || []}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', fontSize: '12px', color: '#f1f5f9' }}
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Plan Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.planDistribution || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {(data?.planDistribution || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', fontSize: '12px', color: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {(data?.planDistribution || []).map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 capitalize">{p.name?.replace(/_/g, ' ')}</span>
                </div>
                <span className="text-slate-800 font-semibold">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Clients + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Clients */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-primary-400" /> Recent Clients
            </h3>
            <Link to="/clients" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.recentClients || []).map(c => (
              <Link key={c.id} to={`/clients/${c.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-primary-400">
                    {c.business_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900 transition-colors">{c.business_name}</p>
                    <p className="text-xs text-slate-400">{c.owner_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge ${c.amc_status === 'active' ? 'badge-active' : c.amc_status === 'expired' ? 'badge-expired' : 'badge-neutral'}`}>
                    {c.amc_status}
                  </span>
                </div>
              </Link>
            ))}
            {(data?.recentClients || []).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">No clients yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-warn-400" /> Recent Activity
            </h3>
            <Link to="/audit" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.recentActivity || []).map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-800">{a.admin_name}</span>{' '}
                    <span className="text-slate-500">{a.action?.replace(/_/g, ' ').toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {(data?.recentActivity || []).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
