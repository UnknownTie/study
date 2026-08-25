import './Card.css';

// 시험(Home)·과목(Exam)·유형(Subject) 카드가 전부 이 컴포넌트 하나를 공유한다.
// 선택 모드(체크박스) 같은 Home 전용 기능은 이 컴포넌트에 넣지 않고, HomePage가 감싸는 SelectableCardWrapper에서 처리한다.
export default function Card({ title, note, stat, exampleCount, accentVar = '--accent', onClick }) {
  return (
    <div className="card" style={{ '--card-accent': `var(${accentVar})` }} onClick={onClick}>
      {stat && <div className="card-ribbon">{stat.pct.toFixed(1)}%</div>}
      <h3 className="card-title">{title}</h3>
      {note && <p className="card-note">{note}</p>}
      {stat && (
        <>
          <div className="stat-bar-track">
            <div className="stat-bar-fill" style={{ width: `${stat.pct}%`, background: `var(${accentVar})` }} />
          </div>
          <div className="card-stat-label">
            {stat.count}문항 / {stat.total}문항 · 출제 비율 {stat.pct.toFixed(1)}%
          </div>
        </>
      )}
      {exampleCount !== undefined && <div className="card-example-label">예제 {exampleCount}문항</div>}
    </div>
  );
}
