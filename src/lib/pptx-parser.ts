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
  // Node.js 내장 zlib 사용 — 외부 의존성 없음
  const { inflateRawSync } = await import("zlib");

  // ZIP 형식의 .pptx 파일을 Buffer로 파싱
  const buf = Buffer.from(buffer);
  const entries = parseZipEntries(buf);

  const slideXmls: Map<number, string> = new Map();
  const notesXmls: Map<number, string> = new Map();

  for (const entry of entries) {
    const slideMatch = entry.name.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (slideMatch) {
      const content = inflateEntry(entry, inflateRawSync);
      slideXmls.set(parseInt(slideMatch[1]), content);
    }
    const notesMatch = entry.name.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/);
    if (notesMatch) {
      const content = inflateEntry(entry, inflateRawSync);
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
  inflateRawSync: (buf: Buffer) => Buffer
): string {
  if (entry.compressionMethod === 0) {
    // 비압축 (stored)
    return entry.compressedData.toString("utf8");
  }
  // Deflate (method 8) — 동기 압축 해제
  try {
    const result = inflateRawSync(entry.compressedData);
    return result.toString("utf8");
  } catch {
    return "";
  }
}
