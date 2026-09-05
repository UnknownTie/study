import { shuffle } from './shuffle';

// "다음 중 옳은/옳지 않은 것을 고르시오"(혹은 "나머지 셋과 다른 것을 고르시오") 스타일 문제:
// q.q와 opts 각 원소가 { text, answerType|truth } 형태로 태깅되어 있다.
// 일반 문제는 q.q가 문자열, opts 원소도 문자열이므로 이 유형이 아니다(기존 문제는 전혀 영향받지 않음).
// truth/answerType 값: "true"/"false"(참/거짓 진술) 또는 "other"/"some"(나머지 셋과 다른 것 찾기류).
export function isStatementQuestion(q) {
  return (
    typeof q.q === 'object' &&
    q.q !== null &&
    Array.isArray(q.opts) &&
    q.opts.length > 0 &&
    q.opts.every((opt) => typeof opt === 'object' && opt !== null && 'truth' in opt)
  );
}

// 문제 텍스트: 태깅된 문제는 q.q.text, 일반 문제는 q.q 그대로.
export function getQuestionText(q) {
  return typeof q.q === 'string' ? q.q : q.q.text;
}

// 보기 텍스트: 태깅된 문제는 opt.text, 일반 문제는 opt(문자열) 그대로.
export function getOptText(opt) {
  return typeof opt === 'string' ? opt : opt.text;
}

// order(원래 인덱스들을 새 순서로 나열한 배열)에 맞춰 opts를 재배열하고 answer를 새 위치로 재계산한다.
// 문자열 보기든({opt: "..."}) 태깅된 보기든({text, truth}) 순서만 바꿀 뿐 각 원소 자체는 건드리지
// 않으므로 두 형태 모두 동일하게 동작한다 — 형식과 무관하게 항상 적용된다.
export function applyOptionOrder(q, order) {
  return {
    ...q,
    opts: order.map((i) => q.opts[i]),
    answer: order.indexOf(q.answer),
  };
}

// opts를 무작위로 섞는다(매 호출마다 새 순서). 고정된 순서를 유지하려면 applyOptionOrder를 직접 쓴다.
export function shuffleOptions(q) {
  return applyOptionOrder(q, shuffle(q.opts.map((_, i) => i)));
}
