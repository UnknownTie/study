import { useEffect, useState } from 'react';
import './ScrollToTopButton.css';

// 화면을 일정 이상 스크롤했을 때만 나타나는 우측 하단 "맨 위로" 버튼. 모든 페이지에 공통으로 뜨도록 App.jsx에서 한 번만 렌더링한다.
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      className="scroll-top-btn"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="맨 위로"
      title="맨 위로"
    >
      ↑
    </button>
  );
}
