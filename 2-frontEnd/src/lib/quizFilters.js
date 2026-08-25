// 문제 배열과 통계(getTopicStatMap 결과)를 명시적으로 결합/필터링하는 순수 함수 모음.
// loader.js는 questions를 절대 변형하지 않으므로, "문제 + 출제율"의 결합은 항상 여기서만 일어난다.

export function enrichWithTopicPct(questions, statMap) {
  return questions.map((q) => ({
    ...q,
    topicPct: statMap[q.topicId] ? statMap[q.topicId].pct : 0,
  }));
}

export function filterByMinPct(questions, minPct) {
  if (!minPct) return questions;
  return questions.filter((q) => q.topicPct >= minPct);
}

// examStage가 없는 문항(유형별 기본 연습문제 등)은 전부 2차 시험 기준 자료이므로 '2차'로 취급한다.
export function getExamStage(q) {
  return q.examStage || '2차';
}

export function filterByExamStage(questions, stage) {
  if (!stage || stage === '전체') return questions;
  return questions.filter((q) => getExamStage(q) === stage);
}
