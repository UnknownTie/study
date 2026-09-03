import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import ContentBlocks from '../components/ContentBlocks';
import Terminal from '../components/Terminal';
import Timer from '../components/Timer';
import {
  findExam,
  getExamRules,
  getExamRounds,
  getQuestionsBySubject,
  getExtraQuestionsBySubject,
} from '../data/loader';
import { buildMockPaper, scoreMockExam } from '../lib/mockExam';
import { buildTimedExamPaper, scoreTimedExam } from '../lib/timedExam';
import { loadHistory, saveHistoryEntry } from '../lib/examHistory';
import { getQuestionText, getOptText } from '../lib/statementShuffle';

const MODE_GRADE_AFTER = 'grade-after'; // 풀고 채점하기
const MODE_EXPLAIN_LIVE = 'explain-live'; // 해설을 보면서 풀기
const MODE_TIMED = 'timed'; // 실전처럼 풀기

export default function MockExamPage() {
  const { examId } = useParams();
  const found = useMemo(() => findExam(examId), [examId]);
  const rules = useMemo(() => getExamRules(examId), [examId]);
  const rounds = useMemo(() => getExamRounds(examId), [examId]);

  const paper = useMemo(() => {
    if (!rules) return null;
    // 실전처럼 풀기(buildTimedExamPaper)와 동일하게 기출 연습문제 풀도 함께 사용한다.
    return buildMockPaper(rules, (subjectId) => [
      ...getQuestionsBySubject(examId, subjectId),
      ...getExtraQuestionsBySubject(examId, subjectId),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, rules]);

  const [mode, setMode] = useState(MODE_GRADE_AFTER);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  // 실전처럼 풀기 전용 상태 — 회차 선택 → 셔플된 응시지 → 타이머 → 채점 → 기록 저장
  const [selectedRound, setSelectedRound] = useState(null);
  const [timedPaper, setTimedPaper] = useState(null);
  const [timedAnswers, setTimedAnswers] = useState({});
  const [timedResult, setTimedResult] = useState(null);
  const [timerKey, setTimerKey] = useState(0); // 회차를 새로 시작할 때마다 타이머를 리셋시키기 위한 key
  const [showHistory, setShowHistory] = useState(false);

  if (!found) return <div className="page">시험을 찾을 수 없습니다.</div>;
  const { exam } = found;
  if (!rules || !paper) {
    return (
      <div className="page">
        <Breadcrumbs crumbs={[{ label: exam.name, to: `/exam/${examId}` }, { label: '가상 모의고사' }]} />
        <p>이 시험은 아직 모의고사 기준(_rules.json)이 등록되지 않았습니다.</p>
      </div>
    );
  }

  function subjectName(subjectId) {
    const s = exam.subjects.find((s) => s.id === subjectId);
    return s ? s.name : subjectId;
  }

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setAnswers({});
    setResult(null);
    if (next !== MODE_TIMED) {
      setShowHistory(false);
      resetTimedRound();
    }
  }

  function selectAnswer(questionId, idx) {
    // 해설을 보면서 풀기 모드는 한 번 고르면 그 문제는 바로 확정(정답/해설 공개)되므로 재선택을 막는다.
    if (mode === MODE_EXPLAIN_LIVE && answers[questionId] !== undefined) return;
    if (mode === MODE_GRADE_AFTER && result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  function submit() {
    setResult(scoreMockExam(paper, answers));
  }

  function startTimedRound(round) {
    const built = buildTimedExamPaper(
      round,
      (subjectId) => getQuestionsBySubject(examId, subjectId),
      (subjectId) => getExtraQuestionsBySubject(examId, subjectId)
    );
    setSelectedRound(round);
    setTimedPaper(built);
    setTimedAnswers({});
    setTimedResult(null);
    setTimerKey((k) => k + 1);
  }

  function resetTimedRound() {
    setSelectedRound(null);
    setTimedPaper(null);
    setTimedAnswers({});
    setTimedResult(null);
  }

  function selectTimedAnswer(questionId, idx) {
    if (timedResult) return;
    setTimedAnswers((prev) => ({ ...prev, [questionId]: idx }));
  }

  function finishTimed(autoSubmitted) {
    if (!timedPaper || timedResult) return;
    const scored = scoreTimedExam(timedPaper, timedAnswers);
    setTimedResult(scored);
    saveHistoryEntry(examId, {
      id: `${Date.now()}`,
      takenAt: new Date().toISOString(),
      roundId: selectedRound.id,
      roundLabel: selectedRound.label,
      totalQuestions: timedPaper.sections.reduce((sum, s) => sum + s.questions.length, 0),
      average: scored.average,
      overallPass: scored.overallPass,
      autoSubmitted,
      sectionResults: scored.sectionResults.map((r) => ({
        subjectId: r.subjectId,
        subjectName: subjectName(r.subjectId),
        correct: r.correct,
        total: r.total,
        score: r.score,
        pass: r.pass,
        skipped: r.skipped,
      })),
    });
  }

  // 해설을 보면서 풀기 모드는 문항 하나하나가 즉시 확정되므로, 전부 답한 시점에 자동으로 최종 채점까지 함께 보여준다.
  const explainLiveAllAnswered =
    mode === MODE_EXPLAIN_LIVE && paper.sections.every((s) => s.questions.every((q) => answers[q.id] !== undefined));
  const liveResult = mode === MODE_EXPLAIN_LIVE && explainLiveAllAnswered ? scoreMockExam(paper, answers) : null;
  const effectiveResult = mode === MODE_GRADE_AFTER ? result : liveResult;

  const history = showHistory ? loadHistory(examId) : [];

  // 실전처럼 풀기: 과목 경계와 무관하게 1번부터 이어지는 문항 번호를 매기기 위해 과목별 시작 번호를 미리 계산해둔다.
  let timedRunningCount = 0;
  const timedSectionsWithStart = timedPaper
    ? timedPaper.sections.map((section) => {
        const startNumber = timedRunningCount + 1;
        timedRunningCount += section.questions.length;
        return { ...section, startNumber };
      })
    : [];

  return (
    <div className="page">
      <Breadcrumbs crumbs={[{ label: exam.name, to: `/exam/${examId}` }, { label: '가상 모의고사' }]} />
      <h1>가상 모의고사 · {exam.name}</h1>

      <div className="segment-group" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={`segment-btn ${mode === MODE_GRADE_AFTER ? 'active' : ''}`}
          onClick={() => switchMode(MODE_GRADE_AFTER)}
        >
          풀고 채점하기
        </button>
        <button
          className={`segment-btn ${mode === MODE_EXPLAIN_LIVE ? 'active' : ''}`}
          onClick={() => switchMode(MODE_EXPLAIN_LIVE)}
        >
          해설을 보면서 풀기
        </button>
        <button className={`segment-btn ${mode === MODE_TIMED ? 'active' : ''}`} onClick={() => switchMode(MODE_TIMED)}>
          실전처럼 풀기
        </button>
        {mode === MODE_TIMED && (
          <button className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => setShowHistory((v) => !v)}>
            기록 {showHistory ? '숨기기' : '보기'}
          </button>
        )}
      </div>

      {mode === MODE_TIMED && showHistory && (
        <div className="mock-notice">
          {history.length === 0 && <p style={{ margin: 0 }}>아직 저장된 응시 기록이 없습니다.</p>}
          {history.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '4px 8px' }}>일시</th>
                  <th style={{ padding: '4px 8px' }}>회차</th>
                  <th style={{ padding: '4px 8px' }}>문항수</th>
                  <th style={{ padding: '4px 8px' }}>평균</th>
                  <th style={{ padding: '4px 8px' }}>결과</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px' }}>{new Date(h.takenAt).toLocaleString()}</td>
                    <td style={{ padding: '4px 8px' }}>{h.roundLabel}</td>
                    <td style={{ padding: '4px 8px' }}>{h.totalQuestions}</td>
                    <td style={{ padding: '4px 8px' }}>{h.average !== null ? h.average.toFixed(1) : '-'}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <span className={`mock-badge ${h.overallPass ? 'pass' : 'fail'}`}>
                        {h.overallPass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {mode !== MODE_TIMED && (
        <div className="mock-notice">
          실제 시험은 {rules.subjects.map((r) => r.questionCount).join('/')}문항이지만, 지금 보유한 연습문제{' '}
          {paper.sections.map((s) => s.availableCount).join('/')}문항으로 모의 진행합니다. 합격 기준(
          {rules.subjects.every((r) => typeof r.passScore === 'number')
            ? `과목별 ${rules.subjects.map((r) => r.passScore).join('/')}점 이상, `
            : '과목별 과락 없이 '}
          평균 {rules.passAverage}점 이상)은 공식 공고 기준으로 재확인이
          필요한 추정값입니다.
          {mode === MODE_EXPLAIN_LIVE && ' 보기를 클릭하면 바로 그 문제의 정답과 해설이 표시됩니다.'}
        </div>
      )}

      {mode !== MODE_TIMED && effectiveResult && (
        <div className="mock-summary">
          <div className={`mock-badge ${effectiveResult.overallPass ? 'pass' : 'fail'}`} style={{ fontSize: '1.2rem' }}>
            {effectiveResult.overallPass ? 'PASS' : 'FAIL'}
          </div>
          <p>전체 평균: {effectiveResult.average !== null ? effectiveResult.average.toFixed(1) : '채점 불가'}점</p>
        </div>
      )}

      {mode !== MODE_TIMED &&
        paper.sections.map((section) => {
          const sectionResult = effectiveResult?.sectionResults.find((r) => r.subjectId === section.subjectId);
          return (
            <div className="mock-section" key={section.subjectId}>
              <div className="mock-section-head">
                <h3>{subjectName(section.subjectId)}</h3>
                {sectionResult && !sectionResult.skipped && (
                  <span className={`mock-badge ${sectionResult.pass ? 'pass' : 'fail'}`}>
                    {sectionResult.correct}/{sectionResult.total} · {sectionResult.score.toFixed(1)}점 ·{' '}
                    {sectionResult.pass ? 'PASS' : 'FAIL'}
                  </span>
                )}
                {sectionResult && sectionResult.skipped && <span className="mock-badge fail">{sectionResult.reason}</span>}
              </div>
              {section.questions.length === 0 && <p>보유한 연습문제가 없어 이 과목은 모의고사에서 제외됩니다.</p>}
              {section.questions.map((q) => {
                const picked = answers[q.id];
                // grade-after: 전체 채점(result) 후에만 공개. explain-live: 그 문제를 고른 즉시 공개.
                const reveal = mode === MODE_GRADE_AFTER ? !!result : picked !== undefined;
                return (
                  <div key={q.id} style={{ marginBottom: 18 }}>
                    <p style={{ fontWeight: 700 }} dangerouslySetInnerHTML={{ __html: getQuestionText(q) }} />
                    {q.code && <Terminal html={q.code} />}
                    <ul className="qopts" style={{ listStyle: 'none', padding: 0 }}>
                      {q.opts.map((opt, i) => {
                        const selected = picked === i;
                        const showCorrect = reveal && i === q.answer;
                        return (
                          <li
                            key={i}
                            onClick={() => selectAnswer(q.id, i)}
                            className={showCorrect ? 'correct' : ''}
                            style={{
                              cursor: reveal ? 'default' : 'pointer',
                              borderColor: selected && !showCorrect ? 'var(--accent)' : undefined,
                              padding: '8px 10px',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              marginBottom: 6,
                            }}
                          >
                            {String.fromCharCode(9312 + i)} {getOptText(opt)} {selected && !reveal ? ' (선택됨)' : ''}
                          </li>
                        );
                      })}
                    </ul>
                    {reveal && (
                      <div className="mock-explain">
                        <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--accent)' }}>
                          정답: {String.fromCharCode(9312 + q.answer)} {getOptText(q.opts[q.answer])}
                        </p>
                        <ContentBlocks content={q.explain} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

      {mode === MODE_GRADE_AFTER && !result && (
        <button className="btn-primary" onClick={submit}>
          채점하기
        </button>
      )}

      {mode === MODE_TIMED && !selectedRound && (
        <div className="mock-notice">
          <p style={{ marginTop: 0 }}>응시할 회차를 선택하세요. 문제는 매번 새로 섞여서 출제됩니다.</p>
          <div className="segment-group" style={{ flexWrap: 'wrap' }}>
            {rounds.map((r) => (
              <button key={r.id} className="segment-btn" onClick={() => startTimedRound(r)}>
                {r.label} ({r.totalQuestions}문항 · {r.timeLimitMinutes}분)
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === MODE_TIMED && selectedRound && timedPaper && (
        <>
          <Timer
            key={timerKey}
            totalSeconds={selectedRound.timeLimitMinutes * 60}
            running={!timedResult}
            onExpire={() => finishTimed(true)}
          />
          <div className="mock-notice">
            <b>{selectedRound.label}</b> · 실제 시험은 {selectedRound.subjects.map((r) => r.questionCount).join('/')}
            문항이지만, 보유 문제 {timedPaper.sections.map((s) => s.availableCount).join('/')}문항 중 셔플하여{' '}
            {timedPaper.sections.map((s) => s.questions.length).join('/')}문항으로 진행합니다.
            {selectedRound.hasSubjectCutoff
              ? ` 합격 기준: 과목별 최소점수 이상 + 평균 ${selectedRound.passAverage}점 이상.`
              : ` 합격 기준: 과목별 과락 없이 평균 ${selectedRound.passAverage}점 이상.`}
            <button className="btn-secondary" style={{ marginLeft: 8 }} onClick={resetTimedRound}>
              다른 회차 선택
            </button>
          </div>

          {timedResult && (
            <div className="mock-summary">
              <div className={`mock-badge ${timedResult.overallPass ? 'pass' : 'fail'}`} style={{ fontSize: '1.2rem' }}>
                {timedResult.overallPass ? 'PASS' : 'FAIL'}
              </div>
              <p>전체 평균: {timedResult.average !== null ? timedResult.average.toFixed(1) : '채점 불가'}점</p>
            </div>
          )}

          {timedSectionsWithStart.map((section) => {
            const sectionResult = timedResult?.sectionResults.find((r) => r.subjectId === section.subjectId);
            return (
              <div className="mock-section" key={section.subjectId}>
                <div className="mock-section-head">
                  <h3>{subjectName(section.subjectId)}</h3>
                  {sectionResult && !sectionResult.skipped && (
                    <span className="mock-badge" style={{}}>
                      {sectionResult.correct}/{sectionResult.total} · {sectionResult.score.toFixed(1)}점
                      {sectionResult.pass !== null ? ` · ${sectionResult.pass ? 'PASS' : 'FAIL'}` : ''}
                    </span>
                  )}
                  {sectionResult && sectionResult.skipped && <span className="mock-badge fail">{sectionResult.reason}</span>}
                </div>
                {section.questions.length === 0 && <p>보유한 문제가 없어 이 과목은 응시지에서 제외되었습니다.</p>}
                {section.questions.map((q, idx) => {
                  const number = section.startNumber + idx;
                  const picked = timedAnswers[q.id];
                  const reveal = !!timedResult;
                  return (
                    <div key={q.id} style={{ marginBottom: 18 }}>
                      <p style={{ fontWeight: 700 }}>
                        {number}. <span dangerouslySetInnerHTML={{ __html: getQuestionText(q) }} />
                      </p>
                      {q.code && <Terminal html={q.code} />}
                      <ul className="qopts" style={{ listStyle: 'none', padding: 0 }}>
                        {q.opts.map((opt, i) => {
                          const selected = picked === i;
                          const showCorrect = reveal && i === q.answer;
                          return (
                            <li
                              key={i}
                              onClick={() => selectTimedAnswer(q.id, i)}
                              className={showCorrect ? 'correct' : ''}
                              style={{
                                cursor: reveal ? 'default' : 'pointer',
                                borderColor: selected && !showCorrect ? 'var(--accent)' : undefined,
                                padding: '8px 10px',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                marginBottom: 6,
                              }}
                            >
                              {String.fromCharCode(9312 + i)} {getOptText(opt)} {selected && !reveal ? ' (선택됨)' : ''}
                            </li>
                          );
                        })}
                      </ul>
                      {reveal && (
                        <div className="mock-explain">
                          <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--accent)' }}>
                            정답: {String.fromCharCode(9312 + q.answer)} {getOptText(q.opts[q.answer])}
                          </p>
                          <ContentBlocks content={q.explain} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {!timedResult && (
            <button className="btn-primary" onClick={() => finishTimed(false)}>
              제출하고 채점하기
            </button>
          )}
        </>
      )}
    </div>
  );
}
