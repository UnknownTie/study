// 데이터 로더 — 이 파일만 디스크(글롭)를 직접 읽는다. UI 컴포넌트는 여기서 나온 값만 사용한다.
// 판별 규칙: 파일명이 '_'로 시작하면 구조/메타 파일(_meta, _rules), 그 외는 전부 유형(topic) leaf 콘텐츠.

const contentFiles = import.meta.glob('./content/**/*.json', { eager: true });
const questionFiles = import.meta.glob('./questions/**/*.json', { eager: true });
const statsFiles = import.meta.glob('./stats/**/*.json', { eager: true });
// 유형(topicId)에 종속되지 않는 별도 연습문제 풀 — 출제율 통계와 무관하게 문항수를 채우기 위한 용도.
// 경로: questions-extra/categoryId/examId/subjectId.json (유형 단계 없음)
const extraQuestionFiles = import.meta.glob('./questions-extra/**/*.json', { eager: true });
// 실제 기출 회차의 "정답 번호만"(사실 데이터, 문항 원문 없음) — content/와 완전히 분리된 별도 디렉터리라 위 글롭과 안 겹친다.
// 원본 PDF 자체는 이 저장소(git 대상)에 없고, gitignore 처리된 public/원본기출-비공개/ 에서만 로컬로 열람한다.
const realExamFiles = import.meta.glob('./realexams/**/*.json', { eager: true });
// 위 realexams/와 별개로, 원본 PDF에서 추출한 문항 원문·보기·해설(저작권 있는 크라우드소싱 해설 대신 직접 작성).
// 이 데이터도 realexams/**만큼 항상 존재하지는 않으므로(시험/회차별 선택적), glob 결과가 비어 있으면 그냥 무시한다.
// 파일 자체는 gitignore 처리되어 로컬에만 존재한다(realexams-full/).
const realExamFullFiles = import.meta.glob('./realexams-full/**/*.json', { eager: true });

function unwrap(mod) {
  return mod && mod.default !== undefined ? mod.default : mod;
}

function segmentsOf(key, prefix) {
  return key.slice(prefix.length).replace(/\.json$/, '').split('/');
}

// ---------- 1) content/ 파싱: 분류 > 시험 > 과목 > 유형 트리 조립 ----------
const categories = new Map();

function ensureCategory(id) {
  if (!categories.has(id)) categories.set(id, { id, name: id, exams: new Map() });
  return categories.get(id);
}
function ensureExam(cat, id) {
  if (!cat.exams.has(id)) cat.exams.set(id, { id, name: id, note: '', rules: null, subjects: new Map() });
  return cat.exams.get(id);
}
function ensureSubject(exam, id) {
  if (!exam.subjects.has(id))
    exam.subjects.set(id, { id, name: id, note: '', order: null, concepts: [], example: null, topics: new Map() });
  return exam.subjects.get(id);
}

for (const [key, mod] of Object.entries(contentFiles)) {
  const data = unwrap(mod);
  const segs = segmentsOf(key, './content/');
  const last = segs[segs.length - 1];

  if (last.startsWith('_')) {
    if (segs.length === 2 && last === '_meta') {
      ensureCategory(segs[0]).name = data.name;
    } else if (segs.length === 3 && last === '_meta') {
      const exam = ensureExam(ensureCategory(segs[0]), segs[1]);
      exam.name = data.name;
      exam.note = data.note || '';
    } else if (segs.length === 3 && last === '_rules') {
      ensureExam(ensureCategory(segs[0]), segs[1]).rules = data;
    } else if (segs.length === 4 && last === '_meta') {
      const exam = ensureExam(ensureCategory(segs[0]), segs[1]);
      const subject = ensureSubject(exam, segs[2]);
      subject.name = data.name;
      subject.note = data.note || '';
      // order: 과목 카드가 나열되는 순서 (작은 값이 먼저). 없으면 맨 뒤로 밀리고 id 알파벳순으로 정렬됨.
      subject.order = typeof data.order === 'number' ? data.order : null;
      // 유형(topic) 단위 개념 정리가 없는 과목(예: 1차)을 위한 과목 단위 설명 — topic.concepts/example과 동일한 형태.
      subject.concepts = data.concepts || [];
      subject.example = data.example ?? null;
    }
    // 그 외 언더스코어 깊이는 알려진 형식이 아니므로 무시 (조용히 스킵)
    continue;
  }

  // 유형(topic) leaf: [categoryId, examId, subjectId, topicId]
  const [categoryId, examId, subjectId, topicId] = segs;
  const exam = ensureExam(ensureCategory(categoryId), examId);
  const subject = ensureSubject(exam, subjectId);
  subject.topics.set(topicId, {
    id: topicId,
    name: data.name,
    concepts: data.concepts || [],
    example: data.example ?? null,
  });
}

// ---------- 2) stats/ 파싱: 시험별 회차 문항수를 examKey(categoryId::examId)로 그룹 ----------
const statsByExam = new Map(); // examKey -> [{topicId:count}, ...] (회차별)

for (const [key, mod] of Object.entries(statsFiles)) {
  const data = unwrap(mod);
  const segs = segmentsOf(key, './stats/');
  const [categoryId, examId] = segs; // segs[2]는 회차 파일명(예: 2023-03), 내용은 필요 없음
  const examKey = `${categoryId}::${examId}`;
  if (!statsByExam.has(examKey)) statsByExam.set(examKey, []);
  statsByExam.get(examKey).push(data.counts || {});
}

function computeExamStats(categoryId, examId) {
  const sessions = statsByExam.get(`${categoryId}::${examId}`) || [];
  const sessionCount = sessions.length;
  const topicCounts = {};
  for (const session of sessions) {
    for (const [topicId, n] of Object.entries(session)) {
      topicCounts[topicId] = (topicCounts[topicId] || 0) + n;
    }
  }
  const examTotal = Object.values(topicCounts).reduce((a, b) => a + b, 0);
  return { sessionCount, topicCounts, examTotal };
}

// ---------- 3) 트리 확정 + 통계를 매번 계산해서 붙여넣기 (loader.js 밖으로 이 계산을 빼지 않음: 트리 자체의 필수 요소이므로) ----------
function buildTree() {
  const catList = [];
  for (const cat of categories.values()) {
    const examList = [];
    for (const exam of cat.exams.values()) {
      const { sessionCount, topicCounts, examTotal } = computeExamStats(cat.id, exam.id);

      // order가 있는 과목이 먼저(오름차순), order가 없으면 맨 뒤로 밀려서 id 알파벳순으로 정렬됨.
      const subjectsSorted = [...exam.subjects.values()].sort((a, b) => {
        const oa = a.order ?? Number.MAX_SAFE_INTEGER;
        const ob = b.order ?? Number.MAX_SAFE_INTEGER;
        if (oa !== ob) return oa - ob;
        return a.id.localeCompare(b.id);
      });

      const subjectList = [];
      for (const subject of subjectsSorted) {
        const topicList = [];
        let subjectCount = 0;
        for (const topic of subject.topics.values()) {
          const count = topicCounts[topic.id] || 0;
          subjectCount += count;
          const pct = examTotal > 0 ? (count / examTotal) * 100 : 0;
          const avg = sessionCount > 0 ? count / sessionCount : 0;
          topicList.push({ ...topic, stat: { count, total: examTotal, pct, avg } });
        }
        const subjectPct = examTotal > 0 ? (subjectCount / examTotal) * 100 : 0;
        subjectList.push({
          id: subject.id,
          name: subject.name,
          note: subject.note,
          concepts: subject.concepts,
          example: subject.example,
          stat: { count: subjectCount, total: examTotal, pct: subjectPct },
          topics: topicList,
        });
      }

      examList.push({
        id: exam.id,
        name: exam.name,
        note: exam.note,
        rules: exam.rules,
        stat: { count: examTotal, total: examTotal, pct: examTotal > 0 ? 100 : 0, sessionCount },
        subjects: subjectList,
      });
    }
    catList.push({ id: cat.id, name: cat.name, exams: examList });
  }
  return { categories: catList };
}

const TREE = buildTree();

// ---------- 4) questions/ 파싱: 평탄화된 배열 (원본 그대로 + 내부 조인용 필드만 추가, mutate 없음) ----------
const allQuestions = [];
for (const [key, mod] of Object.entries(questionFiles)) {
  const data = unwrap(mod);
  const segs = segmentsOf(key, './questions/');
  const [categoryId, examId, subjectId, topicId] = segs;
  for (const q of data) {
    allQuestions.push({ ...q, categoryId, examId, subjectId, topicId });
  }
}

// ---------- 4-1) questions-extra/ 파싱: 유형에 안 묶인 연습문제 풀 (평탄화, subjectId까지만) ----------
const allExtraQuestions = [];
for (const [key, mod] of Object.entries(extraQuestionFiles)) {
  const data = unwrap(mod);
  const segs = segmentsOf(key, './questions-extra/');
  const [categoryId, examId, subjectId] = segs;
  for (const q of data) {
    allExtraQuestions.push({ ...q, categoryId, examId, subjectId, topicId: null });
  }
}

export function getExtraQuestionsBySubject(examId, subjectId) {
  return allExtraQuestions.filter((q) => q.examId === examId && q.subjectId === subjectId);
}

export function getExtraQuestionsByExam(examId) {
  return allExtraQuestions.filter((q) => q.examId === examId);
}

// ---------- 5) exports ----------
export function getTree() {
  return TREE;
}

export function getQuestionsByTopic(examId, subjectId, topicId) {
  return allQuestions.filter(
    (q) => q.examId === examId && q.subjectId === subjectId && q.topicId === topicId
  );
}

export function getQuestionsBySubject(examId, subjectId) {
  return allQuestions.filter((q) => q.examId === examId && q.subjectId === subjectId);
}

export function getQuestionsByExam(examId) {
  return allQuestions.filter((q) => q.examId === examId);
}

export function getQuestionsByExams(examIds) {
  const set = new Set(examIds);
  return allQuestions.filter((q) => set.has(q.examId));
}

export function getAllQuestions() {
  return allQuestions;
}

export function findExam(examId) {
  for (const cat of TREE.categories) {
    for (const exam of cat.exams) {
      if (exam.id === examId) return { category: cat, exam };
    }
  }
  return null;
}

export function findSubject(examId, subjectId) {
  const found = findExam(examId);
  if (!found) return null;
  const subject = found.exam.subjects.find((s) => s.id === subjectId);
  return subject ? { ...found, subject } : null;
}

export function findTopic(examId, subjectId, topicId) {
  const found = findSubject(examId, subjectId);
  if (!found) return null;
  const topic = found.subject.topics.find((t) => t.id === topicId);
  return topic ? { ...found, topic } : null;
}

export function getExamRules(examId) {
  const found = findExam(examId);
  return found ? found.exam.rules : null;
}

// 1차/2차처럼 문항수·시간·과락 유무가 다른 회차 구성이 있으면 _rules.json의 rounds 배열로 제공한다.
// rounds가 없는 시험은 getExamRules()의 값 하나를 "기본 회차"로 감싸서 반환한다.
export function getExamRounds(examId) {
  const rules = getExamRules(examId);
  if (!rules) return [];
  if (Array.isArray(rules.rounds) && rules.rounds.length > 0) return rules.rounds;
  return [
    {
      id: 'default',
      label: '기본',
      totalQuestions: rules.totalQuestions,
      timeLimitMinutes: rules.timeLimitMinutes,
      hasSubjectCutoff: true,
      passAverage: rules.passAverage,
      subjects: rules.subjects,
    },
  ];
}

export function getTopicStatMap(examId) {
  const found = findExam(examId);
  const map = {};
  if (!found) return map;
  for (const subject of found.exam.subjects) {
    for (const topic of subject.topics) {
      map[topic.id] = topic.stat;
    }
  }
  return map;
}

// ---------- 6) realexams/ 파싱: 회차별 "정답 번호만"(사실 데이터) ----------
const realExamSessionsByExam = new Map(); // examKey(categoryId::examId) -> [{id, sessionLabel, pdfFile, answers}]

for (const [key, mod] of Object.entries(realExamFiles)) {
  const data = unwrap(mod);
  const segs = segmentsOf(key, './realexams/');
  const [categoryId, examId] = segs;
  const examKey = `${categoryId}::${examId}`;
  if (!realExamSessionsByExam.has(examKey)) realExamSessionsByExam.set(examKey, []);
  realExamSessionsByExam.get(examKey).push(data);
}

// ---------- 6-1) realexams-full/ 파싱: (선택적) 회차별 문항 원문·보기·해설 — sessionId(파일명) 기준으로만 매칭 ----------
const realExamFullBySessionId = new Map(); // sessionId(예: "2023-03") -> { id, questions }

for (const [key, mod] of Object.entries(realExamFullFiles)) {
  const data = unwrap(mod);
  const segs = segmentsOf(key, './realexams-full/');
  const sessionId = segs[segs.length - 1];
  realExamFullBySessionId.set(sessionId, data);
}

export function getRealExamSessions(examId) {
  const found = findExam(examId);
  if (!found) return [];
  const list = realExamSessionsByExam.get(`${found.category.id}::${examId}`) || [];
  return [...list]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((session) => {
      const full = realExamFullBySessionId.get(session.id);
      return full ? { ...session, questions: full.questions } : session;
    });
}

export function getRealExamSession(examId, sessionId) {
  return getRealExamSessions(examId).find((s) => s.id === sessionId) || null;
}
