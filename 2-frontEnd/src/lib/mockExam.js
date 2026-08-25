// 가상 모의고사 응시지 구성 + 채점. React/DOM에 의존하지 않는 순수 함수 모음.
import { shuffle } from './shuffle';
import { shuffleStatementOptions } from './statementShuffle';

// 과목별로 min(실제 문항수, 보유 문제 수)만큼 뽑아 응시지를 구성한다.
// getQuestionsBySubjectFn(subjectId) => 해당 과목의 보유 문제 배열 을 넘겨받아 사용한다(호출부가 loader를 주입).
export function buildMockPaper(examRules, getQuestionsBySubjectFn) {
  const sections = examRules.subjects.map((rule) => {
    const pool = getQuestionsBySubjectFn(rule.subjectId);
    const count = Math.min(rule.questionCount, pool.length);
    return {
      subjectId: rule.subjectId,
      passScore: rule.passScore,
      requestedCount: rule.questionCount,
      availableCount: pool.length,
      // "옳은/옳지 않은 것을 고르시오"류 문제는 회차마다 보기(①~④) 순서도 새로 섞는다.
      questions: shuffle(pool).slice(0, count).map(shuffleStatementOptions),
    };
  });
  return { examRules, sections };
}

// answers: { [questionId]: 선택한 보기 index }
export function scoreMockExam(paper, answers) {
  const sectionResults = paper.sections.map((section) => {
    if (section.questions.length === 0) {
      return {
        subjectId: section.subjectId,
        skipped: true,
        reason: '문제 부족으로 채점 제외',
        correct: 0,
        total: 0,
        score: null,
        pass: null,
      };
    }
    const correct = section.questions.filter((q) => answers[q.id] === q.answer).length;
    const total = section.questions.length;
    const score = (correct / total) * 100;
    return {
      subjectId: section.subjectId,
      skipped: false,
      correct,
      total,
      score,
      pass: score >= section.passScore,
    };
  });

  const scored = sectionResults.filter((r) => !r.skipped);
  const average = scored.length > 0 ? scored.reduce((sum, r) => sum + r.score, 0) / scored.length : null;
  const allSubjectsPass = scored.length > 0 && scored.every((r) => r.pass);
  const averagePass = average !== null && average >= paper.examRules.passAverage;
  const overallPass = allSubjectsPass && averagePass;

  return { sectionResults, average, overallPass };
}
