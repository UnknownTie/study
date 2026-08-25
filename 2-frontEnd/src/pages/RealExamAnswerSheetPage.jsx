import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import ContentBlocks from '../components/ContentBlocks';
import '../components/QuestionCard.css';
import { findExam, getRealExamSession } from '../data/loader';
import { getQuestionText, getOptText } from '../lib/statementShuffle';

// 답안지 모드: session.questions가 있으면 문항 원문·보기를 함께 보여주고, 채점 후 해설도 펼쳐볼 수 있다.
// questions가 없는 회차는 예전 방식(번호 + 보기 1~4 버튼만) 그대로 유지한다.
export default function RealExamAnswerSheetPage() {
  const { examId, sessionId } = useParams();
  const found = useMemo(() => findExam(examId), [examId]);
  const session = useMemo(() => getRealExamSession(examId, sessionId), [examId, sessionId]);
  const [picks, setPicks] = useState({});
  const [graded, setGraded] = useState(null);
  const [explainOpen, setExplainOpen] = useState({});
  const questionsByNum = useMemo(() => {
    const map = new Map();
    if (Array.isArray(session?.questions)) {
      for (const q of session.questions) map.set(q.number, q);
    }
    return map;
  }, [session]);

  if (!found) return <div className="page">시험을 찾을 수 없습니다.</div>;
  if (!session) return <div className="page">해당 회차를 찾을 수 없습니다.</div>;
  const { exam } = found;
  const hasFullText = questionsByNum.size > 0;

  function pick(qNum, choice) {
    if (graded) return;
    setPicks((prev) => ({ ...prev, [qNum]: choice }));
  }

  function grade() {
    let correct = 0;
    const wrongNums = [];
    session.answers.forEach((ans, idx) => {
      const qNum = idx + 1;
      if (picks[qNum] === ans) correct++;
      else wrongNums.push(qNum);
    });
    setGraded({ correct, total: session.answers.length, wrongNums });
  }

  function reset() {
    setPicks({});
    setGraded(null);
    setExplainOpen({});
  }

  function toggleExplain(qNum) {
    setExplainOpen((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
  }

  return (
    <div className="page">
      <Breadcrumbs
        crumbs={[
          { label: exam.name, to: `/exam/${examId}` },
          { label: '실제 기출 다시 풀기', to: `/exam/${examId}/real` },
          { label: session.sessionLabel },
        ]}
      />

      <div className="page-title-row">
        <h1>{session.sessionLabel} 답안지</h1>
        <a
          className="btn-secondary"
          href={`/원본기출-비공개/${encodeURIComponent(session.pdfFile)}`}
          target="_blank"
          rel="noreferrer"
        >
          원본 PDF 열기
        </a>
      </div>
      <p className="page-hint">
        {hasFullText
          ? '번호별로 정답이라고 생각하는 보기를 클릭한 뒤 채점하세요. 채점 후 "해설 보기"로 정답과 해설을 확인할 수 있습니다.'
          : '옆에서 원본 PDF를 열어 실제 문제를 읽으면서, 아래 번호별로 정답이라고 생각하는 보기(①~④)를 클릭하세요. 문항 내용은 여기 없습니다 — PDF에서 직접 확인해야 합니다.'}
      </p>

      {graded && (
        <div className="mock-summary">
          <div className={`mock-badge ${graded.correct / graded.total >= 0.6 ? 'pass' : 'fail'}`} style={{ fontSize: '1.2rem' }}>
            {graded.correct} / {graded.total}점 ({((graded.correct / graded.total) * 100).toFixed(1)}%)
          </div>
          {graded.wrongNums.length > 0 && (
            <p>
              틀린 번호: {graded.wrongNums.join(', ')}
              {!hasFullText && ' (원본 PDF에서 해당 번호 문제·해설을 다시 확인하세요)'}
            </p>
          )}
          <button className="btn-secondary" onClick={reset}>
            다시 풀기
          </button>
        </div>
      )}

      {hasFullText ? (
        <div style={{ marginTop: 16 }}>
          {session.answers.map((ans, idx) => {
            const qNum = idx + 1;
            const picked = picks[qNum];
            const q = questionsByNum.get(qNum);
            return (
              <div key={qNum} className="qrow">
                <p className="qtext">
                  <span className="qnumber">{qNum}.</span>{' '}
                  {q ? <span dangerouslySetInnerHTML={{ __html: getQuestionText(q) }} /> : '(문항 정보 없음)'}
                  {q?.pending && <span className="qtag" style={{ marginLeft: 8 }}>원본 PDF 확인 필요</span>}
                </p>
                <ul className="qopts" style={{ listStyle: 'none', padding: 0 }}>
                  {(q ? q.opts : [null, null, null, null]).map((opt, i) => {
                    const choice = i + 1;
                    const isCorrect = graded && choice === ans;
                    const isWrong = graded && picked === choice && choice !== ans;
                    return (
                      <li key={i}>
                        <button
                          onClick={() => pick(qNum, choice)}
                          className="segment-btn"
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderColor: isCorrect ? 'var(--ok)' : picked === choice ? 'var(--accent)' : undefined,
                            background: isCorrect
                              ? 'var(--ok-soft)'
                              : isWrong
                              ? 'var(--fail-soft)'
                              : picked === choice
                              ? 'var(--accent-soft)'
                              : undefined,
                          }}
                        >
                          {String.fromCharCode(9312 + i)} {opt != null ? getOptText(opt) : ''}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {graded && q && (
                  <div className="qcard-actions">
                    <button className="btn-ghost" onClick={() => toggleExplain(qNum)}>
                      {explainOpen[qNum] ? '설명 접기' : '설명 보기'}
                    </button>
                  </div>
                )}
                {graded && q && explainOpen[qNum] && (
                  <div className="qexplain-below">
                    <p className="qanswer">
                      정답: {String.fromCharCode(9312 + (ans - 1))} {getOptText(q.opts[ans - 1])}
                    </p>
                    <ContentBlocks content={q.explain} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          {session.answers.map((ans, idx) => {
            const qNum = idx + 1;
            const picked = picks[qNum];
            const isCorrect = graded && picked === ans;
            return (
              <div
                key={qNum}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: 'var(--card)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{qNum}번</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map((choice) => (
                    <button
                      key={choice}
                      onClick={() => pick(qNum, choice)}
                      className="segment-btn"
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        borderColor:
                          graded && choice === ans
                            ? 'var(--ok)'
                            : picked === choice
                            ? 'var(--accent)'
                            : undefined,
                        background: picked === choice ? (graded ? (isCorrect ? 'var(--ok-soft)' : 'var(--fail-soft)') : 'var(--accent-soft)') : undefined,
                      }}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!graded && (
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={grade}>
          채점하기
        </button>
      )}
    </div>
  );
}
