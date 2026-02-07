# DraftBridge Ribbon Tab Research

**Research Date:** 2026-02-04  
**Researched by:** Pip (subagent)  
**Status:** ✅ Complete

---

## Executive Summary

**Can Office Add-ins create custom ribbon tabs?** ✅ **YES!**

Office Add-ins can absolutely create their own custom ribbon tabs that appear alongside Home, Insert, Design, etc. This is done via the `<CustomTab>` element in the manifest.xml, nested within a `<ExtensionPoint xsi:type="PrimaryCommandSurface">` block.

**Key Finding:** DraftBridge currently uses `<OfficeTab id="TabHome">` which adds a group *to the existing Home tab*. To get a full "DraftBridge" tab, we need to switch to `<CustomTab>`.

---

## 1. Custom Tab vs Existing Tab

### Current DraftBridge Implementation
```xml
<!-- Current: Adds a group to the HOME tab -->
<ExtensionPoint xsi:type="PrimaryCommandSurface">
  <OfficeTab id="TabHome">
    <Group id="DraftBridgeGroup">
      <!-- buttons here -->
    </Group>
  </OfficeTab>
</ExtensionPoint>
```

### Custom Tab Implementation (What We Want)
```xml
<!-- NEW: Creates a full "DraftBridge" tab -->
<ExtensionPoint xsi:type="PrimaryCommandSurface">
  <CustomTab id="DraftBridge.Tab">
    <Group id="DraftBridge.ClauseGroup">
      <Label resid="ClauseGroupLabel"/>
      <Icon>...</Icon>
      <Control xsi:type="Button" id="OpenTaskpane">...</Control>
      <Control xsi:type="Menu" id="QuickActions">...</Control>
    </Group>
    <Group id="DraftBridge.TemplatesGroup">
      <!-- More controls -->
    </Group>
    <Label resid="TabLabel"/>
  </CustomTab>
</ExtensionPoint>
```

### Key Differences

| Approach | Element | Result |
|----------|---------|--------|
| `<OfficeTab id="TabHome">` | Uses existing tab | Button appears in Home tab |
| `<CustomTab id="MyTab">` | Creates new tab | New "DraftBridge" tab appears |

---

## 2. Platform Support

### Custom Tabs Availability

| Platform | Custom Tab Support | Notes |
|----------|-------------------|-------|
| **Word on Windows** | ✅ Full support | Microsoft 365, Office 2016+ |
| **Word on Mac** | ✅ Full support | Microsoft 365, Office 2016+ |
| **Word Online (Web)** | ✅ Full support | All supported browsers |
| **Word on iPad** | ⚠️ Limited | Add-in commands available but limited |

### Custom Tab *Positioning* (InsertBefore/InsertAfter)

**⚠️ Important:** Positioning custom tabs (e.g., "place after Review tab") is currently **only supported in PowerPoint** and requires AddinCommands 1.3 requirement set.

For Word, custom tabs always appear at the **right end of the ribbon** after all built-in tabs.

---

## 3. Control Types Available

### Fully Supported Controls

| Control Type | XML | Description |
|--------------|-----|-------------|
| **Button** | `<Control xsi:type="Button">` | Single action button |
| **Menu (Dropdown)** | `<Control xsi:type="Menu">` | Dropdown with multiple items |

### Example: Dropdown Menu
```xml
<Control xsi:type="Menu" id="DraftBridge.ClauseMenu">
  <Label resid="ClauseMenuLabel"/>
  <Supertip>
    <Title resid="ClauseMenuLabel"/>
    <Description resid="ClauseMenuTooltip"/>
  </Supertip>
  <Icon>...</Icon>
  <Items>
    <Item id="InsertNDA">
      <Label resid="InsertNDALabel"/>
      <Action xsi:type="ExecuteFunction">
        <FunctionName>insertNDAClause</FunctionName>
      </Action>
    </Item>
    <Item id="InsertIP">
      <Label resid="InsertIPLabel"/>
      <Action xsi:type="ShowTaskpane">
        <SourceLocation resid="Taskpane.Url"/>
      </Action>
    </Item>
  </Items>
</Control>
```

### NOT Supported in Office Add-ins

| Control Type | Status | Alternative |
|--------------|--------|-------------|
| **SplitButton** | ❌ Not available | Use Menu control |
| **Gallery** | ❌ Not available | Use Menu or taskpane |
| **Checkbox/Toggle** | ❌ Not available | Use button with state |
| **ComboBox** | ❌ Not available | Use Menu or taskpane |
| **Submenus** | ❌ Only 1 level | Flatten menu structure |

---

## 4. Recommended Limits

Microsoft recommends these limits for good UX:

| Element | Recommended Limit | Rationale |
|---------|-------------------|-----------|
| **Visible tabs** | 7 at a time | Prevents overwhelming users |
| **Groups per tab** | 6 groups | Helps users scan quickly |
| **Commands per group** | 7 commands | Reduces decision fatigue |
| **Total ribbon commands** | 70 visible | Helps locate actions efficiently |

**For DraftBridge:** A single custom tab with 2-3 groups and 4-6 buttons per group would be ideal.

---

## 5. Contextual Tabs (Dynamic/Context-Sensitive)

**Current Status:** Contextual tabs are **only supported in Excel**, not Word.

Contextual tabs appear only when certain conditions are met (e.g., when a table is selected). This is NOT available for Word add-ins.

---

## 6. Built-in Tab IDs for Word

If you want to add groups to existing tabs instead:

| Tab ID | Tab Name | Platform Support |
|--------|----------|------------------|
| `TabHome` | Home | Desktop + Web |
| `TabInsert` | Insert | Desktop + Web |
| `TabWordDesign` | Design | Desktop + Web |
| `TabPageLayoutWord` | Layout | Desktop + Web |
| `TabReferences` | References | Desktop + Web |
| `TabMailings` | Mailings | Desktop + Web |
| `TabReviewWord` | Review | Desktop + Web |
| `TabView` | View | Desktop + Web |
| `TabDeveloper` | Developer | Desktop + Web |
| `TabAddIns` | Add-ins | Desktop + Web |

---

## 7. Can We Have BOTH Ribbon Tab AND Taskpane?

**✅ YES!** This is the standard pattern.

The ribbon tab contains buttons/menus, and those can:
1. **ShowTaskpane** - Open the taskpane panel
2. **ExecuteFunction** - Run JavaScript directly (no UI)

You can have a custom tab with multiple buttons:
- "Open DraftBridge" → Opens taskpane
- "Insert Clause" → Dropdown menu with quick-insert options
- "Settings" → Opens settings taskpane

---

## 8. Real-World Examples

### DocuSign
- Adds controls to existing ribbon tabs
- Uses taskpane for document signing workflow

### Adobe Acrobat
- Uses a custom ribbon group
- PDF operations accessible from ribbon

### Grammarly for Word
- Adds button to Review tab
- Opens taskpane for writing assistance

**Note:** Most enterprise add-ins use a combination of ribbon buttons + taskpane rather than a full custom tab, but custom tabs ARE used by larger applications.

---

## 9. Implementation Plan for DraftBridge

### Proposed Manifest Changes

Replace current `<OfficeTab>` with `<CustomTab>`:

```xml
<ExtensionPoint xsi:type="PrimaryCommandSurface">
  <CustomTab id="DraftBridge.MainTab">
    
    <!-- Group 1: Clause Library -->
    <Group id="DraftBridge.ClauseGroup">
      <Label resid="ClauseGroupLabel"/>
      <Icon>
        <bt:Image size="16" resid="Icon.16x16"/>
        <bt:Image size="32" resid="Icon.32x32"/>
        <bt:Image size="80" resid="Icon.80x80"/>
      </Icon>
      
      <!-- Main button to open taskpane -->
      <Control xsi:type="Button" id="OpenClauseLibrary">
        <Label resid="OpenClauseLibraryLabel"/>
        <Supertip>
          <Title resid="OpenClauseLibraryLabel"/>
          <Description resid="OpenClauseLibraryTooltip"/>
        </Supertip>
        <Icon>
          <bt:Image size="16" resid="Icon.16x16"/>
          <bt:Image size="32" resid="Icon.32x32"/>
          <bt:Image size="80" resid="Icon.80x80"/>
        </Icon>
        <Action xsi:type="ShowTaskpane">
          <TaskpaneId>DraftBridgeTaskpane</TaskpaneId>
          <SourceLocation resid="Taskpane.Url"/>
        </Action>
      </Control>
      
      <!-- Quick Insert dropdown -->
      <Control xsi:type="Menu" id="QuickInsertMenu">
        <Label resid="QuickInsertLabel"/>
        <Supertip>
          <Title resid="QuickInsertLabel"/>
          <Description resid="QuickInsertTooltip"/>
        </Supertip>
        <Icon>
          <bt:Image size="16" resid="QuickInsert.16x16"/>
          <bt:Image size="32" resid="QuickInsert.32x32"/>
          <bt:Image size="80" resid="QuickInsert.80x80"/>
        </Icon>
        <Items>
          <Item id="InsertRecentClause">
            <Label resid="InsertRecentLabel"/>
            <Supertip>
              <Title resid="InsertRecentLabel"/>
              <Description resid="InsertRecentTooltip"/>
            </Supertip>
            <Icon>...</Icon>
            <Action xsi:type="ExecuteFunction">
              <FunctionName>insertRecentClause</FunctionName>
            </Action>
          </Item>
          <Item id="InsertFavorite">
            <Label resid="InsertFavoriteLabel"/>
            <Action xsi:type="ExecuteFunction">
              <FunctionName>insertFavoriteClause</FunctionName>
            </Action>
          </Item>
        </Items>
      </Control>
    </Group>
    
    <!-- Group 2: Templates -->
    <Group id="DraftBridge.TemplatesGroup">
      <Label resid="TemplatesGroupLabel"/>
      <Icon>...</Icon>
      <Control xsi:type="Button" id="OpenTemplates">
        <Label resid="TemplatesLabel"/>
        <Action xsi:type="ShowTaskpane">
          <TaskpaneId>DraftBridgeTemplates</TaskpaneId>
          <SourceLocation resid="Templates.Url"/>
        </Action>
      </Control>
    </Group>
    
    <!-- Tab Label (MUST be last) -->
    <Label resid="DraftBridgeTabLabel"/>
  </CustomTab>
</ExtensionPoint>
```

### Required Resources
```xml
<bt:ShortStrings>
  <bt:String id="DraftBridgeTabLabel" DefaultValue="DraftBridge"/>
  <bt:String id="ClauseGroupLabel" DefaultValue="Clause Library"/>
  <bt:String id="OpenClauseLibraryLabel" DefaultValue="Open Library"/>
  <bt:String id="QuickInsertLabel" DefaultValue="Quick Insert"/>
  <bt:String id="TemplatesGroupLabel" DefaultValue="Templates"/>
  <bt:String id="TemplatesLabel" DefaultValue="Templates"/>
</bt:ShortStrings>
```

### Code Changes Required

For `ExecuteFunction` actions, you need a FunctionFile with the JavaScript:

```javascript
// In commands.js
Office.onReady(() => {});

async function insertRecentClause(event) {
  try {
    // Get most recent clause from cache/API
    const clause = await getRecentClause();
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(clause.text, Word.InsertLocation.replace);
      await context.sync();
    });
  } catch (error) {
    console.error(error);
  }
  event.completed();
}

// Register the function
Office.actions.associate("insertRecentClause", insertRecentClause);
```

---

## 10. Limitations Summary

| Limitation | Details |
|------------|---------|
| Tab positioning | Cannot choose position in Word (always rightmost) |
| Control types | Only Button and Menu, no galleries/split buttons |
| Contextual tabs | Not available for Word |
| Submenus | Only 1 level of nesting allowed |
| One custom tab | Add-ins limited to ONE custom tab |

---

## 11. Microsoft Documentation Links

- [CustomTab Element Reference](https://learn.microsoft.com/en-us/javascript/api/manifest/customtab)
- [Add-in Commands Overview](https://learn.microsoft.com/en-us/office/dev/add-ins/design/add-in-commands)
- [Create Add-in Commands](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/create-addin-commands)
- [Built-in Tab IDs](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/built-in-ui-ids)
- [Custom Tab Positioning (PowerPoint only)](https://learn.microsoft.com/en-us/office/dev/add-ins/design/custom-tab-placement)
- [AddinCommands Requirement Sets](https://learn.microsoft.com/en-us/javascript/api/requirement-sets/common/add-in-commands-requirement-sets)

---

## 12. Recommendation

**Implement a custom "DraftBridge" tab** with:

1. **Clause Library group**
   - "Open Library" button → Opens main taskpane
   - "Quick Insert" dropdown → Fast clause insertion

2. **Templates group**
   - "Templates" button → Opens templates view
   - "New Document" button → Start from template

3. **Tools group** (optional)
   - "Settings" button
   - "Analytics" button → Usage stats

This gives DraftBridge prominent placement in Word's ribbon while maintaining the full functionality of the taskpane for complex operations.

---

## Questions for Nick

1. Should we keep the Home tab button AS WELL as adding a custom tab? (Users can then access DraftBridge from either location)

2. What quick-insert functions would be most valuable directly from ribbon buttons (without opening the full taskpane)?

3. Should the tab be called "DraftBridge" or something shorter like "Draft"?

---

*Research complete. Ready to implement when approved.* 🚀
