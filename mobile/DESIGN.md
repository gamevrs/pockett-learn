# Pockett on the phone: the design rules

Every screen in the iOS and Android apps follows these. The values live in `src/theme/tokens.ts` (taken from the
site's `src/app/globals.css` and `components.css`); the parts live in `src/ui`.

## 1. One job per screen

Four tabs, one job each:

- **Home**: what to do now. A greeting, today's goal ring and streak, the Continue card (the screen's one primary
  action), a few next steps, what you finished lately, the Playground.
- **Learn**: everything there is. Foundations' parts and each language's courses, how far along each is, a level
  filter, and search across every lesson from the header.
- **Progress**: how it's going. Level and XP, streaks, active days, the daily goal this week, lessons per path,
  achievements (the full list a page away).
- **Account**: you and the app. Sign in or your profile, sync, Settings, Notifications, About, sign out, delete.

A lesson and the playground cover the tabs (full-screen, native header with close). Before adding a section, find the
screen whose job it is; options that are not needed every time sit behind the row that owns them (Appearance and
Daily goal each open their own page of choices).

## 2. Use the shared part

| Role | Part | Shape |
|---|---|---|
| Screen title | the native header (`TabStack` / `useHeaderOptions`, `useRootTitle` for a tab's first page) | iOS large title in the site's serif; Android top app bar, serif on a tab's first page |
| Section title | `SectionHeader` (also inside `ListSection`) | the site's mono eyebrow, caps |
| A row | `ListRow`, `ListSwitchRow` (platform switch), `GroupRow` (a path/course/module with its ring and %), `LessonRow` | at least 52 tall |
| A group of rows | `ListSection` | one card radius (16) |
| A card | `Card` (`tint` for the one card holding the screen's main action) | radius 16, the site's `.card` |
| A command | `Button` (`primary` at most once per screen, `secondary`, `plain`, `danger`) | capsule, at least 50 tall |
| A filter | `Chip` / `ChipRow` | capsule, 36 tall, inverted when chosen |
| Typing | `TextField` | capsule, label above, 17pt text |
| A fraction | `ProgressRing`, `ProgressBar` | always beside the number it shows |
| A note / nothing to show | `Notice` / `EmptyState` | a mark beside plain text, never a box |
| A glyph | `Icon` | SF Symbols on iOS, Material Symbols on Android, from one role list |

Never hand-size a title, a tile or a control on one screen: sizes come from `text`, `space`, `height`, `iconSize`,
`radius`. One page margin (`space.gutter`, 16), the same inset the tab bar and native lists use.

## 3. Colour and type

- Dark first, light equal: every colour comes from `useTheme().colors`. The accent lime is a fill with dark ink on it;
  the accent for text and lines is `brand` (olive in light, lime in dark), as on the site.
- Red is for destroying only. Selected is inverted.
- One type scale (`text`): `display` and `title` in Source Serif (one big number, a card's headline, the large titles),
  everything else Geist, eyebrows in Geist Mono. Text follows the system text size up to 2x; controls take
  `minHeight`, so they grow and never clip.

## 4. Behaviour

- Native per platform: the system tab bar (Liquid Glass on iOS 26+, Material 3 on Android), native stacks and
  headers, the platform's switch, time picker, alerts, share sheet, menus (iOS pull-down menu; Android overflow
  sheet), Android's back closes a lesson (asking first once it is under way).
- Every visual signal says what it means in words too: rings carry their number, unread items say "New", a
  completed lesson's check is read out as "Finished".
- Badges use the platform's own (the Account tab's unread count).
- A tap meant to start typing raises the keyboard (fields autofocus on their own pages; the lesson web view may focus
  its editor itself).
- Haptics: selection on a choice, success/error on an answer, success on a finished lesson; off in Settings.
- Destructive actions ask first (clear progress, sign out, delete account, leaving a lesson under way).
- Accessibility: every control has a role and a label that says what it does; wrappers stay out of the way.
- Plain words for beginners; no em dashes in anything the user reads.
