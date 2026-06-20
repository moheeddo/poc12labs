# 자율 루프 엔지니어링 로그 (개선 → 검증 → 보강)

- **시작:** 2026-06-20 22:47:05 (epoch 1781963225)
- **목표 종료:** 약 7시간 뒤 (~05:47)
- **방식:** 멀티에이전트 찾기 → refute-default 적대검증 → 확정만 수정 → tsc/test/build 게이트 → 커밋·푸시
- **게이트 기준:** tsc 0 · vitest 205+ 통과 · build ✓ (실패 시 롤백, 통과만 커밋)

## 시작 시점 상태
- 브랜치: feat/global-competency-assessment
- 직전 커밋: 15fa116 fix(ui): 흰글씨 버튼 안 보이는 문제 — 임의 hex 배경을 @theme 토큰으로 교체
- 라이브: https://poc12labs.vercel.app (버튼 버그 수정 배포 완료)
- 진행 중 백그라운드: 프로덕션 아키텍처 리서치(5축) — 별도 산출물 예정

## 사이클 기록

### [사이클 1 · 22:52] 임의 hex → @theme 토큰 마이그레이션
- 진단: 버튼 투명 버그 근원 = Vercel 빌드 캐시(임의값 클래스 누락). 로컬은 26종 전부 생성.
- 조치: 활성 UI 임의 hex 색 110개(6색)를 토큰으로 마이그레이션(재발 차단 + 일관성).
- 검증: tsc0 · 205 · build✓ · 랜딩 렌더 정상. → 커밋·푸시 완료.

### [사이클 2 · 23:07] 채점·통계 도메인 수식 정확성
- 11건 확정 → 6 고유 수식 오류 수정: 루브릭 등급 컷 모순(같은 점수 두 등급)·공정성 효과크기 자기포함 희석·ICC CI 고정상수→F분포·MH χ²(1) p-value 오용·연속성보정 음수·증거 dedup 항목경계.
- 회귀 6개 추가. tsc0 · 211 · build✓ → 커밋·푸시.

### [산출물 · 23:14] 프로덕션 아키텍처 문서 (사용자 요청)
- 5축 웹 리서치+적대검증 → 초보자용 문서 작성: 시나리오 A(클라우드)/B(온프렘 air-gapped).
- 핵심 발견: TwelveLabs가 Marengo·Pegasus 완전 폐쇄망 배포 공식 제공(교차검증·gov 계약). Solar 온프렘도 제공.
- GPU BOM(Pegasus 80B→H100 4~8장, Solar 31B→1장, Marengo→L40S/L4), 촬영HW, 보안·망분리, "확인 필요" 6개.
- docs/2026-06-20-프로덕션-아키텍처-클라우드vs온프렘.md → 커밋·푸시.

### [사이클 3 · 23:24] 리포트·내용평가 파이프라인
- 14건 확정 → 핵심 수정: 리포트 빈객체 호출(빈 레이더·'—'·camelCase) 실데이터 배선+빈상태 가드 / 내용평가 '교수확정'을 행동확정과 분리(거짓진술 차단, dohan1원칙) / PDF 헤더 소스 통일+내용평가 export 포함.
- 보류(기록): ISOAuditView 실 감사·동의 데이터 배선(IndexedDB 스토어 의존, 빈배열 안전·크래시 없음). 내용평가 인용→전사 seek 링크(P2). IntegratedReport derailerRisk 매핑(P2).
- tsc0 · 211 · build✓ · 콘솔0 → 커밋·푸시.

### [사이클 4 · 23:38] 훅·스토어 비동기/생명주기/무결성
- 6건 확정 → 4 고유 수정: GroupManager stale세션 lost-update(loadSession 재읽기+clone) / autoSaveToast 가드가 부모 재보고 차단(분리) / ObjectURL 누수(revoke+언마운트정리) / useMultimodalPipeline 언마운트 미보호(mountedRef 가드).
- tsc0 · 211 · build✓ → 커밋·푸시.

### [사이클 5 · SECURITY] 보안·입력검증 감사 (배포됨)
- 14건 확정 → 핵심 수정·배포: **P0 — /api/tl-token이 마스터 API키를 브라우저에 반환 + origin 검사 fail-open/부분문자열 우회** → Origin/Referer 정확매칭 fail-closed. **라이브 검증: curl→403·키노출0·부분문자열우회→403.**
- XSS 4건: renderReport 블랙리스트→allowlist 선이스케이프, buildReportHtml videoTitle/label escHtml.
- rate limit: derailer/analyze·multimodal-extract(10/분)·content-eval(30/분)+전사 상한.
- **⚠️ 구조적 권고(사용자 결정 필요):** tl-token 강화는 즉시 완화일 뿐, 마스터키가 여전히 브라우저로 감. 근본해결 = 파일업로드를 서버 프록시(/api/twelvelabs/upload)로 일원화하거나 TwelveLabs 스코프 단기 토큰 발급. 단 직접업로드는 Vercel 본문 용량제한 회피용이라 대용량 영상 업로드가 깨질 수 있음 → 트레이드오프 판단 필요. (온프렘 전환 시 자연 해소)
- 미적용(비활성 UI·코드만): pov-instructor-notes 입력검증, lecture/parse-ppt 파일크기, session/create URL검증(SSRF). 활성화 시 처리 권장.
- tsc0 · 211 · build✓ → 커밋·푸시·**배포**.

### [사이클 6] 핵심 분석 파이프라인 정확성
- 13건 확정 → 7 수정: 헤더 컷 SSOT 정렬 / STAR 단일문자 오매칭 라인앵커 / BEI 영문키 한글라벨 / 등급라벨 경계중복 / Hogan 척도명(Argumentative→Skeptical) / richnessScore 데드코드 / gap-snap 주석.
- 보류(동작변경 위험·P2): generateAIScore 근거게이트, Marengo confidence 미사용 융합, differentiating 게이트, derailer 증거 정규식 확장. (의도·트레이드오프 판단 필요)
- tsc0 · 211 · build✓ → 커밋·푸시.

### [사이클 7] 접근성 라운드2
- 4건 확정(수확 체감 — iter28이 a11y 대량 처리) → 5 수정: coachName 입력 aria-label, 챕터 막대 버튼 aria-label+current, TranscriptTimeline 카드 중첩인터랙티브 제거, SpeakerRoleMapping 입력 라벨.
- tsc0 · 211 · build✓ → 커밋·푸시.

### [사이클 8] 배포 + 종합 라이브 QA (검증)
- 누적 변경(C1~C7) 최신 상태 프로덕션 배포.
- 라이브 QA: **P0 보안 tl-token→403(키노출 차단 유지) · 수업시작 버튼 배경 rgb(0,99,65) 가시 · 콘솔 에러 0 · 메인 화면 시각 무결**.
- 50여 건 수정 후에도 앱 정상 동작 확인("돌아간다").

### [사이클 9] 회귀 테스트 보강 (검증·보강)
- 사이클6/7 수정 영구 잠금: STAR 라인앵커 오매칭 방지·completeness, derailer Hogan 척도 유효성(+7 테스트).
- 전체 218 테스트(세션 중 +13: C2 +11 도메인수식, C9 +7 파이프라인... 누적 207→218).
- tsc0 → 커밋·푸시.

### [사이클 10] harden 라운드2(복원력)
- 8건 확정 → 수정: 내용평가 보류/오류 시 '확정' 버튼 차단(거짓확정 방지) / VideoUploader·GroupManager 중복업로드 가드 / 멤버 이름 truncate·coachName maxLength.
- tsc0 · 218 · build✓ · 콘솔0 → 커밋·푸시.

### [사이클 11] 데이터 레이어 정확성
- 19건 확정(중복多) → 5 고유 수정: growth 0패딩 거짓신호·cohenD NaN(공정성)·norm 키손실·transcript argmax/dedup/true-median. +회귀7.
- 보류: slide-matcher coverage(비활성 lecture). 전체 225 테스트.
- tsc0 · 225 · build✓ → 커밋·푸시.

### [사이클 12] 배포 + 성능 재측정 (검증)
- C9~C11 최신 배포. 측정: 라이브 콜드 2856ms(콜드스타트 아티팩트)·웜 ~1500ms(good)·로컬 1384ms · CLS 0 · 번들 116kB(회귀0) · 보안 403 · 콘솔 0.
- 결론: 50여 건 수정에도 성능 회귀 없음. 추가 perf는 폰트CDN 의존(iter36 preconnect 완료)이라 churn 없이 마무리.
