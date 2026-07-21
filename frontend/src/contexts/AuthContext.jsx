import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const cachedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (cachedUser && token) {
      setUser(JSON.parse(cachedUser));
      try {
        const res = await api.get('/api/auth/me');
        if (res.data && res.data.success !== false) {
          const freshUser = res.data;
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
        }
      } catch (err) {
        console.error('Verify auth failed, token may be expired:', err);
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { token, user: userData, success } = res.data;
      if (success && token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
      return { success: false, error: res.data.error || 'เข้าสู่ระบบล้มเหลว' };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
