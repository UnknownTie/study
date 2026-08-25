import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

// 다크/라이트 토글은 여기 딱 한 번만 있다 (모든 페이지 상단 같은 위치).
export default function Header() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || '');

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('theme');
    }
  }, [theme]);

  function toggle() {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'light' : 'dark');
    }
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-title">
        공부 정리 허브
      </Link>
      <button className="theme-toggle" onClick={toggle}>
        라이트/다크 전환
      </button>
    </header>
  );
}
