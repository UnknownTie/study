import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/Card';
import CardGrid from '../components/CardGrid';
import Breadcrumbs from '../components/Breadcrumbs';
import QuizPanel from '../components/QuizPanel';
import {
  findExam,
  getQuestionsByExam,
  getQuestionsBySubject,
  getExtraQuestionsByExam,
  getExtraQuestionsBySubject,
  getTopicStatMap,
  getRealExamSessions,
} from '../data/loader';

export default function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [showQuiz, setShowQuiz] = useState(false);

  const found = useMemo(() => findExam(examId), [examId]);
  const statMap = useMemo(() => getTopicStatMap(examId), [examId]);
  const hasRealExams = useMemo(() => getRealExamSessions(examId).length > 0, [examId]);

  if (!found) return <div className="page">시험을 찾을 수 없습니다.</div>;
  const { exam } = found;

  const topicBasedAll = useMemo(() => getQuestionsByExam(examId), [examId]);
  const extraAll = useMemo(() => getExtraQuestionsByExam(examId), [examId]);
  const allQuestions = useMemo(() => [...topicBasedAll, ...extraAll], [topicBasedAll, extraAll]);
  const questions = useMemo(() => {
    if (!showQuiz) return [];
    return allQuestions.map((q) => {
      const topic = exam.subjects.flatMap((s) => s.topics).find((t) => t.id === q.topicId);
      // 유형(topicId)에 안 묶인 기출 연습문제는 [연습문제] 태그로 구분 표시.
      const topicTagLabel = topic ? topic.name : q.extra ? `[연습문제] ${q.topicHint || ''}`.trim() : q.topicId;
      return { ...q, topicTagLabel };
    });
  }, [showQuiz, allQuestions, exam]);

  return (
    <div className="page">
      <Breadcrumbs crumbs={[{ label: exam.name }]} />

      <div className="page-title-row">
        <h1>{exam.name}</h1>
        <button className="btn-primary" onClick={() => setShowQuiz((s) => !s)}>
          {showQuiz ? '문제 접기' : `예제 문제 풀어보기(${allQuestions.length}문항)`}
        </button>
      </div>
      <p className="page-stat-line">
        {exam.stat.count}문항 / {exam.stat.total}문항 · 과목을 클릭하면 세부 유형을 볼 수 있습니다.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {exam.rules && (
          <button className="btn-secondary" onClick={() => navigate(`/exam/${examId}/mock`)}>
            가상 모의고사 응시
          </button>
        )}
        {hasRealExams && (
          <button className="btn-secondary" onClick={() => navigate(`/exam/${examId}/real`)}>
            실제 기출 다시 풀기
          </button>
        )}
      </div>

      {showQuiz && <QuizPanel questions={questions} statMap={statMap} showSourceTag examName={exam.name} />}

      <CardGrid>
        {exam.subjects.map((subject) => (
          <Card
            key={subject.id}
            title={subject.name}
            note={subject.note}
            stat={subject.stat}
            exampleCount={
              getQuestionsBySubject(examId, subject.id).length + getExtraQuestionsBySubject(examId, subject.id).length
            }
            onClick={() => navigate(`/exam/${examId}/${subject.id}`)}
          />
        ))}
      </CardGrid>
    </div>
  );
}
