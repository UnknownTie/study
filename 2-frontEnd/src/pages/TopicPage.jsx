import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import SideNav from '../components/SideNav';
import ContentBlocks from '../components/ContentBlocks';
import Terminal from '../components/Terminal';
import QuizPanel from '../components/QuizPanel';
import { findTopic, findExam, getQuestionsByTopic, getExtraQuestionsBySubject, getTopicStatMap } from '../data/loader';

export default function TopicPage() {
  const { examId, subjectId, topicId } = useParams();
  const [showQuiz, setShowQuiz] = useState(false);

  const found = useMemo(() => findTopic(examId, subjectId, topicId), [examId, subjectId, topicId]);
  const examFound = useMemo(() => findExam(examId), [examId]);
  const statMap = useMemo(() => getTopicStatMap(examId), [examId]);

  if (!found || !examFound) return <div className="page">유형을 찾을 수 없습니다.</div>;
  const { exam, subject, topic } = found;

  // 형제 유형 이동은 반드시 "현재 시험(examId)"의 전체 유형 목록 안에서만 순환한다 (다른 시험으로 절대 안 넘어감).
  const allTopicsInExam = examFound.exam.subjects.flatMap((s) =>
    s.topics.map((t) => ({ id: t.id, name: t.name, to: `/exam/${examId}/${s.id}/${t.id}` }))
  );

  const topicBasedAll = useMemo(() => getQuestionsByTopic(examId, subjectId, topicId), [examId, subjectId, topicId]);
  // 유형(topicId)이 분류된 기출 연습문제 — questions-extra는 원래 유형에 안 묶이는 게 기본이지만,
  // 분류 작업을 거친 문항은 topicId가 붙어 있으므로 여기서 이 유형에 해당하는 것만 골라 합친다.
  const extraMatched = useMemo(
    () => getExtraQuestionsBySubject(examId, subjectId).filter((q) => q.topicId === topicId),
    [examId, subjectId, topicId]
  );
  const allQuestions = useMemo(() => [...topicBasedAll, ...extraMatched], [topicBasedAll, extraMatched]);
  const questions = useMemo(() => {
    if (!showQuiz) return [];
    return allQuestions.map((q) => ({
      ...q,
      topicTagLabel: q.extra ? `[기출] ${q.topicHint || ''}`.trim() : topic.name,
    }));
  }, [showQuiz, allQuestions, topic]);

  return (
    <div className="page">
      <Breadcrumbs
        crumbs={[
          { label: exam.name, to: `/exam/${examId}` },
          { label: subject.name, to: `/exam/${examId}/${subjectId}` },
          { label: topic.name },
        ]}
      />

      <div className="page-title-row">
        <h1>{topic.name}</h1>
        <button className="btn-primary" onClick={() => setShowQuiz((s) => !s)}>
          {showQuiz ? '문제 접기' : `예제 문제 풀어보기(${allQuestions.length}문항)`}
        </button>
      </div>
      <p className="page-stat-line">
        {topic.stat.count}문항 / {topic.stat.total}문항 ({topic.stat.pct.toFixed(1)}%) · 회당 평균 {topic.stat.avg.toFixed(2)}문항
      </p>

      {showQuiz && <QuizPanel questions={questions} statMap={statMap} examName={exam.name} />}

      <SideNav items={allTopicsInExam} currentId={topicId} />

      <h3>자주 나오는 개념 · 명령어</h3>
      <ul className="concepts-list">
        {topic.concepts.map((c, i) =>
          typeof c === 'string' ? (
            <li key={i} dangerouslySetInnerHTML={{ __html: c }} />
          ) : (
            <li key={i}>
              <ContentBlocks content={c} />
            </li>
          )
        )}
      </ul>

      {topic.formulas && topic.formulas.length > 0 && (
        <>
          <h3>공식</h3>
          <div className="formula-list">
            {topic.formulas.map((f, i) => (
              <div className="formula-item" key={i}>
                <p className="formula-expr" dangerouslySetInnerHTML={{ __html: f.expr }} />
                {f.derivation && (
                  <details className="formula-derivation">
                    <summary>유도 과정 · 원리 보기</summary>
                    <div className="formula-derivation-body" dangerouslySetInnerHTML={{ __html: f.derivation }} />
                  </details>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {topic.example && (
        <>
          <h3>실행 예제</h3>
          <Terminal html={topic.example} />
        </>
      )}
    </div>
  );
}
