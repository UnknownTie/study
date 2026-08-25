import './SelectableCardWrapper.css';

// Home 전용 "여러 시험 선택" 모드에서만 Card를 감싸는 얇은 래퍼.
// 선택 모드가 켜져 있을 때 카드 클릭은 오직 체크만 하고, 내부 Card의 onClick(네비게이션)은 호출하지 않는다.
export default function SelectableCardWrapper({ selectMode, selected, onToggle, children }) {
  if (!selectMode) return children;
  return (
    <div
      className={`selectable-wrap ${selected ? 'selected' : ''}`}
      onClickCapture={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <span className="selectable-check">{selected ? '✔' : ''}</span>
      {children}
    </div>
  );
}
