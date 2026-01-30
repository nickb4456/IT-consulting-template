/**
 * Version History - Timeline Panel
 * 
 * Task pane UI for browsing and restoring document versions.
 * Features the famous "Panic Button" for emergency recovery.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  PrimaryButton,
  DefaultButton,
  IconButton,
  Toggle,
  Slider,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  Dialog,
  DialogType,
  DialogFooter,
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  SelectionMode,
  mergeStyleSets,
  getTheme,
} from '@fluentui/react';
import { 
  VersionManager, 
  DocumentSnapshot, 
  DiffResult,
  getSurvivor 
} from './VersionManager';

const theme = getTheme();

const styles = mergeStyleSets({
  container: {
    padding: '16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  panicButton: {
    backgroundColor: '#d13438',
    borderColor: '#d13438',
    color: 'white',
    fontSize: '18px',
    height: '60px',
    marginBottom: '20px',
    ':hover': {
      backgroundColor: '#a4262c',
      borderColor: '#a4262c',
    }
  },
  panicIcon: {
    fontSize: '24px',
    marginRight: '8px',
  },
  timeline: {
    flex: 1,
    overflowY: 'auto',
  },
  snapshotCard: {
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: theme.palette.neutralLighter,
    borderRadius: '4px',
    borderLeft: '4px solid',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: theme.palette.neutralLight,
    }
  },
  manualSnapshot: {
    borderLeftColor: theme.palette.themePrimary,
  },
  autoSnapshot: {
    borderLeftColor: theme.palette.neutralTertiary,
  },
  timestamp: {
    fontSize: '12px',
    color: theme.palette.neutralSecondary,
  },
  changesSummary: {
    fontSize: '13px',
    color: theme.palette.neutralPrimary,
    marginTop: '4px',
  },
  wordCount: {
    fontSize: '11px',
    color: theme.palette.neutralTertiary,
    marginTop: '2px',
  },
  statusBar: {
    padding: '8px 12px',
    backgroundColor: theme.palette.themeLighter,
    borderRadius: '4px',
    marginBottom: '16px',
  },
  diffViewer: {
    maxHeight: '300px',
    overflow: 'auto',
    padding: '12px',
    backgroundColor: theme.palette.neutralLighter,
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  added: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  removed: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    textDecoration: 'line-through',
  },
});

interface SurvivorPanelProps {
  onClose?: () => void;
}

export const SurvivorPanel: React.FC<SurvivorPanelProps> = ({ onClose }) => {
  const [survivor] = useState(() => getSurvivor());
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5); // minutes
  const [selectedSnapshot, setSelectedSnapshot] = useState<DocumentSnapshot | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [isPanicMode, setIsPanicMode] = useState(false);
  const [message, setMessage] = useState<{ type: MessageBarType; text: string } | null>(null);

  // Load snapshots
  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await survivor.getAllSnapshots();
      setSnapshots(all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    } catch (error) {
      console.error('[Survivor] Load snapshots failed:', error);
      setMessage({ type: MessageBarType.error, text: "Couldn't load version history — your versions are still safe, try refreshing" });
    }
    setIsLoading(false);
  }, [survivor]);

  useEffect(() => {
    // Initialize survivor when component mounts
    Word.run(async (context) => {
      await survivor.initialize(context);
      if (autoSaveEnabled) {
        survivor.startAutoSave();
      }
      await loadSnapshots();
    }).catch(console.error);

    return () => {
      survivor.stopAutoSave();
    };
  }, [survivor, loadSnapshots, autoSaveEnabled]);

  // Handle auto-save toggle
  const handleAutoSaveToggle = (_: any, checked?: boolean) => {
    setAutoSaveEnabled(!!checked);
    if (checked) {
      survivor.startAutoSave();
      setMessage({ type: MessageBarType.success, text: 'Auto-save enabled' });
    } else {
      survivor.stopAutoSave();
      setMessage({ type: MessageBarType.warning, text: 'Auto-save disabled' });
    }
  };

  // Create manual snapshot
  const handleManualSave = async () => {
    setIsLoading(true);
    try {
      await Word.run(async (context) => {
        await survivor.createSnapshot(context, true);
      });
      await loadSnapshots();
      setMessage({ type: MessageBarType.success, text: 'Snapshot saved!' });
    } catch (error) {
      console.error('[Survivor] Snapshot creation failed:', error);
      setMessage({ type: MessageBarType.error, text: "Couldn't save this version — your document is still safe, try again" });
    }
    setIsLoading(false);
  };

  // 🚨 PANIC BUTTON
  const handlePanicButton = async () => {
    setIsPanicMode(true);
    const recentVersions = await survivor.panicButton();
    setSnapshots(recentVersions);
    setMessage({ 
      type: MessageBarType.warning, 
      text: `Showing last ${recentVersions.length} versions - Select one to restore` 
    });
  };

  // Restore snapshot
  const handleRestore = async () => {
    if (!selectedSnapshot) return;
    
    setShowRestoreDialog(false);
    setIsLoading(true);
    try {
      await Word.run(async (context) => {
        await survivor.restoreSnapshot(context, selectedSnapshot.id);
      });
      setMessage({ 
        type: MessageBarType.success, 
        text: `Restored to version from ${formatTimestamp(selectedSnapshot.timestamp)}` 
      });
      setIsPanicMode(false);
      await loadSnapshots();
    } catch (error) {
      console.error('[Survivor] Restore failed:', error);
      setMessage({ type: MessageBarType.error, text: "Couldn't restore that version — it's still available, try again" });
    }
    setIsLoading(false);
  };

  // Compare with current
  const handleCompare = async (snapshot: DocumentSnapshot) => {
    const latest = snapshots[0];
    if (!latest || latest.id === snapshot.id) {
      setMessage({ type: MessageBarType.info, text: 'Nothing to compare' });
      return;
    }
    
    try {
      const result = await survivor.compareSnapshots(snapshot.id, latest.id);
      setDiffResult(result);
      setShowDiffDialog(true);
    } catch (error) {
      console.error('[Survivor] Compare failed:', error);
      setMessage({ type: MessageBarType.error, text: "Couldn't compare these versions — try selecting different ones" });
    }
  };

  // Format timestamp for display
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="xLarge" block>
          🛟 Version History
        </Text>
        {onClose && (
          <IconButton iconProps={{ iconName: 'Cancel' }} onClick={onClose} />
        )}
      </Stack>
      <Text variant="small" style={{ color: theme.palette.neutralSecondary, marginBottom: 16 }}>
        Your document time machine
      </Text>

      {/* Message Bar */}
      {message && (
        <MessageBar
          messageBarType={message.type}
          onDismiss={() => setMessage(null)}
          dismissButtonAriaLabel="Close"
          style={{ marginBottom: 12 }}
        >
          {message.text}
        </MessageBar>
      )}

      {/* 🚨 PANIC BUTTON */}
      <PrimaryButton
        className={styles.panicButton}
        onClick={handlePanicButton}
        disabled={isLoading}
      >
        <span className={styles.panicIcon}>🚨</span>
        PANIC BUTTON
      </PrimaryButton>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="small">
            {snapshots.length} saved version{snapshots.length !== 1 ? 's' : ''}
          </Text>
          <Toggle
            label="Auto-save"
            inlineLabel
            checked={autoSaveEnabled}
            onChange={handleAutoSaveToggle}
          />
        </Stack>
      </div>

      {/* Quick Actions */}
      <Stack horizontal tokens={{ childrenGap: 8 }} style={{ marginBottom: 16 }}>
        <PrimaryButton
          iconProps={{ iconName: 'Save' }}
          onClick={handleManualSave}
          disabled={isLoading}
        >
          Save Now
        </PrimaryButton>
        <DefaultButton
          iconProps={{ iconName: 'Refresh' }}
          onClick={loadSnapshots}
          disabled={isLoading}
        >
          Refresh
        </DefaultButton>
        {isPanicMode && (
          <DefaultButton
            iconProps={{ iconName: 'Cancel' }}
            onClick={() => { setIsPanicMode(false); loadSnapshots(); }}
          >
            Exit Panic
          </DefaultButton>
        )}
      </Stack>

      {/* Version Timeline */}
      <Text variant="mediumPlus" style={{ marginBottom: 8 }}>
        {isPanicMode ? '🚨 Recent Versions (Panic Mode)' : 'Version Timeline'}
      </Text>
      
      <div className={styles.timeline}>
        {isLoading ? (
          <Stack horizontalAlign="center" style={{ padding: 40 }}>
            <Spinner size={SpinnerSize.large} label="Loading versions..." />
          </Stack>
        ) : snapshots.length === 0 ? (
          <MessageBar>
            No versions saved yet. Click "Save Now" to create your first snapshot!
          </MessageBar>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className={`${styles.snapshotCard} ${
                snapshot.isManualSave ? styles.manualSnapshot : styles.autoSnapshot
              }`}
              onClick={() => setSelectedSnapshot(snapshot)}
              style={{
                outline: selectedSnapshot?.id === snapshot.id 
                  ? `2px solid ${theme.palette.themePrimary}` 
                  : undefined
              }}
            >
              <Stack horizontal horizontalAlign="space-between">
                <Text className={styles.timestamp}>
                  {formatTimestamp(snapshot.timestamp)}
                  {snapshot.isManualSave && ' 📌'}
                </Text>
                <Stack horizontal tokens={{ childrenGap: 4 }}>
                  <IconButton
                    iconProps={{ iconName: 'Compare' }}
                    title="Compare with current"
                    onClick={(e) => { e.stopPropagation(); handleCompare(snapshot); }}
                  />
                  <IconButton
                    iconProps={{ iconName: 'Undo' }}
                    title="Restore this version"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setSelectedSnapshot(snapshot);
                      setShowRestoreDialog(true);
                    }}
                  />
                </Stack>
              </Stack>
              <Text className={styles.changesSummary}>
                {snapshot.changesSummary || 'No changes recorded'}
              </Text>
              <Text className={styles.wordCount}>
                {snapshot.wordCount.toLocaleString()} words
              </Text>
            </div>
          ))
        )}
      </div>

      {/* Restore Confirmation Dialog */}
      <Dialog
        hidden={!showRestoreDialog}
        onDismiss={() => setShowRestoreDialog(false)}
        dialogContentProps={{
          type: DialogType.normal,
          title: '⚠️ Restore Version?',
          subText: selectedSnapshot 
            ? `This will restore your document to the version from ${formatTimestamp(selectedSnapshot.timestamp)}. A snapshot of your current document will be saved first.`
            : ''
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={handleRestore} text="Restore" />
          <DefaultButton onClick={() => setShowRestoreDialog(false)} text="Cancel" />
        </DialogFooter>
      </Dialog>

      {/* Diff Viewer Dialog */}
      <Dialog
        hidden={!showDiffDialog}
        onDismiss={() => setShowDiffDialog(false)}
        dialogContentProps={{
          type: DialogType.largeHeader,
          title: '📊 Version Comparison',
        }}
        minWidth={600}
      >
        {diffResult && (
          <>
            <Stack horizontal tokens={{ childrenGap: 20 }} style={{ marginBottom: 16 }}>
              <Text>
                <strong>Added:</strong> +{diffResult.addedWords} words
              </Text>
              <Text>
                <strong>Removed:</strong> -{diffResult.removedWords} words
              </Text>
            </Stack>
            <div className={styles.diffViewer}>
              {diffResult.changes.map((change, index) => {
                if (change.added) {
                  return <span key={index} className={styles.added}>{change.value}</span>;
                }
                if (change.removed) {
                  return <span key={index} className={styles.removed}>{change.value}</span>;
                }
                return <span key={index}>{change.value}</span>;
              })}
            </div>
          </>
        )}
        <DialogFooter>
          <DefaultButton onClick={() => setShowDiffDialog(false)} text="Close" />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default SurvivorPanel;
