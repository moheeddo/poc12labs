// ══════════════════════════════════════════════
// HPO-16: 피드백 뱅크 — 5카테고리 16개 기본 템플릿 + CRUD + 인기순 정렬
// ══════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getDataPath } from './data-path';

const DATA_PATH = getDataPath('feedback-bank.json');

export interface FeedbackTemplate {
  id: string;
  category: 'strength' | 'improvement' | 'critical' | 'hpo' | 'general';
  subcategory?: string;      // "밸브조작", "감시", "STAR" 등
  text: string;              // 피드백 텍스트
  competencyKey?: string;    // 관련 기본수칙 키
  hpoToolKey?: string;       // 관련 HPO 도구 키
  useCount: number;          // 사용 횟수 (인기순 정렬용)
  createdAt: string;
  lastUsedAt?: string;
}

// ── 기본 템플릿 (HPO센터 공통) ──────────────────

function getDefaultTemplates(): FeedbackTemplate[] {
  const now = new Date().toISOString();
  return [
    // 강점
    { id: 'fb-1',  category: 'strength',     subcategory: '절차준수',   text: '절차서를 참조하며 정확한 순서로 수행함',                                                                       competencyKey: 'control',           useCount: 0, createdAt: now },
    { id: 'fb-2',  category: 'strength',     subcategory: 'STAR',       text: 'STAR 기법(멈춤-생각-행동-확인)을 일관되게 적용함',                                                                hpoToolKey: 'selfCheck',            useCount: 0, createdAt: now },
    { id: 'fb-3',  category: 'strength',     subcategory: '감시',       text: '계기 판독값을 정확히 확인하고 정상 범위를 인지함',                                                                competencyKey: 'monitor',           useCount: 0, createdAt: now },
    { id: 'fb-4',  category: 'strength',     subcategory: '의사소통',   text: '3-Way Communication을 정확히 수행함',                                                                              hpoToolKey: 'communication',        useCount: 0, createdAt: now },
    { id: 'fb-5',  category: 'strength',     subcategory: '팀워크',     text: '동료와 적극적으로 상호확인을 수행함',                                                                              competencyKey: 'teamwork',          useCount: 0, createdAt: now },
    // 개선
    { id: 'fb-6',  category: 'improvement',  subcategory: 'STAR',       text: 'STAR 기법 적용이 미흡함 — 조작 전 멈추고 확인하는 습관 필요',                                                    hpoToolKey: 'selfCheck',            useCount: 0, createdAt: now },
    { id: 'fb-7',  category: 'improvement',  subcategory: '밸브조작',   text: '기기번호 확인 없이 밸브를 조작하는 경향 — 인식표 확인 후 조작 필요',                                              hpoToolKey: 'verificationTechnique', useCount: 0, createdAt: now },
    { id: 'fb-8',  category: 'improvement',  subcategory: '절차순서',   text: '절차 순서를 혼동함 — 절차서 동시 참조 습관 필요',                                                                  competencyKey: 'knowledge',         useCount: 0, createdAt: now },
    { id: 'fb-9',  category: 'improvement',  subcategory: '이중확인',   text: '제어실 확인 없이 현장 확인만으로 진행 — 이중확인 필수',                                                            hpoToolKey: 'peerCheck',            useCount: 0, createdAt: now },
    { id: 'fb-10', category: 'improvement',  subcategory: '감시',       text: '계기 판독 시 정확한 수치를 확인하지 않고 대략적으로 판단 — 정밀 판독 훈련 필요',                                  competencyKey: 'monitor',           useCount: 0, createdAt: now },
    // 핵심 위반
    { id: 'fb-11', category: 'critical',     subcategory: '안전',       text: '핵심 안전 단계를 건너뛰었음 — 즉시 재교육 필요',                                                                  useCount: 0, createdAt: now },
    { id: 'fb-12', category: 'critical',     subcategory: '절차이탈',   text: '절차에 없는 조작을 임의로 수행함 — 절차 범위 재교육 필요',                                                        useCount: 0, createdAt: now },
    // HPO 관련
    { id: 'fb-13', category: 'hpo',          subcategory: '작업전회의', text: '작업 전 브리핑을 실시하지 않음 — 작업 시작 전 목표/위험요소 공유 필요',                                            hpoToolKey: 'preJobBriefing',       useCount: 0, createdAt: now },
    { id: 'fb-14', category: 'hpo',          subcategory: '작업후평가', text: '작업 후 자기평가를 실시하지 않음 — 수행 결과 점검 습관 필요',                                                      hpoToolKey: 'postJobReview',        useCount: 0, createdAt: now },
    // 일반
    { id: 'fb-15', category: 'general',      text: '전반적으로 절차에 대한 이해도가 높으며 안정적으로 수행함',                                                                                    useCount: 0, createdAt: now },
    { id: 'fb-16', category: 'general',      text: '보수적 판단 원칙을 잘 지키고 있으며, 확신 없는 상황에서 멈추는 습관이 인상적',                                                                competencyKey: 'conservativeBias',  useCount: 0, createdAt: now },
  ];
}

// ── 파일 입출력 ──────────────────────────────

function readBank(): FeedbackTemplate[] {
  if (!existsSync(DATA_PATH)) return getDefaultTemplates();
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as FeedbackTemplate[];
  } catch {
    return getDefaultTemplates();
  }
}

function writeBank(data: FeedbackTemplate[]): void {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ── 공개 API ────────────────────────────────

/** 피드백 뱅크 초기화 (data 파일 없으면 기본 템플릿으로 생성) */
export function initializeBank(): void {
  if (!existsSync(DATA_PATH)) {
    writeBank(getDefaultTemplates());
  }
}

/** 목록 조회 — 카테고리 필터 + 인기순 정렬 */
export function listTemplates(category?: string): FeedbackTemplate[] {
  let bank = readBank();
  if (category && category !== 'all') {
    bank = bank.filter((t) => t.category === category);
  }
  return bank.sort((a, b) => b.useCount - a.useCount);
}

/** 새 템플릿 추가 */
export function addTemplate(
  template: Omit<FeedbackTemplate, 'id' | 'useCount' | 'createdAt'>,
): FeedbackTemplate {
  const bank = readBank();
  const created: FeedbackTemplate = {
    ...template,
    id: `fb-${Date.now()}`,
    useCount: 0,
    createdAt: new Date().toISOString(),
  };
  bank.push(created);
  writeBank(bank);
  return created;
}

/** 템플릿 사용 — useCount 증가 + lastUsedAt 갱신 */
export function incrementTemplateUsage(id: string): FeedbackTemplate | null {
  const bank = readBank();
  const tmpl = bank.find((t) => t.id === id);
  if (!tmpl) return null;
  tmpl.useCount++;
  tmpl.lastUsedAt = new Date().toISOString();
  writeBank(bank);
  return tmpl;
}

/** 템플릿 삭제 */
export function deleteTemplate(id: string): boolean {
  const bank = readBank();
  const idx = bank.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  bank.splice(idx, 1);
  writeBank(bank);
  return true;
}
