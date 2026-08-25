import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { findExam, getRealExamSessions } from '../data/loader';

// 실제 기출 회차 목록. questions가 있는 회차는 문항 원문·보기·해설을 함께 보여주고,
// 없는 회차는 예전처럼 "원본 PDF 열기"로 실제 파일을 직접 연다(로컬 전용, gitignore 처리됨).
export default function RealExamsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const found = useMemo(() => findExam(examId), [examId]);
  const sessions = useMemo(() => getRealExamSessions(examId), [examId]);

  if (!found) return <div className="page">시험을 찾을 수 없습니다.</div>;
  const { exam } = found;

  return (
    <div className="page">
      <Breadcrumbs crumbs={[{ label: exam.name, to: `/exam/${examId}` }, { label: '실제 기출 다시 풀기' }]} />
      <h1>실제 기출 다시 풀기 · {exam.name}</h1>
      <p className="page-hint">
        문항을 고르면 정답 확인 후 원문과 해설을 볼 수 있습니다(일부 문항은 원본 PDF의 그림·박스 설명이 아직 반영되지
        않아 "원본 PDF 확인 필요" 표시가 붙습니다). "원본 PDF 열기"로 실제 지면도 함께 확인할 수 있습니다.
      </p>

      {sessions.length === 0 && <p>등록된 회차가 없습니다.</p>}

      <div className="grid-auto-fit">
        {sessions.map((s) => (
          <div key={s.id} className="card" style={{ cursor: 'default' }}>
            <h3 className="card-title">{s.sessionLabel}</h3>
            <p className="card-note">
              총 {s.answers.length}문항
              {s.questions && ` · 원문 ${s.questions.filter((q) => !q.pending).length}문항 확보`}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                className="btn-secondary"
                href={`/원본기출-비공개/${encodeURIComponent(s.pdfFile)}`}
                target="_blank"
                rel="noreferrer"
              >
                원본 PDF 열기
              </a>
              <button className="btn-primary" onClick={() => navigate(`/exam/${examId}/real/${s.id}`)}>
                답안지로 풀기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
