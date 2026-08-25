# 개인 공부정리 허브 (React) — 데이터 구조 개편 + 카드뒤집기 퀴즈

## Context

`C:\proj2_\study`에 "공부/정리 내용을 모아두는" 개인 사이트를 React(Vite)로 만드는 중이다. 기존 HTML 프로토타입(`리눅스정리.html`, `리눅스_기출분석_트리.html`)에서 만든 콘텐츠(13개 유형별 개념 설명·터미널 예제, 45개 자체 제작 연습문제)를 그대로 재사용하되, 구조를 아래처럼 바꾼다:

1. **분류(카테고리) > 시험 > 과목 > 유형** 4단계 트리를 `data/` 디렉토리 자체의 폴더 구조로 그대로 반영한다 (JSON 파일 하나에 다 넣지 않는다).
2. **문제(quiz)는 콘텐츠 트리에서 완전히 분리**해서 별도 디렉토리에 저장하고, 태그(해시태그 문자열)로 콘텐츠와 "느슨하게" 연결한다 — 나중에 다른 시험(예: 네트워크관리사2급)이 추가되거나, 같은 유형 태그를 여러 시험이 공유하게 되어도 문제 파일만 추가하면 조합 가능하게.
3. **출제비율(%)은 고정값으로 박제하지 않고, 회차별 문항수 메타데이터에서 매번 계산**한다 — 회차가 늘어나거나 다른 시험이 추가돼도 숫자가 자동으로 갱신되도록.
4. 문제 UI는 **카드 뒤집기**: 앞면=문제(4지선다 + 정답확인), 뒷면=해설. 앞면에서 "설명 보기"→뒷면, 뒷면에서 "문제 보기"→앞면. 여러 문제를 한 화면에 묶어서 볼 수도 있고, "섞어서 풀기" 토글로 순서를 랜덤화해서 풀 수도 있어야 한다.
5. **시험이 나중에 추가돼도(예: 네트워크관리사2급) 코드 수정 없이 자동으로 목차에 나타나야 한다** — 폴더/파일만 추가하면 끝나도록 하드코딩된 목록을 두지 않는다.
6. **목차에서 시험을 여러 개 중복 선택**해서, 선택한 시험들의 문제를 한꺼번에 묶어 풀 수 있어야 한다 (예: 리눅스마스터2급 + 네트워크관리사2급 동시 선택 → 두 시험 문제가 섞인 QuizPanel).
7. **QuizPanel에 출제율(%) 하한 필터**를 둬서, 예를 들어 "출제율 5% 이상"만 골라 풀 수 있어야 한다 (자주 나오는 유형만 집중 연습).
8. **시험별 특성(합격 기준)을 관리하는 전용 파일**을 따로 둔다 — 과목별 최저점수, 합격 평균점수, 과목별 문항수 등.
9. 이 기준을 바탕으로 **가상 모의고사**를 볼 수 있어야 한다 — 보유한 연습문제 풀에서 과목 비율대로 뽑아 응시 → 채점 → 과목별 최저점수·평균점수 기준으로 합격/불합격 판정.
10. 개념 설명(concepts)/유형 예제(example)/문제 해설(explain)에 **텍스트뿐 아니라 이미지, 쉘 명령어+결과 블록**도 섞어 넣을 수 있는 구조로 확장한다 (지금까지는 explain이 순수 HTML 문자열 하나였음).

이미 진행된 것(재사용): Vite+React 스캐폴드 생성 완료, `react-router-dom` 설치 완료, `1-rules/프로젝트/2-소규모.md` 규칙에 따른 폴더 스캐폴드(`0-docs/1-configs/2-frontEnd/4-data/5-rules/deploy/logs`) 일부 생성 완료. `content.json`(단일 파일, quiz 제거된 상태)이 임시로 존재하는데 이번 작업에서 디렉토리 구조로 쪼개고 삭제한다.

## 디렉토리 구조 (data)

`2-frontEnd/src/data/` 아래를 분류 구조 그대로 미러링:

```
data/
  content/
    it-cert/                              # 분류
      _meta.json                          # {"name":"IT 자격증"}
      linux-master-2/                     # 시험
        _meta.json                        # {"name":"리눅스마스터2급","note":"...(비고)..."}  ※ stat 없음 — stats/에서 계산
        _rules.json                       # 시험 특성: {"totalQuestions":80,"timeLimitMinutes":?,"passAverage":60,"subjects":[{"subjectId":"operation-management","questionCount":48,"passScore":40},{"subjectId":"application","questionCount":32,"passScore":40}]}  ※ 아래 참고 (파일명 앞에 _ 붙임 — 이유는 loader.js 절 참고)
        operation-management/             # 과목 (1과목)
          _meta.json                      # {"name":"1과목: 리눅스 운영 및 관리","note":"..."}
          file-permission.json            # 유형: {"name":..,"concepts":[...],"example":"..."}  ※ stat 없음
          filesystem-disk.json
          shell-login.json
          process-control.json
          text-editor.json
          package-management.json
          compression-archive.json
          peripheral-multimedia.json
        application/                      # 과목 (2과목)
          _meta.json
          x-window-desktop.json
          applications.json
          virtualization-cloud.json
          distro-embedded.json
          network-basics.json
  questions/
    it-cert/linux-master-2/operation-management/file-permission.json   # 배열: [{tags:[...], q, opts, answer, explain}, ...]
    ... (content/ 와 동일 경로로 13개 유형 파일 미러링)
  stats/
    it-cert/linux-master-2/
      2023-03.json      # {"counts": {"file-permission":4, "filesystem-disk":8, ..., "network-basics":20}}
      2023-06.json
      2023-09.json
      2023-12.json
  loader.js        # import.meta.glob으로 위 파일들을 읽어 트리 + 평탄화된 문제 배열 + 계산된 통계를 만드는 유일한 진입점
```

- `_meta.json`은 폴더(분류/시험/과목) 레벨의 이름·비고(note)만 담는다 (숫자 통계는 여기 없음).
- 유형(topic) leaf 파일은 `_meta.json`이 아니라 자기 이름 그대로의 `.json` (예: `file-permission.json`) — 폴더 안의 파일명이 곧 유형 id다.
- `questions/`는 `content/`와 **동일한 경로 구조**를 그대로 미러링하되, 각 유형 파일 안의 문제 객체마다 `tags` 배열(예: `["리눅스마스터2급","1과목: 리눅스 운영 및 관리","파일 및 디렉터리 권한 관리"]`)을 넣어 향후 다른 분류/시험이 같은 태그를 재사용해 문제를 조합할 수 있게 한다.
- `stats/`는 **실제 기출 회차별로 유형(topicId)당 몇 문항이 나왔는지 개수만** 담은 파일이다 (문항 원문은 없음 — 저작권 문제 없이 회차를 계속 누적 가능). 리눅스마스터2급은 2023년 4개 회차(03/06/09/12) 파일로 시작하고, 각 회차 파일은 `{counts: {topicId: 문항수, ...}}` 형태. **실행 단계에서 기출 PDF 4개를 다시 회차별로 정확히 재분류**해서(지금까지는 4회분을 합친 총계만 갖고 있고, 회차별 분해는 아직 없음) 이 4개 파일의 숫자를 채워 넣는다.
- `_rules.json`(시험별 특성, 신규): 과목별 문항수·최저점수, 합격 평균점수, (알면) 시험시간을 담아 모의고사 채점에 사용한다. **주의**: 정확한 공식 합격기준 수치(과목당 40점/평균 60점 등은 일반적인 KAIT 자격증 패턴을 참고한 기본값 추정치)는 제가 확정적으로 단언할 수 없는 부분이라, 실행 단계에서 사용자가 실제 공고문 기준으로 값을 확인·수정할 수 있도록 필드만 만들어두고 기본값은 "확인 필요" 주석과 함께 넣는다.
- **`stats/`·`_rules.json`이 유형별로 안 쪼개지고 시험(exam) 폴더 바로 아래에 있는 것은 의도적**이다: `content/`·`questions/`는 "유형 단위" 데이터라 유형별 파일이 자연스럽지만, 회차 통계는 "시험 단위"(회차 하나 = 13개 유형 숫자를 한 파일에), 합격기준도 "시험 전체"에 적용되는 값이라 유형별로 쪼개면 오히려 부자연스럽다. 미러링 규칙은 "데이터의 자연스러운 단위를 따른다"이지 "무조건 leaf까지 4단 폴더를 만든다"가 아니다.

### loader.js 동작
- **판별 규칙은 "언더스코어로 시작하는 파일명 = 구조/메타 파일, 그 외 = 유형(topic) leaf 콘텐츠" 하나로 통일**한다 (길이 기반 분기 금지 — `_meta.json`뿐 아니라 `_rules.json` 등 앞으로 늘어날 특수 파일도 같은 규칙으로 자동 처리되게). `import.meta.glob('./content/**/*.json', {eager:true})` 하나로 content 전체를 긁은 뒤, 각 파일을 basename이 `_`로 시작하면 `parseMetaPath()`(분류/시험/과목 메타 또는 시험 rules로 세그먼트 개수에 따라 분기), 아니면 `parseTopicPath()`(유형 leaf)로 나눠 처리한다.
- `import.meta.glob('./questions/**/*.json', {eager:true})` — 유형별 문제 배열
- `import.meta.glob('./stats/**/*.json', {eager:true})` — 시험별 회차 문항수 메타데이터
- 파일 경로(`categoryId/examId/subjectId/topicId`)를 파싱해 중첩 트리(`{categories:[{id,name,exams:[{id,name,note,subjects:[{id,name,note,topics:[{id,name,concepts,example}]}]}]}]}`)를 조립한다. **트리 노드의 표시용 `id`는 폴더/파일명 그대로 쓰지만(URL에 그대로 노출), questions/stats 조회 등 내부 조인에 쓰는 키는 항상 `examId::subjectId::topicId` 형태의 합성키로 네임스페이스한다** — 나중에 다른 시험이 같은 폴더명(예: 두 시험 다 `network-basics`)을 써도 서로 안 섞이게.
- **통계 계산**: 해당 exam의 모든 `stats/.../*.json`(회차) 파일을 합산 → `topicCount = Σ(회차별 counts[topicId])`, `examTotal = Σ(모든 topicCount)`, `sessionCount = 회차 파일 개수`. 이 값들로 `topic.pct = topicCount/examTotal*100`, `topic.avg = topicCount/sessionCount`, `subject.count/pct`는 하위 topic 합산으로 매번 즉석 계산 — 트리를 조립하면서 각 노드에 `stat:{count,total,pct,avg}`를 동적으로 붙여 넣는다.
- 문제는 평탄화된 배열로 만들어 각 문제에 `topicId/subjectId/examId/categoryId`(내부 조인용, robust)와 원본 `tags`(휴먼/향후 확장용)를 함께 보관한다 — 여기까지가 loader.js의 역할이며, 출제율(pct)은 붙이지 않는다(아래 참고).
- export: `getTree()`(통계 포함, 목차/카드가 여기서 시험 목록을 그대로 뽑아 쓰므로 새 시험 폴더 추가만으로 자동 반영됨), `getQuestionsByTopic(examId, subjectId, topicId)`, `getQuestionsBySubject(examId, subjectId)`, `getQuestionsByExam(examId)`, `getQuestionsByExams(examIds[])`(다중 시험 결합용, 내부적으로 examId별 결과를 합침), `getAllQuestions()`, `getExamRules(examId)`(`_rules.json`이 없으면 null → 모의고사 버튼 자체를 숨김), `getTopicStatMap(examId)`(topicId→{count,pct,avg} 조회용, 아래 lib에서 사용). *(getQuestionsByTopic/BySubject는 examId를 명시적으로 받아 위 합성키 네임스페이스와 일치시킨다 — topicId 하나만으로는 호출 불가.)*
- **loader.js는 questions 객체를 직접 변형(mutate)하지 않는다** — `questions/`에서 읽은 원본과 `stats/`에서 계산한 통계는 로더 안에서 암묵적으로 섞지 않고, 각각 독립된 getter로만 내보낸다. 둘을 결합해야 하는 지점(예: 문제에 출제율을 붙여 필터링)은 아래 `lib/quizFilters.js`에서 명시적으로 처리한다 — "이 값이 어디서 왔는지" 항상 추적 가능하게.

### src/lib/ (순수 로직, React 없음 — 데이터/기능 분리의 핵심)
- `shuffle.js` — Fisher-Yates 셔플 함수 하나. QuizPanel과 MockExamPage 둘 다 이 함수만 재사용(중복 구현 금지).
- `quizFilters.js` — `enrichWithTopicPct(questions, statMap)`(문제 배열 + getTopicStatMap 결과를 받아 각 문제에 topicPct를 붙인 새 배열을 반환, 원본 배열/객체는 변경하지 않음), `filterByMinPct(questions, minPct)`.
- `mockExam.js` — `buildMockPaper(examRules, questionsBySubject)`(과목별 min(questionCount, 보유수)만큼 셔플 추출), `scoreMockExam(paper, answers, examRules)`(과목별 점수 계산 + passScore/passAverage 판정 결과 객체 반환). 둘 다 순수 함수(입력→출력, DOM/React 접근 없음)라 MockExamPage.jsx는 호출만 한다.

## 컴포넌트/페이지

`2-frontEnd/src/`
```
components/
  Card.jsx / CardGrid.jsx      # 목차·시험·과목 카드 그리드 (제목, note, 진행률 바)
  Breadcrumbs.jsx              # 분류>시험>과목>유형 경로 표시, 클릭시 상위 이동
  SideNav.jsx                  # 이전/다음 형제 이동 (기존 HTML 프로토타입의 좌우 이동 로직 이식)
  Terminal.jsx                 # 명령어+결과 블록 하나를 렌더 (prompt/cmd/out 라인 배열)
  ContentBlocks.jsx            # concepts/example/explain 공용 렌더러: 블록 배열을 순회하며 타입별로 그림 (text→문단, terminal→Terminal.jsx, image→<img>). 문자열이 오면 기존처럼 text 블록 1개로 취급(하위호환)
  QuestionCard.jsx             # 카드 뒤집기 1문제: 앞면(문제+보기+정답확인+설명보기 버튼) / 뒷면(ContentBlocks로 해설 렌더 + 문제보기 버튼), CSS 3D flip
  QuizPanel.jsx                # 문제 목록 묶음: 출제율 필터 + "섞어서 풀기" 토글(Fisher-Yates 셔플) + QuestionCard 리스트 렌더, 문제가 여러 유형/시험에서 왔으면 카드에 출처 chip 표시
pages/
  HomePage.jsx      # 분류별로 묶은 시험 카드 그리드 (목차) — getTree()에서 시험 목록을 그대로 렌더하므로 새 시험 폴더 추가만으로 카드가 자동 생김. "여러 시험 선택" 토글로 카드에 체크박스 모드 전환 → 선택시 하단 고정바 "N개 시험 · 문제 풀기" → (Exam/Subject/Topic과 동일하게) 같은 페이지 아래로 QuizPanel(getQuestionsByExams(선택된 examId들)) 인라인 펼침. **선택 모드가 켜져 있는 동안 카드 클릭은 오직 체크만 하고 상세 페이지로 이동하지 않는다**(두 동작이 동시에 걸리지 않게 모드에 따라 클릭 핸들러 자체를 분기) — 모드를 끄면 원래의 클릭=이동 동작으로 복귀.
  ExamPage.jsx       # 시험 상세: 과목 카드 목록 + 제목 우측 "예제 문제 풀어보기" 버튼 → 아래에 QuizPanel(해당 시험 전체 문제, getQuestionsByExam). _rules.json이 있으면 "가상 모의고사 응시" 버튼도 표시 → MockExamPage로 이동
  SubjectPage.jsx    # 과목 상세: 유형 카드 목록 + 동일 버튼 → QuizPanel(해당 과목 전체 문제, getQuestionsBySubject) + SideNav(형제 과목 이동)
  TopicPage.jsx      # 유형 상세: concepts(ContentBlocks), 예제(ContentBlocks), 동일 버튼 → QuizPanel(해당 유형 문제만, getQuestionsByTopic) + SideNav(형제 유형 이동 — **반드시 현재 examId 범위 안에서만** 순환, 다른 시험 유형으로는 절대 안 넘어감)
  MockExamPage.jsx   # 가상 모의고사: getExamRules(examId)로 과목별 questionCount/passScore, passAverage 조회 → lib/mockExam.js의 buildMockPaper/scoreMockExam 호출만 함(로직은 페이지에 없음) → 합격/불합격 + 과목별 점수 리포트 표시
App.jsx  — react-router-dom 라우트: `/`, `/exam/:examId`, `/exam/:examId/:subjectId`, `/exam/:examId/:subjectId/:topicId`, `/exam/:examId/mock`

"예제 문제 풀어보기" 동작은 **Home/Exam/Subject/Topic 어디서든 동일한 패턴**으로 통일한다 — 버튼을 누르면 같은 페이지 안에서 목록 아래로 QuizPanel이 인라인으로 펼쳐질 뿐, 별도 라우트로 이동하지 않는다 (다중 시험 선택 결과도 예외 없이 이 패턴).

라우트 관련 참고: `/exam/:examId/mock`은 `/exam/:examId/:subjectId`와 세그먼트 위치가 같아 보이지만, React Router v6는 정적 세그먼트(`mock`)를 동적 파라미터(`:subjectId`)보다 항상 우선 매칭하므로 실제 충돌은 없다. 다만 앞으로 과목 폴더명을 `mock`으로 짓지 않는다(예약어로 취급).

### ContentBlocks 데이터 모델
`concepts`(배열의 각 항목)/`example`/`explain` 필드는 다음 중 하나:
- 기존처럼 순수 문자열(간단한 `<b>` 텍스트) — 그대로 지원(하위호환), 또는
- 블록 배열: `[{type:"text", html:"..."}, {type:"terminal", lines:[{prompt,cmd},{out:"..."}]}, {type:"image", src:"/images/...", alt:"...", caption:"..."}]`
- 이미지 파일은 `2-frontEnd/public/images/<examId>/<topicId>/...`에 두고 JSON에서는 `/images/...` 절대경로로 참조(당장 추가할 실제 이미지는 없음 — 스키마와 렌더러만 준비, 사용자가 나중에 이미지 파일을 넣으면 바로 동작).

### QuestionCard 뒤집기 동작
- state: `flipped`(문제/해설 면), `revealed`(정답 하이라이트 여부)
- 앞면: 태그 chip + 문제 + 4지선다 목록 + [정답 확인](→ revealed=true, 정답 옵션 초록 강조, 앞면 유지) + [설명 보기](→ flipped=true)
- 뒷면: 태그 chip + "Q. 문제 텍스트" 리마인드 + 정답/해설 + [문제 보기](→ flipped=false)
- CSS: `transform-style:preserve-3d` + `rotateY(180deg)`로 실제 카드 뒤집기 애니메이션

### QuizPanel 묶어보기 / 섞어서 풀기 / 출제율 필터
- 기본: 문제를 유형 순서대로(원본 순서) 나열해 "한번에 묶어서" 볼 수 있음
- `[🔀 섞어서 풀기]` 버튼: 클릭 시 현재 문제 배열을 Fisher-Yates로 섞어 다시 렌더 (다시 누르면 재셔플), `[↕ 원래 순서]`로 원상복구
- **QuestionCard 리스트는 반드시 `key={question.id}`로 렌더**(배열 인덱스를 key로 쓰지 않는다) — 인덱스를 key로 쓰면 셔플로 순서가 바뀔 때 React가 같은 자리의 컴포넌트를 재사용해서, 이미 뒤집혀 있던 카드의 "뒤집힘/정답공개" 상태가 그 자리에 새로 온 다른 문제로 잘못 이어지는 버그가 생긴다.
- **출제율 필터**: 상단에 세그먼트 버튼 `[전체] [1%+] [3%+] [5%+] [10%+]` — QuizPanel이 받은 문제 배열을 `lib/quizFilters.js`의 `enrichWithTopicPct(questions, getTopicStatMap(examId))`로 감싼 뒤 `filterByMinPct`로 걸러서 렌더(즉 pct는 QuizPanel 렌더 시점에 명시적으로 결합, 문제 원본 데이터에는 없음). 필터 → 셔플 순서로 적용(필터링된 결과 안에서 섞임)
- ExamPage/SubjectPage/다중 시험 결합 화면에서는 여러 유형(및 여러 시험)의 문제가 섞여 보이므로 각 QuestionCard 상단에 출처 유형(및 시험) 이름 chip을 붙여 어디서 왔는지 구분 가능하게 함

### MockExamPage 채점 로직
- 각 과목마다 `min(_rules.json의 questionCount, 해당 과목 보유 연습문제 수)`개를 랜덤 추출해 응시지 구성 (지금은 과목당 보유 문제가 실제 시험 문항수보다 훨씬 적으므로, 화면에 "실제 시험 48/32문항 중 보유한 연습문제 29/16문항으로 모의 진행합니다" 안내 문구 표시)
- **보유 문제 0개인 과목 처리**: `buildMockPaper`가 해당 과목을 응시지에서 제외하고, `scoreMockExam`은 그 과목을 "채점 제외(문제 없음)"로 표시 — 0으로 나누기(NaN 점수) 방지. 전체 평균은 채점 가능한 과목만으로 계산.
- 채점: 과목별 정답수/응시문항수 → 100점 환산 점수가 `passScore` 이상인지, 전체 평균이 `passAverage` 이상인지 판정 → 과목별 점수 막대 + 전체 평균 + PASS/FAIL 배지로 결과 표시
- `_rules.json`이 없는 시험(향후 추가되는 시험이 아직 기준을 안 채웠을 때)은 ExamPage에 모의고사 버튼 자체가 안 보임

## UI/UX 일관성 규칙

- **전역 테마**: 기존 HTML 프로토타입(`리눅스정리.html`/`리눅스_기출분석_트리.html`)에서 이미 검증된 CSS 변수 팔레트(`--bg/--card/--text/--border/--accent` 등, `data-theme` 속성 기반 라이트/다크)를 그대로 `src/styles/theme.css` 전역 스타일로 이식한다. 페이지마다 색을 새로 정의하지 않고 전부 이 변수만 참조. 다크/라이트 토글 버튼은 `App.jsx`가 감싸는 공용 레이아웃(Header)에 **딱 한 번**만 두고 모든 페이지 상단 같은 위치(우상단 고정)에 노출 — 페이지별로 각자 토글을 만들지 않는다.
- **공용 페이지 레이아웃 순서(예외 없이 고정)**: Breadcrumbs → 제목 + 우측 "예제 문제 풀어보기"(강조 버튼) → 통계 바(카드/상세 공용) → SideNav(이전/다음, 있는 레벨만) → 본문(카드 그리드 또는 concepts/예제) → QuizPanel(버튼 클릭시 펼침). Exam/Subject/Topic 세 페이지가 이 순서를 토씨 하나 안 틀리고 동일하게 따른다 — 예전 프로토타입처럼 "유형 페이지만 하단에 SideNav" 같은 예외를 두지 않는다.
- **Card/통계 바는 완전히 공용 컴포넌트 하나**: 시험(Home)·과목(Exam)·유형(Subject) 카드 전부 같은 `Card.jsx`+통계바 서브컴포넌트를 쓴다. **Home의 "여러 시험 선택" 체크박스 모드는 `Card.jsx` 자체에 넣지 않고, HomePage가 `Card`를 감싸는 얇은 `SelectableCardWrapper`로만 처리** — Exam/Subject 레벨의 Card는 선택 모드를 아예 모르게 유지(불필요한 prop이 새지 않게).
- **버튼 위계 통일** (아래 매핑을 그대로 따름, 매 페이지 새로 디자인하지 않음):
  - *강조(Primary, 채워진 accent 버튼)*: "예제 문제 풀어보기", "가상 모의고사 응시", "N개 시험 · 문제 풀기"(다중 선택 하단바)
  - *보조(Secondary, outline 버튼)*: 카드 뒷면 "문제 보기", 앞면 "정답 확인", "🔀 섞어서 풀기"/"↕ 원래 순서"
  - *텍스트/고스트*: "설명 보기", Breadcrumbs 링크, "← 대분류로 돌아가기"류 back 버튼
  - *세그먼트 그룹(하나의 토글 바)*: 출제율 필터 `[전체][1%+][3%+][5%+][10%+]`
- **반응형 그리드 공용화**: CardGrid, QuizPanel의 문제 목록, MockExamPage 결과 화면이 전부 같은 `grid-auto-fit` 유틸리티 클래스(예: `repeat(auto-fit, minmax(240px,1fr))`)를 재사용 — 페이지마다 breakpoint를 따로 잡지 않는다.

## 스캐폴드 나머지
`1-rules/프로젝트/2-소규모.md` 규칙대로 이미 만든 `0-docs/1-configs/4-data/5-rules/deploy/logs` 폴더는 유지한다. 이 프로젝트는 정적 콘텐츠(프론트엔드가 직접 JSON을 불러 쓰는 구조)라 `3-backend`는 규칙만 따라 스캐폴드 원본의 `main.py` placeholder만 복사해두고 실제 로직은 만들지 않는다(불필요한 API 서버를 억지로 만들지 않음).

## 마이그레이션 데이터
1. `content.json`(현재 존재, quiz 제거됨)에 있는 13개 유형의 `concepts`/`example`을 위 디렉토리 구조로 그대로 옮겨 쓴다 (숫자 stat 필드는 버림 — stats/에서 계산하므로).
2. 이전 대화에서 이미 직접 작성한 45개 연습문제(2~6문항×13유형, 전부 원본 창작 — 기출 PDF 원문 아님)를 `questions/`에 태그 붙여서 옮겨 쓴다.
3. **`stats/` 채우기**: 이미 추출해둔 4개 기출 PDF(`D:\0.업무\3.공부\리눅스2급\리눅스마스터2급2023{0311,0610,0909,1209}(해설집).pdf`)를 다시 pdfplumber로 열어, 이번엔 **회차별로** 80문항씩 13개 유형에 재분류해서 `stats/it-cert/linux-master-2/2023-{03,06,09,12}.json` 4개 파일의 `counts`를 채운다 (지금까지는 4회 합계 320문항 기준 총계만 있었고, 회차별 분해는 새로 해야 함 — 총합은 기존에 검증한 13개 유형별 합계와 반드시 일치해야 함: 16/34/33/39/24/25/7/14/25/10/14/2/77, 합 320).
4. `_rules.json` 생성: `totalQuestions:80`, `subjects:[{operation-management, questionCount:48, passScore:40},{application, questionCount:32, passScore:40}]`, `passAverage:60`을 기본값으로 넣되 파일 상단에 "공식 공고 기준으로 재확인 필요" 주석을 남긴다.
5. 완료 후 루트의 `content.json` 단일 파일은 삭제.

## 검증
1. `npm run dev`로 Vite 개발 서버 기동 후 Claude Browser로 접속해 확인:
   - Home → 리눅스마스터2급 카드 클릭 → 1과목/2과목 카드 + "예제 문제 풀어보기" 버튼 노출
   - 시험 페이지에서 버튼 클릭 → 아래에 전체(320문항 아님, 45문항) 문제가 유형별로 묶여 나타남, "섞어서 풀기" 클릭 시 순서 변경 확인
   - 문제 카드에서 "설명 보기" → 뒤집혀 해설 표시 → "문제 보기" → 다시 앞면
   - 2과목 페이지에서 동일 버튼 → 5개 유형(네트워크 기초 등)의 문제만 모여서 보이는지 확인 (1과목 문제 섞이지 않아야 함)
   - 유형(예: 파일 및 디렉터리 권한 관리) 상세 페이지 → concepts, 터미널 예제, 좌우 이전/다음 유형 이동, 해당 유형 문제만 나오는 QuizPanel 확인
   - 각 카드/상세 페이지의 "%"·"회당 평균" 표시가 `stats/` 4개 회차 파일 합산과 일치하는지 (예: 네트워크 기초 24.1%, 77문항) 확인
   - Home에서 "여러 시험 선택" 토글 → 카드 체크 → 하단 바 노출 → 문제 풀기 클릭 → 선택한 시험(들)의 문제만 결합돼 나오는지 확인 (지금은 시험이 1개뿐이라 실제 다중 결합은 두 번째 시험이 추가된 뒤에나 눈으로 검증되지만, 최소한 단일 시험 선택 결합은 정상 동작해야 함)
   - QuizPanel에서 "5%+" 필터 클릭 → 압축과아카이브(2.2%)·배포판/임베디드(0.6%) 유형 문제가 빠지고 네트워크기초·프로세스 등만 남는지 확인
   - ExamPage → "가상 모의고사 응시" 클릭 → 과목별로 보유 문제가 섞여 출제 → 다 풀고 제출 → 과목별 점수/전체 평균/합격 여부 화면 확인
   - 문제 하나의 explain을 블록 배열([text, terminal]) 형태로 넣어보고 QuestionCard 뒷면에서 터미널 블록이 Terminal.jsx 스타일대로 렌더되는지 확인 (이미지 블록은 실제 이미지 파일이 없으므로 alt 텍스트만 깨지지 않고 나오는지 정도만 확인)
2. 브라우저 콘솔에 JS 에러 없는지 확인 (`read_console_messages`)
3. `stats/` 4개 회차 파일의 `counts` 합계가 13개 유형별로 16/34/33/39/24/25/7/14/25/10/14/2/77(총 320)과 정확히 일치하는지 스크립트로 검산
4. 가상의 두 번째 시험 폴더(빈 더미)를 content/questions/stats에 임시로 추가해봤을 때 Home 카드 그리드에 코드 수정 없이 바로 나타나는지 확인 후 더미 폴더 제거 (하드코딩 여부 검증용)

## 실행 순서 / 토큰 예산 관리
예약된 작업 세션은 아래 우선순위로 진행하고, 중간에 토큰이 부족해지면 그 시점까지 확인·수정한 내용을 `0-docs/`에 진행상황 md로 남기고 멈춘다 (4번은 여유 있을 때만):
1. **데이터 구조 확인 및 수정** — 위 디렉토리 구조/loader.js대로 실제 파일 생성, `_meta`/`_rules` 판별 규칙·합성키 네임스페이스가 실제로 맞물리는지 확인
2. **로직상 버그 확인 및 수정** — 위에서 잡은 6개 버그 항목(파일 판별, 시험 간 id 충돌, SideNav 범위, 모의고사 0문항 과목, React key, 다중선택 클릭 충돌)이 실제 코드에도 반영됐는지 하나씩 점검
3. **UX/UI 구성 확인 및 수정** — 위 "UI/UX 일관성 규칙" 절(전역 테마, 레이아웃 순서, 버튼 위계, 카드 재사용 경계)대로 실제 렌더링됐는지 브라우저로 확인
4. **예제 문제 추가 생성** — 유형(topic)당 연습문제를 **최대 10문항까지** 늘리되, **출제율(pct) 높은 유형부터 우선** 채운다. 지금 보유량(leaf13 네트워크기초 6문항이 가장 많음) 대비 우선순위 순서: 네트워크 기초(24.1%) → 프로세스와 작업 제어(12.2%) → 파일시스템과 디스크 관리(10.6%) → 쉘과 로그인 환경(10.3%) → 패키지 관리(7.8%) / X윈도(7.8%) → 텍스트 편집기(7.5%) → 주변장치(4.4%) / 가상화(4.4%) → 권한관리(5.0%, 이미 낮은 편) → 응용프로그램(3.1%) → 압축(2.2%) → 배포판/임베디드(0.6%, 우선순위 최하). 새로 추가하는 문제도 지금까지와 동일하게 **전부 원본 창작**(기출 PDF 원문 재현 아님 다만, 기출 pdf 참고), `questions/` 해당 유형 파일에 태그 붙여 추가.
