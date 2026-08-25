# study

리눅스마스터2급 자격증 공부 정리 허브. 과목/유형별 핵심 개념, 실행 예제, 기출 통계, 모의고사 기능을 제공하는 개인용 학습 웹앱입니다.

## 구조

- `2-frontEnd/` — React + Vite 프론트엔드 (실제 앱 코드)
- `0-docs/` — 작업 현황, 마이그레이션 계획 등 문서
- `4-data/`, `5-rules/` — 원본 데이터/규칙 (일부는 저작권 문제로 `.gitignore` 처리됨)

## 로컬 실행

```bash
cd 2-frontEnd
npm install
npm run dev
```

## 배포

`main` 브랜치에 push되면 GitHub Actions가 `2-frontEnd`를 빌드해 GitHub Pages로 자동 배포합니다 (`.github/workflows/deploy.yml`).
