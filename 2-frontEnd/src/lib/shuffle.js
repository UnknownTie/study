// Fisher-Yates 셔플. QuizPanel과 MockExamPage가 공용으로 재사용한다(중복 구현 금지).
export function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
