/**
 * Recent Changes Animation - Integration Examples
 * 
 * Shows how to integrate pulse animations with common DraftBridge operations
 */

import { changePulse, ChangePulse } from './change-pulse';

// ============================================================
// Example 1: Template Application
// ============================================================

async function applyTemplate(templateId: string): Promise<void> {
  await Word.run(async (context) => {
    const changedRanges: Word.Range[] = [];
    
    // Your template logic here...
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    
    // For each paragraph that matches template patterns...
    for (const para of paragraphs.items) {
      // Apply template changes
      // ... your logic ...
      
      // Track the changed range
      changedRanges.push(para.getRange());
    }
    
    await context.sync();
    
    // Pulse all changed ranges - the magic moment! ✨
    await changePulse.highlightRanges(changedRanges);
  });
}


// ============================================================
// Example 2: Find & Replace with Visual Feedback
// ============================================================

async function findAndReplace(find: string, replace: string): Promise<number> {
  let count = 0;
  
  await Word.run(async (context) => {
    const changedRanges: Word.Range[] = [];
    
    const searchResults = context.document.body.search(find, {
      matchCase: false,
      matchWholeWord: false
    });
    
    searchResults.load('items');
    await context.sync();
    
    for (const result of searchResults.items) {
      result.insertText(replace, Word.InsertLocation.replace);
      changedRanges.push(result);
      count++;
    }
    
    await context.sync();
    
    // Pulse shows exactly what changed - users love this
    await changePulse.highlightRanges(changedRanges);
  });
  
  return count;
}


// ============================================================
// Example 3: Bulk Clause Insertion
// ============================================================

async function insertClauses(clauses: string[], afterParagraph: number): Promise<void> {
  await changePulse.wrapOperation(async () => {
    const insertedRanges: Word.Range[] = [];
    
    await Word.run(async (context) => {
      const paragraphs = context.document.body.paragraphs;
      paragraphs.load('items');
      await context.sync();
      
      let insertPoint = paragraphs.items[afterParagraph];
      
      for (const clause of clauses) {
        const newPara = insertPoint.insertParagraph(clause, Word.InsertLocation.after);
        insertedRanges.push(newPara.getRange());
        insertPoint = newPara;
      }
      
      await context.sync();
    });
    
    return insertedRanges;
  });
}


// ============================================================
// Example 4: Variable Replacement (Party Names, Dates, etc.)
// ============================================================

interface VariableMap {
  [placeholder: string]: string;
}

async function replaceVariables(variables: VariableMap): Promise<void> {
  const allChangedRanges: Word.Range[] = [];
  
  await Word.run(async (context) => {
    for (const [placeholder, value] of Object.entries(variables)) {
      const searchResults = context.document.body.search(placeholder, {
        matchCase: true,
        matchWholeWord: false
      });
      
      searchResults.load('items');
      await context.sync();
      
      for (const result of searchResults.items) {
        result.insertText(value, Word.InsertLocation.replace);
        allChangedRanges.push(result);
      }
      
      await context.sync();
    }
    
    // Single pulse for all variable replacements
    // Staggered animation creates a satisfying "ripple" effect
    await changePulse.highlightRanges(allChangedRanges, {
      stagger: true,
      showCount: true
    });
  });
}


// ============================================================
// Example 5: Different Pulse Types for Different Actions
// ============================================================

async function demonstratePulseTypes(): Promise<void> {
  await Word.run(async (context) => {
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    paragraphs.load('items');
    await context.sync();
    
    // Success: template applied, clause inserted
    await changePulse.pulseSuccess([paragraphs.items[0].getRange()]);
    
    // Warning: found potential issues
    await changePulse.pulseWarning([paragraphs.items[1].getRange()]);
    
    // Info: just highlighting for review
    await changePulse.pulseInfo([paragraphs.items[2].getRange()]);
  });
}


// ============================================================
// Example 6: User Preference Toggle (Settings Panel)
// ============================================================

function createPulseToggle(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'draftbridge-setting';
  
  const label = document.createElement('label');
  label.textContent = 'Show change animations';
  
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = changePulse.isEnabled();
  
  toggle.addEventListener('change', () => {
    changePulse.setEnabled(toggle.checked);
  });
  
  container.appendChild(toggle);
  container.appendChild(label);
  
  return container;
}


// ============================================================
// Example 7: Integration with DraftBridge Command System
// ============================================================

interface DraftBridgeCommand {
  id: string;
  execute: () => Promise<Word.Range[]>;
}

async function executeWithPulse(command: DraftBridgeCommand): Promise<void> {
  try {
    const affectedRanges = await command.execute();
    await changePulse.highlightRanges(affectedRanges);
  } catch (error) {
    console.error(`Command ${command.id} failed:`, error);
    throw error;
  }
}
