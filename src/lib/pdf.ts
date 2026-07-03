import { extractText, getDocumentProxy } from "unpdf";

/**
 * Plain text-layer extraction — no AI, no network call. unpdf ships a
 * runtime-agnostic pdf.js build, so this runs in the browser as well as on
 * the server. Works for born-digital PDFs (the common case); scanned/
 * image-only PDFs come back with little or no text (no OCR here).
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}
