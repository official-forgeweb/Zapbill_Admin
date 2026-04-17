import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import CreateClientPage from './pages/CreateClientPage';
import LicensesPage from './pages/LicensesPage';
import DevicesPage from './pages/DevicesPage';
import FeaturesPage from './pages/FeaturesPage';
import PlansPage from './pages/PlansPage';
import AmcPage from './pages/AmcPage';
import AuditPage from './pages/AuditPage';
import WebsiteOrdersOverviewPage from './pages/WebsiteOrdersOverviewPage';
import TrialClientsPage from './pages/TrialClientsPage';

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!admin) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/new" element={<CreateClientPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="licenses" element={<LicensesPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="amc" element={<AmcPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="website-orders" element={<WebsiteOrdersOverviewPage />} />
        <Route path="trials" element={<TrialClientsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
