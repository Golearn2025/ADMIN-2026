# Document Actions - Enterprise Architecture

## Overview

Modular, scalable document action system with clean separation of concerns.

## Architecture

```
actions/
├── DocumentActions.tsx          (Container - 56 lines)
├── DocumentPrimaryActions.tsx   (Primary buttons - 51 lines)
├── DocumentSettingsMenu.tsx     (Dropdown menu - 72 lines)
└── DocumentActionButton.tsx     (Reusable button - 37 lines)

hooks/
└── useDocumentActions.ts        (Handler hook - 58 lines)
```

All components < 200 lines ✅

---

## Components

### DocumentActions (Container)

Main component that combines primary actions and settings menu.

**Props:**
- `documentId: string`
- `onView: (id: string) => void`
- `onDownload: (id: string) => void`
- `onReplace: (id: string) => void`
- `onViewHistory: (id: string) => void`
- `onEditExpiry: (id: string) => void`
- `onDelete?: (id: string) => void`
- `disabled?: boolean`
- `showDelete?: boolean`

**Usage:**
```tsx
<DocumentActions
  documentId={doc.id}
  onView={handleView}
  onDownload={handleDownload}
  onReplace={handleReplace}
  onViewHistory={handleHistory}
  onEditExpiry={handleExpiry}
  onDelete={handleDelete}
  showDelete={false}
/>
```

---

### DocumentPrimaryActions

Primary action buttons (View, Download, Replace).

**Actions:**
- **View** - Opens document viewer
- **Download** - Downloads document file
- **Replace** - Uploads new file to replace existing

---

### DocumentSettingsMenu

Secondary actions in dropdown menu.

**Actions:**
- **View History** - Shows document status change history
- **Edit Expiry Date** - Updates document expiration
- **Delete Document** - Removes document (optional, destructive)

---

### DocumentActionButton

Generic reusable button component.

**Props:**
- `icon: LucideIcon`
- `label: string`
- `onClick: () => void`
- `variant?: "ghost" | "default" | "destructive" | "outline"`
- `disabled?: boolean`

---

## Hook: useDocumentActions

Lightweight hook for organizing action handlers.

**NO business logic** - just passes through callbacks.

```tsx
const actions = useDocumentActions({
  onView: (id) => console.log('View', id),
  onDownload: (id) => console.log('Download', id),
  onReplace: (id) => console.log('Replace', id),
  onViewHistory: (id) => console.log('History', id),
  onEditExpiry: (id) => console.log('Expiry', id),
  onDelete: (id) => console.log('Delete', id),
});
```

---

## Design Principles

1. **Presentational Only** - No business logic in UI components
2. **Props-based** - All handlers passed as props
3. **Modular** - Small, focused components
4. **Reusable** - Generic components for future use
5. **Scalable** - Easy to add new actions

---

## Integration

### DocumentTable

```tsx
<DocumentActions
  documentId={document.id}
  onView={() => onDocumentAction('view', document.id)}
  onDownload={() => onDocumentAction('download', document.id)}
  onReplace={() => onDocumentAction('replace', document.id)}
  onViewHistory={() => onDocumentAction('history', document.id)}
  onEditExpiry={() => onDocumentAction('edit-expiry', document.id)}
  onDelete={() => onDocumentAction('delete', document.id)}
  showDelete={false}
/>
```

---

## Future Extensions

To add new actions:

1. Add handler prop to `DocumentActions`
2. Pass to appropriate child component
3. Add UI in `DocumentPrimaryActions` or `DocumentSettingsMenu`
4. Update `useDocumentActions` hook

No need to modify existing components ✅

---

## Notes

- Replace action uses Upload icon (visual consistency)
- Delete action is optional (controlled by `showDelete` prop)
- All actions use native `title` attribute for tooltips
- Dropdown uses shadcn/ui DropdownMenu component
