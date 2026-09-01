# ESL Teacher Desktop App — Product & Technical Plan

## 1. Product Overview

Build a **simple, fast, polished desktop application for an ESL teacher**.

The app is intentionally NOT an all-in-one AI teaching platform. Its purpose is to make three everyday tasks extremely easy:

1. Manage students and their information.
2. Record and review notes for every class.
3. Organize and quickly access teaching materials.

The application must feel like a **premium native desktop productivity tool**, not a website wrapped in a desktop shell.

### Core principle

> **UX first. Speed first. UI second.**

The interface should require as few clicks as possible for common teacher workflows.

A teacher should be able to:

- Find a student almost instantly.
- See their important information immediately.
- Add a class note in seconds.
- Review previous class notes without digging through menus.
- Find and open a teaching material quickly.
- Understand every screen without needing instructions.

Do NOT add unnecessary features just because they are technically interesting.

---

# 2. Target User

Primary user:

- ESL teacher
- Uses a desktop/laptop while teaching
- Has multiple students
- Needs to remember what happened in previous classes
- Has many teaching materials scattered across folders
- Wants something simpler than a large school-management system

The product should feel personal, calm, organized, and professional.

---

# 3. Core Features

## 3.1 Dashboard

The dashboard is the teacher's starting point.

Show only useful information.

### Sections

- Greeting / application header
- Today's classes or recent activity
- Recently accessed students
- Recently added class notes
- Recently used teaching materials
- Quick actions

### Quick actions

- `Add Student`
- `Add Class Note`
- `Add Material`

### UX requirements

- Do not overload the dashboard with cards.
- Information hierarchy must be obvious.
- Prioritize actions over decoration.
- Empty states should guide the user naturally.
- Dashboard should load almost instantly.

---

# 4. Students

## 4.1 Student List

Main student management screen.

### Features

- Search
- Add student
- Edit student
- Delete/archive student
- Sort
- Filter by English level
- Recently viewed indicator
- Student count

### Student list design

Prefer a clean table/list hybrid instead of oversized cards.

Possible columns:

- Name
- English level
- Last class
- Next class
- Status

The list must remain readable with many students.

### Search UX

Search should be:

- Instant
- Keyboard accessible
- Case insensitive
- Able to search names and relevant student fields
- Debounced only if necessary

Keyboard shortcut:

`Ctrl/Cmd + K` → global search

---

# 5. Student Profile

The student profile is one of the most important screens.

## Header

Display:

- Student name
- English level
- Contact information
- Optional avatar/initial
- Edit button
- Add class note button

## Information

Suggested fields:

- Full name
- Preferred name
- Age
- Email
- Phone
- English level
- Learning goals
- General notes

Do not force every field to be required.

Only require what is actually necessary.

## Class History

Display a chronological timeline/list of classes.

Each class entry should show:

- Date
- Lesson/topic
- Short note preview
- Homework if available

Clicking an entry opens the full class note.

### Important UX

The teacher should be able to go:

`Students → Student → Previous Class → Full Notes`

with minimal friction.

---

# 6. Class Notes

Class notes are the second major feature.

## Create Class Note

Fields:

- Student
- Date
- Lesson/topic
- What was taught
- Student performance
- Difficulties / mistakes
- Homework
- Next lesson
- Additional notes

Do NOT make the form feel like an administrative form.

Use sections and progressive disclosure.

### Recommended layout

Desktop:

```text
┌────────────────────────────────────────────────────────┐
│ New Class Note                              Save       │
├───────────────────────────┬────────────────────────────┤
│ Student                   │                            │
│ [ Maria Santos        ]   │ Lesson / Topic             │
│                           │ [______________________]   │
│ Date                      │                            │
│ [ Sep 1, 2026         ]   │ What we covered            │
│                           │ [                        ] │
│                           │ [                        ] │
│                           │                            │
│                           │ Student performance         │
│                           │ [                        ] │
│                           │                            │
│                           │ Difficulties / mistakes     │
│                           │ [                        ] │
│                           │                            │
│                           │ Homework                   │
│                           │ [                        ] │
│                           │                            │
│                           │ Next lesson                │
│                           │ [                        ] │
└───────────────────────────┴────────────────────────────┘
```

The exact layout can change, but the principle should remain:

- Context visible
- Writing area large
- Minimal distractions
- Easy save
- Easy cancel
- No unnecessary wizard

## Save behavior

- Save button always visible.
- `Ctrl/Cmd + S` saves.
- Warn before leaving with unsaved changes.
- Autosave can be considered, but do not introduce confusing behavior.
- Show a subtle saved state.

Example:

`Saved just now`

Never use intrusive success modals for ordinary saves.

---

# 7. Class Note History

Each student should have a clean class history.

### Timeline style

```text
September 1
Travel Conversation
--------------------------------
Worked on past tense and travel
vocabulary...

Homework:
Write 10 sentences about a past trip.

Next:
Review irregular verbs.

August 28
Present Perfect
--------------------------------
...
```

The teacher should be able to scan previous lessons quickly.

### Filters

Optional:

- Date
- Topic
- Search

Do not over-engineer filtering for v1.

---

# 8. Teaching Materials

This is the third major feature.

The goal is NOT to build a full file manager.

The goal is:

> "I know I have a worksheet somewhere. Let me find it immediately."

## Supported materials

Initially support:

- PDF
- DOCX
- PPTX
- PPT
- XLSX
- XLS
- PNG
- JPG/JPEG
- WEBP
- MP3
- WAV
- M4A
- MP4

The app does not need to edit these files.

It should organize and open them.

---

# 9. Material Library

## Main screen

Use a familiar file-library structure.

```text
┌────────────────────────────────────────────────────────────┐
│ Teaching Materials                         + Add Material  │
├───────────────┬────────────────────────────────────────────┤
│               │ Search materials...                         │
│ All Materials │                                            │
│ Favorites     │  Recent                                    │
│               │  ┌────────┐ ┌────────┐ ┌────────┐          │
│ Folders       │  │ PDF    │ │ DOCX   │ │ PPTX   │          │
│ Grammar       │  │ Travel │ │ Verbs  │ │ B1     │          │
│ Vocabulary    │  └────────┘ └────────┘ └────────┘          │
│ Speaking      │                                            │
│ Reading       │  All Materials                             │
│ Listening     │  ...                                       │
│               │                                            │
└───────────────┴────────────────────────────────────────────┘
```

Avoid excessive visual decoration.

## Material actions

- Add/import
- Open
- Rename
- Move
- Delete/remove from library
- Favorite
- Tag
- Search
- Sort
- Filter
- Reveal in file explorer

---

# 10. Material Import

Support:

- File picker
- Drag and drop
- Multiple-file import

When importing files:

1. Validate file type.
2. Store/reference the file.
3. Extract metadata.
4. Generate searchable metadata.
5. Add to database.
6. Show progress only when necessary.

### Important decision

Prefer **referencing existing files** instead of automatically duplicating huge files.

However, the architecture should allow an optional managed-library mode later.

Do not silently duplicate gigabytes of teaching materials.

---

# 11. Material Organization

Support:

### Folders

Examples:

```text
Grammar
Vocabulary
Speaking
Reading
Listening
Writing
Games
Worksheets
Presentations
A1
A2
B1
B2
C1
C2
```

Users should be able to create their own folders.

### Tags

Allow multiple tags per material.

Example:

```text
Travel
B1
Speaking
Vocabulary
```

Tags should be lightweight and easy to apply.

---

# 12. Material Search

Search must feel extremely fast.

Search should cover:

- File name
- Folder
- Tags
- File type
- Extracted metadata when practical

Example:

Searching:

`travel b1`

could return:

- B1 Travel Conversation.pdf
- Travel Vocabulary.pptx
- Airport Speaking Activity.docx

Search should update immediately as the user types.

---

# 13. Global Search

Implement a global search experience.

Keyboard:

`Ctrl/Cmd + K`

Search categories:

- Students
- Class notes
- Materials

Example:

```text
Search...

Students
  Maria Santos
  Maria Garcia

Class Notes
  Maria — Travel Conversation

Materials
  Travel Vocabulary.pdf
  Travel Speaking Questions.docx
```

Use keyboard navigation.

- Arrow Up/Down
- Enter
- Escape

This should become one of the fastest ways to navigate the app.

---

# 14. Navigation

Use a compact desktop sidebar.

Recommended:

```text
┌──────────────────────┐
│ App Logo / Name      │
│                      │
│ Overview              │
│ Students              │
│ Class Notes           │
│ Materials             │
│                      │
│                      │
│ Settings              │
└──────────────────────┘
```

Do not create a sidebar with 15 destinations.

Keep the information architecture small.

### Navigation rules

- Current page is obvious.
- Sidebar remains stable.
- Avoid unnecessary nested navigation.
- Breadcrumbs only where they improve orientation.
- Back navigation should behave naturally.

---

# 15. UI/UX QUALITY BAR

This project is intentionally strict about UI/UX.

## UX comes before visual design

Before styling a screen, determine:

- What is the user trying to accomplish?
- What information do they need?
- What is the primary action?
- What can be removed?
- What should happen after the action?
- What should happen when there is no data?
- What happens if something fails?
- What keyboard interaction makes sense?

Do not compensate for bad UX with visual polish.

---

# 16. Interaction Design

The app should feel responsive.

### Every interaction should have clear feedback

Examples:

- Button pressed → immediate visual response.
- Save → subtle saved indicator.
- Delete → confirmation only when destructive.
- Import → progress if necessary.
- Search → instant results.
- Empty state → useful next action.
- Error → clear human-readable message.

Avoid:

- Toast spam
- Giant success dialogs
- Blocking loading screens
- Excessive animations
- Fake loading indicators
- Unnecessary confirmation dialogs

---

# 17. Keyboard UX

Because this is a desktop app, keyboard navigation is important.

Recommended shortcuts:

- `Ctrl/Cmd + K` — global search
- `Ctrl/Cmd + N` — contextual new item
- `Ctrl/Cmd + S` — save
- `Escape` — close dialog/search
- `Enter` — confirm/open
- `Ctrl/Cmd + ,` — settings
- `Delete` — delete selected item where appropriate

Do not implement shortcuts blindly.

They should behave consistently throughout the app.

---

# 18. Command Palette

Use a command palette for advanced navigation.

Example:

```text
Command Palette

> Add Student
  Add Class Note
  Add Material
  Search Students
  Search Materials
  Open Settings
```

Keep it small.

The command palette is a power-user feature, not the main navigation.

---

# 19. Forms

Forms must be carefully designed.

Rules:

- Clear labels
- Helpful placeholders
- Logical grouping
- Good spacing
- Inline validation
- Preserve entered data after validation errors
- Keyboard navigation
- Autofocus where appropriate
- Avoid unnecessary required fields

Do not use placeholder text as the only label.

---

# 20. Empty States

Empty states should be useful.

Bad:

> No students.

Better:

```text
No students yet

Add your first student to start keeping track
of classes and lesson notes.

[ Add Student ]
```

Material empty state:

```text
Your teaching library is empty

Import your first teaching material.

[ Add Material ]
```

---

# 21. Loading States

Because this is a local desktop application, loading should be rare.

Prefer:

- Instant rendering
- Skeletons only for genuinely asynchronous operations
- Background work for expensive tasks

Never show a full-page spinner for a simple SQLite query.

---

# 22. Visual Design Direction

The visual design should be:

- Premium
- Calm
- Minimal
- Warm
- Professional
- Highly readable
- Modern but not generic SaaS
- Desktop-native feeling
- Slightly editorial/productivity-oriented

Avoid:

- Generic dashboard templates
- Excessive rounded cards
- Huge gradients
- Excessive glassmorphism
- Neon colors
- Overly playful education visuals
- Excessive shadows
- Huge typography
- Excessive empty space
- "AI SaaS" visual clichés

The app should look like a product someone would happily use every day.

---

# 23. Design System

Use Tailwind CSS.

Use a restrained design system.

### Typography

Choose a highly readable UI font.

Potential choices:

- Inter
- Geist
- IBM Plex Sans
- Plus Jakarta Sans

Pick ONE primary UI font.

Do not mix many fonts.

Typography hierarchy should be subtle and consistent.

### Colors

Use a neutral base.

Example conceptual palette:

```text
Background
Surface
Surface elevated
Border
Text primary
Text secondary
Text muted
Accent
Success
Warning
Danger
```

Do not hardcode colors randomly throughout components.

Create semantic design tokens.

### Borders

Prefer subtle borders over heavy shadows.

### Radius

Use consistent radii.

Avoid making every element excessively rounded.

### Shadows

Use shadows sparingly.

Most UI should rely on:

- spacing
- borders
- contrast
- typography

rather than shadows.

---

# 24. Dark Mode

Support dark mode architecturally.

It can be polished after the light theme is complete.

Do not make dark mode an afterthought.

Use semantic Tailwind tokens rather than hardcoded colors.

---

# 25. Responsive Behavior

This is a desktop application, so optimize for:

- 1280×720
- 1440×900
- 1920×1080

Also handle smaller windows gracefully.

Do not design only for fullscreen 1920×1080.

At minimum:

- Sidebar can collapse.
- Tables should remain usable.
- Forms should adapt.
- Dialogs should not exceed the usable viewport.
- Text should not become microscopic.

---

# 26. Accessibility

Follow good accessibility practices.

- Keyboard navigation
- Visible focus states
- Semantic buttons
- Proper labels
- Sufficient contrast
- Screen-reader-friendly labels where applicable
- Don't rely solely on color
- Tooltips for icon-only controls
- Dialog focus management

Accessibility should be built into components.

---

# 27. Animations

Use animation sparingly.

Animations should communicate:

- Opening/closing
- State changes
- Selection
- Navigation
- Drag/drop
- Feedback

Use short transitions.

Avoid:

- Parallax
- Large entrance animations
- Bouncy UI everywhere
- Animation on every component
- Anything that makes the app feel slower

The app should feel **fast first**.

---

# 28. Recommended Frontend Stack

Use:

- Tauri v2
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI primitives where appropriate
- Lucide icons
- TanStack Query where asynchronous state benefits from it
- React Hook Form
- Zod

Do not install libraries just because they are popular.

Every dependency should have a clear reason.

---

# 29. Recommended Rust Stack

Use Rust for:

- Database access
- Filesystem operations
- Material indexing
- File metadata
- Import/export
- Application commands
- Background processing
- Potential search engine
- OS integration

Suggested crates:

- `tauri`
- `serde`
- `serde_json`
- `tokio`
- `sqlx` OR `rusqlite`
- `thiserror`
- `anyhow` where appropriate
- `tracing`
- `tracing-subscriber`
- `uuid`
- `chrono`
- `directories`
- `notify`
- `walkdir`

For search:

- Start with SQLite FTS5 if it satisfies requirements.
- Introduce Tantivy only if the material library actually needs it.

Do not prematurely add Tantivy.

---

# 30. Database

Use SQLite.

Suggested tables:

## students

```text
id
name
preferred_name
age
email
phone
english_level
goals
general_notes
created_at
updated_at
archived_at
```

## class_notes

```text
id
student_id
class_date
topic
lesson_content
performance
difficulties
homework
next_lesson
additional_notes
created_at
updated_at
```

## materials

```text
id
name
path
mime_type
file_size
folder_id
is_favorite
created_at
updated_at
last_opened_at
```

## folders

```text
id
name
parent_id
created_at
updated_at
```

## tags

```text
id
name
created_at
```

## material_tags

```text
material_id
tag_id
```

Optional later:

- schedules
- attachments
- settings
- recent_items

Do not create unnecessary tables.

---

# 31. Database Design Principles

- Use foreign keys.
- Use indexes for frequently searched fields.
- Use migrations.
- Never manipulate the database directly from React.
- Keep database access inside Rust.
- Validate data at the Rust boundary.
- Use typed structs.
- Handle migrations safely.

---

# 32. Tauri Architecture

Recommended architecture:

```text
React UI
   │
   │ invoke()
   ▼
Tauri Commands
   │
   ├── Student Service
   ├── Class Note Service
   ├── Material Service
   ├── Search Service
   └── Settings Service
           │
           ▼
        SQLite
           │
           ▼
      Local Files
```

Keep Tauri commands small and explicit.

Do not expose arbitrary filesystem access to the frontend.

---

# 33. Rust Module Structure

Suggested structure:

```text
src-tauri/
├── src/
│   ├── main.rs
│   ├── lib.rs
│   │
│   ├── commands/
│   │   ├── mod.rs
│   │   ├── students.rs
│   │   ├── class_notes.rs
│   │   ├── materials.rs
│   │   ├── folders.rs
│   │   ├── tags.rs
│   │   └── search.rs
│   │
│   ├── db/
│   │   ├── mod.rs
│   │   ├── migrations/
│   │   └── models/
│   │
│   ├── services/
│   │   ├── material_service.rs
│   │   ├── search_service.rs
│   │   └── file_service.rs
│   │
│   ├── error.rs
│   └── state.rs
│
├── migrations/
└── tauri.conf.json
```

The exact structure can change if a simpler architecture is better.

Do not over-engineer the project.

---

# 34. React Structure

Suggested:

```text
src/
├── app/
│   ├── routes/
│   ├── layout/
│   └── providers/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── students/
│   ├── class-notes/
│   └── materials/
│
├── features/
│   ├── students/
│   ├── class-notes/
│   └── materials/
│
├── hooks/
├── lib/
│   ├── tauri.ts
│   ├── utils.ts
│   └── validators.ts
│
├── types/
└── styles/
```

Prefer feature-oriented organization once the application grows.

---

# 35. State Management

Do not immediately introduce Redux.

Use:

- React state for local UI state.
- TanStack Query for async/server-like state if useful.
- URL/router state for navigation state.
- Rust/SQLite as the source of truth.

Avoid duplicating database state in multiple frontend stores.

---

# 36. File Handling

Materials should be treated as external resources.

Requirements:

- Validate paths.
- Handle missing files gracefully.
- Detect when a file no longer exists.
- Allow user to locate/reconnect a missing file.
- Do not crash if a material was moved outside the application.
- Handle filenames with spaces/unicode.
- Handle large files safely.

If a material is missing:

```text
Material unavailable

This file may have been moved or deleted.

[ Locate File ]
[ Remove from Library ]
```

---

# 37. Drag and Drop

Material import should support drag and drop.

UX:

- Highlight drop area only when dragging files over it.
- Accept supported files.
- Reject unsupported files clearly.
- Support multiple files.
- Do not require a special import dialog if drag/drop is used.

---

# 38. Error Handling

Errors should be understandable.

Bad:

```text
SQLITE_CONSTRAINT_FOREIGNKEY
```

Good:

```text
Couldn't save the class note.

The student may have been removed.
Please try selecting the student again.
```

Log technical details with Rust `tracing`.

Show user-friendly messages in the UI.

---

# 39. Logging

Use structured Rust logging.

Recommended:

- `tracing`
- `tracing-subscriber`

Log:

- Import failures
- Database errors
- File access failures
- Unexpected command failures

Never log:

- Student private information unnecessarily
- Passwords
- Sensitive credentials
- Full document contents

---

# 40. Privacy

This is a local teacher application.

Default behavior:

- Student information stays local.
- Class notes stay local.
- Materials stay local.
- No account required.
- No analytics required.
- No cloud dependency required.

If telemetry is ever added, it must be explicit and opt-in.

---

# 41. Backup

A simple local backup feature is highly valuable.

Potential v1.5/v2 feature:

`Settings → Backup`

Allow:

- Export database
- Import backup
- Automatic periodic backup

Do not make cloud sync a requirement for v1.

---

# 42. Settings

Keep settings minimal.

Possible settings:

### Appearance

- Light
- Dark
- System

### Behavior

- Start on last page
- Confirm before deleting
- Default class note date

### Materials

- Default material folder
- Show missing-file warnings

### Data

- Backup
- Export data
- Import backup

Avoid a giant settings screen.

---

# 43. Data Safety

Destructive operations:

- Delete student
- Delete class note
- Remove material

Prefer archive/soft-delete for students.

For important destructive actions:

- Confirmation dialog
- Explain consequence
- Clear primary/secondary actions

For non-critical actions, avoid confirmation fatigue.

---

# 44. Performance Requirements

Performance is a first-class requirement.

Targets:

- Application launch should feel immediate.
- Navigation should be instant.
- Student search should feel instantaneous.
- Class note creation should have no noticeable lag.
- Material browsing should not freeze the UI.
- Large imports must run in background tasks.
- UI thread must never perform heavy filesystem/database work directly.

Avoid unnecessary:

- React re-renders
- Large global state
- Huge component trees
- Blocking filesystem operations
- Full-library rescans on every render

---

# 45. Material Indexing Performance

Do not scan the entire material library every time the Materials page opens.

Use:

- SQLite metadata
- File modification timestamps
- Background watcher/indexing
- Incremental updates

Potential flow:

```text
App starts
   ↓
Load material metadata from SQLite
   ↓
Render immediately
   ↓
Background validation/indexing
   ↓
Update only changed files
```

Use `notify` if appropriate.

---

# 46. Startup Experience

The startup screen should be minimal.

Avoid splash screens unless absolutely necessary.

Ideal:

```text
App launch
   ↓
Window appears quickly
   ↓
Dashboard renders
   ↓
Background initialization continues
```

The user should never feel like they are waiting for Electron-style application startup.

---

# 47. Security

Follow Tauri v2 security principles.

- Minimal Tauri capabilities
- Restrict filesystem permissions
- Do not expose arbitrary shell commands
- Validate all Rust command inputs
- Avoid unnecessary plugins
- Keep dependencies updated
- Do not put secrets in frontend code
- Do not trust frontend input

Use the smallest possible permission surface.

---

# 48. Tauri Plugins

Only add plugins that provide clear value.

Potential:

- `tauri-plugin-dialog`
- `tauri-plugin-fs`
- `tauri-plugin-opener`
- `tauri-plugin-store`
- `tauri-plugin-updater`

Potentially useful later:

- `tauri-plugin-single-instance`
- `tauri-plugin-notification`

Do not install every available plugin.

---

# 49. Desktop Integration

Useful desktop behavior:

- Open materials using the OS default application.
- Reveal a material in Finder/Explorer.
- Remember window size and position.
- Remember sidebar state.
- Support native file dialogs.
- Support native context menus only where appropriate.
- Respect OS light/dark preference.

---

# 50. Components

Build a reusable component system.

Core components:

- Button
- Input
- Textarea
- Select
- Combobox
- Dialog
- Sheet
- Dropdown
- Tooltip
- Tabs
- Table
- Command palette
- Toast
- Empty state
- Confirm dialog
- Date picker
- File drop zone
- Search input
- Avatar
- Badge
- Breadcrumb
- Sidebar
- Resizable panel

Use shadcn/ui as a foundation, but customize it heavily.

Do NOT leave the app looking like an untouched shadcn template.

---

# 51. Design Details

Pay particular attention to:

- 4/8px-based spacing rhythm
- Consistent control heights
- Consistent border radius
- Text hierarchy
- Icon sizing
- Alignment
- Table density
- Form density
- Hover states
- Focus states
- Disabled states
- Selected states
- Empty states
- Error states

Small details matter more than adding decorative features.

---

# 52. Icons

Use Lucide icons.

Rules:

- Icons should communicate meaning.
- Do not use icons where text is clearer.
- Icon-only buttons need tooltips.
- Maintain consistent icon sizes.
- Do not use emoji as primary UI icons.

The interface should look professional.

---

# 53. Tables and Lists

Tables should be information-dense but comfortable.

Avoid:

- Giant row heights
- Excessive padding
- Tiny text
- Too many columns

For students, prioritize:

`Name → Level → Last Class → Actions`

For materials:

`Name → Type → Folder → Last Opened → Actions`

Actions can live in a contextual menu.

---

# 54. Context Menus

For desktop UX, consider right-click menus where useful.

Student:

```text
Open Student
Add Class Note
Edit Student
Archive Student
```

Material:

```text
Open
Open With...
Reveal in Explorer
Rename
Move
Favorite
Delete
```

Do not make right-click the only way to access actions.

---

# 55. Notifications / Toasts

Use subtle feedback.

Examples:

- `Student added`
- `Class note saved`
- `3 materials imported`

Keep them short.

Do not show a toast for every tiny UI action.

---

# 56. First-Run Experience

Do not force a long onboarding wizard.

First launch can show:

```text
Welcome

Keep your students, class notes, and teaching
materials organized in one place.

[ Add Your First Student ]
```

After adding the first student, guide naturally toward adding a class note.

---

# 57. MVP Scope

The first release should contain ONLY:

### Dashboard

- Recent students
- Recent class notes
- Recent materials
- Quick actions

### Students

- List
- Search
- Create
- Edit
- Archive
- Student profile

### Class Notes

- Create
- Edit
- Delete
- Student association
- Date
- Topic
- Notes
- Homework
- Next lesson
- History

### Materials

- Import
- Drag/drop
- List/grid
- Search
- Folders
- Tags
- Favorite
- Open
- Rename
- Remove
- Reveal in file explorer

### Settings

- Appearance
- Basic data/backup settings

Everything else is optional.

---

# 58. Explicitly Do NOT Build in MVP

Do NOT add:

- AI lesson generation
- AI chat
- Online accounts
- Cloud sync
- Student portals
- Payments
- School administration
- Complex calendars
- Messaging
- Notifications system
- Attendance analytics
- Grading system
- Multiplayer
- Social features
- Subscription system

These would distract from the core product.

---

# 59. Development Phases

## Phase 1 — Foundation

Set up:

- Tauri v2
- React
- TypeScript
- Vite
- Tailwind
- shadcn/ui
- Rust
- SQLite
- migrations
- application state
- error handling
- logging

Build:

- App shell
- Sidebar
- Routing
- Theme system
- Basic design tokens

Before building features, establish the visual foundation.

---

## Phase 2 — Students

Build:

- Database model
- Rust commands
- Student repository/service
- Student list
- Search
- Add student
- Edit student
- Archive student
- Student profile

UX test:

> Can a teacher find a student and view their history in under 5 seconds?

---

## Phase 3 — Class Notes

Build:

- Class note schema
- Create form
- Edit form
- Delete
- Student history
- Timeline
- Search/filter if needed

UX test:

> Can a teacher finish recording a simple class note in under 30 seconds?

---

## Phase 4 — Materials

Build:

- File picker
- Drag/drop
- Material database
- Folders
- Tags
- Favorites
- Open file
- Reveal file
- Rename
- Remove
- Search

UX test:

> Can a teacher find a known material in under 5 seconds?

---

## Phase 5 — Global Search

Build:

- Command palette
- Global search
- Keyboard navigation
- Student search
- Class note search
- Material search

UX test:

> Can the teacher reach any common resource without touching the mouse?

---

## Phase 6 — Polish

Focus heavily on:

- Spacing
- Typography
- Interaction states
- Loading states
- Empty states
- Error states
- Keyboard navigation
- Animations
- Dark mode
- Accessibility
- Performance

Do not add new features during this phase unless essential.

---

# 60. UX Testing Checklist

Before calling a feature finished, test:

### Students

- Can I add a student quickly?
- Can I search them?
- Can I edit them?
- Can I archive them?
- Can I see their previous classes?
- Can I add a class note directly from their profile?

### Class Notes

- Can I create a note quickly?
- Is the writing area comfortable?
- Can I save using keyboard?
- Is unsaved data protected?
- Can I quickly review old notes?

### Materials

- Can I drag in multiple files?
- Can I find a material quickly?
- Can I open it?
- Can I reveal it in Explorer/Finder?
- What happens if the file was moved?
- Can I organize it without friction?

### General

- Can I use the application without a tutorial?
- Does every screen have an obvious primary action?
- Are destructive actions clear?
- Are empty states helpful?
- Does anything feel slower than it should?
- Are there unnecessary clicks?
- Are there unnecessary dialogs?

---

# 61. UI Review Checklist

Every screen must be reviewed for:

- Visual hierarchy
- Alignment
- Spacing
- Typography
- Contrast
- Density
- Consistency
- Focus states
- Hover states
- Active states
- Disabled states
- Error states
- Empty states
- Loading states
- Responsive behavior

Do not consider a page finished merely because it works.

---

# 62. Design Review Standard

The UI should pass this test:

> If screenshots of the app were shown without the app name, it should still look like a deliberately designed premium desktop product.

Avoid the feeling of:

- generated UI
- default component library
- admin dashboard
- web app inside a window

The product should have a recognizable visual identity.

---

# 63. Implementation Rules for Claude

When implementing this project:

1. **Prioritize UX over feature count.**
2. **Prioritize performance over unnecessary abstraction.**
3. **Keep the UI simple.**
4. **Do not add features without a clear user need.**
5. **Do not blindly use default shadcn styling.**
6. **Do not create giant components.**
7. **Do not put database logic in React.**
8. **Do not block the UI with filesystem/database work.**
9. **Use Rust for privileged/local operations.**
10. **Keep Tauri permissions minimal.**
11. **Use TypeScript strictly.**
12. **Use typed Rust ↔ TypeScript boundaries.**
13. **Validate data on both frontend and backend where appropriate.**
14. **Use reusable components.**
15. **Avoid premature abstraction.**
16. **Avoid unnecessary dependencies.**
17. **Do not introduce global state unless justified.**
18. **Do not use animations that make the app feel slower.**
19. **Treat empty/error/loading states as part of the feature.**
20. **Every destructive operation must be deliberate.**

---

# 64. Claude Code Workflow

Claude should work incrementally.

For each feature:

### Step 1 — Understand

Before coding, identify:

- User goal
- Primary action
- Required data
- Edge cases
- Empty state
- Error state

### Step 2 — Plan

Determine:

- Database changes
- Rust commands
- React components
- UI states
- Accessibility requirements

### Step 3 — Implement

Implement the smallest complete version.

### Step 4 — Review

Check:

- UX
- Visual hierarchy
- Performance
- Accessibility
- Error handling
- Type safety

### Step 5 — Polish

Only after functionality works:

- spacing
- typography
- transitions
- icons
- visual details

---

# 65. Important UX Instruction

DO NOT optimize for how impressive the code looks.

Optimize for how quickly the teacher can accomplish a task.

The ideal interaction is:

```text
Think → Click → Done
```

not:

```text
Think → Navigate → Open menu → Select option
→ Fill unnecessary fields → Confirm → Wait → Done
```

Reduce interaction cost everywhere.

---

# 66. Product Personality

The product should feel:

- Calm
- Fast
- Thoughtful
- Organized
- Reliable
- Personal
- Professional

It should feel like a tool made specifically for a teacher, not enterprise software.

---

# 67. Final Product Vision

The final app should answer three questions immediately:

### "Who am I teaching?"

→ Students

### "What happened last class?"

→ Class Notes

### "What am I teaching with?"

→ Materials

That is the entire product.

Everything else should support those three workflows.

---

# 68. Definition of Done

The MVP is complete when:

- The app launches quickly.
- A teacher can add students.
- Student information is easy to view/edit.
- A teacher can add notes for each class.
- Previous class notes are easy to review.
- Teaching materials can be imported.
- Materials can be organized.
- Materials can be searched.
- Materials can be opened.
- Data persists reliably between launches.
- Missing files are handled gracefully.
- The app works offline.
- Keyboard navigation works.
- Light/dark themes work.
- Empty/error/loading states are polished.
- No major workflow requires unnecessary clicks.
- The interface feels cohesive and premium.
- No core screen looks like an untouched component-library template.

---

# 69. Final Instruction to Claude

Build this as a **real desktop application**, not a website.

The user is extremely strict about UX and UI quality.

Do not rush into feature implementation.

First establish:

1. Information architecture
2. Design tokens
3. Layout system
4. Typography
5. Component quality
6. Interaction patterns
7. Empty/error/loading states

Then implement features.

When making UI decisions, always ask:

> "What is the fastest and clearest way for an ESL teacher to accomplish this?"

When making visual decisions, always ask:

> "Does this improve clarity and hierarchy, or is it decoration?"

Prefer clarity.

Prefer speed.

Prefer fewer clicks.

Prefer fewer elements.

Prefer excellent defaults.

Do not sacrifice usability for visual effects.

The final result should be a **small, exceptionally polished, fast, local-first ESL teacher desktop app built with Tauri v2 + React + TypeScript + Rust + Tailwind CSS**.
