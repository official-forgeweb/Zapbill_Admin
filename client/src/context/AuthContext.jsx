import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('zapbill_token');
    const savedAdmin = localStorage.getItem('zapbill_admin');
    if (token && savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
      // Verify token is still valid
      api.get('/auth/me')
        .then(res => setAdmin(res.data.admin))
        .catch(() => {
          localStorage.removeItem('zapbill_token');
          localStorage.removeItem('zapbill_admin');
          setAdmin(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, admin: adminData } = res.data;
    localStorage.setItem('zapbill_token', token);
    localStorage.setItem('zapbill_admin', JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  };

  const logout = () => {
    localStorage.removeItem('zapbill_token');
    localStorage.removeItem('zapbill_admin');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
