/**
 * Version History - Keyboard Commands & Ribbon Integration
 * 
 * Provides quick access to versioning features via
 * keyboard shortcuts and Office ribbon integration.
 */

import { getSurvivor } from './VersionManager';

/**
 * Command IDs for Office ribbon/menu integration
 */
export const SURVIVOR_COMMANDS = {
  PANIC_BUTTON: 'DocForge.Survivor.Panic',
  SAVE_SNAPSHOT: 'DocForge.Survivor.Save',
  SHOW_TIMELINE: 'DocForge.Survivor.Timeline',
  QUICK_RESTORE: 'DocForge.Survivor.QuickRestore',
  COMPARE_LAST: 'DocForge.Survivor.CompareLast',
  TOGGLE_AUTOSAVE: 'DocForge.Survivor.ToggleAuto',
} as const;

/**
 * Register all Survivor commands with Office
 */
export function registerSurvivorCommands(): void {
  Office.actions.associate(SURVIVOR_COMMANDS.PANIC_BUTTON, panicButtonCommand);
  Office.actions.associate(SURVIVOR_COMMANDS.SAVE_SNAPSHOT, saveSnapshotCommand);
  Office.actions.associate(SURVIVOR_COMMANDS.QUICK_RESTORE, quickRestoreCommand);
  Office.actions.associate(SURVIVOR_COMMANDS.COMPARE_LAST, compareLastCommand);
}

/**
 * 🚨 PANIC BUTTON - Immediate access to recent versions
 * Keyboard shortcut: Ctrl+Shift+P (configured in manifest)
 */
async function panicButtonCommand(event: Office.AddinCommands.Event): Promise<void> {
  try {
    const survivor = getSurvivor();
    const recentVersions = await survivor.panicButton();
    
    if (recentVersions.length === 0) {
      showNotification('No versions saved yet!', 'warning');
      event.completed();
      return;
    }

    // Open task pane in panic mode
    await Office.addin.showAsTaskpane();
    
    // Send message to panel to enter panic mode
    Office.context.ui.messageParent(JSON.stringify({
      type: 'PANIC_MODE',
      versions: recentVersions.length
    }));
    
    showNotification(`🚨 ${recentVersions.length} recent versions available`, 'info');
  } catch (error) {
    console.error('[Survivor] Panic button failed:', error);
    showNotification("Couldn't access versions — try the panel instead", 'error');
  }
  
  event.completed();
}

/**
 * Quick save - Create manual snapshot
 * Keyboard shortcut: Ctrl+Shift+S (configured in manifest)
 */
async function saveSnapshotCommand(event: Office.AddinCommands.Event): Promise<void> {
  try {
    await Word.run(async (context) => {
      const survivor = getSurvivor();
      await survivor.initialize(context);
      const snapshot = await survivor.createSnapshot(context, true);
      
      if (snapshot) {
        showNotification('✅ Version saved!', 'success');
      } else {
        showNotification('No changes to save', 'info');
      }
    });
  } catch (error) {
    console.error('[Survivor] Save snapshot failed:', error);
    showNotification("Couldn't save version — your document is safe, try again", 'error');
  }
  
  event.completed();
}

/**
 * Quick restore - Restore to last saved version
 * Keyboard shortcut: Ctrl+Shift+Z (configured in manifest)
 */
async function quickRestoreCommand(event: Office.AddinCommands.Event): Promise<void> {
  try {
    await Word.run(async (context) => {
      const survivor = getSurvivor();
      await survivor.initialize(context);
      
      const latest = await survivor.getLatestSnapshot();
      if (!latest) {
        showNotification('No versions to restore', 'warning');
        event.completed();
        return;
      }
      
      // Show confirmation dialog
      await Office.context.ui.displayDialogAsync(
        'https://localhost:3000/survivor-confirm.html',
        { height: 30, width: 20 },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            result.value.addEventHandler(
              Office.EventType.DialogMessageReceived,
              async (arg: any) => {
                if (arg.message === 'CONFIRM') {
                  await survivor.restoreSnapshot(context, latest.id);
                  showNotification('✅ Restored to last version', 'success');
                }
                result.value.close();
              }
            );
          }
        }
      );
    });
  } catch (error) {
    console.error('[Survivor] Quick restore failed:', error);
    showNotification("Couldn't restore — try using the Survivor panel", 'error');
  }
  
  event.completed();
}

/**
 * Compare with last version
 */
async function compareLastCommand(event: Office.AddinCommands.Event): Promise<void> {
  try {
    const survivor = getSurvivor();
    const snapshots = await survivor.getAllSnapshots();
    
    if (snapshots.length < 2) {
      showNotification('Need at least 2 versions to compare', 'info');
      event.completed();
      return;
    }
    
    const sorted = snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const diff = await survivor.compareSnapshots(sorted[1].id, sorted[0].id);
    
    const summary = diff.addedWords > 0 
      ? `+${diff.addedWords} words added` 
      : diff.removedWords > 0 
        ? `-${diff.removedWords} words removed`
        : 'Minor changes';
    
    showNotification(`Changes since last save: ${summary}`, 'info');
  } catch (error) {
    console.error('[Survivor] Compare failed:', error);
    showNotification("Couldn't compare — try selecting versions in the panel", 'error');
  }
  
  event.completed();
}

/**
 * Show notification to user
 */
function showNotification(
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error'
): void {
  // Use Office notification API if available
  if (Office.context.mailbox?.item?.notificationMessages) {
    Office.context.mailbox.item.notificationMessages.addAsync('survivor', {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message: message,
      icon: 'icon-16',
      persistent: false
    });
  } else {
    // Fallback to console for Word
    console.log(`[Survivor ${type}] ${message}`);
    
    // Could also use a custom toast notification system
    const event = new CustomEvent('survivor-notification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }
}

/**
 * Manifest snippet for keyboard shortcuts
 * Add to manifest.xml:
 * 
 * <ExtensionPoint xsi:type="Keyboard">
 *   <Shortcuts>
 *     <Shortcut>
 *       <Action>DocForge.Survivor.Panic</Action>
 *       <Key>Ctrl+Shift+P</Key>
 *     </Shortcut>
 *     <Shortcut>
 *       <Action>DocForge.Survivor.Save</Action>
 *       <Key>Ctrl+Shift+S</Key>
 *     </Shortcut>
 *     <Shortcut>
 *       <Action>DocForge.Survivor.QuickRestore</Action>
 *       <Key>Ctrl+Shift+Z</Key>
 *     </Shortcut>
 *   </Shortcuts>
 * </ExtensionPoint>
 */
export const MANIFEST_SHORTCUTS = `
<ExtensionPoint xsi:type="Keyboard">
  <Shortcuts>
    <Shortcut>
      <Action>DocForge.Survivor.Panic</Action>
      <Key>Ctrl+Shift+P</Key>
    </Shortcut>
    <Shortcut>
      <Action>DocForge.Survivor.Save</Action>
      <Key>Ctrl+Shift+S</Key>
    </Shortcut>
    <Shortcut>
      <Action>DocForge.Survivor.QuickRestore</Action>
      <Key>Ctrl+Shift+Z</Key>
    </Shortcut>
  </Shortcuts>
</ExtensionPoint>
`;

/**
 * Ribbon button configuration for manifest
 */
export const RIBBON_BUTTONS = `
<Group id="SurvivorGroup">
  <Label resid="Survivor.Group.Label"/>
  <Control xsi:type="Button" id="SurvivorPanicButton">
    <Label resid="Survivor.Panic.Label"/>
    <Supertip>
      <Title resid="Survivor.Panic.Title"/>
      <Description resid="Survivor.Panic.Desc"/>
    </Supertip>
    <Icon>
      <bt:Image size="16" resid="Icon.Panic.16"/>
      <bt:Image size="32" resid="Icon.Panic.32"/>
    </Icon>
    <Action xsi:type="ExecuteFunction">
      <FunctionName>DocForge.Survivor.Panic</FunctionName>
    </Action>
  </Control>
  <Control xsi:type="Button" id="SurvivorSaveButton">
    <Label resid="Survivor.Save.Label"/>
    <Supertip>
      <Title resid="Survivor.Save.Title"/>
      <Description resid="Survivor.Save.Desc"/>
    </Supertip>
    <Icon>
      <bt:Image size="16" resid="Icon.Save.16"/>
      <bt:Image size="32" resid="Icon.Save.32"/>
    </Icon>
    <Action xsi:type="ExecuteFunction">
      <FunctionName>DocForge.Survivor.Save</FunctionName>
    </Action>
  </Control>
</Group>
`;
