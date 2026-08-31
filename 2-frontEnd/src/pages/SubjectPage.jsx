import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/Card';
import CardGrid from '../components/CardGrid';
import Breadcrumbs from '../components/Breadcrumbs';
import SideNav from '../components/SideNav';
import QuizPanel from '../components/QuizPanel';
import ContentBlocks from '../components/ContentBlocks';
import Terminal from '../components/Terminal';
import {
  findSubject,
  getQuestionsBySubject,
  getQuestionsByTopic,
  getExtraQuestionsBySubject,
  getTopicStatMap,
} from '../data/loader';

export default function SubjectPage() {
  const { examId, subjectId } = useParams();
  const navigate = useNavigate();
  const [showQuiz, setShowQuiz] = useState(false);

  const found = useMemo(() => findSubject(examId, subjectId), [examId, subjectId]);
  const statMap = useMemo(() => getTopicStatMap(examId), [examId]);

  if (!found) return <div className="page">과목을 찾을 수 없습니다.</div>;
  const { exam, subject } = found;

  const siblingSubjects = exam.subjects.map((s) => ({
    id: s.id,
    name: s.name,
    to: `/exam/${examId}/${s.id}`,
  }));

  const topicBasedAll = useMemo(() => getQuestionsBySubject(examId, subjectId), [examId, subjectId]);
  const extraAll = useMemo(() => getExtraQuestionsBySubject(examId, subjectId), [examId, subjectId]);
  const totalQuestionCount = topicBasedAll.length + extraAll.length;
  // 유형 카드에 [기본 문제 + 그 유형으로 분류된 기출 연습문제] 합산 문항수를 보여주기 위한 카운트 맵.
  const extraCountByTopic = useMemo(() => {
    const map = {};
    for (const q of extraAll) {
      if (q.topicId) map[q.topicId] = (map[q.topicId] || 0) + 1;
    }
    return map;
  }, [extraAll]);

  const questions = useMemo(() => {
    if (!showQuiz) return [];
    const topicBased = topicBasedAll.map((q) => {
      const topic = subject.topics.find((t) => t.id === q.topicId);
      return { ...q, topicTagLabel: topic ? topic.name : q.topicId };
    });
    // 유형(출제율)에 안 묶인 별도 연습문제 풀 — [연습문제] 태그를 붙여 구분 표시
    const extra = extraAll.map((q) => ({
      ...q,
      topicTagLabel: `[연습문제] ${q.topicHint || ''}`.trim(),
    }));
    return [...topicBased, ...extra];
  }, [showQuiz, topicBasedAll, extraAll, subject]);

  return (
    <div className="page">
      <Breadcrumbs crumbs={[{ label: exam.name, to: `/exam/${examId}` }, { label: subject.name }]} />

      <div className="page-title-row">
        <h1>{subject.name}</h1>
        <button className="btn-primary" onClick={() => setShowQuiz((s) => !s)}>
          {showQuiz ? '문제 접기' : `예제 문제 풀어보기(${totalQuestionCount}문항)`}
        </button>
      </div>
      <p className="page-stat-line">
        {subject.stat.count}문항 / {subject.stat.total}문항 ({subject.stat.pct.toFixed(1)}%) · 유형을 클릭하면 세부 내용을 볼 수 있습니다.
      </p>

      <SideNav items={siblingSubjects} currentId={subjectId} />

      {subject.concepts.length > 0 && (
        <>
          <h3>과목 개요</h3>
          <ul className="concepts-list">
            {subject.concepts.map((c, i) =>
              typeof c === 'string' ? (
                <li key={i} dangerouslySetInnerHTML={{ __html: c }} />
              ) : (
                <li key={i}>
                  <ContentBlocks content={c} />
                </li>
              )
            )}
          </ul>
        </>
      )}

      {subject.example && (
        <>
          <h3>실행 예제</h3>
          <Terminal html={subject.example} />
        </>
      )}

      {showQuiz && <QuizPanel questions={questions} statMap={statMap} showSourceTag examName={exam.name} />}

      <CardGrid>
        {subject.topics.map((topic) => (
          <Card
            key={topic.id}
            title={topic.name}
            stat={topic.stat}
            exampleCount={getQuestionsByTopic(examId, subjectId, topic.id).length + (extraCountByTopic[topic.id] || 0)}
            onClick={() => navigate(`/exam/${examId}/${subjectId}/${topic.id}`)}
          />
        ))}
      </CardGrid>
    </div>
  );
}
