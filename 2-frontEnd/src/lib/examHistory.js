// 실전처럼 풀기 기록 저장소 — 매번 문제 조합이 랜덤이라 나중에 참고할 수 있도록 브라우저에 남겨둔다.
const STORAGE_PREFIX = 'lm2study:mockHistory:';

function key(examId) {
  return STORAGE_PREFIX + examId;
}

export function loadHistory(examId) {
  try {
    const raw = localStorage.getItem(key(examId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(examId, entry) {
  const list = loadHistory(examId);
  list.unshift(entry);
  localStorage.setItem(key(examId), JSON.stringify(list));
}

export function clearHistory(examId) {
  localStorage.removeItem(key(examId));
}
