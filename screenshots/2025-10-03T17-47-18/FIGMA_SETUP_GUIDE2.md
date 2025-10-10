 ---
  📝 Figma First Draft プロンプト（統合予約ページ）

  以下を全文コピーして、Figma First Draftのプロンプト入力欄にペーストしてください：

  Create a unified lesson booking and reservation management interface for MUED LMS v2, consolidating three separate pages (lesson slots,
   reservations, booking calendar) into a single, modern booking experience inspired by Calendly, Acuity Scheduling, and world-class SaaS
   platforms.

  PROJECT CONTEXT:
  - Current implementation: 3 separate pages (Lessons, Reservations, Booking Calendar)
  - Goal: Unified single-page interface with tab switching between "Book Lessons" and "My Reservations"
  - Technology: Next.js 15.5.4, React 19, TailwindCSS 4
  - Resolution: 1440x900 @2x (Retina)
  - Must maintain existing API structure while completely redesigning UI/UX

  DESIGN DIRECTION:
  Modern SaaS booking platform inspired by Calendly's simplicity, Acuity's customization, and iTalki's tutoring focus. Clean,
  professional, and highly usable for students booking lessons with mentors.

  EXISTING DESIGN TOKENS (Must Use):
  Colors:
  - Brand Green: #75bc11 (primary CTA, selected calendar dates)
  - Brand Green Hover: #65a20f
  - Text Primary: #000a14 (headings, labels)
  - Card Background: #ffffff
  - Card Border: #e5e7eb

  New Status Colors (Add to system):
  - Status Confirmed: #10b981 (green badge)
  - Status Pending: #f59e0b (yellow badge)
  - Status Cancelled: #6b7280 (gray badge)
  - Status Completed: #3b82f6 (blue badge)
  - Calendar Available: #e0f2fe (light blue background for available dates)
  - Calendar Selected: #75bc11 (brand green for selected date)

  Typography:
  - Page Title (H1): 24-28px, bold, #000a14
  - Section Heading (H2): 20-24px, semibold, #000a14
  - Body Text: 14-16px, regular, #4b5563
  - Small Text: 12-14px, regular, #6b7280
  - Font family: Modern sans-serif supporting English and Japanese

  Spacing:
  - Card padding: 16-24px
  - Section spacing: 32-48px
  - Grid gaps: 16-24px
  - Border radius: 8-12px

  PAGES TO DESIGN (Desktop 1440px):

  1. UNIFIED BOOKING PAGE - "Book Lessons" Tab (Default View)

  Layout Structure (3-column):
  ┌──────────────────────────────────────────────────────────────┐
  │ [User Avatar] Testuser                                        │
  │ test@example.com                                              │
  ├──────────────────────────────────────────────────────────────┤
  │ Overview | Lessons | Materials | Reservations | Calendar     │ ← Dashboard Tabs
  ├──────────────────────────────────────────────────────────────┤
  │                                                               │
  │  [ Book Lessons ] [ My Reservations ]  ← Sub-tabs            │
  │   ─────────────   ─────────────────                          │
  │                                                               │
  │  ┌──────────┐  ┌─────────────────────────────────────────┐ │
  │  │ Filters  │  │ Calendar + Time Slots                   │ │
  │  │ (240px)  │  │                                         │ │
  │  ├──────────┤  │  ┌──────────┐  ┌───────────────────┐  │ │
  │  │          │  │  │          │  │                   │  │ │
  │  │ Mentors  │  │  │ Calendar │  │   Time Slots      │  │ │
  │  │ ☑ Tanaka │  │  │          │  │                   │  │ │
  │  │ ☐ Suzuki │  │  │ January  │  │  10:00-11:00      │  │ │
  │  │ ☐ Sato   │  │  │   2025   │  │  Tanaka Sensei    │  │ │
  │  │          │  │  │          │  │  ¥3,000           │  │ │
  │  │ Price    │  │  │ S M T W T│  │  [Book Now]       │  │ │
  │  │ [Slider] │  │  │ F S      │  │                   │  │ │
  │  │ ¥0-¥10000│  │  │          │  │  13:00-14:00      │  │ │
  │  │          │  │  │ 26 27 28 │  │  Suzuki Sensei    │  │ │
  │  │ Time     │  │  │ 29 30 31 │  │  ¥4,000           │  │ │
  │  │ ⦿ All    │  │  │  1  2  3 │  │  [Book Now]       │  │ │
  │  │ ○ AM     │  │  │          │  │                   │  │ │
  │  │ ○ PM     │  │  │ [<] [>]  │  │  (scroll list)    │  │ │
  │  │ ○ Night  │  │  └──────────┘  └───────────────────┘  │ │
  │  │          │  │                                         │ │
  │  │ Subject  │  │  Empty State (when no slots):          │ │
  │  │ ⦿ All    │  │  📅 No available slots on this date    │ │
  │  │ ○ Math   │  │  Please select another date            │ │
  │  │ ○ English│  │                                         │ │
  │  │          │  │                                         │ │
  │  │ [Reset]  │  │                                         │ │
  │  └──────────┘  └─────────────────────────────────────────┘ │
  │                                                               │
  └──────────────────────────────────────────────────────────────┘

  Components for "Book Lessons" Tab:

  A. FILTER SIDEBAR (240px width, left column):
  - Background: #ffffff
  - Border: 1px solid #e5e7eb on right side
  - Padding: 24px
  - Sections with 16px spacing between:

    1. Mentors Section:
       - Heading: "Mentors" (14px bold)
       - Checkboxes with mentor names (14px)
       - Avatar + name layout

    2. Price Range Section:
       - Heading: "Price Range" (14px bold)
       - Range slider with min/max labels
       - Current values: "¥2,000 - ¥5,000" (12px gray)

    3. Time Slot Section:
       - Heading: "Time Slot" (14px bold)
       - Radio buttons:
         * All
         * Morning (9:00-12:00)
         * Afternoon (12:00-18:00)
         * Evening (18:00-21:00)

    4. Subject Section:
       - Heading: "Subject" (14px bold)
       - Radio buttons: All, Math, English, Science

    5. Reset Button:
       - Full width
       - Outline style
       - Text: "Reset Filters"

  B. MONTHLY CALENDAR (360px × 400px):
  - Background: #ffffff
  - Border: 1px solid #e5e7eb
  - Border radius: 8px
  - Padding: 20px
  - Header:
    * Navigation: [<] January 2025 [>] (16px bold, centered)
    * Weekday labels: S M T W T F S (12px gray-600)
  - Date Grid:
    * Each cell: 44px × 44px
    * Today: 2px green border, rounded
    * Available dates: light blue background (#e0f2fe), bold text
    * Selected date: green background (#75bc11), white text, rounded
    * Past dates: gray (#9ca3af), not clickable
    * Unavailable dates: default gray

  C. TIME SLOT LIST (remaining width, scrollable):
  - Background: transparent
  - Vertical scroll
  - Each Slot Card (8px margin-bottom):
    * Width: 100% (fills remaining space)
    * Background: #ffffff
    * Border: 1px solid #e5e7eb
    * Border radius: 8px
    * Padding: 16px
    * Hover: shadow lift effect

    Layout per card:
    ┌────────────────────────────────┐
    │ [Avatar] Tanaka Taro          │ ← 16px bold
    │          tanaka@example.com   │ ← 12px gray
    │                                │
    │ 🕐 10:00 - 11:00 (60 min)     │ ← 14px
    │                                │
    │ ¥3,000                        │ ← 18px bold
    │                                │
    │      [ Book Now ]             │ ← Full width button
    └────────────────────────────────┘

  - Empty State (when no slots available):
    * Centered layout
    * Icon: 📅 calendar (48px)
    * Text: "No available slots on this date"
    * Subtext: "Please select another date"
    * Text color: #6b7280

  2. UNIFIED BOOKING PAGE - "My Reservations" Tab

  Layout Structure (Full width, no filters):
  ┌──────────────────────────────────────────────────────────────┐
  │ [User Avatar] Testuser                                        │
  │ test@example.com                                              │
  ├──────────────────────────────────────────────────────────────┤
  │ Overview | Lessons | Materials | Reservations | Calendar     │
  ├──────────────────────────────────────────────────────────────┤
  │                                                               │
  │  [ Book Lessons ] [ My Reservations ]                        │
  │                    ─────────────────                          │
  │                                                               │
  │  Filters: [All Status ▾]  Date: [2025/01/01 - 2025/12/31]   │
  │                                                               │
  │  ┌───────────────────────────────────────────────────────┐  │
  │  │ Mentor │ Date │ Time │ Status │ Payment │ Actions    │  │
  │  ├───────────────────────────────────────────────────────┤  │
  │  │ [👤]   │ 1/30 │10:00 │ ● Confirmed│ Paid │[View][X]│  │
  │  │ Tanaka │ (Thu)│-11:00│            │      │          │  │
  │  ├───────────────────────────────────────────────────────┤  │
  │  │ [👤]   │ 2/1  │15:00 │ ● Pending  │ Wait │[Pay][X] │  │
  │  │ Suzuki │ (Sat)│-16:00│            │      │          │  │
  │  ├───────────────────────────────────────────────────────┤  │
  │  │ [👤]   │ 2/5  │13:00 │ ● Completed│ Paid │[View]   │  │
  │  │ Sato   │ (Wed)│-14:00│            │      │          │  │
  │  └───────────────────────────────────────────────────────┘  │
  │                                                               │
  │  Empty State (when no reservations):                         │
  │  📅 No reservations yet                                      │
  │  [Book Your First Lesson] ← Button linking to Book tab       │
  │                                                               │
  └──────────────────────────────────────────────────────────────┘

  Components for "My Reservations" Tab:

  D. FILTER BAR (top of table):
  - Layout: Horizontal flex
  - Status Dropdown:
    * Label: "Status:" (14px medium)
    * Dropdown: "All Status ▾"
    * Options: All, Confirmed, Pending, Completed, Cancelled
  - Date Range:
    * Label: "Date:" (14px medium)
    * Date inputs: "2025/01/01 - 2025/12/31"
    * Date picker on click

  E. RESERVATION TABLE:
  - Full width
  - Background: #ffffff
  - Border: 1px solid #e5e7eb
  - Border radius: 8px

  Headers (gray background #f9fafb):
  | Mentor | Date | Time | Status | Payment | Actions |
  - Font: 14px semibold
  - Padding: 12px 16px
  - Border-bottom: 1px solid #e5e7eb

  Rows:
  - Alternating background: white / #f9fafb (subtle)
  - Padding: 16px
  - Border-bottom: 1px solid #e5e7eb
  - Hover: slight background highlight

  Columns:
  1. Mentor: Avatar (32px) + Name (14px bold)
  2. Date: "1/30 (Thu)" (14px)
  3. Time: "10:00-11:00" (14px)
  4. Status: Badge with dot + text
     - ● Confirmed (green #10b981)
     - ● Pending (yellow #f59e0b)
     - ● Completed (blue #3b82f6)
     - ● Cancelled (gray #6b7280)
     Badge style: rounded pill, 8px padding, small text
  5. Payment: "Paid" / "Waiting" (14px)
  6. Actions: Button group
     - [View] button (outline, small)
     - [Pay] button (primary, small) - if payment waiting
     - [Cancel] button (ghost, small, red text)

  F. EMPTY STATE (when no reservations):
  - Centered in table area
  - Icon: 📅 (64px)
  - Heading: "No reservations yet" (20px bold)
  - Subtext: "Book your first lesson to get started" (14px gray)
  - CTA Button: "Book Your First Lesson" (primary, medium size)
    * Links to "Book Lessons" tab

  3. BOOKING CONFIRMATION MODAL (appears when clicking "Book Now")

  Modal Specs:
  - Size: 480px × auto
  - Background overlay: rgba(0,0,0,0.5)
  - Modal background: #ffffff
  - Border radius: 12px
  - Padding: 32px
  - Drop shadow: multi-layer elevation

  Layout:
  ┌─────────────────────────┐
  │ Confirm Booking         │ ← 20px bold
  ├─────────────────────────┤
  │ Mentor: Tanaka Taro     │ ← 16px
  │ Date: January 30, 2025  │
  │ Time: 10:00 - 11:00     │
  │ Price: ¥3,000           │
  │                         │
  │ [Cancel] [Confirm]      │ ← Button group
  └─────────────────────────┘

  Buttons:
  - Cancel: Outline, gray
  - Confirm: Primary, brand green

  RESPONSIVE BREAKPOINTS:

  Tablet (768px):
  - Filter sidebar becomes collapsible drawer (hamburger trigger)
  - Calendar and time slots stack vertically
  - Table maintains scroll horizontally

  Mobile (375px):
  - Tabs move to bottom navigation bar
  - Filter drawer from left side
  - Calendar full width
  - Time slot cards full width
  - Table becomes card-based list view

  INTERACTION STATES:

  Buttons:
  - Default: Solid or outline
  - Hover: Slight lift, stronger shadow, color darken
  - Pressed: Inset shadow
  - Focused: 2px ring outline (accessibility)
  - Disabled: 50% opacity, no pointer events

  Cards (Time Slot Cards):
  - Default: Subtle border
  - Hover: Stronger shadow, slight translate Y (-2px)
  - Pressed: Shadow reduction

  Calendar Dates:
  - Default: Gray text
  - Available: Bold + light blue background
  - Selected: Green background + white text
  - Today: Green border
  - Hover: Slight scale (1.05)

  ACCESSIBILITY:
  - All interactive elements have minimum 44px touch targets
  - Keyboard navigation support (Tab, Enter, Escape)
  - Focus indicators (2px ring)
  - ARIA labels for screen readers
  - Color contrast ratios meet WCAG AA (4.5:1 for text)

  EXPECTED OUTPUT:
  A comprehensive, production-ready unified booking interface with:
  - Sophisticated filtering system (left sidebar)
  - Intuitive monthly calendar view
  - Clean time slot listing
  - Professional reservation management table
  - Tab-based navigation between booking and reservations
  - Booking confirmation modal
  - Empty states for better UX
  - Status badges with semantic colors
  - Responsive layouts for Desktop/Tablet/Mobile
  - Complete interaction states for all components
  - Accessibility-compliant design

  Please create a modern, highly usable booking interface that consolidates the three separate booking-related pages into a seamless
  single-page experience, following the best practices from Calendly, Acuity, and modern SaaS platforms.

  ---
  このプロンプトを使って、以下の手順でFigmaデザインを作成してください：

  1. Figma で新規ファイル作成
  2. Actions → First Draft を選択
  3. 上記プロンプトを全文ペースト
  4. Library で "Website" を選択
  5. Make it をクリック