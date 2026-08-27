import { useMemo, useState } from 'react';
import QuestionCard from './QuestionCard';
import { shuffle } from '../lib/shuffle';
import { shuffleStatementOptions, isStatementQuestion } from '../lib/statementShuffle';
import { enrichWithTopicPct, filterByMinPct, filterByExamStage, getExamStage } from '../lib/quizFilters';
import { useStars } from '../lib/useStars';
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
    // 문제 순서뿐 아니라 "옳은/옳지 않은 것을 고르시오"류 문제의 보기 순서(①~④)도 함께 섞는다
    // (태깅 안 된 일반 문제는 shuffleStatementOptions가 그대로 반환하므로 영향 없음).
    return shuffle(byStar).map(shuffleStatementOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byStar, shuffled, shuffleSeed]);
  // "참인 보기만 색칠" 버튼은 참/거짓형으로 태깅된 문제가 하나라도 있을 때만 노출한다.
  const hasStatementQuestions = useMemo(() => ordered.some(isStatementQuestion), [ordered]);

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
            setShuffled((s) => !s || true);
            setShuffleSeed((n) => n + 1);
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
        <span className="quiz-count">{ordered.length}문항</span>
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
          />
        ))}
      </div>
    </div>
  );
}
