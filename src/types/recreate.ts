/**
 * DraftBridge Recreate Feature Types
 */

export type RecreateDocumentType = 'letter' | 'memo' | 'email' | 'contract' | 'unknown';
export type TargetFormat = 'letter' | 'memo' | 'email' | 'summary' | 'bullets' | 'plain';

export interface RecreateOptions {
  keepFormatting: boolean;
  openInNewWindow: boolean;
  tone: 'formal' | 'casual' | 'neutral';
  firmName?: string;
}

export interface RecreateRequest {
  content: string;
  sourceType: RecreateDocumentType;
  targetType: TargetFormat;
  preservedText: string[];
  options: RecreateOptions;
}

export interface RecreateResponse {
  success: boolean;
  transformed: string;
  sourceTypeDetected: RecreateDocumentType;
  preservedCount: number;
  warnings: string[];
  processingTimeMs: number;
}

export interface TransformTemplate {
  id: TargetFormat;
  label: string;
  description: string;
  icon: string;
  availableFrom: RecreateDocumentType[];
}

export const TRANSFORM_TEMPLATES: TransformTemplate[] = [
  {
    id: 'memo',
    label: 'Memorandum',
    description: 'Internal memo format with To/From/Date/Re headers',
    icon: '📋',
    availableFrom: ['letter', 'email', 'unknown']
  },
  {
    id: 'letter',
    label: 'Formal Letter',
    description: 'Professional letter with salutation and closing',
    icon: '✉️',
    availableFrom: ['memo', 'email', 'unknown']
  },
  {
    id: 'email',
    label: 'Email Draft',
    description: 'Concise email format',
    icon: '📧',
    availableFrom: ['letter', 'memo', 'unknown']
  },
  {
    id: 'summary',
    label: 'Executive Summary',
    description: 'Brief summary of key points',
    icon: '📝',
    availableFrom: ['letter', 'memo', 'email', 'contract', 'unknown']
  },
  {
    id: 'bullets',
    label: 'Bullet Points',
    description: 'Key information as bullet list',
    icon: '•',
    availableFrom: ['letter', 'memo', 'email', 'contract', 'unknown']
  },
  {
    id: 'plain',
    label: 'Plain English',
    description: 'Simplified, jargon-free version',
    icon: '💬',
    availableFrom: ['contract', 'unknown']
  }
];

export const DEFAULT_OPTIONS: RecreateOptions = {
  keepFormatting: false,
  openInNewWindow: true,
  tone: 'formal',
  firmName: undefined
};
