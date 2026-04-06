# 교수자 강의평가 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PPT 강의안 대비 내용 충실도 + 멀티모달 전달력을 듀얼 엔진으로 평가하는 교수자 강의평가 서비스 구축

**Architecture:** 기존 리더십/POV 패턴을 따르는 3번째 서비스 탭. 내용 충실도 엔진(PPT 파싱→3계층 분석)과 전달력 엔진(멀티모달 5채널+교수법 3지표)을 분리하고 통합 스코어링. PPT는 선택 입력으로, 미첨부 시 전달력만 100점 환산.

**Tech Stack:** Next.js 14 App Router, TypeScript, TwelveLabs API, Solar/Upstage API, Recharts, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-06-lecture-evaluation-design.md`

---

## 파일 구조

### 신규 생성
```
src/lib/lecture-types.ts                    # 강의평가 전용 타입
src/lib/lecture-scoring.ts                  # 통합 스코어링 엔진 (100점 환산)
src/lib/slide-matcher.ts                   # 전사↔슬라이드 매칭 로직
src/lib/pptx-parser.ts                     # .pptx ZIP→XML→슬라이드+노트 추출
src/hooks/useLectureAnalysis.ts            # 분석 파이프라인 오케스트레이터
src/app/api/lecture/parse-ppt/route.ts     # PPT 업로드 → 파싱 API
src/app/api/lecture/analyze/route.ts       # 분석 시작 (비동기 Job)
src/app/api/lecture/analyze/status/route.ts # 분석 상태 폴링
src/app/api/lecture/pedagogy-extract/route.ts # 교수법 3지표 추출
src/components/lecture/LectureEvaluation.tsx # 메인 서비스 컴포넌트
src/components/lecture/PptUploader.tsx      # PPT 업로드 컴포넌트
src/components/lecture/LectureProgress.tsx  # 분석 진행률 UI
src/components/lecture/LectureDashboard.tsx # 종합 결과 대시보드
src/components/lecture/SlideMap.tsx         # 슬라이드 커버리지 시각화
src/components/lecture/ConceptMatchTable.tsx # 핵심 개념 매칭 테이블
src/components/lecture/LectureRadar.tsx     # 8축 레이더 차트
src/components/lecture/LectureTimeline.tsx  # 타임라인 하이라이트
src/components/lecture/LectureHistory.tsx   # 이력/추이
```

### 수정
```
src/lib/types.ts:276                       # ServiceTab에 "lecture" 추가
src/lib/constants.ts:4-34                  # TWELVELABS_INDEXES, SERVICE_TABS에 lecture 추가
src/app/page.tsx:16-52                     # LectureEvaluation lazy import + 렌더링
src/components/landing/Landing.tsx:11-94   # Station 03 추가 + 3열 그리드
src/hooks/useKeyboardShortcuts.ts:42-64    # 키 3 = lecture 추가
src/components/shared/KeyboardHelp.tsx:14-17 # 단축키 3 항목 추가
src/components/layout/Header.tsx:38-41     # glowColorMap에 lecture 추가
src/components/layout/Footer.tsx:7-10      # FOOTER_LINKS에 lecture 추가
src/app/layout.tsx:15-34                   # 메타데이터에 강의평가 추가
```

---

### Task 1: 타입 정의 + 인프라 등록

**Files:**
- Create: `src/lib/lecture-types.ts`
- Modify: `src/lib/types.ts:276`
- Modify: `src/lib/constants.ts:4-34`

- [ ] **Step 1: 강의평가 전용 타입 파일 생성**

```typescript
// src/lib/lecture-types.ts

// PPT 파싱 결과
export interface ParsedSlide {
  index: number;
  title: string;
  bodyText: string;
  notes: string;
  keyConcepts?: string[];
}

export interface ParsedPpt {
  fileName: string;
  slideCount: number;
  slides: ParsedSlide[];
  totalNotesLength: number;
}

// 내용 충실도 — Layer 1: 슬라이드별 커버리지
export interface SlideCoverage {
  slideIndex: number;
  slideTitle: string;
  coveragePercent: number;
  matchedSegments: { start: number; end: number; text: string }[];
}

// 내용 충실도 — Layer 2: 핵심 개념 매칭
export interface ConceptMatch {
  concept: string;
  definition: string;
  slideIndex: number;
  status: "found" | "partial" | "missing";
  timestamp?: number;
  evidence?: string;
}

// 내용 충실도 — Layer 3: 전달 품질
export interface DeliveryQuality {
  conceptOrSlide: string;
  exampleUsage: number;       // 0-3
  repetitionSummary: number;  // 0-3
  learnerInteraction: number; // 0-3
  logicalConnection: number;  // 0-3
  totalScore: number;         // 0-12
}

// 내용 충실도 통합
export interface ContentFidelityResult {
  slideCoverages: SlideCoverage[];
  conceptMatches: ConceptMatch[];
  deliveryQualities: DeliveryQuality[];
  overallCoveragePercent: number;
  conceptMatchRate: number;
  deliveryQualityAvg: number;
  score: number; // 0-50
}

// 교수법 확장 지표
export interface PedagogyIndicator {
  key: "learnerEngagement" | "slidePointing" | "transitionSignal";
  label: string;
  score: number;  // 0-5
  count: number;
  evidence: string[];
}

// 전달력 통합 (멀티모달 + 교수법)
export interface DeliveryResult {
  multimodalScore: number;     // 0-35 (기존 0-9 → 35점 변환)
  multimodalRaw: number;       // 0-9 원본
  pedagogyIndicators: PedagogyIndicator[];
  pedagogyScore: number;       // 0-15
  score: number;               // 0-50
}

// 강의평가 종합 결과
export interface LectureEvaluationResult {
  id: string;
  videoId: string;
  instructorName: string;
  courseName: string;
  date: string;
  hasPpt: boolean;
  // 듀얼 엔진 결과
  delivery: DeliveryResult;
  contentFidelity: ContentFidelityResult | null; // PPT 없으면 null
  // 통합
  totalScore: number;  // 0-100
  grade: string;       // 탁월/우수/보통/미흡
  report?: string;     // Solar 리포트
  // 타임라인 하이라이트
  highlights: LectureHighlight[];
  analyzedAt: string;
}

export interface LectureHighlight {
  timestamp: number;
  type: "positive" | "warning" | "negative";
  category: "content" | "delivery" | "pedagogy";
  description: string;
}

// 분석 Job
export type LectureAnalysisStage =
  | "transcription"
  | "pptParsing"
  | "contentFidelity"
  | "multimodal"
  | "pedagogy"
  | "scoring"
  | "reporting";

export type StageStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface LectureAnalysisJob {
  id: string;
  videoId: string;
  pptData: ParsedPpt | null;
  instructorName: string;
  courseName: string;
  status: "analyzing" | "complete" | "error";
  progress: number;
  stages: Record<LectureAnalysisStage, StageStatus>;
  result?: LectureEvaluationResult;
  error?: string;
}
```

- [ ] **Step 2: ServiceTab에 lecture 추가**

`src/lib/types.ts` 276행:
```typescript
export type ServiceTab = "leadership" | "pov" | "lecture";
```

- [ ] **Step 3: constants.ts에 인덱스 + 탭 정보 추가**

`src/lib/constants.ts` TWELVELABS_INDEXES에 추가:
```typescript
export const TWELVELABS_INDEXES = {
  leadership: "69ccf4b781e81bcd08ca5487",
  pov: "69ccf4b881e81bcd08ca5488",
  lecture: "placeholder-lecture-index",
} as const;
```

SERVICE_TABS 배열 끝에 추가:
```typescript
  {
    key: "lecture",
    label: "교수자 강의평가",
    description: "강의 영상과 강의안을 AI로 분석하여 전달력과 내용 충실도를 정량 평가합니다.",
    color: "text-coral-600",
    bgColor: "bg-coral-500/10",
    borderColor: "border-coral-500/30",
  },
```

- [ ] **Step 4: 빌드 확인**

Run: `npx next build 2>&1 | tail -5`
Expected: 빌드 성공 (ServiceTab 사용처에서 타입 에러 없음 — Record<ServiceTab, ...> 에 lecture 키가 없는 곳 수정 필요)

- [ ] **Step 5: ServiceTab Record 타입 사용처 수정**

타입 에러가 발생하는 파일들에 `lecture` 키 추가:
- `src/components/landing/Landing.tsx` — STATIONS 배열에 Station 03 추가 (Task 2에서 처리)
- `src/components/dashboard/ServiceCard.tsx` — 이미 삭제됨
- 기타 Record<ServiceTab, ...> 사용처

- [ ] **Step 6: 커밋**

```bash
git add src/lib/lecture-types.ts src/lib/types.ts src/lib/constants.ts
git commit -m "feat(lecture): 강의평가 타입 정의 + ServiceTab·constants 등록"
```

---

### Task 2: 랜딩 + 네비게이션 통합

**Files:**
- Modify: `src/components/landing/Landing.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/components/shared/KeyboardHelp.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/components/lecture/LectureEvaluation.tsx` (스텁)

- [ ] **Step 1: Landing.tsx에 Station 03 추가**

STATIONS 배열에 3번째 항목 추가:
```typescript
  {
    key: "lecture" as ServiceTab,
    number: "03",
    title: "교수자",
    subtitle: "강의평가",
    tagline: "전달력 + 내용 충실도 듀얼 분석",
    description: "강의 영상과 강의안(PPT)을 AI로 분석하여 전달력과 강의 내용 전달 충실도를 정량 평가합니다.",
    features: [
      "PPT 슬라이드별 커버리지 분석",
      "핵심 개념 의미론적 매칭",
      "멀티모달 5채널 전달력 평가",
      "교수법 특화 지표 (질문유도·포인팅·전환)",
    ],
    accentColor: "var(--color-coral-500)",
    bgTint: "var(--color-coral-50)",
    borderAccent: "var(--color-coral-200)",
    hoverBg: "var(--color-coral-100)",
    textAccent: "var(--color-coral-700)",
    textLight: "var(--color-coral-600)",
    dotColor: "bg-coral-500",
    btnClass: "bg-coral-600 hover:bg-coral-700 focus-visible:ring-coral-400",
  },
```

그리드를 `md:grid-cols-3`으로 변경:
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
```

- [ ] **Step 2: page.tsx에 LectureEvaluation 추가**

```typescript
const LectureEvaluation = lazy(() => import("@/components/lecture/LectureEvaluation"));
```

Suspense 내부에 추가:
```typescript
{activeTab === "lecture" && <LectureEvaluation />}
```

- [ ] **Step 3: 단축키·헤더·푸터 업데이트**

`useKeyboardShortcuts.ts` switch문에:
```typescript
case "3":
  e.preventDefault();
  onTabChange("lecture");
  break;
```

JSDoc 주석도 `* - 3: 교수자 강의평가` 추가.

`KeyboardHelp.tsx` items에:
```typescript
{ key: "3", description: "교수자 강의평가" },
```

`Header.tsx` glowColorMap에:
```typescript
lecture: "from-coral-500 via-coral-400/40 to-transparent",
```

`Footer.tsx` FOOTER_LINKS에:
```typescript
{ key: "lecture", label: "강의평가", color: "hover:text-coral-600" },
```

- [ ] **Step 4: layout.tsx 메타데이터 업데이트**

description들을:
```
"리더십 코칭·POV 분석·강의평가를 위한 AI 영상 역량 평가 플랫폼"
```

- [ ] **Step 5: LectureEvaluation 스텁 컴포넌트 생성**

```typescript
// src/components/lecture/LectureEvaluation.tsx
"use client";

export default function LectureEvaluation() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 animate-slide-in-right">
      <div>
        <h2 className="text-2xl font-bold text-coral-600 tracking-tight">교수자 강의평가</h2>
        <p className="text-lg text-slate-500 mt-1.5">
          강의 영상과 강의안을 AI로 분석하여 전달력과 내용 충실도를 정량 평가
        </p>
      </div>
      <div className="mt-8 text-center text-slate-400 py-20">
        구현 준비 중
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -5`

```bash
git add src/components/landing/Landing.tsx src/app/page.tsx src/hooks/useKeyboardShortcuts.ts \
  src/components/shared/KeyboardHelp.tsx src/components/layout/Header.tsx \
  src/components/layout/Footer.tsx src/app/layout.tsx src/components/lecture/LectureEvaluation.tsx
git commit -m "feat(lecture): 랜딩 Station 03 + 네비게이션 통합 + 스텁 컴포넌트"
```

---

### Task 3: PPT 파싱 엔진

**Files:**
- Create: `src/lib/pptx-parser.ts`
- Create: `src/app/api/lecture/parse-ppt/route.ts`

- [ ] **Step 1: pptx-parser.ts 구현**

.pptx는 ZIP 파일이며 내부에 `ppt/slides/slide{N}.xml`과 `ppt/notesSlides/notesSlide{N}.xml` 포함.
Node.js 내장 모듈로 파싱 (외부 의존성 없음):

```typescript
// src/lib/pptx-parser.ts
import { createLogger } from "./logger";
import type { ParsedSlide, ParsedPpt } from "./lecture-types";

const log = createLogger("pptx-parser");

// XML에서 텍스트 노드 추출 (정규식 기반 경량 파서)
function extractTextFromXml(xml: string): string {
  // <a:t>텍스트</a:t> 패턴에서 텍스트 추출
  const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
  return matches
    .map((m) => m.replace(/<[^>]+>/g, ""))
    .join(" ")
    .trim();
}

// 슬라이드 제목 추출 (ph type="title" 또는 "ctrTitle")
function extractTitle(xml: string): string {
  // <p:sp> 안에 <p:ph type="title"/> 또는 type="ctrTitle" 인 shape의 텍스트
  const titleMatch = xml.match(
    /<p:sp>[\s\S]*?<p:ph[^>]*type="(?:title|ctrTitle)"[^>]*\/>[\s\S]*?<p:txBody>([\s\S]*?)<\/p:txBody>[\s\S]*?<\/p:sp>/
  );
  if (!titleMatch) return "";
  return extractTextFromXml(titleMatch[1]);
}

export async function parsePptxBuffer(
  buffer: ArrayBuffer,
  fileName: string
): Promise<ParsedPpt> {
  // dynamic import for Node.js built-in 'zlib' isn't needed;
  // we use the JSZip-like approach with raw ZIP parsing
  // But simpler: use the 'unzipper' pattern or built-in DecompressionStream
  // For server-side Next.js, we can use Node.js APIs

  const { Readable } = await import("stream");
  const { createInflateRaw } = await import("zlib");

  // Parse ZIP manually using Buffer
  const buf = Buffer.from(buffer);
  const entries = parseZipEntries(buf);

  const slideXmls: Map<number, string> = new Map();
  const notesXmls: Map<number, string> = new Map();

  for (const entry of entries) {
    const slideMatch = entry.name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (slideMatch) {
      const content = inflateEntry(entry, createInflateRaw);
      slideXmls.set(parseInt(slideMatch[1]), content);
    }
    const notesMatch = entry.name.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/);
    if (notesMatch) {
      const content = inflateEntry(entry, createInflateRaw);
      notesXmls.set(parseInt(notesMatch[1]), content);
    }
  }

  const slideCount = slideXmls.size;
  const slides: ParsedSlide[] = [];

  for (let i = 1; i <= slideCount; i++) {
    const slideXml = slideXmls.get(i) || "";
    const notesXml = notesXmls.get(i) || "";

    slides.push({
      index: i,
      title: extractTitle(slideXml) || `슬라이드 ${i}`,
      bodyText: extractTextFromXml(slideXml),
      notes: extractTextFromXml(notesXml),
    });
  }

  const totalNotesLength = slides.reduce((sum, s) => sum + s.notes.length, 0);

  log.info("PPT 파싱 완료", { fileName, slideCount, totalNotesLength });

  return { fileName, slideCount, slides, totalNotesLength };
}

// ─── ZIP 파싱 유틸리티 (Node.js Buffer 기반) ───

interface ZipEntry {
  name: string;
  compressedData: Buffer;
  compressionMethod: number;
  uncompressedSize: number;
}

function parseZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset < buf.length - 4) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // Local file header signature

    const compressionMethod = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const uncompressedSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    const compressedData = buf.subarray(dataStart, dataStart + compressedSize);

    entries.push({ name, compressedData, compressionMethod, uncompressedSize });
    offset = dataStart + compressedSize;
  }

  return entries;
}

function inflateEntry(
  entry: ZipEntry,
  createInflateRaw: typeof import("zlib").createInflateRaw
): string {
  if (entry.compressionMethod === 0) {
    return entry.compressedData.toString("utf8");
  }
  // Deflate (method 8) — synchronous inflate
  const { inflateRawSync } = require("zlib");
  try {
    const result = inflateRawSync(entry.compressedData);
    return result.toString("utf8");
  } catch {
    return "";
  }
}
```

- [ ] **Step 2: parse-ppt API 라우트 구현**

```typescript
// src/app/api/lecture/parse-ppt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parsePptxBuffer } from "@/lib/pptx-parser";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:lecture/parse-ppt");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
    }

    if (!file.name.endsWith(".pptx")) {
      return NextResponse.json({ error: ".pptx 파일만 지원합니다" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const result = await parsePptxBuffer(buffer, file.name);

    log.info("PPT 파싱 성공", {
      fileName: result.fileName,
      slideCount: result.slideCount,
      totalNotesLength: result.totalNotesLength,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "PPT 파싱 실패";
    log.error("PPT 파싱 에러", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -5`

```bash
git add src/lib/pptx-parser.ts src/app/api/lecture/parse-ppt/route.ts
git commit -m "feat(lecture): PPT 파싱 엔진 — .pptx ZIP→XML→슬라이드+노트 추출"
```

---

### Task 4: 통합 스코어링 엔진 + 슬라이드 매처

**Files:**
- Create: `src/lib/lecture-scoring.ts`
- Create: `src/lib/slide-matcher.ts`

- [ ] **Step 1: slide-matcher.ts 구현**

```typescript
// src/lib/slide-matcher.ts
import type { ParsedSlide, SlideCoverage, ConceptMatch, DeliveryQuality } from "./lecture-types";
import type { TranscriptSegment } from "./types";

// 슬라이드 노트와 전사 텍스트의 유사도를 단어 겹침 기반으로 계산
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^\w가-힣\s]/g, "").split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^\w가-힣\s]/g, "").split(/\s+/).filter(Boolean));
  if (wordsA.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / wordsA.size;
}

// Layer 1: 슬라이드별 커버리지 계산 (로컬 폴백용)
export function computeSlideCoverages(
  slides: ParsedSlide[],
  transcript: TranscriptSegment[]
): SlideCoverage[] {
  const fullText = transcript.map((s) => s.value).join(" ");

  return slides.map((slide) => {
    if (!slide.notes.trim()) {
      return {
        slideIndex: slide.index,
        slideTitle: slide.title,
        coveragePercent: 0,
        matchedSegments: [],
      };
    }

    // 각 전사 세그먼트와의 유사도 계산
    const matched = transcript
      .map((seg) => ({ ...seg, similarity: wordOverlap(slide.notes, seg.value) }))
      .filter((seg) => seg.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    const coveragePercent = Math.min(
      100,
      Math.round(wordOverlap(slide.notes, fullText) * 100)
    );

    return {
      slideIndex: slide.index,
      slideTitle: slide.title,
      coveragePercent,
      matchedSegments: matched.map((m) => ({
        start: m.start,
        end: m.end,
        text: m.value,
      })),
    };
  });
}

// Layer 2/3은 TwelveLabs generate API 결과를 파싱하여 구조화
export function parseConceptMatches(raw: Record<string, unknown>[]): ConceptMatch[] {
  return raw.map((item) => ({
    concept: String(item.concept || ""),
    definition: String(item.definition || ""),
    slideIndex: Number(item.slideIndex || 0),
    status: (item.status as ConceptMatch["status"]) || "missing",
    timestamp: item.timestamp ? Number(item.timestamp) : undefined,
    evidence: item.evidence ? String(item.evidence) : undefined,
  }));
}

export function parseDeliveryQualities(raw: Record<string, unknown>[]): DeliveryQuality[] {
  return raw.map((item) => {
    const ex = Number(item.exampleUsage || 0);
    const rep = Number(item.repetitionSummary || 0);
    const int = Number(item.learnerInteraction || 0);
    const log = Number(item.logicalConnection || 0);
    return {
      conceptOrSlide: String(item.conceptOrSlide || ""),
      exampleUsage: ex,
      repetitionSummary: rep,
      learnerInteraction: int,
      logicalConnection: log,
      totalScore: ex + rep + int + log,
    };
  });
}
```

- [ ] **Step 2: lecture-scoring.ts 구현**

```typescript
// src/lib/lecture-scoring.ts
import type {
  ContentFidelityResult,
  DeliveryResult,
  LectureEvaluationResult,
  LectureHighlight,
  PedagogyIndicator,
  SlideCoverage,
  ConceptMatch,
  DeliveryQuality,
} from "./lecture-types";

// 내용 충실도 점수 계산 (50점 만점)
export function scoreContentFidelity(
  coverages: SlideCoverage[],
  concepts: ConceptMatch[],
  qualities: DeliveryQuality[]
): ContentFidelityResult {
  // Layer 1: 슬라이드 커버리지 (15점)
  const avgCoverage =
    coverages.length > 0
      ? coverages.reduce((sum, c) => sum + c.coveragePercent, 0) / coverages.length
      : 0;
  const coverageScore = Math.round((avgCoverage / 100) * 15 * 10) / 10;

  // Layer 2: 핵심 개념 매칭 (20점)
  const totalConcepts = concepts.length || 1;
  const found = concepts.filter((c) => c.status === "found").length;
  const partial = concepts.filter((c) => c.status === "partial").length;
  const matchRate = (found + partial * 0.5) / totalConcepts;
  const conceptScore = Math.round(matchRate * 20 * 10) / 10;

  // Layer 3: 전달 품질 (15점)
  const avgQuality =
    qualities.length > 0
      ? qualities.reduce((sum, q) => sum + q.totalScore, 0) / qualities.length
      : 0;
  const qualityScore = Math.round((avgQuality / 12) * 15 * 10) / 10;

  return {
    slideCoverages: coverages,
    conceptMatches: concepts,
    deliveryQualities: qualities,
    overallCoveragePercent: Math.round(avgCoverage),
    conceptMatchRate: Math.round(matchRate * 100),
    deliveryQualityAvg: Math.round(avgQuality * 10) / 10,
    score: Math.round((coverageScore + conceptScore + qualityScore) * 10) / 10,
  };
}

// 전달력 점수 계산 (50점 만점)
export function scoreDelivery(
  multimodalRaw: number, // 0-9 (기존 멀티모달 총점)
  pedagogyIndicators: PedagogyIndicator[]
): DeliveryResult {
  // 멀티모달 (35점)
  const multimodalScore = Math.round((multimodalRaw / 9) * 35 * 10) / 10;

  // 교수법 (15점)
  const pedagogyScore = pedagogyIndicators.reduce((sum, p) => sum + p.score, 0);

  return {
    multimodalScore,
    multimodalRaw,
    pedagogyIndicators,
    pedagogyScore: Math.min(15, pedagogyScore),
    score: Math.round((multimodalScore + Math.min(15, pedagogyScore)) * 10) / 10,
  };
}

// 등급 판정
export function getLectureGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "탁월", color: "text-teal-600" };
  if (score >= 75) return { grade: "우수", color: "text-emerald-600" };
  if (score >= 60) return { grade: "보통", color: "text-amber-600" };
  return { grade: "미흡", color: "text-red-600" };
}

// 통합 점수 계산
export function computeTotalScore(
  delivery: DeliveryResult,
  contentFidelity: ContentFidelityResult | null
): number {
  if (!contentFidelity) {
    // PPT 미첨부: 전달력만 100점 환산
    return Math.round((delivery.score / 50) * 100 * 10) / 10;
  }
  return Math.round((delivery.score + contentFidelity.score) * 10) / 10;
}
```

- [ ] **Step 3: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -5`

```bash
git add src/lib/lecture-scoring.ts src/lib/slide-matcher.ts
git commit -m "feat(lecture): 통합 스코어링 엔진 + 슬라이드 매처"
```

---

### Task 5: 교수법 추출 + 분석 파이프라인 API

**Files:**
- Create: `src/app/api/lecture/pedagogy-extract/route.ts`
- Create: `src/app/api/lecture/analyze/route.ts`
- Create: `src/app/api/lecture/analyze/status/route.ts`

- [ ] **Step 1: pedagogy-extract API 구현**

```typescript
// src/app/api/lecture/pedagogy-extract/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:lecture/pedagogy-extract");
const TL_API_KEY = process.env.TWELVELABS_API_KEY || "";
const TL_BASE = "https://api.twelvelabs.io/v1.2";

const PEDAGOGY_PROMPTS = {
  learnerEngagement: `강의 영상에서 교수자가 학습자와 상호작용하는 장면을 분석하세요.
다음을 JSON으로 반환:
{
  "questionCount": 교수자가 학습자에게 질문한 횟수,
  "nameCallCount": 학습자를 이름으로 호명한 횟수,
  "confirmationCount": "이해되셨죠?", "맞죠?" 같은 확인 질문 횟수,
  "examples": ["타임스탬프: 설명", ...]
}
순수 JSON만 반환하세요. 마크다운 금지.`,

  slidePointing: `강의 영상에서 교수자가 슬라이드나 화면을 가리키며 설명하는 장면을 분석하세요.
다음을 JSON으로 반환:
{
  "pointingCount": 화면/슬라이드를 가리킨 횟수,
  "boardWritingCount": 판서를 한 횟수,
  "examples": ["타임스탬프: 설명", ...]
}
순수 JSON만 반환하세요. 마크다운 금지.`,

  transitionSignal: `강의 영상에서 교수자가 주제 전환이나 요약을 하는 구간을 분석하세요.
"정리하면", "다음으로", "지금까지", "요약하면" 같은 메타 담화를 찾으세요.
다음을 JSON으로 반환:
{
  "transitionCount": 주제 전환 시그널 횟수,
  "summaryCount": 요약/정리 횟수,
  "examples": ["타임스탬프: 설명", ...]
}
순수 JSON만 반환하세요. 마크다운 금지.`,
};

export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId 필요" }, { status: 400 });
    }

    if (!TL_API_KEY) {
      // 데모 폴백
      return NextResponse.json({
        indicators: [
          { key: "learnerEngagement", label: "학습자 질문 유도", score: 3, count: 5, evidence: ["데모 데이터"] },
          { key: "slidePointing", label: "슬라이드 포인팅", score: 4, count: 8, evidence: ["데모 데이터"] },
          { key: "transitionSignal", label: "요약·전환 시그널", score: 3, count: 6, evidence: ["데모 데이터"] },
        ],
      });
    }

    const results = await Promise.allSettled(
      Object.entries(PEDAGOGY_PROMPTS).map(async ([key, prompt]) => {
        const res = await fetch(`${TL_BASE}/generate`, {
          method: "POST",
          headers: {
            "x-api-key": TL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ video_id: videoId, prompt }),
        });
        const data = await res.json();
        const text = data?.data || "{}";
        // JSON 추출 (마크다운 코드블록 제거)
        const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        return { key, parsed: JSON.parse(cleaned) };
      })
    );

    const indicators = results.map((r) => {
      if (r.status === "rejected") {
        return { key: "unknown", label: "", score: 0, count: 0, evidence: [] };
      }
      const { key, parsed } = r.value;
      const totalCount = Object.values(parsed)
        .filter((v) => typeof v === "number")
        .reduce((a: number, b) => a + (b as number), 0);
      const examples = (parsed.examples as string[]) || [];

      // 점수 계산 (0-5): count 기반
      const score = Math.min(5, Math.round(totalCount / 2));

      const labelMap: Record<string, string> = {
        learnerEngagement: "학습자 질문 유도",
        slidePointing: "슬라이드 포인팅",
        transitionSignal: "요약·전환 시그널",
      };

      return { key, label: labelMap[key] || key, score, count: totalCount, evidence: examples };
    });

    return NextResponse.json({ indicators });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "교수법 추출 실패";
    log.error("교수법 추출 에러", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: analyze API (비동기 Job 시작)**

```typescript
// src/app/api/lecture/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import type { LectureAnalysisJob, LectureAnalysisStage, StageStatus } from "@/lib/lecture-types";

const log = createLogger("API:lecture/analyze");

// 인메모리 Job 스토어
const jobStore = new Map<string, LectureAnalysisJob>();

export function getJob(jobId: string): LectureAnalysisJob | undefined {
  return jobStore.get(jobId);
}

export function setJob(job: LectureAnalysisJob): void {
  jobStore.set(job.id, job);
}

const INITIAL_STAGES: Record<LectureAnalysisStage, StageStatus> = {
  transcription: "pending",
  pptParsing: "pending",
  contentFidelity: "pending",
  multimodal: "pending",
  pedagogy: "pending",
  scoring: "pending",
  reporting: "pending",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, pptData, instructorName, courseName } = body;

    if (!videoId) {
      return NextResponse.json({ error: "videoId 필요" }, { status: 400 });
    }

    const jobId = `lecture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hasPpt = !!(pptData && pptData.slides && pptData.slides.length > 0);

    const job: LectureAnalysisJob = {
      id: jobId,
      videoId,
      pptData: hasPpt ? pptData : null,
      instructorName: instructorName || "",
      courseName: courseName || "",
      status: "analyzing",
      progress: 0,
      stages: {
        ...INITIAL_STAGES,
        pptParsing: hasPpt ? "pending" : "skipped",
        contentFidelity: hasPpt ? "pending" : "skipped",
      },
    };

    setJob(job);

    // 비동기 파이프라인 실행 (fire-and-forget)
    runLectureAnalysisPipeline(job).catch((err) => {
      job.status = "error";
      job.error = err instanceof Error ? err.message : "분석 실패";
      setJob(job);
    });

    log.info("강의평가 분석 시작", { jobId, videoId, hasPpt });

    return NextResponse.json({ jobId, status: job.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "분석 시작 실패";
    log.error("분석 시작 에러", { error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// 파이프라인 구현은 Task 6에서 완성
async function runLectureAnalysisPipeline(job: LectureAnalysisJob): Promise<void> {
  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Stage 1: 전사 추출
  job.stages.transcription = "running";
  job.progress = 5;
  setJob(job);

  try {
    const indexId = process.env.TWELVELABS_LECTURE_INDEX || "placeholder-lecture-index";
    const txRes = await fetch(
      `${BASE}/api/twelvelabs/transcription?indexId=${indexId}&videoId=${job.videoId}`
    );
    const txData = await txRes.json();
    const transcript = txData.transcription || [];
    job.stages.transcription = "done";
    job.progress = 15;
    setJob(job);

    // Stage 2: PPT 파싱 (이미 클라이언트에서 파싱되어 job.pptData에 있음)
    if (job.pptData) {
      job.stages.pptParsing = "done";
    }
    job.progress = 20;
    setJob(job);

    // Stage 3: 내용 충실도 (PPT 있을 때만)
    let contentFidelityResult = null;
    if (job.pptData) {
      job.stages.contentFidelity = "running";
      job.progress = 25;
      setJob(job);

      // 로컬 매칭 (폴백)
      const { computeSlideCoverages } = await import("@/lib/slide-matcher");
      const coverages = computeSlideCoverages(job.pptData.slides, transcript);
      const { scoreContentFidelity } = await import("@/lib/lecture-scoring");
      contentFidelityResult = scoreContentFidelity(coverages, [], []);

      job.stages.contentFidelity = "done";
      job.progress = 45;
      setJob(job);
    }

    // Stage 4: 멀티모달 5채널
    job.stages.multimodal = "running";
    job.progress = 50;
    setJob(job);

    let multimodalRaw = 0;
    try {
      const mmRes = await fetch(`${BASE}/api/twelvelabs/multimodal-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: job.videoId, channel: "all" }),
      });
      if (mmRes.ok) {
        const mmData = await mmRes.json();
        multimodalRaw = mmData.totalScore ?? 5; // 폴백 중간값
      }
    } catch {
      multimodalRaw = 5; // 폴백
    }

    job.stages.multimodal = "done";
    job.progress = 65;
    setJob(job);

    // Stage 5: 교수법 3지표
    job.stages.pedagogy = "running";
    job.progress = 70;
    setJob(job);

    let pedagogyIndicators = [];
    try {
      const pedRes = await fetch(`${BASE}/api/lecture/pedagogy-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: job.videoId }),
      });
      const pedData = await pedRes.json();
      pedagogyIndicators = pedData.indicators || [];
    } catch {
      pedagogyIndicators = [];
    }

    job.stages.pedagogy = "done";
    job.progress = 80;
    setJob(job);

    // Stage 6: 통합 스코어링
    job.stages.scoring = "running";
    job.progress = 85;
    setJob(job);

    const { scoreDelivery, computeTotalScore, getLectureGrade } = await import("@/lib/lecture-scoring");
    const delivery = scoreDelivery(multimodalRaw, pedagogyIndicators);
    const totalScore = computeTotalScore(delivery, contentFidelityResult);
    const { grade } = getLectureGrade(totalScore);

    job.stages.scoring = "done";
    job.progress = 90;
    setJob(job);

    // Stage 7: 리포트 생성
    job.stages.reporting = "running";
    job.progress = 92;
    setJob(job);

    let report = "";
    try {
      const reportRes = await fetch(`${BASE}/api/solar/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoringResult: { totalScore: multimodalRaw, interpretation: grade },
          competencyLabel: "강의 전달력",
          scenarioText: `교수자: ${job.instructorName}, 과목: ${job.courseName}`,
        }),
      });
      const reportData = await reportRes.json();
      report = reportData.report || "";
    } catch {
      report = `${job.instructorName} 교수자의 ${job.courseName} 강의 평가 결과: ${totalScore}점 (${grade})`;
    }

    job.stages.reporting = "done";
    job.progress = 100;
    setJob(job);

    // 결과 저장
    job.result = {
      id: job.id,
      videoId: job.videoId,
      instructorName: job.instructorName,
      courseName: job.courseName,
      date: new Date().toISOString(),
      hasPpt: !!job.pptData,
      delivery,
      contentFidelity: contentFidelityResult,
      totalScore,
      grade,
      report,
      highlights: [],
      analyzedAt: new Date().toISOString(),
    };

    job.status = "complete";
    setJob(job);

    log.info("강의평가 분석 완료", { jobId: job.id, totalScore, grade });
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : "파이프라인 실패";
    setJob(job);
    throw err;
  }
}
```

- [ ] **Step 3: analyze/status API**

```typescript
// src/app/api/lecture/analyze/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getJob } from "../route";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId 필요" }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job 없음" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    stages: job.stages,
    result: job.result || null,
    error: job.error || null,
  });
}
```

- [ ] **Step 4: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -5`

```bash
git add src/app/api/lecture/
git commit -m "feat(lecture): 교수법 추출 + 분석 파이프라인 API (비동기 Job)"
```

---

### Task 6: useLectureAnalysis 훅

**Files:**
- Create: `src/hooks/useLectureAnalysis.ts`

- [ ] **Step 1: 훅 구현**

```typescript
// src/hooks/useLectureAnalysis.ts
"use client";

import { useState, useCallback, useRef } from "react";
import type {
  ParsedPpt,
  LectureAnalysisJob,
  LectureEvaluationResult,
  LectureAnalysisStage,
  StageStatus,
} from "@/lib/lecture-types";

interface LectureAnalysisState {
  status: "idle" | "uploading-ppt" | "analyzing" | "complete" | "error";
  pptData: ParsedPpt | null;
  progress: number;
  stages: Record<LectureAnalysisStage, StageStatus> | null;
  result: LectureEvaluationResult | null;
  error: string | null;
}

const INITIAL_STATE: LectureAnalysisState = {
  status: "idle",
  pptData: null,
  progress: 0,
  stages: null,
  result: null,
  error: null,
};

export function useLectureAnalysis() {
  const [state, setState] = useState<LectureAnalysisState>(INITIAL_STATE);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // PPT 업로드 + 파싱
  const uploadPpt = useCallback(async (file: File): Promise<ParsedPpt | null> => {
    setState((prev) => ({ ...prev, status: "uploading-ppt", error: null }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/lecture/parse-ppt", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "PPT 파싱 실패");
      }
      const pptData: ParsedPpt = await res.json();
      setState((prev) => ({ ...prev, status: "idle", pptData }));
      return pptData;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PPT 업로드 실패";
      setState((prev) => ({ ...prev, status: "error", error: msg }));
      return null;
    }
  }, []);

  // 분석 시작
  const startAnalysis = useCallback(
    async (videoId: string, instructorName: string, courseName: string) => {
      stopPolling();
      setState((prev) => ({
        ...prev,
        status: "analyzing",
        progress: 0,
        stages: null,
        result: null,
        error: null,
      }));

      try {
        const res = await fetch("/api/lecture/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            pptData: state.pptData,
            instructorName,
            courseName,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "분석 시작 실패");
        }

        const { jobId } = await res.json();

        // 폴링 시작 (3초 간격)
        pollingRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/lecture/analyze/status?jobId=${jobId}`);
            const statusData = await statusRes.json();

            setState((prev) => ({
              ...prev,
              progress: statusData.progress ?? prev.progress,
              stages: statusData.stages ?? prev.stages,
            }));

            if (statusData.status === "complete") {
              setState((prev) => ({
                ...prev,
                status: "complete",
                progress: 100,
                result: statusData.result,
                stages: statusData.stages,
              }));
              stopPolling();
            } else if (statusData.status === "error") {
              setState((prev) => ({
                ...prev,
                status: "error",
                error: statusData.error || "분석 실패",
                stages: statusData.stages,
              }));
              stopPolling();
            }
          } catch {
            // 폴링 에러는 무시 (다음 폴링에서 재시도)
          }
        }, 3000);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "분석 시작 실패";
        setState((prev) => ({ ...prev, status: "error", error: msg }));
      }
    },
    [state.pptData, stopPolling]
  );

  const reset = useCallback(() => {
    stopPolling();
    setState(INITIAL_STATE);
  }, [stopPolling]);

  return {
    ...state,
    uploadPpt,
    startAnalysis,
    reset,
  };
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -5`

```bash
git add src/hooks/useLectureAnalysis.ts
git commit -m "feat(lecture): useLectureAnalysis 훅 — PPT 업로드 + 분석 폴링"
```

---

### Task 7: UI — 메인 컴포넌트 + 업로드 화면

**Files:**
- Modify: `src/components/lecture/LectureEvaluation.tsx` (스텁 → 실제 구현)
- Create: `src/components/lecture/PptUploader.tsx`
- Create: `src/components/lecture/LectureProgress.tsx`

- [ ] **Step 1: PptUploader 컴포넌트**

```typescript
// src/components/lecture/PptUploader.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Upload, Check, X } from "lucide-react";
import type { ParsedPpt } from "@/lib/lecture-types";

interface PptUploaderProps {
  pptData: ParsedPpt | null;
  onUpload: (file: File) => Promise<ParsedPpt | null>;
  loading?: boolean;
}

export default function PptUploader({ pptData, onUpload, loading }: PptUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".pptx")) return;
      await onUpload(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (pptData) {
    return (
      <div className="border border-coral-200 bg-coral-50/50 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-coral-100 flex items-center justify-center">
          <Check className="w-5 h-5 text-coral-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{pptData.fileName}</p>
          <p className="text-xs text-slate-500">
            {pptData.slideCount}장 슬라이드 · 노트 {pptData.slides.filter((s) => s.notes.trim()).length}장
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-coral-600 hover:text-coral-700 font-medium"
        >
          변경
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pptx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
        dragOver
          ? "border-coral-400 bg-coral-50"
          : "border-slate-200 hover:border-coral-300 hover:bg-coral-50/30"
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-3">
        {loading ? (
          <div className="w-5 h-5 border-2 border-coral-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <FileText className="w-5 h-5 text-slate-400" />
        )}
      </div>
      <p className="text-sm text-slate-600 font-medium">
        {loading ? "PPT 파싱 중..." : "강의안 PPT 첨부 (선택)"}
      </p>
      <p className="text-xs text-slate-400 mt-1">.pptx 파일 · 슬라이드 노트가 강의스크립트로 사용됩니다</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pptx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: LectureProgress 컴포넌트**

```typescript
// src/components/lecture/LectureProgress.tsx
"use client";

import type { LectureAnalysisStage, StageStatus } from "@/lib/lecture-types";
import { Check, Loader2, Circle, SkipForward, AlertCircle } from "lucide-react";

interface LectureProgressProps {
  progress: number;
  stages: Record<LectureAnalysisStage, StageStatus> | null;
}

const STAGE_LABELS: Record<LectureAnalysisStage, string> = {
  transcription: "전사 추출",
  pptParsing: "PPT 파싱",
  contentFidelity: "내용 충실도 분석",
  multimodal: "멀티모달 전달력 분석",
  pedagogy: "교수법 지표 추출",
  scoring: "통합 스코어링",
  reporting: "리포트 생성",
};

const STATUS_ICON: Record<StageStatus, React.ReactNode> = {
  pending: <Circle className="w-4 h-4 text-slate-300" />,
  running: <Loader2 className="w-4 h-4 text-coral-500 animate-spin" />,
  done: <Check className="w-4 h-4 text-emerald-500" />,
  skipped: <SkipForward className="w-4 h-4 text-slate-300" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
};

export default function LectureProgress({ progress, stages }: LectureProgressProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      {/* 전체 진행률 바 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">분석 진행 중</span>
          <span className="text-sm font-mono text-coral-600">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-coral-400 to-coral-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 스테이지 목록 */}
      {stages && (
        <div className="space-y-2">
          {(Object.entries(stages) as [LectureAnalysisStage, StageStatus][]).map(([stage, status]) => (
            <div key={stage} className="flex items-center gap-3 py-1.5">
              {STATUS_ICON[status]}
              <span
                className={`text-sm ${
                  status === "running"
                    ? "text-coral-600 font-medium"
                    : status === "done"
                    ? "text-slate-700"
                    : "text-slate-400"
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
              {status === "skipped" && (
                <span className="text-xs text-slate-300 ml-auto">건너뜀</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: LectureEvaluation 메인 컴포넌트 구현**

```typescript
// src/components/lecture/LectureEvaluation.tsx
"use client";

import { useState, useCallback } from "react";
import { useLectureAnalysis } from "@/hooks/useLectureAnalysis";
import { useVideoUpload } from "@/hooks/useTwelveLabs";
import { TWELVELABS_INDEXES } from "@/lib/constants";
import VideoUploader from "@/components/shared/VideoUploader";
import PptUploader from "./PptUploader";
import LectureProgress from "./LectureProgress";

type Phase = "upload" | "analyzing" | "result";

export default function LectureEvaluation() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [instructorName, setInstructorName] = useState("");
  const [courseName, setCourseName] = useState("");

  const { progress: uploadProgress, upload, uploadByUrl } = useVideoUpload();
  const lecture = useLectureAnalysis();

  const handleVideoUpload = useCallback(
    async (file: File) => {
      try {
        const id = await upload(TWELVELABS_INDEXES.lecture, file);
        setVideoId(id);
      } catch {
        // 에러는 useVideoUpload에서 처리
      }
    },
    [upload]
  );

  const handleVideoUrlUpload = useCallback(
    async (url: string) => {
      try {
        const id = await uploadByUrl(TWELVELABS_INDEXES.lecture, url);
        setVideoId(id);
      } catch {
        // 에러는 useVideoUpload에서 처리
      }
    },
    [uploadByUrl]
  );

  const handleStartAnalysis = useCallback(async () => {
    if (!videoId) return;
    setPhase("analyzing");
    await lecture.startAnalysis(videoId, instructorName, courseName);
  }, [videoId, instructorName, courseName, lecture]);

  // 분석 완료 감지
  if (phase === "analyzing" && lecture.status === "complete") {
    setPhase("result");
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6 animate-slide-in-right">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-coral-600 tracking-tight">교수자 강의평가</h2>
        <p className="text-lg text-slate-500 mt-1.5">
          강의 영상과 강의안을 AI로 분석하여 전달력과 내용 충실도를 정량 평가
        </p>
      </div>

      {/* Phase 1: 업로드 */}
      {phase === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <VideoUploader
              onUpload={handleVideoUpload}
              onUrlUpload={handleVideoUrlUpload}
              progress={uploadProgress}
              accentColor="coral"
            />
            <PptUploader
              pptData={lecture.pptData}
              onUpload={lecture.uploadPpt}
              loading={lecture.status === "uploading-ppt"}
            />
          </div>
          <div className="space-y-4">
            {/* 강의 정보 입력 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="text-base font-medium text-slate-700">강의 정보</h4>
              <div>
                <label className="block text-sm text-slate-500 mb-1">교수자명</label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-coral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">과목명</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="원전 안전 관리"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-coral-400 focus:outline-none"
                />
              </div>

              {/* 분석 시작 버튼 */}
              <button
                onClick={handleStartAnalysis}
                disabled={!videoId || !instructorName.trim() || !courseName.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-coral-600 hover:bg-coral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                AI 강의평가 시작
              </button>

              {/* PPT 상태 표시 */}
              <p className="text-xs text-slate-400 text-center">
                {lecture.pptData
                  ? `✅ 강의안 ${lecture.pptData.slideCount}장 — 전달력 + 내용 충실도 분석`
                  : "📎 강의안 미첨부 — 전달력만 분석됩니다"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: 분석 중 */}
      {phase === "analyzing" && (
        <LectureProgress progress={lecture.progress} stages={lecture.stages} />
      )}

      {/* Phase 3: 결과 (Task 8에서 구현) */}
      {phase === "result" && lecture.result && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center">
          <p className="text-4xl font-bold font-mono text-slate-900">{lecture.result.totalScore}</p>
          <p className="text-lg text-slate-500 mt-1">/ 100</p>
          <span className={`text-xl font-bold mt-2 inline-block ${
            lecture.result.grade === "탁월" ? "text-teal-600" :
            lecture.result.grade === "우수" ? "text-emerald-600" :
            lecture.result.grade === "보통" ? "text-amber-600" : "text-red-600"
          }`}>
            {lecture.result.grade}
          </span>
          <p className="text-sm text-slate-400 mt-4">상세 결과 UI는 다음 단계에서 구현됩니다</p>
        </div>
      )}

      {/* 에러 */}
      {lecture.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600">{lecture.error}</p>
          <button
            onClick={() => { lecture.reset(); setPhase("upload"); }}
            className="mt-2 text-sm text-red-500 hover:text-red-700 font-medium"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -5`

```bash
git add src/components/lecture/
git commit -m "feat(lecture): 메인 UI — 업로드(영상+PPT) + 분석 진행률 + 결과 스텁"
```

---

### Task 8: UI — 결과 대시보드 + 슬라이드 맵 + 레이더

**Files:**
- Create: `src/components/lecture/LectureDashboard.tsx`
- Create: `src/components/lecture/SlideMap.tsx`
- Create: `src/components/lecture/ConceptMatchTable.tsx`
- Create: `src/components/lecture/LectureRadar.tsx`
- Modify: `src/components/lecture/LectureEvaluation.tsx` (Phase 3에 통합)

- [ ] **Step 1: SlideMap 컴포넌트**

슬라이드별 커버리지를 바 차트로 시각화:

```typescript
// src/components/lecture/SlideMap.tsx
"use client";

import type { SlideCoverage } from "@/lib/lecture-types";

interface SlideMapProps {
  coverages: SlideCoverage[];
}

function getCoverageColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  if (pct >= 20) return "bg-orange-500";
  return "bg-red-500";
}

function getCoverageLabel(pct: number): string {
  if (pct >= 80) return "충분";
  if (pct >= 50) return "부분";
  if (pct >= 20) return "부족";
  return "미전달";
}

export default function SlideMap({ coverages }: SlideMapProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h4 className="text-base font-medium text-slate-700 mb-4">슬라이드별 커버리지</h4>
      <div className="space-y-2">
        {coverages.map((c) => (
          <div key={c.slideIndex} className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0">
              {c.slideIndex}
            </span>
            <span className="text-sm text-slate-600 w-32 truncate shrink-0" title={c.slideTitle}>
              {c.slideTitle}
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div
                className={`h-full rounded-full ${getCoverageColor(c.coveragePercent)} transition-all duration-700`}
                style={{ width: `${c.coveragePercent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500 w-10 text-right">
              {c.coveragePercent}%
            </span>
            <span className={`text-xs w-12 text-right ${
              c.coveragePercent >= 80 ? "text-emerald-600" :
              c.coveragePercent >= 50 ? "text-amber-600" :
              c.coveragePercent >= 20 ? "text-orange-600" : "text-red-600"
            }`}>
              {getCoverageLabel(c.coveragePercent)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: LectureRadar 컴포넌트**

8축 레이더 차트 (멀티모달 5채널 + 교수법 3지표):

```typescript
// src/components/lecture/LectureRadar.tsx
"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from "recharts";
import type { DeliveryResult } from "@/lib/lecture-types";

interface LectureRadarProps {
  delivery: DeliveryResult;
}

export default function LectureRadar({ delivery }: LectureRadarProps) {
  // 멀티모달 5채널은 0-7점 (35점/5)으로 정규화
  const mmPerChannel = delivery.multimodalScore / 5;

  const data = [
    { axis: "시선", value: Math.min(7, mmPerChannel), fullMark: 7 },
    { axis: "음성", value: Math.min(7, mmPerChannel), fullMark: 7 },
    { axis: "유창성", value: Math.min(7, mmPerChannel), fullMark: 7 },
    { axis: "자세", value: Math.min(7, mmPerChannel), fullMark: 7 },
    { axis: "표정", value: Math.min(7, mmPerChannel), fullMark: 7 },
    ...delivery.pedagogyIndicators.map((p) => ({
      axis: p.label,
      value: p.score,
      fullMark: 5,
    })),
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h4 className="text-base font-medium text-slate-700 mb-4">전달력 레이더</h4>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "#64748b" }} />
          <Radar
            dataKey="value"
            stroke="#ff6b47"
            fill="#ff6b47"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: LectureDashboard 종합 대시보드**

```typescript
// src/components/lecture/LectureDashboard.tsx
"use client";

import type { LectureEvaluationResult } from "@/lib/lecture-types";
import { getLectureGrade } from "@/lib/lecture-scoring";
import SlideMap from "./SlideMap";
import LectureRadar from "./LectureRadar";

interface LectureDashboardProps {
  result: LectureEvaluationResult;
}

export default function LectureDashboard({ result }: LectureDashboardProps) {
  const { grade, color } = getLectureGrade(result.totalScore);

  return (
    <div className="space-y-6">
      {/* 종합 점수 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-coral-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500 mb-1">종합 평가</p>
          <p className="text-4xl font-bold font-mono text-slate-900">{result.totalScore}</p>
          <p className="text-sm text-slate-400">/ 100</p>
          <span className={`text-lg font-bold mt-2 inline-block ${color}`}>{grade}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500 mb-1">전달력</p>
          <p className="text-3xl font-bold font-mono text-slate-900">{result.delivery.score}</p>
          <p className="text-sm text-slate-400">/ 50</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500 mb-1">내용 충실도</p>
          {result.contentFidelity ? (
            <>
              <p className="text-3xl font-bold font-mono text-slate-900">{result.contentFidelity.score}</p>
              <p className="text-sm text-slate-400">/ 50</p>
            </>
          ) : (
            <p className="text-lg text-slate-300 mt-2">강의안 미첨부</p>
          )}
        </div>
      </div>

      {/* 강의 정보 */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span>교수자: <strong className="text-slate-700">{result.instructorName}</strong></span>
        <span className="text-slate-300">|</span>
        <span>과목: <strong className="text-slate-700">{result.courseName}</strong></span>
        <span className="text-slate-300">|</span>
        <span className="font-mono">{new Date(result.date).toLocaleDateString("ko-KR")}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 전달력 레이더 */}
        <LectureRadar delivery={result.delivery} />

        {/* 슬라이드 커버리지 (PPT 있을 때만) */}
        {result.contentFidelity && (
          <SlideMap coverages={result.contentFidelity.slideCoverages} />
        )}
      </div>

      {/* Solar 리포트 */}
      {result.report && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-base font-medium text-slate-700 mb-3">AI 코칭 리포트</h4>
          <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
            {result.report}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: LectureEvaluation Phase 3에 LectureDashboard 연결**

`src/components/lecture/LectureEvaluation.tsx`의 Phase 3 섹션을 교체:

```typescript
// Phase 3 결과 부분을 다음으로 교체
{phase === "result" && lecture.result && (
  <LectureDashboard result={lecture.result} />
)}
```

import 추가:
```typescript
import LectureDashboard from "./LectureDashboard";
```

- [ ] **Step 5: 빌드 확인 + 커밋**

Run: `npx next build 2>&1 | tail -5`

```bash
git add src/components/lecture/
git commit -m "feat(lecture): 결과 대시보드 — 종합점수 + 슬라이드맵 + 레이더 + 코칭 리포트"
```

---

### Task 9: 최종 통합 + 빌드 검증

**Files:**
- 전체 빌드 검증
- 푸시

- [ ] **Step 1: 전체 빌드 확인**

Run: `npx next build 2>&1 | tail -10`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 2: 변경 사항 확인**

Run: `git status && git log --oneline -8`

- [ ] **Step 3: 푸시**

```bash
git push
```
