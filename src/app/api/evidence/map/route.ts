import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/twelvelabs";
import { generateSearchQueries, mapSearchResultToClip, buildEvidenceMap } from "@/lib/evidence/evidence-mapper";

export async function POST(req: NextRequest) {
  try {
    const { videoId, indexId, competencyKey, score, rubricItems } = await req.json();
    if (!indexId || !competencyKey || !rubricItems?.length) {
      return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });
    }
    const allClips: Array<{ rubricItemId: string; rubricItemText: string; videoTimestamp: { start: number; end: number }; confidence: number; matchedText: string; searchQuery: string }> = [];
    for (const item of rubricItems) {
      const queries = generateSearchQueries(item.criteria);
      for (const query of queries) {
        try {
          const result = await searchVideos(indexId, query);
          if (result.data) {
            for (const r of result.data) {
              if (videoId && r.video_id !== videoId) continue;
              allClips.push(mapSearchResultToClip(item.id, item.criteria, query, { start: r.start, end: r.end, confidence: r.confidence }));
            }
          }
        } catch { /* 개별 검색 실패 시 건너뜀 */ }
      }
    }
    const evidenceMap = buildEvidenceMap(competencyKey, score || 0, rubricItems.map((i: { id: string }) => i.id), allClips);
    return NextResponse.json(evidenceMap);
  } catch {
    return NextResponse.json({ error: "증거 매핑 실패" }, { status: 500 });
  }
}
