# LLM 업무자동화: AI Agent에게 일 제대로 시키는 법 배우기

코디세이 AI 네이티브 본과정 · AI 도구 단계 · 1주 미션

과업: 카드 사용내역에서 PG 경유 결제를 골라내 회계 담당자가 실제 가맹점을 조회할 수 있게 표로 정리하기

## 문서 순서

1. [docs/model-comparison.md](docs/model-comparison.md): LLM 모델 3종(Gemini 4 Hydrogen, Upstage Solar Pro 4, GPT-6) 비교와 선정 결과. GPT-6을 골랐다(19/20점).
2. [docs/system-design.md](docs/system-design.md): 과업 정의, 페르소나 "P/G killer", 시스템 프롬프트 v1·v2, Few-shot 3개, 입력 템플릿, 검증 전략, Zero-shot과 Few-shot 비교
3. [docs/run-log.md](docs/run-log.md): 작업 기록, 10턴 대화 원문 링크, 환각 검증 결과(Pass/Fail)
4. [docs/unresolved.md](docs/unresolved.md): 프롬프트로 끝내 풀지 못한 과업 2건

## 결과 한눈에

- 환각 질문 5개: Pass 4 (A 1, B 3), Fail 1. 실패한 7턴(입력과 다른 사용자 주장을 그대로 따름)은 v2 규칙으로 고쳤다.
- Few-shot은 PG 판별을 24/24로 올렸지만 공급가액 칸에서 새 오류가 생겼다.

## 그 밖의 폴더

- `docs/runs/`: 모델 실행 결과 원문(편집 없음)과 10턴 대화 원문
- `data/`: 가짜 샘플 카드내역과 정답지 (실제 회사 데이터·개인정보 없음)
- `캡처/`: 실행 화면 캡처
