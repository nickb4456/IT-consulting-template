/**
 * Recreate Panel Component
 * UI for document transformation feature
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  RecreateDocumentType,
  TargetFormat,
  RecreateOptions,
  TRANSFORM_TEMPLATES,
  DEFAULT_OPTIONS
} from '../../types/recreate';
import {
  recreateDocument,
  getSelectedText,
  getDocumentContent,
  openInNewWindow,
  replaceDocumentContent
} from '../../services/recreateService';
import { detectDocumentType, getDocumentTypeLabel } from '../../services/documentDetector';
import './RecreatePanel.css';

interface RecreatePanelProps {
  onClose?: () => void;
}

type TransformStatus = 'idle' | 'loading' | 'success' | 'error';

export const RecreatePanel: React.FC<RecreatePanelProps> = ({ onClose }) => {
  // State
  const [documentContent, setDocumentContent] = useState<string>('');
  const [detectedType, setDetectedType] = useState<RecreateDocumentType>('unknown');
  const [confidence, setConfidence] = useState<number>(0);
  const [selectedTarget, setSelectedTarget] = useState<TargetFormat>('memo');
  const [preservedText, setPreservedText] = useState<string[]>([]);
  const [options, setOptions] = useState<RecreateOptions>(DEFAULT_OPTIONS);
  const [status, setStatus] = useState<TransformStatus>('idle');
  const [result, setResult] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Load document on mount with cleanup
  useEffect(() => {
    let cancelled = false;
    
    const loadDocument = async () => {
      const content = await getDocumentContent();
      if (cancelled) return;
      
      setDocumentContent(content);
      
      if (content) {
        const detection = detectDocumentType(content);
        if (cancelled) return;
        
        setDetectedType(detection.type);
        setConfidence(detection.confidence);
        
        // Auto-select best target based on source
        if (detection.type === 'letter') setSelectedTarget('memo');
        else if (detection.type === 'memo') setSelectedTarget('letter');
        else if (detection.type === 'email') setSelectedTarget('memo');
        else if (detection.type === 'contract') setSelectedTarget('plain');
      }
      
      // Check for selected text
      const selected = await getSelectedText();
      if (cancelled) return;
      setPreservedText(selected);
    };

    loadDocument();
    
    return () => { cancelled = true; };
  }, []);

  const handleTransform = async () => {
    if (!documentContent) return;
    
    setStatus('loading');
    setWarnings([]);
    
    const response = await recreateDocument({
      content: documentContent,
      sourceType: detectedType,
      targetType: selectedTarget,
      preservedText,
      options
    });
    
    if (response.success) {
      setResult(response.transformed);
      setWarnings(response.warnings);
      setStatus('success');
      
      if (!showPreview) {
        // Direct output
        if (options.openInNewWindow) {
          await openInNewWindow(response.transformed);
        } else {
          await replaceDocumentContent(response.transformed);
        }
      }
    } else {
      setStatus('error');
      setWarnings(response.warnings);
    }
  };

  const handleApplyResult = async () => {
    if (!result) return;
    
    if (options.openInNewWindow) {
      await openInNewWindow(result);
    } else {
      await replaceDocumentContent(result);
    }
    
    setShowPreview(false);
    setStatus('idle');
  };

  const removePreservedItem = (index: number) => {
    setPreservedText(prev => prev.filter((_, i) => i !== index));
  };

  const refreshSelection = async () => {
    const selected = await getSelectedText();
    if (selected.length > 0) {
      setPreservedText(prev => [...prev, ...selected.filter(s => !prev.includes(s))]);
    }
  };

  const availableTargets = TRANSFORM_TEMPLATES.filter(
    t => t.availableFrom.includes(detectedType) || detectedType === 'unknown'
  );

  return (
    <div className="recreate-panel">
      <div className="recreate-header">
        <span className="recreate-icon">↻</span>
        <h2>Recreate Document</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      {/* Document Detection */}
      <div className="detection-section">
        <label>Detected Format:</label>
        <div className="detected-type">
          <span className="type-badge">{getDocumentTypeLabel(detectedType)}</span>
          {confidence > 0 && (
            <span className="confidence">({Math.round(confidence * 100)}% confident)</span>
          )}
        </div>
      </div>

      {/* Target Selection */}
      <div className="target-section">
        <label>Transform to:</label>
        <select 
          value={selectedTarget}
          onChange={(e) => setSelectedTarget(e.target.value as TargetFormat)}
          disabled={status === 'loading'}
        >
          {availableTargets.map(t => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
        <p className="target-description">
          {TRANSFORM_TEMPLATES.find(t => t.id === selectedTarget)?.description}
        </p>
      </div>

      {/* Options */}
      <div className="options-section">
        <label>Options:</label>
        <div className="option-row">
          <input
            type="checkbox"
            id="openNew"
            checked={options.openInNewWindow}
            onChange={(e) => setOptions(prev => ({ ...prev, openInNewWindow: e.target.checked }))}
          />
          <label htmlFor="openNew">Open in new window</label>
        </div>
        <div className="option-row">
          <input
            type="checkbox"
            id="preview"
            checked={showPreview}
            onChange={(e) => setShowPreview(e.target.checked)}
          />
          <label htmlFor="preview">Preview before applying</label>
        </div>
      </div>

      {/* Preserved Text */}
      {preservedText.length > 0 && (
        <div className="preserved-section">
          <div className="preserved-header">
            <label>Preserve exactly:</label>
            <button className="refresh-btn" onClick={refreshSelection} title="Add more from selection">
              + Add Selection
            </button>
          </div>
          <ul className="preserved-list">
            {preservedText.map((text, i) => (
              <li key={i}>
                <span className="preserved-text">"{text.substring(0, 50)}{text.length > 50 ? '...' : ''}"</span>
                <button className="remove-btn" onClick={() => removePreservedItem(i)}>×</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {preservedText.length === 0 && (
        <div className="preserved-hint">
          <p>💡 Select text in your document before clicking Transform to preserve specific content exactly.</p>
          <button className="refresh-btn" onClick={refreshSelection}>
            Capture Selection
          </button>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="warnings-section">
          {warnings.map((w, i) => (
            <div key={i} className="warning">⚠️ {w}</div>
          ))}
        </div>
      )}

      {/* Preview */}
      {showPreview && result && status === 'success' && (
        <div className="preview-section">
          <label>Preview:</label>
          <div className="preview-content">
            {result.substring(0, 500)}
            {result.length > 500 && '...'}
          </div>
          <button className="apply-btn" onClick={handleApplyResult}>
            Apply Result
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="actions-section">
        <button 
          className="transform-btn"
          onClick={handleTransform}
          disabled={status === 'loading' || !documentContent}
        >
          {status === 'loading' ? (
            <>⏳ Transforming...</>
          ) : (
            <>↻ Transform</>
          )}
        </button>
      </div>

      {/* Status */}
      {status === 'success' && !showPreview && (
        <div className="status-success">
          ✓ Document transformed successfully
        </div>
      )}
      {status === 'error' && (
        <div className="status-error">
          ✗ Transform failed. Please try again.
        </div>
      )}
    </div>
  );
};

export default RecreatePanel;
