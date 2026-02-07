/**
 * Recreate Service - Template-Based Document Transformation
 *
 * Pure rule-based pattern matching and template application (no AI).
 * Parses source documents (letter, memo, etc.) into structured data,
 * then reformats into a chosen target format.
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import { 
  RecreateRequest, 
  RecreateResponse, 
  RecreateDocumentType,
  TargetFormat,
  RecreateOptions,
  DEFAULT_OPTIONS 
} from '../types/recreate';
import { detectDocumentType } from './documentDetector';

// ============================================================================
// DOCUMENT PARSING - Extract structured data from documents
// ============================================================================

interface ParsedLetter {
  date?: string;
  recipientName?: string;
  recipientAddress?: string;
  salutation?: string;
  body: string;
  closing?: string;
  senderName?: string;
  reference?: string;
}

interface ParsedMemo {
  to?: string;
  from?: string;
  date?: string;
  re?: string;
  body: string;
}

/** Extract structured letter fields (date, salutation, body, closing) from raw text. */
function parseLetter(text: string): ParsedLetter {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const result: ParsedLetter = { body: '' };
  
  // Try to find date (various formats)
  const datePatterns = [
    /^([A-Z][a-z]+ \d{1,2}, \d{4})$/,           // January 15, 2026
    /^(\d{1,2}\/\d{1,2}\/\d{2,4})$/,            // 1/15/2026
    /^(\d{1,2}-\d{1,2}-\d{2,4})$/,              // 1-15-2026
  ];
  
  let bodyStartIndex = 0;
  let bodyEndIndex = lines.length;
  
  // Find date
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    for (const pattern of datePatterns) {
      const match = lines[i].match(pattern);
      if (match) {
        result.date = match[1];
        bodyStartIndex = Math.max(bodyStartIndex, i + 1);
        break;
      }
    }
  }
  
  // Find salutation
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (/^dear\s+/i.test(lines[i])) {
      result.salutation = lines[i];
      result.recipientName = lines[i].replace(/^dear\s+/i, '').replace(/[,:;]$/, '');
      bodyStartIndex = Math.max(bodyStartIndex, i + 1);
      break;
    }
  }
  
  // Find reference line
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (/^re:|^reference:/i.test(lines[i])) {
      result.reference = lines[i].replace(/^re:\s*/i, '').replace(/^reference:\s*/i, '');
      bodyStartIndex = Math.max(bodyStartIndex, i + 1);
      break;
    }
  }
  
  // Find closing (from the end)
  const closingPatterns = [
    /^(sincerely|regards|truly yours|respectfully|best regards|cordially|very truly yours)/i
  ];
  
  for (let i = lines.length - 1; i > lines.length - 10 && i >= 0; i--) {
    for (const pattern of closingPatterns) {
      if (pattern.test(lines[i])) {
        result.closing = lines[i].replace(/,?\s*$/, '');
        bodyEndIndex = i;
        // Next non-empty line might be sender name
        if (i + 1 < lines.length) {
          result.senderName = lines[i + 1];
        }
        break;
      }
    }
    if (result.closing) break;
  }
  
  // Extract body
  result.body = lines.slice(bodyStartIndex, bodyEndIndex).join('\n');
  
  return result;
}

/** Extract structured memo fields (to, from, date, re, body) from raw text. */
function parseMemo(text: string): ParsedMemo {
  const lines = text.split('\n').map(line => line.trim());
  const result: ParsedMemo = { body: '' };
  
  let bodyStartIndex = 0;
  
  // Parse header fields
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    
    if (/^to:\s*/i.test(line)) {
      result.to = line.replace(/^to:\s*/i, '');
      bodyStartIndex = i + 1;
    } else if (/^from:\s*/i.test(line)) {
      result.from = line.replace(/^from:\s*/i, '');
      bodyStartIndex = i + 1;
    } else if (/^date:\s*/i.test(line)) {
      result.date = line.replace(/^date:\s*/i, '');
      bodyStartIndex = i + 1;
    } else if (/^re:\s*/i.test(line) || /^subject:\s*/i.test(line)) {
      result.re = line.replace(/^(re|subject):\s*/i, '');
      bodyStartIndex = i + 1;
    } else if (/^memorandum$/i.test(line)) {
      bodyStartIndex = i + 1;
    }
  }
  
  // Skip any blank lines after headers
  while (bodyStartIndex < lines.length && !lines[bodyStartIndex]) {
    bodyStartIndex++;
  }
  
  result.body = lines.slice(bodyStartIndex).filter(Boolean).join('\n');
  
  return result;
}

// ============================================================================
// TEMPLATES - Output formats
// ============================================================================

function formatAsMemo(data: { to?: string; from?: string; date?: string; re?: string; body: string }): string {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  return `MEMORANDUM

TO:      ${data.to || '[Recipient]'}
FROM:    ${data.from || '[Sender]'}
DATE:    ${data.date || today}
RE:      ${data.re || '[Subject]'}

${data.body}`;
}

function formatAsLetter(data: { 
  date?: string; 
  recipientName?: string; 
  body: string; 
  closing?: string;
  senderName?: string;
  reference?: string;
}): string {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  let letter = `${data.date || today}\n\n`;
  
  if (data.recipientName) {
    letter += `Dear ${data.recipientName},\n\n`;
  } else {
    letter += `Dear [Recipient],\n\n`;
  }
  
  if (data.reference) {
    letter += `Re: ${data.reference}\n\n`;
  }
  
  letter += `${data.body}\n\n`;
  letter += `${data.closing || 'Sincerely'},\n\n`;
  letter += data.senderName || '[Your Name]';
  
  return letter;
}

function formatAsSummary(body: string): string {
  // Extract key sentences (first sentence of each paragraph + any with key words)
  const paragraphs = body.split(/\n\n+/);
  const keyPhrases = ['must', 'shall', 'agree', 'require', 'deadline', 'important', 'critical'];
  
  const summaryParts: string[] = [];
  
  for (const para of paragraphs) {
    const sentences = para.split(/(?<=[.!?])\s+/);
    if (sentences.length > 0) {
      // Always include first sentence
      summaryParts.push(sentences[0]);
      
      // Include sentences with key phrases
      for (let i = 1; i < sentences.length; i++) {
        const lower = sentences[i].toLowerCase();
        if (keyPhrases.some(phrase => lower.includes(phrase))) {
          summaryParts.push(sentences[i]);
        }
      }
    }
  }
  
  return `SUMMARY\n\n${summaryParts.join(' ')}`;
}

function formatAsBullets(body: string): string {
  // Convert paragraphs to bullet points
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  
  const bullets = paragraphs.map(para => {
    // Clean up and truncate long paragraphs
    const cleaned = para.replace(/\n/g, ' ').trim();
    if (cleaned.length > 200) {
      // Take first sentence or truncate
      const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
      return `• ${firstSentence ? firstSentence[0] : cleaned.substring(0, 197) + '...'}`;
    }
    return `• ${cleaned}`;
  });
  
  return `KEY POINTS\n\n${bullets.join('\n\n')}`;
}

function formatAsEmail(data: { to?: string; subject?: string; body: string }): string {
  return `To: ${data.to || '[recipient@email.com]'}
Subject: ${data.subject || '[Subject]'}

${data.body}

Best regards,
[Your Name]`;
}

// ============================================================================
// TRANSFORMATION LOGIC
// ============================================================================

/**
 * Core transformation: parse source content and reformat to the target type.
 *
 * Also verifies that preserved text anchors survive the transformation and
 * emits warnings for any that are lost.
 */
function transformDocument(
  content: string,
  sourceType: RecreateDocumentType,
  targetType: TargetFormat,
  preservedText: string[]
): { transformed: string; warnings: string[] } {
  
  let transformed = '';
  const warnings: string[] = [];
  
  // Parse source
  let parsedLetter: ParsedLetter | null = null;
  let parsedMemo: ParsedMemo | null = null;
  let body = content;
  
  if (sourceType === 'letter') {
    parsedLetter = parseLetter(content);
    body = parsedLetter.body;
  } else if (sourceType === 'memo') {
    parsedMemo = parseMemo(content);
    body = parsedMemo.body;
  }
  
  // Transform to target
  switch (targetType) {
    case 'memo':
      if (parsedLetter) {
        transformed = formatAsMemo({
          to: parsedLetter.recipientName,
          from: parsedLetter.senderName,
          date: parsedLetter.date,
          re: parsedLetter.reference,
          body: parsedLetter.body
        });
      } else if (parsedMemo) {
        transformed = formatAsMemo(parsedMemo);
      } else {
        transformed = formatAsMemo({ body });
      }
      break;
      
    case 'letter':
      if (parsedMemo) {
        transformed = formatAsLetter({
          date: parsedMemo.date,
          recipientName: parsedMemo.to,
          body: parsedMemo.body,
          senderName: parsedMemo.from,
          reference: parsedMemo.re
        });
      } else if (parsedLetter) {
        transformed = formatAsLetter(parsedLetter);
      } else {
        transformed = formatAsLetter({ body });
      }
      break;
      
    case 'summary':
      transformed = formatAsSummary(body);
      break;
      
    case 'bullets':
      transformed = formatAsBullets(body);
      break;
      
    case 'email':
      if (parsedLetter) {
        transformed = formatAsEmail({
          to: parsedLetter.recipientName,
          subject: parsedLetter.reference,
          body: parsedLetter.body
        });
      } else if (parsedMemo) {
        transformed = formatAsEmail({
          to: parsedMemo.to,
          subject: parsedMemo.re,
          body: parsedMemo.body
        });
      } else {
        transformed = formatAsEmail({ body });
      }
      break;
      
    case 'plain':
      // For plain, just clean up the body
      transformed = body.replace(/\n{3,}/g, '\n\n');
      break;
      
    default:
      transformed = content;
      warnings.push(`Unknown target format: ${targetType}`);
  }
  
  // Verify preserved text
  for (const text of preservedText) {
    if (!transformed.includes(text)) {
      // Try to inject it back
      if (body.includes(text)) {
        // It was in the original body but got lost - add warning
        warnings.push(`"${text.substring(0, 30)}..." may need manual verification`);
      }
    }
  }
  
  return { transformed, warnings };
}

/**
 * Wrap a Word.run call with a timeout to prevent indefinite hangs.
 *
 * Returns a discriminated union so callers can handle success/failure
 * without try/catch boilerplate.
 *
 * @param fn - Callback executed inside Word.run's request context.
 * @param timeoutMs - Maximum wait time in milliseconds (default 10 000).
 */
async function wordRunWithTimeout<T>(
  fn: (context: Word.RequestContext) => Promise<T>,
  timeoutMs: number = 10000
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await Promise.race([
      Word.run(fn),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Word.run timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[recreateService] Word.run failed:', message);
    return { success: false, error: message };
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Transform a document from one format to another using rule-based parsing.
 *
 * Auto-detects source type when `request.sourceType` is `'unknown'`, then
 * applies the appropriate parser and formatter for the target type.
 *
 * @param request - Contains the source content, type, target format, and preserved text anchors.
 * @returns A response with the transformed content, detection info, and any warnings.
 */
export async function recreateDocument(request: RecreateRequest): Promise<RecreateResponse> {
  const startTime = Date.now();
  
  // Auto-detect if unknown
  let sourceType = request.sourceType;
  if (sourceType === 'unknown') {
    const detection = detectDocumentType(request.content);
    sourceType = detection.type;
  }
  
  const { transformed, warnings } = transformDocument(
    request.content,
    sourceType,
    request.targetType,
    request.preservedText
  );
  
  // Count preserved text that made it through
  const preservedCount = request.preservedText.filter(t => transformed.includes(t)).length;
  
  return {
    success: true,
    transformed,
    sourceTypeDetected: sourceType,
    preservedCount,
    warnings,
    processingTimeMs: Date.now() - startTime
  };
}

/**
 * Get selected text from the active Word document, split into non-empty lines.
 *
 * Returns an empty array if nothing is selected or if the Word.run call fails.
 */
export async function getSelectedText(): Promise<string[]> {
  const result = await wordRunWithTimeout(async (context) => {
    const selection = context.document.getSelection();
    selection.load('text');
    await context.sync();

    const text = selection.text.trim();
    if (!text) return [];

    return text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  });

  if (!result.success) {
    console.error('[recreateService] Failed to get selected text from Word:', result.error);
    return [];
  }
  return result.data;
}

/**
 * Read the full body text of the active Word document.
 *
 * Returns an empty string on failure rather than throwing, so callers can
 * degrade gracefully.
 */
export async function getDocumentContent(): Promise<string> {
  const result = await wordRunWithTimeout(async (context) => {
    const body = context.document.body;
    body.load('text');
    await context.sync();
    return body.text || '';
  });

  if (!result.success) {
    console.error('[recreateService] Failed to get document content:', result.error);
    return '';
  }
  return result.data;
}

/**
 * Open transformed content in a new Word document window.
 *
 * @param content - Plain text to insert into the new document.
 * @returns `true` on success, `false` if the Word.run call fails.
 */
export async function openInNewWindow(content: string): Promise<boolean> {
  const result = await wordRunWithTimeout(async (context) => {
    const newDoc = context.application.createDocument();
    await context.sync();
    newDoc.body.insertText(content, Word.InsertLocation.start);
    await context.sync();
    return true;
  });

  if (!result.success) {
    console.error('[recreateService] Failed to open new Word window:', result.error);
    return false;
  }
  return true;
}

/**
 * Replace the body of the current Word document with new content.
 *
 * @param content - Plain text that will replace the entire document body.
 * @returns `true` on success, `false` if the Word.run call fails.
 */
export async function replaceDocumentContent(content: string): Promise<boolean> {
  const result = await wordRunWithTimeout(async (context) => {
    const body = context.document.body;
    body.clear();
    body.insertText(content, Word.InsertLocation.start);
    await context.sync();
    return true;
  });

  if (!result.success) {
    console.error('[recreateService] Failed to replace document content:', result.error);
    return false;
  }
  return true;
}
