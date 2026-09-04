import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuizProgress } from '../lib/quizProgressContext';
import './Header.css';

// 다크/라이트 토글은 여기 딱 한 번만 있다 (모든 페이지 상단 같은 위치).
export default function Header() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || '');
  const { progress } = useQuizProgress();

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

  // 다크 모드 진행 시(명시적으로 dark 선택했거나, 시스템 설정이 dark인데 아직 명시적으로 안 고른 경우) 해 아이콘을,
  // 라이트 모드 진행 시 달 아이콘을 보여준다 — 아이콘은 "누르면 바뀔 모드"가 아니라 "지금 상태"를 나타낸다.
  const isDarkNow = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;

  return (
    <header className="app-header">
      <Link to="/" className="app-title">
        공부 정리 허브
      </Link>
      {progress && (
        <span className="header-quiz-progress">
          전체 {progress.total} · 남은문항 {progress.remaining} · 정답 {progress.correct} · 오답 {progress.incorrect} · ⭐ {progress.starred}
        </span>
      )}
      <button className="theme-toggle" onClick={toggle} aria-label="라이트/다크 전환" title="라이트/다크 전환">
        {isDarkNow ? '🌙' : '☀️'}
      </button>
    </header>
  );
}
