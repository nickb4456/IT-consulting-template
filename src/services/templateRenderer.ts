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
