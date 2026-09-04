import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SideNav.css';

// 연속된 트랙패드 스와이프 하나에서 여러 번 발화하지 않도록 두는 최소 간격.
const SWIPE_COOLDOWN_MS = 600;
// 휠 이벤트: 세로 스크롤 중 섞여 들어오는 미세한 가로 흔들림을 무시하기 위한 임계값.
const WHEEL_DELTA_THRESHOLD = 24;
// 터치 스와이프: 손가락이 최소 이 정도는 가로로 움직여야 스와이프로 인정.
const TOUCH_DELTA_THRESHOLD = 60;
// 코드 박스·표처럼 자체적으로 가로 스크롤되는 영역 안에서는 페이지 이동을 가로채지 않는다.
const SCROLLABLE_SELECTOR = '.term, .content-table-wrap';

// 스와이프 하나로 페이지가 넘어가면 SideNav는 새 페이지의 새 컴포넌트 인스턴스로 마운트되므로,
// 쿨다운을 컴포넌트 내부 state/ref로 두면 이동 직후 리셋되어 한 번의 트랙패드 스와이프가 여러 문서를
// 연달아 넘겨버릴 수 있다. 그래서 모듈 스코프 변수로 두어 라우트 이동과 무관하게 값이 유지되게 한다.
let lastTriggerAt = 0;

// items: [{id, name, to}] — 항상 "호출부가 넘겨준 배열 안에서만" 순환한다.
// TopicPage가 호출할 때는 반드시 현재 examId의 13개 유형 배열만 넘겨서, 다른 시험 유형으로 절대 넘어가지 않게 한다.
export default function SideNav({ items, currentId }) {
  const navigate = useNavigate();
  const touchStartRef = useRef(null);

  const valid = Array.isArray(items) && items.length >= 2;
  const idx = valid ? items.findIndex((it) => it.id === currentId) : -1;
  const prev = idx !== -1 ? items[(idx - 1 + items.length) % items.length] : null;
  const next = idx !== -1 ? items[(idx + 1) % items.length] : null;

  // 좌우 스크롤(트랙패드 가로 스와이프·shift+휠)과 터치 스와이프로도 이전/다음 항목으로 넘어갈 수 있게 한다.
  // 버튼 클릭과 동일하게 navigate(prev.to)/navigate(next.to)를 호출할 뿐이라, 순환 로직은 위와 완전히 공유된다.
  useEffect(() => {
    if (!prev || !next) return undefined;

    function canTrigger() {
      const now = Date.now();
      if (now - lastTriggerAt < SWIPE_COOLDOWN_MS) return false;
      lastTriggerAt = now;
      return true;
    }

    function isInsideScrollable(target) {
      return !!(target && target.closest && target.closest(SCROLLABLE_SELECTOR));
    }

    function handleWheel(e) {
      if (isInsideScrollable(e.target)) return;
      if (Math.abs(e.deltaX) < WHEEL_DELTA_THRESHOLD) return;
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return;
      if (!canTrigger()) return;
      navigate(e.deltaX > 0 ? next.to : prev.to);
    }

    function handleTouchStart(e) {
      const t = e.touches[0];
      touchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null;
    }

    function handleTouchEnd(e) {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || isInsideScrollable(e.target)) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < TOUCH_DELTA_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (!canTrigger()) return;
      navigate(dx < 0 ? next.to : prev.to);
    }

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [prev, next, navigate]);

  if (!valid || idx === -1) return null;

  return (
    <div className="side-nav">
      <button className="nav-btn prev" onClick={() => navigate(prev.to)}>
        <span className="nav-label">← 이전 항목</span>
        <span className="nav-name">{prev.name}</span>
      </button>
      <button className="nav-btn next" onClick={() => navigate(next.to)}>
        <span className="nav-label">다음 항목 →</span>
        <span className="nav-name">{next.name}</span>
      </button>
    </div>
  );
}
