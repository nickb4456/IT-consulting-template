/**
 * DraftBridge Gold - Template Renderer
 * 
 * Renders templates using Handlebars with custom helpers.
 * Generates content for Word document insertion.
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import Handlebars from 'handlebars';
import {
  TemplateDefinition,
  TemplateRenderResult,
  DocumentState
} from '../types/variables';
import { VariableEngine } from './variableEngine';
import {
  NumberingService,
  getNumberingService,
  MultilevelPreset,
  toOoxmlLevel
} from './numberingService';

// ============================================================================
// HANDLEBARS SETUP
// ============================================================================

// Create isolated instance
const hbs = Handlebars.create();

// ============================================================================
// CUSTOM HELPERS
// ============================================================================

// Comparison helpers
hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
hbs.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
hbs.registerHelper('gt', (a: number, b: number) => a > b);
hbs.registerHelper('gte', (a: number, b: number) => a >= b);
hbs.registerHelper('lt', (a: number, b: number) => a < b);
hbs.registerHelper('lte', (a: number, b: number) => a <= b);

// Logical helpers
hbs.registerHelper('and', (...args: unknown[]) => {
  args.pop(); // Remove Handlebars options hash
  return args.every(Boolean);
});

hbs.registerHelper('or', (...args: unknown[]) => {
  args.pop(); // Remove Handlebars options hash
  return args.some(Boolean);
});

hbs.registerHelper('not', (value: unknown) => !value);

// String helpers
hbs.registerHelper('uppercase', (str: string) => 
  str ? str.toUpperCase() : ''
);

hbs.registerHelper('lowercase', (str: string) => 
  str ? str.toLowerCase() : ''
);

hbs.registerHelper('titlecase', (str: string) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
});

hbs.registerHelper('trim', (str: string) => 
  str ? str.trim() : ''
);

hbs.registerHelper('concat', (...args: unknown[]) => {
  args.pop(); // Remove options
  return args.join('');
});

hbs.registerHelper('replace', (str: string, find: string, replace: string) => {
  if (!str) return '';
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(escaped, 'g'), replace);
});

// Date helpers
hbs.registerHelper('date', (dateStr: string, options: Handlebars.HelperOptions) => {
  const format = options.hash.format || 'MMMM D, YYYY';
  return formatDate(dateStr, format);
});

hbs.registerHelper('today', (options: Handlebars.HelperOptions) => {
  const format = options.hash.format || 'MMMM D, YYYY';
  return formatDate(new Date().toISOString(), format);
});

// Array helpers
hbs.registerHelper('length', (arr: unknown[]) => 
  Array.isArray(arr) ? arr.length : 0
);

hbs.registerHelper('first', (arr: unknown[]) => 
  Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined
);

hbs.registerHelper('last', (arr: unknown[]) => 
  Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : undefined
);

hbs.registerHelper('join', (arr: unknown[], separator: string) => {
  if (!Array.isArray(arr)) return '';
  return arr.join(typeof separator === 'string' ? separator : ', ');
});

// Derived value helper
hbs.registerHelper('derived', function(this: Record<string, unknown>, path: string) {
  // Access derived values via the $ prefix convention
  const parts = path.split('.');
  if (parts.length === 2) {
    const [varId, field] = parts;
    const derivedKey = `${varId}$`;
    const derivedObj = this[derivedKey] as Record<string, unknown> | undefined;
    return derivedObj?.[field] || '';
  }
  return '';
});

// Pluralize helper
hbs.registerHelper('pluralize', (count: number, singular: string, plural?: string) => {
  if (count === 1) return singular;
  return plural || `${singular}s`;
});

// Default value helper
hbs.registerHelper('default', (value: unknown, defaultValue: unknown) =>
  value !== undefined && value !== null && value !== '' ? value : defaultValue
);

// ============================================================================
// NUMBERING HELPERS
// ============================================================================

/**
 * Track current numbering state during rendering.
 * This is used by the multilevel block helper.
 */
interface NumberingState {
  type: MultilevelPreset;
  numId: number;
  counters: number[];
}

let currentNumberingState: NumberingState | null = null;

/**
 * Block helper for multilevel numbered content.
 * Usage: {{#multilevel type="legal" start=1}}...content...{{/multilevel}}
 */
hbs.registerHelper('multilevel', function (
  this: unknown,
  options: Handlebars.HelperOptions
) {
  const type = (options.hash.type || 'numbered') as MultilevelPreset;
  const start = typeof options.hash.start === 'number' ? options.hash.start : 1;

  // Initialize counters for all 9 levels
  const counters = Array(9).fill(start);

  // Set up numbering state for child helpers
  const service = getNumberingService();
  const numDef = service.createMultilevelList(type);
  const numInstance = service.createNumInstance(numDef.abstractNumId);

  currentNumberingState = {
    type,
    numId: numInstance.numId,
    counters
  };

  // Render the block content
  const result = options.fn(this);

  // Clear state after rendering
  currentNumberingState = null;

  return result;
});

/**
 * Helper to mark content at a specific level within a multilevel block.
 * Usage: {{level 1}}Content goes here{{/level}}
 * Levels are 1-9 (mapped to OOXML 0-8 internally)
 */
hbs.registerHelper('level', function (
  this: unknown,
  levelNum: number,
  options: Handlebars.HelperOptions
) {
  if (!currentNumberingState) {
    // Not inside a multilevel block, just return content
    return options.fn ? options.fn(this) : '';
  }

  const ilvl = toOoxmlLevel(levelNum);
  const state = currentNumberingState;

  // Get current counter for this level
  const counter = state.counters[ilvl];

  // Increment counter for next time
  state.counters[ilvl]++;

  // Reset all deeper levels
  for (let i = ilvl + 1; i < 9; i++) {
    state.counters[i] = 1;
  }

  // Build the number prefix based on type
  let prefix = '';
  if (state.type === 'legal') {
    // Legal format: 1.1.1
    const parts: number[] = [];
    for (let i = 0; i <= ilvl; i++) {
      parts.push(state.counters[i] - (i === ilvl ? 1 : 0) || 1);
    }
    // Fix: use actual counter values
    parts[ilvl] = counter;
    prefix = parts.join('.');
  } else if (state.type === 'outline') {
    // Outline format varies by level
    prefix = formatOutlineNumber(ilvl, counter);
  } else {
    // Simple numbered: just the counter
    prefix = `${counter}.`;
  }

  // Render content with number prefix
  const content = options.fn ? options.fn(this) : '';
  const indent = '  '.repeat(ilvl);

  return new Handlebars.SafeString(
    `<p class="level-${levelNum}" data-ilvl="${ilvl}" data-numid="${state.numId}">${indent}${prefix} ${content}</p>`
  );
});

/**
 * Simple numbered list helper (no nesting).
 * Usage: {{#numbered}}{{item}}First{{/item}}{{item}}Second{{/item}}{{/numbered}}
 */
hbs.registerHelper('numbered', function (
  this: unknown,
  options: Handlebars.HelperOptions
) {
  let counter = typeof options.hash.start === 'number' ? options.hash.start : 1;

  // Register a temporary item helper
  const originalItem = hbs.helpers['item'];
  hbs.registerHelper('item', function (
    this: unknown,
    itemOptions: Handlebars.HelperOptions
  ) {
    const num = counter++;
    const content = itemOptions.fn ? itemOptions.fn(this) : '';
    return new Handlebars.SafeString(`<li value="${num}">${content}</li>`);
  });

  const result = `<ol>${options.fn(this)}</ol>`;

  // Restore original helper
  if (originalItem) {
    hbs.registerHelper('item', originalItem);
  } else {
    hbs.unregisterHelper('item');
  }

  return new Handlebars.SafeString(result);
});

/**
 * Simple bulleted list helper.
 * Usage: {{#bulleted}}{{item}}First{{/item}}{{item}}Second{{/item}}{{/bulleted}}
 */
hbs.registerHelper('bulleted', function (
  this: unknown,
  options: Handlebars.HelperOptions
) {
  const bulletStyle = options.hash.style || 'disc';

  // Register a temporary item helper
  const originalItem = hbs.helpers['item'];
  hbs.registerHelper('item', function (
    this: unknown,
    itemOptions: Handlebars.HelperOptions
  ) {
    const content = itemOptions.fn ? itemOptions.fn(this) : '';
    return new Handlebars.SafeString(`<li>${content}</li>`);
  });

  const result = `<ul style="list-style-type: ${bulletStyle}">${options.fn(this)}</ul>`;

  // Restore original helper
  if (originalItem) {
    hbs.registerHelper('item', originalItem);
  } else {
    hbs.unregisterHelper('item');
  }

  return new Handlebars.SafeString(result);
});

/**
 * Inline numbering reference helper.
 * Usage: {{numbering type="legal" level=2 value=3}}
 * Outputs: "1.3" (or whatever the current state dictates)
 */
hbs.registerHelper('numbering', function (options: Handlebars.HelperOptions) {
  const type = (options.hash.type || 'decimal') as string;
  const level = typeof options.hash.level === 'number' ? options.hash.level : 1;
  const value = typeof options.hash.value === 'number' ? options.hash.value : 1;

  if (type === 'legal' && currentNumberingState?.type === 'legal') {
    // Build legal number from current state
    const parts: number[] = [];
    for (let i = 0; i < level; i++) {
      parts.push(currentNumberingState.counters[i] || 1);
    }
    parts[level - 1] = value;
    return parts.join('.');
  }

  // Simple format
  return formatNumber(type, value);
});

/**
 * Format a number in outline style based on level.
 */
function formatOutlineNumber(ilvl: number, value: number): string {
  switch (ilvl) {
    case 0:
      return toRoman(value, true) + '.';    // I.
    case 1:
      return toLetter(value, true) + '.';   // A.
    case 2:
      return value + '.';                    // 1.
    case 3:
      return toLetter(value, false) + ')';  // a)
    case 4:
      return toRoman(value, false) + ')';   // i)
    default:
      return value + ')';
  }
}

/**
 * Format a number in the specified format.
 */
function formatNumber(format: string, value: number): string {
  switch (format) {
    case 'decimal':
      return String(value);
    case 'lowerLetter':
      return toLetter(value, false);
    case 'upperLetter':
      return toLetter(value, true);
    case 'lowerRoman':
      return toRoman(value, false);
    case 'upperRoman':
      return toRoman(value, true);
    default:
      return String(value);
  }
}

/**
 * Convert number to letter (1=a, 2=b, ..., 27=aa, etc.)
 */
function toLetter(n: number, upper: boolean): string {
  let result = '';
  let num = n;
  while (num > 0) {
    num--;
    result = String.fromCharCode((num % 26) + (upper ? 65 : 97)) + result;
    num = Math.floor(num / 26);
  }
  return result || (upper ? 'A' : 'a');
}

/**
 * Convert number to Roman numeral.
 */
function toRoman(n: number, upper: boolean): string {
  if (n <= 0 || n > 3999) return String(n);

  const romanNumerals: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];

  let result = '';
  let remaining = n;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return upper ? result : result.toLowerCase();
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

function formatDate(dateStr: string, format: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // Single-pass replacement to avoid shorter tokens matching inside already-replaced text
  const tokenMap: Record<string, string> = {
    'MMMM': months[month],
    'MMM': monthsShort[month],
    'MM': String(month + 1).padStart(2, '0'),
    'M': String(month + 1),
    'YYYY': String(year),
    'YY': String(year).slice(-2),
    'DD': String(day).padStart(2, '0'),
    'D': String(day)
  };
  return format.replace(/MMMM|MMM|MM|M|YYYY|YY|DD|D/g, match => tokenMap[match] || match);
}

// ============================================================================
// TEMPLATE RENDERER CLASS
// ============================================================================

export class TemplateRenderer {
  private compiledTemplates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private partials: Map<string, string> = new Map();
  private static MAX_CACHE_SIZE = 50;
  
  /**
   * Register a named partial template that can be referenced via `{{> name}}` in Handlebars.
   */
  registerPartial(name: string, template: string): void {
    this.partials.set(name, template);
    hbs.registerPartial(name, template);
  }
  
  /**
   * Register multiple partials
   */
  registerPartials(partials: Record<string, string>): void {
    for (const [name, template] of Object.entries(partials)) {
      this.registerPartial(name, template);
    }
  }
  
  /**
   * Compile a Handlebars template body, caching the result by `templateId`.
   *
   * Uses an LRU eviction strategy capped at {@link MAX_CACHE_SIZE} entries.
   */
  compile(templateId: string, body: string): Handlebars.TemplateDelegate {
    const cached = this.compiledTemplates.get(templateId);
    if (cached) {
      // Move to end for LRU ordering
      this.compiledTemplates.delete(templateId);
      this.compiledTemplates.set(templateId, cached);
      return cached;
    }

    // LRU eviction: remove oldest entry when cache is full
    if (this.compiledTemplates.size >= TemplateRenderer.MAX_CACHE_SIZE) {
      const firstKey = this.compiledTemplates.keys().next().value;
      if (firstKey) this.compiledTemplates.delete(firstKey);
    }
    const compiled = hbs.compile(body, {
      strict: false,
      assumeObjects: false
    });
    this.compiledTemplates.set(templateId, compiled);
    return compiled;
  }
  
  /**
   * Clear compiled template cache
   */
  clearCache(templateId?: string): void {
    if (templateId) {
      this.compiledTemplates.delete(templateId);
    } else {
      this.compiledTemplates.clear();
    }
  }
  
  /**
   * Render a template definition against a context object.
   *
   * @returns A result with the rendered HTML/text content, or errors if compilation fails.
   */
  render(
    template: TemplateDefinition,
    context: Record<string, unknown>
  ): TemplateRenderResult {
    try {
      const compiled = this.compile(template.id, template.body);
      const content = compiled(context);
      
      return {
        success: true,
        content,
        contentControls: [] // TODO: Extract content control mappings
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[TemplateRenderer] Failed to render template "${template.id}":`, message);
      return {
        success: false,
        content: '',
        contentControls: [],
        errors: [message]
      };
    }
  }
  
  /**
   * Convenience method: render a template using a VariableEngine's current context.
   */
  renderWithEngine(
    template: TemplateDefinition,
    engine: VariableEngine
  ): TemplateRenderResult {
    const context = engine.getTemplateContext();
    return this.render(template, context);
  }
  
  /**
   * Preview render: substitutes `[variableName]` placeholders for any missing values.
   *
   * Useful for showing lawyers a live preview while they are still filling in variables.
   */
  renderPreview(
    template: TemplateDefinition,
    context: Record<string, unknown>
  ): string {
    try {
      // Create preview context with placeholder for undefined
      const previewContext = new Proxy(context, {
        get(target, prop) {
          const value = Reflect.get(target, prop);
          if (value === undefined || value === null || value === '') {
            return `[${String(prop)}]`;
          }
          return value;
        }
      });
      
      const compiled = this.compile(template.id, template.body);
      return compiled(previewContext);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error: ${message}`;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: TemplateRenderer | null = null;

/** Get (or lazily create) the singleton TemplateRenderer instance. */
export function getTemplateRenderer(): TemplateRenderer {
  if (!instance) {
    instance = new TemplateRenderer();
  }
  return instance;
}

// ============================================================================
// BUILT-IN PARTIALS (Components)
// ============================================================================

export const BUILT_IN_PARTIALS: Record<string, string> = {
  // Federal Caption
  'federal-caption': `
<div class="caption">
  <div class="court-name">{{uppercase court.fullName}}</div>
  <div class="caption-body">
    <div class="parties">
      <div class="plaintiffs">{{plaintiffs$.plaintiffNamesEtAl}},</div>
      <div class="party-label">{{pluralize (length plaintiffs) "Plaintiff" "Plaintiffs"}},</div>
      <div class="versus">{{default parties$.versusText "v."}}</div>
      <div class="defendants">{{defendants$.defendantNamesEtAl}},</div>
      <div class="party-label">{{pluralize (length defendants) "Defendant" "Defendants"}}.</div>
    </div>
    <div class="case-info">
      <div class="case-number">{{court.caseNumberLabel}} {{caseNumber}}</div>
      {{#if judge}}<div class="judge">{{judge}}</div>{{/if}}
    </div>
  </div>
</div>
`,

  // Attorney Signature Block
  'attorney-signature': `
<div class="signature-block">
  <p>Respectfully submitted,</p>
  <br><br>
  <p class="signature-line">____________________________</p>
  <p>{{author$.fullNameFormal}}</p>
  <p>Bar No. {{author.barNumber}}</p>
  <p>{{author.firmName}}</p>
  {{#if author.firmAddress}}
  <p>{{author.firmAddress.street1}}</p>
  <p>{{author.firmAddress.city}}, {{author.firmAddress.state}} {{author.firmAddress.zip}}</p>
  {{/if}}
  {{#if author.phone}}<p>Tel: {{author.phone}}</p>{{/if}}
  {{#if author.email}}<p>Email: {{author.email}}</p>{{/if}}
  <br>
  <p>Attorney for {{movingParty$.fullName}}</p>
</div>
`,

  // Proof of Service
  'proof-of-service': `
<div class="proof-of-service">
  <h3>PROOF OF SERVICE</h3>
  <p>I hereby certify that on {{date today format="MMMM D, YYYY"}}, I caused the foregoing document to be served on all counsel of record via {{serviceMethod}}.</p>
  <br><br>
  <p class="signature-line">____________________________</p>
  <p>{{author$.fullName}}</p>
</div>
`,

  // Letterhead
  'firm-letterhead': `
<div class="letterhead">
  <div class="firm-name">{{firm.name}}</div>
  {{#if firm.address}}
  <div class="firm-address">
    {{firm.address.street1}}<br>
    {{firm.address.city}}, {{firm.address.state}} {{firm.address.zip}}
  </div>
  {{/if}}
</div>
`,

  // Letter Salutation
  'letter-salutation': `
{{recipient$.salutation}}
`,

  // Letter Closing
  'letter-closing': `
<p>{{default closing "Sincerely,"}}</p>
<br><br><br>
<p>{{author$.fullNameFormal}}</p>
`,

  // Numbered List
  'numbered-list': `
{{#numbered start=1}}
{{#each items}}
{{#item}}{{this}}{{/item}}
{{/each}}
{{/numbered}}
`,

  // Bulleted List
  'bulleted-list': `
{{#bulleted}}
{{#each items}}
{{#item}}{{this}}{{/item}}
{{/each}}
{{/bulleted}}
`,

  // Legal Outline (for briefs, contracts)
  'legal-outline': `
{{#multilevel type="legal"}}
{{#each sections}}
{{#level 1}}{{this.title}}{{/level}}
{{#each this.subsections}}
{{#level 2}}{{this.title}}{{/level}}
{{#each this.paragraphs}}
{{#level 3}}{{this}}{{/level}}
{{/each}}
{{/each}}
{{/each}}
{{/multilevel}}
`,

  // Outline Format (I, A, 1, a, i)
  'outline-format': `
{{#multilevel type="outline"}}
{{#each sections}}
{{#level 1}}{{this.title}}{{/level}}
{{#each this.items}}
{{#level 2}}{{this}}{{/level}}
{{/each}}
{{/each}}
{{/multilevel}}
`,

  // Contract Sections (common legal document format)
  'contract-sections': `
{{#multilevel type="legal" start=1}}
{{#each articles}}
{{#level 1}}ARTICLE {{@index}} - {{uppercase this.title}}{{/level}}
{{#each this.sections}}
{{#level 2}}{{this.title}}{{/level}}
{{#if this.content}}
<p class="contract-text">{{this.content}}</p>
{{/if}}
{{#each this.subsections}}
{{#level 3}}{{this}}{{/level}}
{{/each}}
{{/each}}
{{/each}}
{{/multilevel}}
`
};

// ============================================================================
// INITIALIZE DEFAULT PARTIALS
// ============================================================================

/** Initialize the singleton renderer and register all built-in legal partials. */
export function initializeRenderer(): TemplateRenderer {
  const renderer = getTemplateRenderer();
  renderer.registerPartials(BUILT_IN_PARTIALS);
  return renderer;
}
