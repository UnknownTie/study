import { createContext, useContext } from 'react';

// 문제를 푸는 동안(QuizPanel이 화면에 떠 있는 동안)의 진행 현황을 상단 고정 헤더까지 끌어올리기 위한 컨텍스트.
// App.jsx가 Provider로 감싸고, QuizPanel이 setProgress로 값을 채워 넣으며(언마운트 시 null로 되돌림),
// Header가 그 값을 읽어 스크롤 중에도 항상 보이는 위치에 표시한다.
// progress: null(퀴즈 안 펼쳐짐) | { solved, total, starred }
export const QuizProgressContext = createContext({ progress: null, setProgress: () => {} });

export function useQuizProgress() {
  return useContext(QuizProgressContext);
}
