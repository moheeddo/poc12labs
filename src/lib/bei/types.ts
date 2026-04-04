// BEI(Behavioral Event Interview) 분석 관련 타입 정의

export interface STARElement {
  text: string;
  timestamp: { start: number; end: number };
}

export interface STARStructure {
  situation: STARElement;
  task: STARElement;
  action: STARElement;
  result: STARElement;
  // 0~1 사이의 완성도 점수 (4개 요소 각각의 유무 + 내용 풍부도)
  completeness: number;
}

export interface BEIEvent {
  id: string;
  speakerId: string;
  star: STARStructure;
  // 코딩된 역량 목록 (하나의 BEI 이벤트가 여러 역량을 동시에 증거할 수 있음)
  codedCompetencies: {
    competencyKey: string;
    confidence: number;
    level: "threshold" | "differentiating";
  }[];
  // 1~5 품질 점수
  qualityScore: number;
}

export interface BEIAnalysis {
  events: BEIEvent[];
  // 역량별 평균 신뢰도 분포 (0~1)
  competencyDistribution: Record<string, number>;
  // 차별화 역량 목록 (differentiating level이 2개 이상 코딩된 역량)
  differentiatingCompetencies: string[];
  totalEvents: number;
  // 전체 이벤트의 STAR 완성도 평균
  averageCompleteness: number;
}
