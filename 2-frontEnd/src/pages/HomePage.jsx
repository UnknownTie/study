import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import CardGrid from '../components/CardGrid';
import SelectableCardWrapper from '../components/SelectableCardWrapper';
import QuizPanel from '../components/QuizPanel';
import { getTree, getQuestionsByExams, getTopicStatMap, getQuestionsByExam, getExtraQuestionsByExam } from '../data/loader';

export default function HomePage() {
  const navigate = useNavigate();
  const tree = useMemo(() => getTree(), []);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [quizScope, setQuizScope] = useState(null); // null | examId[]

  const allExamIds = tree.categories.flatMap((c) => c.exams.map((e) => e.id));
  const allQuestionsCount = getQuestionsByExams(allExamIds).length;

  function toggleSelect(examId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  }

  function buildQuiz(examIds) {
    const questions = getQuestionsByExams(examIds);
    const statMaps = Object.fromEntries(examIds.map((id) => [id, getTopicStatMap(id)]));
    const enriched = questions.map((q) => {
      const examNode = tree.categories.flatMap((c) => c.exams).find((e) => e.id === q.examId);
      const found = examNode?.subjects.flatMap((s) => s.topics).find((t) => t.id === q.topicId);
      return { ...q, topicTagLabel: found ? found.name : q.topicId, examName: examNode ? examNode.name : q.examId };
    });
    return { questions: enriched, statMaps };
  }

  const activeQuiz = quizScope ? buildQuiz(quizScope) : null;
  // 여러 시험을 합칠 때 statMap도 examId별로 다르므로, 문제별 examId에 맞는 statMap을 미리 붙여 넣는다.
  function mergedStatMap(statMaps) {
    const merged = {};
    for (const map of Object.values(statMaps)) Object.assign(merged, map);
    return merged;
  }

  return (
    <div className="page">
      <div className="page-title-row">
        <h1>목차</h1>
        <button className="btn-primary" onClick={() => setQuizScope((s) => (s ? null : allExamIds))}>
          {quizScope ? '문제 접기' : `예제 문제 풀어보기(${allQuestionsCount}문항)`}
        </button>
      </div>
      <p className="page-hint">공부하거나 정리해두고 싶은 내용을 모아두는 공간입니다. 카드를 클릭하면 하위 항목으로 이동합니다.</p>

      {activeQuiz && (
        <QuizPanel questions={activeQuiz.questions} statMap={mergedStatMap(activeQuiz.statMaps)} showSourceTag />
      )}

      <div className="select-mode-row">
        <button className="btn-ghost" onClick={() => { setSelectMode((s) => !s); setSelected(new Set()); }}>
          {selectMode ? '선택 모드 끄기' : '여러 시험 선택'}
        </button>
      </div>

      {tree.categories.map((cat) => (
        <section key={cat.id} className="category-section">
          <h2 className="category-title">{cat.name}</h2>
          <CardGrid>
            {cat.exams.map((exam) => (
              <SelectableCardWrapper
                key={exam.id}
                selectMode={selectMode}
                selected={selected.has(exam.id)}
                onToggle={() => toggleSelect(exam.id)}
              >
                <Card
                  title={exam.name}
                  note={exam.note}
                  stat={{ count: exam.stat.count, total: exam.stat.total, pct: exam.stat.pct }}
                  exampleCount={getQuestionsByExam(exam.id).length + getExtraQuestionsByExam(exam.id).length}
                  onClick={() => {
                    if (selectMode) return; // 선택 모드에서는 카드 클릭이 이동을 대체하지 않고 체크만 한다
                    navigate(`/exam/${exam.id}`);
                  }}
                />
              </SelectableCardWrapper>
            ))}
          </CardGrid>
        </section>
      ))}

      {selectMode && selected.size > 0 && (
        <div className="select-bottom-bar">
          <span>{selected.size}개 시험 선택됨</span>
          <button className="btn-primary" onClick={() => setQuizScope([...selected])}>
            {selected.size}개 시험 · 문제 풀기
          </button>
        </div>
      )}
    </div>
  );
}
