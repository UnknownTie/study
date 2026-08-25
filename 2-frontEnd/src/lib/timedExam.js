import { shuffle } from './shuffle';
import { shuffleStatementOptions } from './statementShuffle';

// 실전처럼 풀기: 회차(1차/2차 등)별 문항수(questionCount)를 유형별 문제 + 연습문제([연습문제] 태그)를 합쳐서 중복 없이 채운다.
// round는 loader.js의 getExamRounds(examId)가 반환하는 배열의 원소 하나(예: {id,label,totalQuestions,timeLimitMinutes,hasSubjectCutoff,passAverage,subjects}).
// getQuestionsBySubjectFn/getExtraQuestionsBySubjectFn은 loader.js의 getQuestionsBySubject/getExtraQuestionsBySubject를 주입받는다.
export function buildTimedExamPaper(round, getQuestionsBySubjectFn, getExtraQuestionsBySubjectFn) {
  const sections = round.subjects.map((rule) => {
    const topicBased = getQuestionsBySubjectFn(rule.subjectId);
    const extra = getExtraQuestionsBySubjectFn(rule.subjectId);
    const pool = shuffle([...topicBased, ...extra]);
    const count = Math.min(rule.questionCount, pool.length);
    return {
      subjectId: rule.subjectId,
      passScore: rule.passScore ?? null,
      requestedCount: rule.questionCount,
      availableCount: pool.length,
      // "옳은/옳지 않은 것을 고르시오"류 문제는 회차마다 보기(①~④) 순서도 새로 섞는다.
      questions: pool.slice(0, count).map(shuffleStatementOptions),
    };
  });
  return { round, sections };
}

// hasSubjectCutoff가 false인 회차(예: 1차)는 과목별 과락 없이 전체 평균만으로 합격을 판정한다.
export function scoreTimedExam(paper, answers) {
  const sectionResults = paper.sections.map((section) => {
    if (section.questions.length === 0) {
      return { subjectId: section.subjectId, skipped: true, reason: '문제 부족으로 채점 제외', correct: 0, total: 0, score: null, pass: null };
    }
    const correct = section.questions.filter((q) => answers[q.id] === q.answer).length;
    const total = section.questions.length;
    const score = (correct / total) * 100;
    const pass = paper.round.hasSubjectCutoff ? (section.passScore !== null ? score >= section.passScore : null) : null;
    return { subjectId: section.subjectId, skipped: false, correct, total, score, pass };
  });

  const scored = sectionResults.filter((r) => !r.skipped);
  const average = scored.length > 0 ? scored.reduce((sum, r) => sum + r.score, 0) / scored.length : null;
  const averagePass = average !== null && average >= paper.round.passAverage;
  const subjectCutoffPass = paper.round.hasSubjectCutoff ? scored.length > 0 && scored.every((r) => r.pass) : true;
  const overallPass = averagePass && subjectCutoffPass;

  return { sectionResults, average, overallPass };
}
