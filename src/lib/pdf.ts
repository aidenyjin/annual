import { extractText, getDocumentProxy } from "unpdf";

/**
 * Plain text-layer extraction — no AI, no network call. Works for
 * born-digital PDFs (the common case for syllabi); scanned/image-only PDFs
 * will come back empty since there's no OCR step here.
 */
export async function extractPdfText(bytes: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}
