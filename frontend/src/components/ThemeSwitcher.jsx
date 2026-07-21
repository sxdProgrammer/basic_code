import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeSwitcher.css';

export default function ThemeSwitcher({ position = 'sidebar' }) {
  const { themeName, setThemeName, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`theme-switcher ${position}`} ref={ref}>
      <button className="theme-switcher__trigger" onClick={() => setOpen(!open)} title="เปลี่ยนธีม">
        <Palette size={18} />
        {position === 'sidebar' && <span>เปลี่ยนธีม</span>}
      </button>

      {open && (
        <div className="theme-switcher__dropdown">
          <div className="theme-switcher__title">เลือกธีม</div>
          {Object.entries(themes).map(([key, theme]) => (
            <button
              key={key}
              className={`theme-switcher__option ${key === themeName ? 'active' : ''}`}
              onClick={() => { setThemeName(key); setOpen(false); }}
            >
              <span className="theme-switcher__preview" style={{
                background: `linear-gradient(135deg, ${theme['--gradient-start']}, ${theme['--gradient-end']})`
              }} />
              <span className="theme-switcher__icon">{theme.icon}</span>
              <span className="theme-switcher__name">{theme.name}</span>
              {key === themeName && <span className="theme-switcher__check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
