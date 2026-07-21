import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Custom React hook for checking session details and login auth.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (cachedUser && token) {
      setUser(JSON.parse(cachedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.hash = '#/login';
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
