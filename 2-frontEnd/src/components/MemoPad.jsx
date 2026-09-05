import { useEffect, useRef, useState } from 'react';
import './MemoPad.css';

const STORAGE_KEY = 'studyhub_memo';

// 헤더에서 항상 접근 가능한 간단한 메모장 — 버튼을 누르면 펼쳐지고, 다시 누르거나 바깥을 클릭하면 접힌다.
// 내용은 localStorage에 그대로 저장되어 페이지를 옮기거나 새로고침해도 남아있다.
export default function MemoPad() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleChange(e) {
    setText(e.target.value);
    localStorage.setItem(STORAGE_KEY, e.target.value);
  }

  return (
    <div className="memo-pad" ref={wrapRef}>
      <button
        className={`memo-toggle ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="메모장"
        title="메모장"
      >
        📝
      </button>
      {open && (
        <div className="memo-popup">
          <div className="memo-popup-header">
            <span>메모장</span>
            <button className="memo-close" onClick={() => setOpen(false)} aria-label="메모장 닫기">
              ✕
            </button>
          </div>
          <textarea
            className="memo-textarea"
            value={text}
            onChange={handleChange}
            placeholder="여기에 메모를 입력하세요..."
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
