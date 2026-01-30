/**
 * ClauseVault Task Pane UI
 * 
 * React component for browsing, searching, and managing clauses
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  TextField,
  Dropdown,
  IDropdownOption,
  PrimaryButton,
  DefaultButton,
  IconButton,
  Text,
  MessageBar,
  MessageBarType,
  Dialog,
  DialogType,
  DialogFooter,
  Pivot,
  PivotItem,
  List,
  SearchBox,
  Spinner,
  SpinnerSize,
  Label,
  TagPicker,
  ITag,
} from '@fluentui/react';
import {
  clauseVault,
  Clause,
  ClauseCategory,
  CATEGORY_LABELS,
} from './ClauseVault';

// Styles
const styles = {
  container: {
    padding: '16px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    marginBottom: '16px',
  },
  searchBox: {
    marginBottom: '12px',
  },
  clauseList: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  clauseItem: {
    padding: '12px',
    borderBottom: '1px solid #edebe9',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: '#f3f2f1',
    },
  },
  clauseTitle: {
    fontWeight: 600,
    marginBottom: '4px',
  },
  clausePreview: {
    color: '#605e5c',
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  clauseMeta: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
    fontSize: '11px',
    color: '#8a8886',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px',
    color: '#605e5c',
  },
  footer: {
    borderTop: '1px solid #edebe9',
    paddingTop: '12px',
    marginTop: '12px',
  },
};

// Convert categories to dropdown options
const categoryOptions: IDropdownOption[] = [
  { key: '', text: 'All Categories' },
  ...Object.entries(CATEGORY_LABELS).map(([key, text]) => ({
    key,
    text,
  })),
];

/**
 * Single clause item in the list
 */
const ClauseListItem: React.FC<{
  clause: Clause;
  onInsert: (id: string) => void;
  onEdit: (clause: Clause) => void;
  onDelete: (id: string) => void;
}> = ({ clause, onInsert, onEdit, onDelete }) => {
  const preview = clause.content.substring(0, 100) + (clause.content.length > 100 ? '...' : '');
  
  return (
    <div style={styles.clauseItem}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
        <Stack.Item grow>
          <div style={styles.clauseTitle}>{clause.title}</div>
          <div style={styles.clausePreview}>{preview}</div>
          <div style={styles.clauseMeta}>
            <span>{CATEGORY_LABELS[clause.category]}</span>
            <span>•</span>
            <span>Used {clause.usageCount}x</span>
            {clause.tags.length > 0 && (
              <>
                <span>•</span>
                <span>{clause.tags.join(', ')}</span>
              </>
            )}
          </div>
        </Stack.Item>
        <Stack horizontal tokens={{ childrenGap: 4 }}>
          <IconButton
            iconProps={{ iconName: 'Add' }}
            title="Insert"
            onClick={() => onInsert(clause.id)}
          />
          <IconButton
            iconProps={{ iconName: 'Edit' }}
            title="Edit"
            onClick={() => onEdit(clause)}
          />
          <IconButton
            iconProps={{ iconName: 'Delete' }}
            title="Delete"
            onClick={() => onDelete(clause.id)}
          />
        </Stack>
      </Stack>
    </div>
  );
};

/**
 * Save Clause Dialog
 */
const SaveClauseDialog: React.FC<{
  isOpen: boolean;
  onDismiss: () => void;
  onSave: (title: string, category: ClauseCategory, tags: string[], description: string) => void;
  editingClause?: Clause;
}> = ({ isOpen, onDismiss, onSave, editingClause }) => {
  const [title, setTitle] = useState(editingClause?.title || '');
  const [category, setCategory] = useState<ClauseCategory>(editingClause?.category || 'custom');
  const [tags, setTags] = useState<ITag[]>(
    editingClause?.tags.map(t => ({ key: t, name: t })) || []
  );
  const [description, setDescription] = useState(editingClause?.description || '');

  useEffect(() => {
    if (editingClause) {
      setTitle(editingClause.title);
      setCategory(editingClause.category);
      setTags(editingClause.tags.map(t => ({ key: t, name: t })));
      setDescription(editingClause.description || '');
    } else {
      setTitle('');
      setCategory('custom');
      setTags([]);
      setDescription('');
    }
  }, [editingClause, isOpen]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave(title, category, tags.map(t => t.name), description);
    onDismiss();
  };

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: editingClause ? 'Edit Clause' : 'Save to Clause Library',
        subText: editingClause 
          ? 'Update the clause details'
          : 'Save the selected text as a reusable clause',
      }}
      modalProps={{ isBlocking: true }}
    >
      <Stack tokens={{ childrenGap: 12 }}>
        <TextField
          label="Title"
          required
          value={title}
          onChange={(_, v) => setTitle(v || '')}
          placeholder="e.g., Standard Indemnification"
        />
        
        <Dropdown
          label="Category"
          selectedKey={category}
          options={categoryOptions.slice(1)} // Remove "All Categories"
          onChange={(_, option) => setCategory(option?.key as ClauseCategory)}
        />
        
        <div>
          <Label>Tags</Label>
          <TagPicker
            onResolveSuggestions={(filter) => {
              return [{ key: filter, name: filter }];
            }}
            selectedItems={tags}
            onChange={(items) => setTags(items || [])}
            inputProps={{
              placeholder: 'Add tags...',
            }}
          />
        </div>
        
        <TextField
          label="Description (optional)"
          multiline
          rows={2}
          value={description}
          onChange={(_, v) => setDescription(v || '')}
          placeholder="When to use this clause..."
        />
      </Stack>
      
      <DialogFooter>
        <PrimaryButton onClick={handleSave} text="Save" disabled={!title.trim()} />
        <DefaultButton onClick={onDismiss} text="Cancel" />
      </DialogFooter>
    </Dialog>
  );
};

/**
 * Placeholder replacement dialog
 */
const PlaceholderDialog: React.FC<{
  isOpen: boolean;
  placeholders: string[];
  onDismiss: () => void;
  onConfirm: (replacements: Record<string, string>) => void;
}> = ({ isOpen, placeholders, onDismiss, onConfirm }) => {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues({});
  }, [placeholders, isOpen]);

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Fill Placeholders',
        subText: 'Replace the placeholders with actual values',
      }}
      modalProps={{ isBlocking: true }}
    >
      <Stack tokens={{ childrenGap: 12 }}>
        {placeholders.map((placeholder) => (
          <TextField
            key={placeholder}
            label={placeholder}
            value={values[placeholder] || ''}
            onChange={(_, v) => setValues({ ...values, [placeholder]: v || '' })}
            placeholder={`Enter ${placeholder}...`}
          />
        ))}
      </Stack>
      
      <DialogFooter>
        <PrimaryButton onClick={() => onConfirm(values)} text="Insert" />
        <DefaultButton onClick={onDismiss} text="Cancel" />
      </DialogFooter>
    </Dialog>
  );
};

/**
 * Main ClauseVault Task Pane
 */
export const ClauseVaultTaskPane: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ClauseCategory | ''>('');
  const [message, setMessage] = useState<{ type: MessageBarType; text: string } | null>(null);
  
  // Dialog states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editingClause, setEditingClause] = useState<Clause | undefined>();
  const [placeholderDialogOpen, setPlaceholderDialogOpen] = useState(false);
  const [pendingPlaceholders, setPendingPlaceholders] = useState<string[]>([]);
  const [pendingClauseId, setPendingClauseId] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Initialize vault and load clauses
  useEffect(() => {
    const init = async () => {
      try {
        await clauseVault.initialize();
        refreshClauses();
      } catch (e) {
        console.error('[ClauseVault] Init failed:', e);
        showMessage(MessageBarType.error, "Couldn't load Clause Library — try refreshing the panel");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refreshClauses = useCallback(() => {
    const filtered = clauseVault.search(searchQuery, categoryFilter || undefined);
    setClauses(filtered);
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    refreshClauses();
  }, [searchQuery, categoryFilter, refreshClauses]);

  const showMessage = (type: MessageBarType, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Handlers
  const handleSaveClause = async (
    title: string,
    category: ClauseCategory,
    tags: string[],
    description: string
  ) => {
    try {
      if (editingClause) {
        await clauseVault.update(editingClause.id, { title, category, tags, description });
        showMessage(MessageBarType.success, 'Clause updated!');
      } else {
        await clauseVault.saveFromSelection(title, category, tags, description);
        showMessage(MessageBarType.success, 'Clause saved to vault!');
      }
      refreshClauses();
      setEditingClause(undefined);
    } catch (e: any) {
      console.warn('[ClauseVault] Save failed:', e);
      showMessage(MessageBarType.error, "Couldn't save clause — check your connection and try again");
    }
  };

  const handleInsert = async (clauseId: string) => {
    try {
      // Check for placeholders first
      const placeholders = await clauseVault.insertWithPlaceholders(clauseId);
      
      if (placeholders.length > 0) {
        // Show placeholder dialog
        setPendingPlaceholders(placeholders);
        setPendingClauseId(clauseId);
        setPlaceholderDialogOpen(true);
      } else {
        // Insert directly
        await clauseVault.insertClause(clauseId);
        showMessage(MessageBarType.success, 'Clause inserted!');
        refreshClauses();
      }
    } catch (e: any) {
      console.warn('[ClauseVault] Insert failed:', e);
      showMessage(MessageBarType.error, "Couldn't insert clause — make sure your cursor is in the document");
    }
  };

  const handlePlaceholderConfirm = async (replacements: Record<string, string>) => {
    try {
      await clauseVault.insertWithPlaceholders(pendingClauseId, replacements);
      showMessage(MessageBarType.success, 'Clause inserted!');
      refreshClauses();
    } catch (e: any) {
      console.warn('[ClauseVault] Insert with placeholders failed:', e);
      showMessage(MessageBarType.error, "Couldn't insert clause — try again");
    }
    setPlaceholderDialogOpen(false);
  };

  const handleEdit = (clause: Clause) => {
    setEditingClause(clause);
    setSaveDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await clauseVault.delete(id);
      showMessage(MessageBarType.success, 'Clause deleted');
      refreshClauses();
    } catch (e: any) {
      console.warn('[ClauseVault] Delete failed:', e);
      showMessage(MessageBarType.error, "Couldn't delete clause — refresh and try again");
    }
    setDeleteConfirmId(null);
  };

  const handleExport = () => {
    const json = clauseVault.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clause-vault-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showMessage(MessageBarType.success, 'Exported clause library');
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size={SpinnerSize.large} label="Loading Clause Library..." />
      </div>
    );
  }

  const stats = clauseVault.getStats();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Text variant="xLarge" block>
          Clause Library
        </Text>
        <Text variant="small" style={{ color: '#605e5c' }}>
          {stats.totalClauses} clauses • {stats.totalUsages} total uses
        </Text>
      </div>

      {/* Messages */}
      {message && (
        <MessageBar
          messageBarType={message.type}
          isMultiline={false}
          onDismiss={() => setMessage(null)}
          styles={{ root: { marginBottom: 12 } }}
        >
          {message.text}
        </MessageBar>
      )}

      {/* Search and Filter */}
      <SearchBox
        placeholder="Search clauses..."
        value={searchQuery}
        onChange={(_, v) => setSearchQuery(v || '')}
        styles={{ root: styles.searchBox }}
      />
      
      <Dropdown
        placeholder="Filter by category"
        selectedKey={categoryFilter}
        options={categoryOptions}
        onChange={(_, option) => setCategoryFilter((option?.key as ClauseCategory) || '')}
        styles={{ root: { marginBottom: 12 } }}
      />

      {/* Save Button */}
      <PrimaryButton
        iconProps={{ iconName: 'Add' }}
        text="Save Selection to Vault"
        onClick={() => {
          setEditingClause(undefined);
          setSaveDialogOpen(true);
        }}
        styles={{ root: { marginBottom: 12 } }}
      />

      {/* Clause List */}
      <Pivot>
        <PivotItem headerText="All" itemCount={clauses.length}>
          <div style={styles.clauseList}>
            {clauses.length === 0 ? (
              <div style={styles.emptyState}>
                <Text>No clauses found.</Text>
                <Text variant="small" block style={{ marginTop: 8 }}>
                  Select text in your document and click "Save Selection to Vault" to add your first clause.
                </Text>
              </div>
            ) : (
              clauses.map((clause) => (
                <ClauseListItem
                  key={clause.id}
                  clause={clause}
                  onInsert={handleInsert}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              ))
            )}
          </div>
        </PivotItem>
        
        <PivotItem headerText="Frequent">
          <div style={styles.clauseList}>
            {clauseVault.getFrequentlyUsed(10).map((clause) => (
              <ClauseListItem
                key={clause.id}
                clause={clause}
                onInsert={handleInsert}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </div>
        </PivotItem>
        
        <PivotItem headerText="Recent">
          <div style={styles.clauseList}>
            {clauseVault.getRecent(10).map((clause) => (
              <ClauseListItem
                key={clause.id}
                clause={clause}
                onInsert={handleInsert}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </div>
        </PivotItem>
      </Pivot>

      {/* Footer */}
      <div style={styles.footer}>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton
            iconProps={{ iconName: 'Download' }}
            text="Export"
            onClick={handleExport}
          />
        </Stack>
      </div>

      {/* Dialogs */}
      <SaveClauseDialog
        isOpen={saveDialogOpen}
        onDismiss={() => {
          setSaveDialogOpen(false);
          setEditingClause(undefined);
        }}
        onSave={handleSaveClause}
        editingClause={editingClause}
      />

      <PlaceholderDialog
        isOpen={placeholderDialogOpen}
        placeholders={pendingPlaceholders}
        onDismiss={() => setPlaceholderDialogOpen(false)}
        onConfirm={handlePlaceholderConfirm}
      />

      <Dialog
        hidden={!deleteConfirmId}
        onDismiss={() => setDeleteConfirmId(null)}
        dialogContentProps={{
          type: DialogType.normal,
          title: 'Delete Clause?',
          subText: 'This action cannot be undone.',
        }}
      >
        <DialogFooter>
          <PrimaryButton onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} text="Delete" />
          <DefaultButton onClick={() => setDeleteConfirmId(null)} text="Cancel" />
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default ClauseVaultTaskPane;
