import { useEffect, useMemo, useState } from 'react';
import QuestionCard from './QuestionCard';
import { shuffle } from '../lib/shuffle';
import { shuffleOptions, isStatementQuestion } from '../lib/statementShuffle';
import { enrichWithTopicPct, filterByMinPct, filterByExamStage, getExamStage } from '../lib/quizFilters';
import { useStars } from '../lib/useStars';
import { useQuizProgress } from '../lib/quizProgressContext';
import './QuizPanel.css';

const PCT_OPTIONS = [0, 1, 3, 5, 10];
const STAGE_OPTIONS = ['전체', '1차', '2차'];
const STAR_OPTIONS = ['전체 풀기', '별표 풀기'];

// 문제 목록 묶음: 출제율 필터 + 1차/2차 필터 + 섞어서 풀기 + 카드박스 하나에 문제1, 문제2, ... 순서로 나열.
// questions에는 이미 topicName/examName 같은 표시용 필드가 있다고 가정(호출부가 채워 넣음).
// examName을 prop으로 받으면(단일 시험 페이지) 모든 문항에 그 이름을 쓰고, 없으면 문제별 q.examName을 쓴다(여러 시험 결합 시).
export default function QuizPanel({ questions, statMap, showSourceTag = false, examName }) {
  const [minPct, setMinPct] = useState(0);
  const [stage, setStage] = useState('전체');
  const [starFilter, setStarFilter] = useState('전체 풀기');
  const [shuffled, setShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [showTruth, setShowTruth] = useState(false);
  // "정답 확인"을 누른 문제 id 집합 — 다시 누르면 안 푼 상태로 돌아가는 토글이라 Set으로 관리한다.
  // 필터/셔플로 카드가 재배치돼도 문제 id 기준이라 "푼 상태"가 그대로 유지된다.
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const toggleRevealed = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  // 문제별로 고른 보기 — 정답 확인 전까지는 자유롭게 바꿔 고를 수 있고, 정답/오답 집계에도 쓰인다.
  const [selectedAnswers, setSelectedAnswers] = useState(() => ({}));
  const selectAnswer = (id, i) => {
    setSelectedAnswers((prev) => ({ ...prev, [id]: i }));
  };

  const { stars, toggleStar, isStarred } = useStars();

  const enriched = useMemo(() => enrichWithTopicPct(questions, statMap), [questions, statMap]);
  // 1차(족보)와 2차(실제 기출 등)가 섞여 있는 문제 풀에서만 필터를 보여준다 — 한 종류뿐이면 굳이 노출하지 않음.
  const stageOptionsAvailable = useMemo(() => new Set(enriched.map(getExamStage)).size > 1, [enriched]);
  const byStage = useMemo(
    () => (stageOptionsAvailable ? filterByExamStage(enriched, stage) : enriched),
    [enriched, stage, stageOptionsAvailable]
  );
  const filtered = useMemo(() => filterByMinPct(byStage, minPct), [byStage, minPct]);
  const byStar = useMemo(() => {
    if (starFilter === '별표 풀기') {
      return filtered.filter(q => stars.includes(q.id));
    }
    return filtered;
  }, [filtered, starFilter, stars]);

  const ordered = useMemo(() => {
    if (!shuffled) return byStar;
    // 문제 순서뿐 아니라 보기 순서(①~④)도 함께 섞는다(문제 유형과 무관하게 항상 적용).
    return shuffle(byStar).map(shuffleOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byStar, shuffled, shuffleSeed]);
  // "참인 보기만 색칠" 버튼은 참/거짓형으로 태깅된 문제가 하나라도 있을 때만 노출한다.
  const hasStatementQuestions = useMemo(() => ordered.some(isStatementQuestion), [ordered]);
  // 문제를 풀고 있을 때(퀴즈 패널이 떠 있는 동안) 툴바에 보여줄 진행 현황 — 현재 필터된 목록(ordered) 기준.
  // 정답 확인을 누르지 않은 문제는 "남은 문항"에 남고, 누른 문제만 고른 보기와 정답을 비교해 정답/오답으로 갈린다
  // (아무 보기도 안 고르고 정답 확인만 누른 경우도 오답으로 집계 — 실제 시험에서 공란과 같은 취급).
  const totalCount = ordered.length;
  const solvedCount = useMemo(() => ordered.filter((q) => revealedIds.has(q.id)).length, [ordered, revealedIds]);
  const remainingCount = totalCount - solvedCount;
  const correctCount = useMemo(
    () => ordered.filter((q) => revealedIds.has(q.id) && selectedAnswers[q.id] === q.answer).length,
    [ordered, revealedIds, selectedAnswers]
  );
  const incorrectCount = solvedCount - correctCount;
  const starredCount = useMemo(() => ordered.filter((q) => stars.includes(q.id)).length, [ordered, stars]);

  // 스크롤을 내려 문제를 풀고 있는 동안에도 진행 현황을 볼 수 있도록, 상단 고정 헤더까지 값을 끌어올린다.
  // 이 패널이 사라지면(다른 화면으로 이동·"문제 접기") 헤더 표시도 함께 사라지도록 언마운트 시 null로 되돌린다.
  const { setProgress } = useQuizProgress();
  useEffect(() => {
    if (questions.length === 0) {
      setProgress(null);
      return undefined;
    }
    setProgress({ total: totalCount, remaining: remainingCount, correct: correctCount, incorrect: incorrectCount, starred: starredCount });
    return () => setProgress(null);
  }, [questions.length, totalCount, remainingCount, correctCount, incorrectCount, starredCount, setProgress]);

  if (questions.length === 0) {
    return <p className="quiz-empty">아직 등록된 연습문제가 없습니다.</p>;
  }

  return (
    <div className="quiz-panel">
      <div className="quiz-toolbar">
        <div className="segment-group">
          <span className="quiz-toolbar-label">출제율</span>
          {PCT_OPTIONS.map((p) => (
            <button
              key={p}
              className={`segment-btn ${minPct === p ? 'active' : ''}`}
              onClick={() => setMinPct(p)}
            >
              {p === 0 ? '전체' : `${p}%+`}
            </button>
          ))}
        </div>
        <div className="segment-group">
          {STAR_OPTIONS.map((s) => (
            <button
              key={s}
              className={`segment-btn ${starFilter === s ? 'active' : ''}`}
              onClick={() => setStarFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        {stageOptionsAvailable && (
          <div className="segment-group">
            <span className="quiz-toolbar-label">차수</span>
            {STAGE_OPTIONS.map((s) => (
              <button
                key={s}
                className={`segment-btn ${stage === s ? 'active' : ''}`}
                onClick={() => setStage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <button
          className="btn-secondary"
          onClick={() => {
            setShuffled(true);
            setShuffleSeed((n) => n + 1);
            // 섞을 때마다 새로 푸는 셈이므로 정답 확인·선택했던 보기를 전부 초기화한다.
            setRevealedIds(new Set());
            setSelectedAnswers({});
          }}
        >
          {shuffled ? '🔀 다시 섞기' : '🔀 섞어서 풀기'}
        </button>
        {shuffled && (
          <button className="btn-ghost" onClick={() => setShuffled(false)}>
            ↕ 원래 순서
          </button>
        )}
        {hasStatementQuestions && (
          <button
            className={`btn-secondary ${showTruth ? 'active' : ''}`}
            onClick={() => setShowTruth((v) => !v)}
          >
            {showTruth ? '참인 보기 색칠 끄기' : '참인 보기만 색칠'}
          </button>
        )}
        <span className="quiz-count">
          전체 {totalCount} · 남은문항 {remainingCount} · 정답 {correctCount} · 오답 {incorrectCount} · ⭐ {starredCount}
        </span>
      </div>

      {/* 카드박스 하나 안에 문제1, 문제2, ... 순서로 나열한다(개별 카드 뒤집기 아님).
          key는 반드시 question.id를 사용한다(배열 인덱스 금지) — 인덱스를 쓰면 셔플 후 자리를
          재사용해 펼침/정답공개 상태가 다른 문제로 새는 버그가 생긴다. */}
      <div className="quiz-box">
        {ordered.map((q, idx) => (
          <QuestionCard
            key={`${q.id}-${starFilter}`}
            question={q}
            number={idx + 1}
            tagLabel={showSourceTag ? q.topicTagLabel : null}
            examLabel={examName || q.examName}
            showTruth={showTruth}
            isStarred={isStarred(q.id)}
            onToggleStar={() => toggleStar(q.id)}
            revealed={revealedIds.has(q.id)}
            onToggleReveal={() => toggleRevealed(q.id)}
            selected={selectedAnswers[q.id] ?? null}
            onSelect={(i) => selectAnswer(q.id, i)}
          />
        ))}
      </div>
    </div>
  );
}
