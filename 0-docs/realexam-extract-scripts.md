# 기출 PDF → 원문 데이터 추출 스크립트

`2-frontEnd/src/data/realexams-full/`(문항 원문·보기·해설, gitignore 처리됨)를 만들 때 쓴 파이썬 스크립트 모음. 4개 회차(2023-03/06/09/12) 320문항은 박스(이미지) 문항까지 전부 복원 완료(2026-07-29). 새 회차를 추가할 때 이 문서 전체 절차를 재사용한다.

## 준비물

```bash
pip install pdfplumber
```

경로는 이 저장소 루트(`C:\proj2_\study`) 기준 상대경로로 스크립트 안에 하드코딩되어 있다. 다른 위치에서 돌릴 경우 각 스크립트 위쪽의 `REPO_ROOT`만 고치면 된다.

중간 산출물(`_work/` 아래 `*-parsed.json`, `*-draft.json`, `*-explain.json`)에는 원본 PDF에서 뽑아낸 원문 텍스트가 그대로 들어있으므로 `realexams-full/` 하위에 둔다 — `.gitignore`가 `2-frontEnd/src/data/realexams-full/`를 통째로 무시하므로 자동으로 커밋 대상에서 빠진다.

## 1. `extract_questions.py` — PDF 컬럼 파싱

2단 컬럼 레이아웃의 해설집 PDF에서 문항 번호·질문·보기 4개를 뽑아 JSON으로 저장한다.

핵심 주의사항 (전부 실제로 겪었던 버그):
- **원형숫자(①②③④) 마커와 보기 텍스트를 top 좌표를 `round()`로 그리드 버킷팅해서 묶으면 안 된다.** 마커 글리프와 텍스트 글리프의 베이스라인이 1~2pt 어긋나 있어서, 버킷 경계에 걸리면 마커만 있고 텍스트가 빈 줄, 또는 그 반대로 쪼개진다. → `top` 값이 가까운 단어끼리 근접도 기반으로 묶어야 한다(고정 그리드 아님).
- **페이지 머리말/꼬리말은 문자열 매칭이 아니라 위치(`top` 좌표)로 걸러내야 한다.** 꼬리말이 마지막 실제 콘텐츠 줄과 top이 비슷하면 같은 줄로 묶여서 문자열 앞부분(`기출문제 해설은...`)이 없어도 뒷부분(`CBT :www.comcbt.com`)이 문제 텍스트 뒤에 그대로 붙어버린다.
- **문항 중 상당수(회차당 약 절반)는 "다음 설명/그림/결과/예시/상황에 해당하는" 형태로, 실제 시나리오·명령어가 텍스트가 아니라 래스터 이미지(박스)로 삽입되어 있어 추출이 안 된다.** `page.images`의 위치를 문항 파싱 상태(`stem`/`choices` 구간)와 대조해서 `has_image` 플래그로 표시해두고, 해당 문항은 나중에 페이지를 이미지로 렌더링해서 직접 보고 옮겨 적어야 한다 (§4 참고).

```python
# -*- coding: utf-8 -*-
"""사용법: python extract_questions.py <PDF파일명> <출력.json>
예: python extract_questions.py "리눅스마스터2급20230311(해설집).pdf" 2023-03-parsed.json
PDF파일명은 REPO_ROOT/2-frontEnd/public/원본기출-비공개/ 안에 있다고 가정한다."""
import pdfplumber
import re
import json
import sys
import os

REPO_ROOT = r'C:\proj2_\study'
PDF_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'public', '원본기출-비공개')

NOISE_PATTERNS = [
    re.compile(r'^본 해설집은'),
    re.compile(r'^해설을 제공해'),
    re.compile(r'^만들어진 자료입니다'),
    re.compile(r'^리눅스마스터 2급'),
    re.compile(r'^및 해설집'),
    re.compile(r'^전자문제집 CBT\s*:?\s*www\.comcbt\.com$'),
    re.compile(r'^CBT$'),
    re.compile(r'^기출문제 해설은'),
    re.compile(r'^:\s*www\.comcbt\.com'),
    re.compile(r'^\d+과목\s*:'),
]

def is_noise(line):
    s = line.strip()
    if not s:
        return True
    return any(p.search(s) for p in NOISE_PATTERNS)

def lines_from_words_with_top(ws, tol=3.0):
    # 고정 그리드 반올림 대신 top 근접도로 줄을 묶는다 (버그 노트 참고).
    ws = sorted(ws, key=lambda w: (w['top'], w['x0']))
    groups, current, ref_top = [], [], None
    for w in ws:
        if current and (w['top'] - ref_top) > tol:
            groups.append(current)
            current, ref_top = [], None
        current.append(w)
        if ref_top is None:
            ref_top = w['top']
    if current:
        groups.append(current)
    out = []
    for group in groups:
        lw = sorted(group, key=lambda w: w['x0'])
        out.append((min(x['top'] for x in lw), ' '.join(x['text'] for x in lw)))
    return out

def extract_all_lines(pdf_path):
    all_lines = []  # [(page_no, text)], text may be '[IMG_BOX]'
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages):
            words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
            # 머리말(top~22-34)/꼬리말(top~823)은 위치로 제거 (문서마다 실측해서 조정할 것).
            words = [w for w in words if 40 <= w['top'] <= 815]
            mid = page.width / 2
            left_words = [w for w in words if w['x0'] < mid]
            right_words = [w for w in words if w['x0'] >= mid]
            left_lines = lines_from_words_with_top(left_words)
            right_lines = lines_from_words_with_top(right_words)
            left_imgs = [(im['top'], '[IMG_BOX]') for im in page.images
                         if im['x0'] < mid and im['width'] > 60 and im['height'] > 15]
            right_imgs = [(im['top'], '[IMG_BOX]') for im in page.images
                          if im['x0'] >= mid and im['width'] > 60 and im['height'] > 15]
            for _, text in sorted(left_lines + left_imgs, key=lambda t: t[0]):
                all_lines.append((pno + 1, text))
            for _, text in sorted(right_lines + right_imgs, key=lambda t: t[0]):
                all_lines.append((pno + 1, text))
    return all_lines

def split_choices(text):
    return [m.strip() for m in re.findall(r'[①②③④](.*?)(?=[①②③④]|$)', text, re.S)]

def parse_document(page_lines):
    lines = [(p, l) for (p, l) in page_lines if l == '[IMG_BOX]' or not is_noise(l)]
    questions, i, n, expected_num, cur = [], 0, len(lines), 1, None

    def flush(cur):
        stem = ''.join(cur['stem_lines']).strip()
        choice_text = ' '.join(cur['choice_lines']).strip()
        return {
            'number': cur['number'],
            'page': cur['page'],
            'stem': stem,
            'choices': [c.strip() for c in split_choices(choice_text)],
            'has_image': cur['has_image'],
            'explanation_raw': '\n'.join(cur['expl_lines']).strip(),  # 참고용 원본 크라우드소싱 해설(직접 쓰지 말 것)
        }

    while i < n:
        page, line = lines[i]
        m = re.match(r'^(\d{1,3})\.\s+(.*)$', line) if line != '[IMG_BOX]' else None
        if m and int(m.group(1)) == expected_num:
            if cur is not None:
                questions.append(flush(cur))
            expected_num += 1
            cur = {'number': int(m.group(1)), 'page': page, 'stem_lines': [m.group(2)],
                   'choice_lines': [], 'expl_lines': [], 'state': 'stem', 'has_image': False}
        elif cur is not None:
            if line == '[IMG_BOX]':
                if cur['state'] in ('stem', 'choices'):
                    cur['has_image'] = True
            elif cur['state'] == 'stem':
                if '①' in line:
                    idx = line.index('①')
                    before, after = line[:idx].strip(), line[idx:]
                    if before:
                        cur['stem_lines'].append(before)
                    cur['choice_lines'].append(after)
                    cur['state'] = 'choices'
                else:
                    cur['stem_lines'].append(line)
            elif cur['state'] == 'choices':
                if line.strip() == '<문제 해설>':
                    cur['state'] = 'expl'
                else:
                    cur['choice_lines'].append(line)
            elif cur['state'] == 'expl':
                cur['expl_lines'].append(line)
        i += 1

    if cur is not None:
        questions.append(flush(cur))
    return questions

if __name__ == '__main__':
    pdf_path = os.path.join(PDF_DIR, sys.argv[1])
    out_path = sys.argv[2]
    questions = parse_document(extract_all_lines(pdf_path))
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    n_img = sum(1 for q in questions if q['has_image'])
    print(f'{out_path}: {len(questions)}문항 파싱, 박스(이미지) {n_img}개')
    bad = [q['number'] for q in questions if len(q['choices']) != 4]
    if bad:
        print('경고: 보기 개수 4개 아님 ->', bad)
    empty = [q['number'] for q in questions if any(not c.strip() for c in q['choices'])]
    if empty:
        print('경고: 빈 보기 있음 ->', empty)
```

## 2. `merge_with_answers.py` — 기존 정답과 병합

`realexams/*.json`(정답 번호만, git 추적 대상)과 위에서 뽑은 문제·보기를 합쳐 회차별 `-draft.json`을 만든다. 박스(`has_image`) 문항 번호를 콘솔에 출력해준다.

```python
# -*- coding: utf-8 -*-
import json
import os

REPO_ROOT = r'C:\proj2_\study'
WORK_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'realexams-full', '_work')
ANSWERS_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'realexams', 'it-cert', 'linux-master-2')

os.makedirs(WORK_DIR, exist_ok=True)

ROUNDS = ['2023-03', '2023-06', '2023-09', '2023-12']  # 새 회차 추가 시 여기에 이름만 추가

for name in ROUNDS:
    with open(os.path.join(WORK_DIR, name + '-parsed.json'), encoding='utf-8') as f:
        questions = json.load(f)
    with open(os.path.join(ANSWERS_DIR, name + '.json'), encoding='utf-8') as f:
        answers = json.load(f)['answers']
    assert len(answers) == len(questions), (name, len(answers), len(questions))

    merged = [{
        'number': q['number'],
        'page': q['page'],
        'stem': q['stem'],
        'choices': q['choices'],
        'answer': answers[q['number'] - 1] - 1,  # 0-indexed로 변환
        'has_image': q['has_image'],
    } for q in questions]

    with open(os.path.join(WORK_DIR, name + '-draft.json'), 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    box = [m['number'] for m in merged if m['has_image']]
    print(f'{name}: 총 {len(merged)} / 박스 {len(box)}개 ->', box)
```

## 3. `build_final.py` — 최종 realexams-full JSON 조립

회차별 `-draft.json` + 직접 작성한 `-explain.json`(문항 번호 → 해설 HTML 문자열 매핑, 박스 없는 문항만) 을 합쳐 앱이 실제로 읽는 `realexams-full/it-cert/linux-master-2/*.json`을 만든다. 박스 문항은 `pending: true`로 표시되고 안내 문구가 `explain`에 들어간다.

```python
# -*- coding: utf-8 -*-
import json
import os

REPO_ROOT = r'C:\proj2_\study'
WORK_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'realexams-full', '_work')
OUT_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'realexams-full', 'it-cert', 'linux-master-2')

PENDING_NOTE = (
    "이 문항은 원본 PDF에 텍스트가 아닌 이미지(박스)로 된 설명이 포함되어 있어 "
    "자동 추출이 되지 않았습니다. 정답만 확인하고, 문제 전문은 원본 PDF를 참고하세요."
)

ROUNDS = ['2023-03', '2023-06', '2023-09', '2023-12']

os.makedirs(OUT_DIR, exist_ok=True)

for name in ROUNDS:
    with open(os.path.join(WORK_DIR, name + '-draft.json'), encoding='utf-8') as f:
        draft = json.load(f)
    explain_path = os.path.join(WORK_DIR, name + '-explain.json')
    explains = {}
    if os.path.exists(explain_path):
        with open(explain_path, encoding='utf-8') as f:
            explains = json.load(f)

    questions = []
    for q in draft:
        entry = {'number': q['number'], 'q': q['stem'], 'opts': q['choices'], 'answer': q['answer']}
        if q['has_image']:
            entry['pending'] = True
            entry['explain'] = PENDING_NOTE
        else:
            key = str(q['number'])
            if key not in explains:
                raise SystemExit(f'{name}: Q{q["number"]} 해설 없음 — {name}-explain.json에 추가할 것')
            entry['explain'] = explains[key]
        questions.append(entry)

    out_path = os.path.join(OUT_DIR, name + '.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({'id': name, 'questions': questions}, f, ensure_ascii=False, indent=2)
    print(f'{name}: {len(questions)}문항 -> {out_path}')
```

## 4. `merge_into_extra.py` — 유형별 연습문제 풀(`questions-extra/`)에 합치기

`realexams-full/*.json`에서 `pending`이 아닌 문항만 골라 `questions-extra/it-cert/linux-master-2/{operation-management,application}.json`에 **덧붙인다**(기존 항목은 건드리지 않음). 과목 분리는 `_rules.json`에 이미 문서화된 경계(1~48번=1과목, 49~80번=2과목)를 그대로 쓴다 — 새 시험을 추가할 때는 이 경계값을 확인해서 바꿔야 한다. 다시 실행하면 같은 `id`가 이미 있어 충돌 에러가 나므로(중복 추가 방지), 박스 160문항을 나중에 복원한 뒤에는 이 스크립트를 그대로 다시 돌리면 새로 `pending`이 풀린 문항만 추가된다.

```python
# -*- coding: utf-8 -*-
import json
import os

REPO_ROOT = r'C:\proj2_\study'
FULL_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'realexams-full', 'it-cert', 'linux-master-2')
EXTRA_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'questions-extra', 'it-cert', 'linux-master-2')
REALEXAMS_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'realexams', 'it-cert', 'linux-master-2')

ROUNDS = ['2023-03', '2023-06', '2023-09', '2023-12']
SUBJECT_BOUNDARY = 48  # 1~48 = operation-management(1과목), 49~80 = application(2과목) — _rules.json 기준
SUBJECT_NAME = {
    'operation-management': '1과목: 리눅스 운영 및 관리',
    'application': '2과목: 리눅스 활용',
}

by_subject = {'operation-management': [], 'application': []}
skipped_pending = 0

for round_id in ROUNDS:
    with open(os.path.join(FULL_DIR, round_id + '.json'), encoding='utf-8') as f:
        data = json.load(f)
    with open(os.path.join(REALEXAMS_DIR, round_id + '.json'), encoding='utf-8') as f:
        json.load(f)  # sessionLabel 등은 지금 안 쓰지만 존재 확인용

    for q in data['questions']:
        if q.get('pending'):
            skipped_pending += 1
            continue
        subject_id = 'operation-management' if q['number'] <= SUBJECT_BOUNDARY else 'application'
        by_subject[subject_id].append({
            'id': f'lm2-realexam-{round_id}-q{q["number"]}',
            'extra': True,
            'topicHint': f'{round_id} 기출문제',
            'tags': ['리눅스마스터2급', SUBJECT_NAME[subject_id], f'{round_id} 기출문제'],
            'q': q['q'],
            'opts': q['opts'],
            'answer': q['answer'],
            'explain': q['explain'],
        })

for subject_id, new_entries in by_subject.items():
    path = os.path.join(EXTRA_DIR, subject_id + '.json')
    with open(path, encoding='utf-8') as f:
        existing = json.load(f)
    existing_ids = {e['id'] for e in existing}
    dup = [e['id'] for e in new_entries if e['id'] in existing_ids]
    if dup:
        raise SystemExit(f'{subject_id}: 이미 추가된 id 있음(중복 실행?) -> {dup}')
    combined = existing + new_entries
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)
    print(f'{subject_id}: {len(existing)} -> {len(combined)} (+{len(new_entries)})')

print('pending이라 건너뛴 문항 수:', skipped_pending)
```

## 5. 박스(이미지) 160문항 복원 — 완료(2026-07-29), 재사용 절차 기록

4개 회차(2023-03/06/09/12) 총 160개 박스 문항 전부 복원 완료. 새 회차를 추가하거나 같은 작업을 다시 해야 할 때를 위해 실제로 쓴 절차를 남겨둔다.

1. 전체 페이지를 한 번에 렌더링해둔다(페이지별로 반복하지 않아도 되게).

```python
import pdfplumber
path = r'C:\proj2_\study\2-frontEnd\public\원본기출-비공개\리눅스마스터2급20231209(해설집).pdf'
out_dir = r'<스크래치>\pages-2023-12'  # os.makedirs로 미리 만들어둘 것
with pdfplumber.open(path) as pdf:
    for i, page in enumerate(pdf.pages):
        page.to_image(resolution=170).save(out_dir + f'\\p{i+1}.png')
```

2. `realexams-full/<회차>.json`에서 `pending: true`인 문항의 `number`/`q`(부분 stem)/`opts`만 뽑아 `<회차>-pending-dump.json`으로 덤프해두면, 어떤 문항이 남았는지 한눈에 보기 좋다(Read 도구로 봐야 함 — 콘솔에 한글을 직접 print하면 cp949 콘솔 인코딩 때문에 깨진다. 항상 UTF-8 파일로 쓰고 Read로 읽을 것).
3. 렌더링된 페이지 이미지를 Read 도구로 순서대로 열어서, 각 pending 문항의 박스(시나리오/명령어/터미널 출력/그림 설명)를 그대로 옮겨 적어 `box-texts-<회차>.json`(`{문항번호: 박스텍스트}`)에 채워 넣는다. 그림(스크린샷 등)은 "(그림) ..."로 시작하는 서술형 설명으로 대체해서 적는다.
4. **정답 인덱스는 반드시 PDF 맨 뒤 정답표(10열×8행 원문자 격자)를 별도로 크롭해서 확인한다.** 페이지 전체를 한 번에 읽고 눈대중으로 행을 세면 ±1행씩 밀려서 잘못 읽기 쉽다(실제로 이 세션에서 2023-09 41~50번 구간을 한 번 잘못 읽어서 재확인한 사례 있음). PIL로 해당 영역만 잘라 2~3배 확대해서 다시 읽고, 문항별 인라인 해설(있는 경우)과 교차검증할 것:

```python
from PIL import Image
im = Image.open(r'<스크래치>\pages-2023-12\p16.png')
crop = im.crop((700, 1360, 1230, 1700))  # 좌표는 페이지마다 다르므로 먼저 대략 크게 잘라보고 조정
crop.resize((crop.width*2, crop.height*2)).save(r'<스크래치>\ans_check.png')
```

5. `<회차>-box-fix.json`에 `{문항번호: {stem, explain}}` 형태로, 기존 부분 stem과 박스 내용을 `<br/>`/`<code>`로 자연스럽게 합친 완성 stem과, 정답 인덱스 기준으로 새로 작성한 해설(원본 크라우드소싱 해설은 참고만 하고 그대로 베끼지 않음)을 채운다.
6. 아래 `apply_box_fix.py`로 `realexams-full/<회차>.json`에 반영한다(멱등 — `pending`이 없는 항목은 건드리지 않고, box-fix에 없는 pending은 그대로 남겨서 몇 번이고 나눠서 실행 가능).

```python
# -*- coding: utf-8 -*-
import json, os, sys

REPO_ROOT = r'C:\proj2_\study'
FULL_DIR = os.path.join(REPO_ROOT, '2-frontEnd', 'src', 'data', 'realexams-full', 'it-cert', 'linux-master-2')
WORK_DIR = r'<스크래치 디렉터리>'

round_id = sys.argv[1]  # 예: '2023-12'

with open(os.path.join(FULL_DIR, round_id + '.json'), encoding='utf-8') as f:
    data = json.load(f)
with open(os.path.join(WORK_DIR, round_id + '-box-fix.json'), encoding='utf-8') as f:
    fixes = json.load(f)

applied = 0
still_pending = []
for q in data['questions']:
    key = str(q['number'])
    if q.get('pending'):
        if key in fixes:
            q['q'] = fixes[key]['stem']
            q['explain'] = fixes[key]['explain']
            del q['pending']
            applied += 1
        else:
            still_pending.append(q['number'])

with open(os.path.join(FULL_DIR, round_id + '.json'), 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'{round_id}: applied {applied} fixes, still pending: {still_pending}')
```

7. 마지막으로 `merge_into_extra.py`(§4)를 다시 돌려서 `questions-extra/`에도 반영한다 — 이미 들어간 id는 건너뛰므로 안전하게 재실행 가능.
4. 진짜 스크린샷(예: 데스크톱 그림, 명령 실행 결과 캡처)이라 텍스트로 옮길 수 없는 극소수 문항은 `q`에 "(원본 PDF의 그림 참고)"처럼 명시하고 `pending`은 유지해도 된다.
