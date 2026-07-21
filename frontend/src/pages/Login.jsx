import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Cpu, Lock, User, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeSwitcher from '../components/ThemeSwitcher';
import './Login.css';

export default function Login() {
  const { login, user } = useAuth();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.title = 'IT Request System — เข้าสู่ระบบ';
    if (user) navigate('/submit', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    if (!res.success) {
      setError(res.error);
    } else {
      const from = location.state?.from?.pathname || '/submit';
      // Ensure we clean up Dev_work prefix if redirect came from there
      const cleanFrom = from.replace('/Dev_work', '');
      navigate(cleanFrom, { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg__gradient" />
        <div className="login-bg__orb login-bg__orb--1" />
        <div className="login-bg__orb login-bg__orb--2" />
        <div className="login-bg__orb login-bg__orb--3" />
        <div className="login-bg__grid" />
      </div>

      {/* Theme Switcher */}
      <div className="login-theme-toggle">
        <ThemeSwitcher position="login-position" />
      </div>

      {/* Login Card */}
      <div className="login-card fade-in">
        <div className="login-card__glow" />

        <div className="login-header">
          <div className="login-icon-wrapper">
            <div className="login-icon-ring" />
            <Cpu size={28} />
          </div>
          <h1>IT Request</h1>
          <p className="login-subtitle">ระบบจัดการคำร้อง IT</p>
        </div>

        {error && (
          <div className="login-error slide-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label>ชื่อผู้ใช้</label>
            <div className="login-input-wrapper">
              <User size={16} className="login-input-icon" />
              <input
                type="text"
                placeholder="กรอกชื่อผู้ใช้ หรือ อีเมล"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
              />
              <div className="login-input-highlight" />
            </div>
          </div>

          <div className="login-input-group">
            <label>รหัสผ่าน</label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <div className="login-input-highlight" />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <div className="login-btn-loader">
                <span className="spinner" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </div>
            ) : (
              <>
                <LogIn size={16} />
                เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="login-footer__line" />
          <span>SiamGroup V3</span>
          <div className="login-footer__line" />
        </div>
      </div>
    </div>
  );
}
