import { useNavigate } from 'react-router-dom';
import './SideNav.css';

// items: [{id, name, to}] — 항상 "호출부가 넘겨준 배열 안에서만" 순환한다.
// TopicPage가 호출할 때는 반드시 현재 examId의 13개 유형 배열만 넘겨서, 다른 시험 유형으로 절대 넘어가지 않게 한다.
export default function SideNav({ items, currentId }) {
  const navigate = useNavigate();
  if (!items || items.length < 2) return null;

  const idx = items.findIndex((it) => it.id === currentId);
  if (idx === -1) return null;

  const prev = items[(idx - 1 + items.length) % items.length];
  const next = items[(idx + 1) % items.length];

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
