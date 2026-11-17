// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
import mammoth from "mammoth";

export type DocumentType = "pdf" | "docx" | "text";

export function detectDocumentType(filename: string, mimeType?: string): DocumentType {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return "text";
}

export async function parseDocument(buffer: Buffer, type: DocumentType): Promise<string> {
  switch (type) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "text":
      return buffer.toString("utf-8").trim();
  }
}

async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || "").trim();
    if (!text || text.length < 30) {
      throw new Error(
        "PDF appears to be scanned or contains very little text. Please paste the resume text instead."
      );
    }
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("scanned")) {
      throw error;
    }
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").trim();
    if (!text) {
      throw new Error("DOCX file appears to be empty.");
    }
    return text;
  } catch (error) {
    throw new Error(
      `Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export function parseRawText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Text content is empty.");
  }
  if (trimmed.length > 50000) {
    throw new Error("Text content exceeds maximum length of 50,000 characters.");
  }
  return trimmed;
}
