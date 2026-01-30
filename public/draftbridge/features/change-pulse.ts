/**
 * Recent Changes Animation
 * 
 * Provides satisfying visual feedback when bulk operations modify document content.
 * Affected ranges get a subtle green pulse that fades out, confirming changes.
 * 
 * Usage:
 *   const pulse = new ChangePulse();
 *   await pulse.highlightRanges(changedRanges);
 *   
 *   // Or wrap any bulk operation:
 *   await pulse.wrapOperation(async () => {
 *     // your bulk changes here
 *     return affectedRanges;
 *   });
 */

// Configuration
const PULSE_CONFIG = {
  // Highlight color (soft green - legal-friendly, not alarming)
  highlightColor: '#E8F5E9',  // Material Design Green 50
  
  // Animation timing
  pulseDurationMs: 400,
  staggerDelayMs: 30,  // Delay between each range for ripple effect
  
  // Limits for performance
  maxRangesToAnimate: 100,
  
  // User preference key
  storageKey: 'draftbridge_pulse_enabled'
};

export interface PulseOptions {
  color?: string;
  duration?: number;
  stagger?: boolean;
  showCount?: boolean;  // Show "X changes" notification
}

export class ChangePulse {
  private enabled: boolean = true;
  
  constructor() {
    this.loadPreference();
  }
  
  /**
   * Check if animations are enabled (user preference)
   */
  private loadPreference(): void {
    try {
      const stored = localStorage.getItem(PULSE_CONFIG.storageKey);
      this.enabled = stored !== 'false';
    } catch {
      this.enabled = true;
    }
  }
  
  /**
   * Toggle animation on/off
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem(PULSE_CONFIG.storageKey, String(enabled));
    } catch {
      // localStorage unavailable, just use in-memory setting
    }
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Highlight changed ranges with a pulse animation
   */
  async highlightRanges(
    ranges: Word.Range[],
    options: PulseOptions = {}
  ): Promise<void> {
    if (!this.enabled || ranges.length === 0) return;
    
    const {
      color = PULSE_CONFIG.highlightColor,
      duration = PULSE_CONFIG.pulseDurationMs,
      stagger = true,
      showCount = true
    } = options;
    
    // Limit ranges for performance
    const toAnimate = ranges.slice(0, PULSE_CONFIG.maxRangesToAnimate);
    
    await Word.run(async (context) => {
      // Store original highlights to restore later
      const originals: Map<Word.Range, Word.HighlightColor> = new Map();
      
      // Apply highlight to all ranges
      for (let i = 0; i < toAnimate.length; i++) {
        const range = toAnimate[i];
        range.load('highlightColor');
      }
      
      await context.sync();
      
      // Save originals and apply pulse color
      for (const range of toAnimate) {
        originals.set(range, range.highlightColor);
      }
      
      // Staggered application for ripple effect
      if (stagger && toAnimate.length > 1) {
        for (let i = 0; i < toAnimate.length; i++) {
          setTimeout(() => {
            Word.run(async (ctx) => {
              // Re-get range in new context
              const range = toAnimate[i];
              range.highlightColor = this.colorToWordHighlight(color);
              await ctx.sync();
            });
          }, i * PULSE_CONFIG.staggerDelayMs);
        }
        
        // Wait for all staggers to apply
        await this.sleep(toAnimate.length * PULSE_CONFIG.staggerDelayMs);
      } else {
        // Apply all at once
        for (const range of toAnimate) {
          range.highlightColor = this.colorToWordHighlight(color);
        }
        await context.sync();
      }
      
      // Hold the highlight briefly
      await this.sleep(duration / 2);
      
      // Fade out (restore original)
      await Word.run(async (ctx) => {
        for (const range of toAnimate) {
          const original = originals.get(range) || Word.HighlightColor.noHighlight;
          range.highlightColor = original;
        }
        await ctx.sync();
      });
      
      // Show notification if enabled
      if (showCount && ranges.length > 0) {
        this.showNotification(ranges.length);
      }
    });
  }
  
  /**
   * Wrap a bulk operation and automatically highlight affected ranges
   */
  async wrapOperation<T extends Word.Range[]>(
    operation: () => Promise<T>,
    options: PulseOptions = {}
  ): Promise<T> {
    const result = await operation();
    await this.highlightRanges(result, options);
    return result;
  }
  
  /**
   * Quick pulse for a single range (common case)
   */
  async pulseRange(range: Word.Range, options: PulseOptions = {}): Promise<void> {
    await this.highlightRanges([range], { ...options, stagger: false });
  }
  
  /**
   * Pulse with custom color presets
   */
  async pulseSuccess(ranges: Word.Range[]): Promise<void> {
    await this.highlightRanges(ranges, { color: '#E8F5E9' }); // Green
  }
  
  async pulseWarning(ranges: Word.Range[]): Promise<void> {
    await this.highlightRanges(ranges, { color: '#FFF8E1' }); // Amber
  }
  
  async pulseInfo(ranges: Word.Range[]): Promise<void> {
    await this.highlightRanges(ranges, { color: '#E3F2FD' }); // Blue
  }
  
  /**
   * Map hex color to Word highlight (limited palette)
   */
  private colorToWordHighlight(hex: string): Word.HighlightColor {
    // Word only supports specific highlight colors
    // Map to closest match
    const colorMap: Record<string, Word.HighlightColor> = {
      '#E8F5E9': Word.HighlightColor.brightGreen,
      '#FFF8E1': Word.HighlightColor.yellow,
      '#E3F2FD': Word.HighlightColor.turquoise,
      '#FFEBEE': Word.HighlightColor.pink,
    };
    return colorMap[hex] || Word.HighlightColor.brightGreen;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Show subtle notification toast
   */
  private showNotification(count: number): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'draftbridge-pulse-notification';
    notification.innerHTML = `
      <span class="draftbridge-pulse-icon">✓</span>
      <span class="draftbridge-pulse-text">${count} ${count === 1 ? 'change' : 'changes'} applied</span>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('draftbridge-pulse-visible');
    });
    
    // Remove after animation
    setTimeout(() => {
      notification.classList.remove('draftbridge-pulse-visible');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
}

// Singleton instance for convenience
export const changePulse = new ChangePulse();

// CSS injection for notification
const pulseStyles = `
.draftbridge-pulse-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #2E7D32;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 10000;
}

.draftbridge-pulse-notification.draftbridge-pulse-visible {
  opacity: 1;
  transform: translateY(0);
}

.draftbridge-pulse-icon {
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.draftbridge-pulse-text {
  letter-spacing: 0.2px;
}
`;

// Inject styles on load
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = pulseStyles;
  document.head.appendChild(styleSheet);
}

export default ChangePulse;
