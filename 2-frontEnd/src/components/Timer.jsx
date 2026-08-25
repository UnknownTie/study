import { useEffect, useRef, useState } from 'react';
import './Timer.css';

// 우측 상단에 계속 떠 있는 카운트다운 타이머. 0이 되면 onExpire를 한 번만 호출한다.
export default function Timer({ totalSeconds, onExpire, running = true }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(totalSeconds);
    expiredRef.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const low = remaining <= 60;

  return (
    <div className={`exam-timer ${low ? 'low' : ''}`}>
      ⏱ {mm}:{ss}
    </div>
  );
}
