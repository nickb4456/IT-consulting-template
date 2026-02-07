/**
 * Document Type Detection Service
 *
 * Analyzes plain-text document content with weighted pattern matching to
 * determine its most likely format (letter, memo, email, or contract).
 *
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import { RecreateDocumentType } from '../types/recreate';

interface DetectionResult {
  type: RecreateDocumentType;
  confidence: number;
  indicators: string[];
}

const LETTER_PATTERNS = [
  { pattern: /^dear\s+/im, weight: 0.4, indicator: 'Salutation (Dear...)' },
  { pattern: /sincerely|regards|truly yours|respectfully/im, weight: 0.3, indicator: 'Closing phrase' },
  { pattern: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/m, weight: 0.1, indicator: 'Date at start' },
  { pattern: /^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}/m, weight: 0.1, indicator: 'Written date format' },
  { pattern: /re:|reference:/im, weight: 0.1, indicator: 'Reference line' }
];

const MEMO_PATTERNS = [
  { pattern: /^(memorandum|memo)\b/im, weight: 0.5, indicator: 'MEMORANDUM header' },
  { pattern: /^to:\s*.+$/im, weight: 0.2, indicator: 'To: header' },
  { pattern: /^from:\s*.+$/im, weight: 0.2, indicator: 'From: header' },
  { pattern: /^(date|re|subject):\s*.+$/im, weight: 0.1, indicator: 'Standard memo headers' }
];

const EMAIL_PATTERNS = [
  { pattern: /^from:\s*.*@/im, weight: 0.4, indicator: 'Email From header' },
  { pattern: /^to:\s*.*@/im, weight: 0.3, indicator: 'Email To header' },
  { pattern: /^subject:\s*.+$/im, weight: 0.2, indicator: 'Subject line' },
  { pattern: /^(sent|received):\s*.+$/im, weight: 0.1, indicator: 'Timestamp header' }
];

const CONTRACT_PATTERNS = [
  { pattern: /^(section|article)\s+\d+/im, weight: 0.3, indicator: 'Section/Article numbering' },
  { pattern: /^\d+\.\d+\s+/m, weight: 0.2, indicator: 'Legal numbering (1.1)' },
  { pattern: /hereby|whereas|therefore|witnesseth/im, weight: 0.3, indicator: 'Legal terms' },
  { pattern: /shall|agrees to|represents and warrants/im, weight: 0.2, indicator: 'Contract language' }
];

function calculateScore(text: string, patterns: typeof LETTER_PATTERNS): { score: number; indicators: string[] } {
  let score = 0;
  const indicators: string[] = [];
  
  for (const { pattern, weight, indicator } of patterns) {
    if (pattern.test(text)) {
      score += weight;
      indicators.push(indicator);
    }
  }
  
  return { score, indicators };
}

/**
 * Detect the most likely document type from raw text content.
 *
 * Uses weighted pattern matching across letter, memo, email, and contract indicators.
 * Returns `'unknown'` when no pattern scores above the minimum confidence threshold.
 */
export function detectDocumentType(text: string): DetectionResult {
  const normalized = text.trim();
  
  if (!normalized || normalized.length < 20) {
    return { type: 'unknown', confidence: 0, indicators: ['Document too short'] };
  }
  
  const scores: { type: RecreateDocumentType; score: number; indicators: string[] }[] = [
    { type: 'letter', ...calculateScore(normalized, LETTER_PATTERNS) },
    { type: 'memo', ...calculateScore(normalized, MEMO_PATTERNS) },
    { type: 'email', ...calculateScore(normalized, EMAIL_PATTERNS) },
    { type: 'contract', ...calculateScore(normalized, CONTRACT_PATTERNS) }
  ];
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  const best = scores[0];
  const secondBest = scores[1];
  
  // Require minimum confidence and clear winner
  if (best.score < 0.2) {
    return { type: 'unknown', confidence: 0, indicators: ['No clear document pattern detected'] };
  }
  
  // Check if there's a clear winner (at least 0.1 ahead of second place)
  const confidence = best.score - (secondBest?.score || 0) > 0.1 
    ? Math.min(best.score, 1) 
    : best.score * 0.7;
  
  return {
    type: best.type,
    confidence: Math.round(confidence * 100) / 100,
    indicators: best.indicators
  };
}

/** Return the list of sensible target formats for a given source document type. */
export function suggestTargetFormats(sourceType: RecreateDocumentType): string[] {
  const suggestions: Record<RecreateDocumentType, string[]> = {
    letter: ['memo', 'email', 'summary', 'bullets'],
    memo: ['letter', 'email', 'summary', 'bullets'],
    email: ['memo', 'letter', 'summary', 'bullets'],
    contract: ['plain', 'summary', 'bullets'],
    unknown: ['memo', 'letter', 'summary', 'bullets']
  };
  
  return suggestions[sourceType] || suggestions.unknown;
}

/** Map a document type code to a human-readable label for the UI. */
export function getDocumentTypeLabel(type: RecreateDocumentType): string {
  const labels: Record<RecreateDocumentType, string> = {
    letter: 'Letter',
    memo: 'Memorandum',
    email: 'Email',
    contract: 'Contract/Legal Document',
    unknown: 'Document'
  };
  
  return labels[type] || 'Document';
}
