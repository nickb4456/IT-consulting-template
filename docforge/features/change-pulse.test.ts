/**
 * Recent Changes Animation - Unit Tests
 */

import { ChangePulse } from './change-pulse';

// Mock Word API for testing outside Office
const mockWordRange = {
  highlightColor: null as any,
  load: jest.fn(),
};

const mockContext = {
  sync: jest.fn().mockResolvedValue(undefined),
};

// @ts-ignore - mocking global
global.Word = {
  run: jest.fn(async (callback) => {
    await callback(mockContext);
  }),
  HighlightColor: {
    noHighlight: 'NoColor',
    brightGreen: 'BrightGreen',
    yellow: 'Yellow',
    turquoise: 'Turquoise',
    pink: 'Pink',
  },
};

describe('ChangePulse', () => {
  let pulse: ChangePulse;
  
  beforeEach(() => {
    pulse = new ChangePulse();
    localStorage.clear();
    jest.clearAllMocks();
  });
  
  describe('preferences', () => {
    it('should default to enabled', () => {
      expect(pulse.isEnabled()).toBe(true);
    });
    
    it('should persist disabled state', () => {
      pulse.setEnabled(false);
      expect(pulse.isEnabled()).toBe(false);
      expect(localStorage.getItem('docforge_pulse_enabled')).toBe('false');
    });
    
    it('should persist enabled state', () => {
      pulse.setEnabled(false);
      pulse.setEnabled(true);
      expect(pulse.isEnabled()).toBe(true);
      expect(localStorage.getItem('docforge_pulse_enabled')).toBe('true');
    });
    
    it('should load preference from storage', () => {
      localStorage.setItem('docforge_pulse_enabled', 'false');
      const newPulse = new ChangePulse();
      expect(newPulse.isEnabled()).toBe(false);
    });
  });
  
  describe('highlightRanges', () => {
    it('should do nothing when disabled', async () => {
      pulse.setEnabled(false);
      await pulse.highlightRanges([mockWordRange as any]);
      expect(global.Word.run).not.toHaveBeenCalled();
    });
    
    it('should do nothing with empty array', async () => {
      await pulse.highlightRanges([]);
      expect(global.Word.run).not.toHaveBeenCalled();
    });
    
    it('should call Word.run when enabled with ranges', async () => {
      await pulse.highlightRanges([mockWordRange as any], { showCount: false });
      expect(global.Word.run).toHaveBeenCalled();
    });
  });
  
  describe('wrapOperation', () => {
    it('should execute operation and return result', async () => {
      const mockRanges = [mockWordRange as any];
      const operation = jest.fn().mockResolvedValue(mockRanges);
      
      const result = await pulse.wrapOperation(operation, { showCount: false });
      
      expect(operation).toHaveBeenCalled();
      expect(result).toBe(mockRanges);
    });
  });
  
  describe('color presets', () => {
    it('should have success preset (green)', async () => {
      const spy = jest.spyOn(pulse, 'highlightRanges');
      await pulse.pulseSuccess([mockWordRange as any]);
      expect(spy).toHaveBeenCalledWith(
        [mockWordRange],
        expect.objectContaining({ color: '#E8F5E9' })
      );
    });
    
    it('should have warning preset (amber)', async () => {
      const spy = jest.spyOn(pulse, 'highlightRanges');
      await pulse.pulseWarning([mockWordRange as any]);
      expect(spy).toHaveBeenCalledWith(
        [mockWordRange],
        expect.objectContaining({ color: '#FFF8E1' })
      );
    });
    
    it('should have info preset (blue)', async () => {
      const spy = jest.spyOn(pulse, 'highlightRanges');
      await pulse.pulseInfo([mockWordRange as any]);
      expect(spy).toHaveBeenCalledWith(
        [mockWordRange],
        expect.objectContaining({ color: '#E3F2FD' })
      );
    });
  });
});

describe('Notification', () => {
  it('should create notification element', () => {
    // The CSS should be injected
    const styleElements = document.querySelectorAll('style');
    const hasStyles = Array.from(styleElements).some(
      el => el.textContent?.includes('docforge-pulse-notification')
    );
    expect(hasStyles).toBe(true);
  });
});
