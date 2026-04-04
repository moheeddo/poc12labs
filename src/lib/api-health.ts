// =============================================
// API 헬스체크 + 데모 모드 판정
// TWELVELABS_API_KEY 미설정 시 자동 데모 모드 전환
// =============================================

export interface ApiHealth {
  twelvelabs: {
    configured: boolean;      // API 키 설정 여부
    connected: boolean;       // 실제 연결 가능 여부
    indexExists: boolean;     // pov 인덱스 존재 여부
    lastChecked: string;
  };
  demoMode: boolean;          // 데모 모드 활성화 여부
}

/** TwelveLabs API 키 설정 여부 */
export function isApiKeyConfigured(): boolean {
  return !!process.env.TWELVELABS_API_KEY && process.env.TWELVELABS_API_KEY.length > 10;
}

/** 데모 모드 여부 (API 키 미설정이면 자동 데모) */
export function isDemoMode(): boolean {
  return !isApiKeyConfigured();
}

/** API 헬스체크 실행 */
export async function checkApiHealth(): Promise<ApiHealth> {
  const configured = isApiKeyConfigured();
  let connected = false;
  let indexExists = false;

  if (configured) {
    try {
      const res = await fetch('https://api.twelvelabs.io/v1.3/indexes?page_limit=1', {
        headers: { 'x-api-key': process.env.TWELVELABS_API_KEY! },
        signal: AbortSignal.timeout(5000),
      });
      connected = res.ok;
      if (connected) {
        const data = await res.json();
        // pov 인덱스 존재 여부 확인
        indexExists = data.data?.some(
          (idx: Record<string, unknown>) =>
            (typeof idx.index_name === 'string' && idx.index_name.includes('pov')) ||
            idx._id === process.env.TWELVELABS_POV_INDEX_ID
        ) || false;
      }
    } catch {
      connected = false;
    }
  }

  return {
    twelvelabs: {
      configured,
      connected,
      indexExists,
      lastChecked: new Date().toISOString(),
    },
    demoMode: !configured || !connected,
  };
}
