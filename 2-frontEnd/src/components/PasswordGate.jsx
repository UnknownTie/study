import { useEffect, useState } from 'react';

// 비밀번호는 평문으로 저장하지 않고 SHA-256 해시만 비교한다 (완전한 서버 인증이 아닌, 캐주얼한 접근 차단용).
const PASSWORD_HASH = '0c87ed818fb90f3f88faa6b362cf1e99025f3c1248f8fe513cdb38d03d9dce65';
const STORAGE_KEY = 'studyhub_auth_until';
const TTL_MS = 24 * 60 * 60 * 1000; // 24시간

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isUnlocked() {
  const until = Number(localStorage.getItem(STORAGE_KEY) || 0);
  return until > Date.now();
}

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (unlocked) localStorage.setItem(STORAGE_KEY, String(Date.now() + TTL_MS));
  }, [unlocked]);

  if (unlocked) return <>{children}</>;

  async function handleSubmit(e) {
    e.preventDefault();
    const hash = await sha256Hex(input);
    if (hash === PASSWORD_HASH) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <div className="gate-wrap">
      <form className="gate-card" onSubmit={handleSubmit}>
        <h1 className="gate-title">🔒 비밀번호 입력</h1>
        <input
          type="password"
          autoFocus
          className="gate-input"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          placeholder="비밀번호"
        />
        <button type="submit" className="btn-primary gate-submit">
          입장하기
        </button>
        {error && <p className="gate-error">비밀번호가 올바르지 않습니다.</p>}
      </form>
    </div>
  );
}
