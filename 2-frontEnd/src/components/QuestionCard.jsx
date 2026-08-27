import { useState } from 'react';
import ContentBlocks from './ContentBlocks';
import { isStatementQuestion, getQuestionText, getOptText } from '../lib/statementShuffle';
import './QuestionCard.css';

// 시험명 칩 색상 팔레트 — 시험(examLabel) 이름을 해시해서 항상 같은 파스텔 색이 배정되게 한다.
// 지금은 시험이 하나뿐이라 늘 같은 색이 나오지만, 나중에 시험이 늘어나면 자동으로 서로 다른
// 색이 배정되어 시험별 색인 구분이 된다(하드코딩 없이).
const CHIP_PALETTE = [
  { bg: '#FFE9A8', fg: '#8a6d1d' },
  { bg: '#BFEEDD', fg: '#1f6f56' },
  { bg: '#FBD5E0', fg: '#9c3f5c' },
  { bg: '#CFE3FA', fg: '#2f5f96' },
  { bg: '#E3D9FA', fg: '#5b4693' },
];
function chipColor(label) {
  if (!label) return CHIP_PALETTE[0];
  let sum = 0;
  for (let i = 0; i < label.length; i += 1) sum += label.charCodeAt(i);
  return CHIP_PALETTE[sum % CHIP_PALETTE.length];
}

// 카드박스 안의 문제 한 줄: 문제+보기 아래로 해설이 바로 펼쳐진다(뒤집기 없음).
// showTruth(참인 보기만 색칠)는 QuizPanel 툴바의 전역 토글로, 카드 전체에 일괄 적용된다(문제별 토글 아님).
export default function QuestionCard({ question, tagLabel, examLabel, number, showTruth = false, isStarred, onToggleStar }) {
  const [revealed, setRevealed] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const chip = examLabel ? chipColor(examLabel) : null;
  const statementQ = isStatementQuestion(question);

  return (
    <div className="qrow">
      {(chip || tagLabel) && (
        <div className="qrow-head">
          {chip && (
            <span className="qexam-chip" style={{ background: chip.bg, color: chip.fg }}>
              {examLabel}
            </span>
          )}
          {tagLabel && <span className="qtag">{tagLabel}</span>}
        </div>
      )}
      <p className="qtext">
        <button className={`btn-ghost ${isStarred ? 'starred' : ''}`} onClick={onToggleStar}>
          {isStarred ? '★ ' : '☆ '}
        </button>
        <span className="qnumber">문제{number}.</span>{' '}
        <span dangerouslySetInnerHTML={{ __html: getQuestionText(question) }} />
      </p>
      <ul className="qopts">
        {question.opts.map((opt, i) => {
          const classes = [];
          if (revealed && i === question.answer) classes.push('correct');
          // "참인 보기만 색칠"은 truth 라벨이 정확히 "true"인 보기만 강조한다(other/some/false는 대상 아님).
          if (showTruth && statementQ && opt.truth === 'true') classes.push('truth');
          return (
            <li key={i} className={classes.join(' ')}>
              {String.fromCharCode(9312 + i)} {getOptText(opt)}
            </li>
          );
        })}
      </ul>
      <div className="qcard-actions">

        <button className="btn-secondary" onClick={() => setRevealed(true)}>
          정답 확인
        </button>
        <button className="btn-ghost" onClick={() => setExplainOpen((v) => !v)}>
          {explainOpen ? '설명 접기' : '설명 보기'}
        </button>
      </div>
      {explainOpen && (
        <div className="qexplain-below">
          <p className="qanswer">
            정답: {String.fromCharCode(9312 + question.answer)} {getOptText(question.opts[question.answer])}
          </p>
          <ContentBlocks content={question.explain} />
        </div>
      )}
    </div>
  );
}
