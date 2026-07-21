# Push-up Coach

3명이 함께 사용하는 모바일 푸시업 카운터입니다. 사용자를 선택하고 목표 개수를 정하면, 운동 완료 기록을 저장해 오늘 완료 여부, 연속 운동일, 월간 완료 달력을 확인할 수 있습니다.

자동 카운트는 전면 카메라에서 얼굴 크기가 가까워졌다가 다시 멀어지는 동작을 감지합니다. 폰을 몸에 고정하는 방식이 아니라 바닥에 세워 얼굴과 상체가 카메라 화면에 보이도록 배치해야 합니다. 운동 화면에서 카메라 미리보기와 `얼굴 인식 중` 상태를 확인한 뒤 시작합니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui
- **Storage**: Upstash Redis / Vercel KV
- **Testing**: Vitest, Playwright
- **Package Manager**: Bun

## 시작하기

```bash
bun install
bun dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 환경변수

운동 기록 저장에는 Upstash Redis 환경변수가 필요합니다. Vercel 프로젝트에 KV를 연결한 뒤 로컬에서는 다음 명령으로 환경변수를 받아옵니다.

```bash
vercel env pull .env.development.local
```

앱은 아래 변수 중 하나의 조합을 사용합니다.

```env
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

또는

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## 스크립트

| 명령어 | 설명 |
|---|---|
| `bun dev` | 개발 서버 실행 |
| `bun run build` | 프로덕션 빌드 |
| `bun start` | 프로덕션 서버 실행 |
| `bun run lint` | ESLint 실행 |
| `bun run test` | Vitest 실행 |
| `bun run test:e2e` | Playwright E2E 실행 |
