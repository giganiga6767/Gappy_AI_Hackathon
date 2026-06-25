# CURSOR MASTER BUILD SPECIFICATION
## NIT Karnataka — Sophomore ECE Management System ("NexusDesk")
**Version:** 1.0.0 | **Stack:** Next.js 14 App Router · PostgreSQL · Prisma · Ollama (llama3) · Tailwind CSS · shadcn/ui

---

## PART 0 — AGENT DIRECTIVES (READ BEFORE WRITING A SINGLE LINE)

These are non-negotiable constraints. Violating any directive is a build failure.

### 0.1 — Language & Typing
- Every file is `.ts` or `.tsx`. Zero `.js` files permitted.
- Every function, prop, API response, and Prisma result must have an explicit TypeScript interface or type. No `any`. No implicit `any`. Use `unknown` and narrow where needed.
- Use `zod` for all runtime validation at API boundaries. Define a Zod schema before writing any API handler.
- Use `React.FC<Props>` typing convention with explicit named interface for all components.

### 0.2 — Architecture Rules
- App Router only. No `pages/` directory. No `getServerSideProps`. No `getStaticProps`.
- Server Components by default. Add `"use client"` only when: (a) using React hooks, (b) handling browser events, (c) using browser APIs. Mark every `"use client"` file with a comment `// CLIENT COMPONENT — reason: [reason]`.
- Data mutations: Server Actions only. No client-side `fetch` to internal API routes except `/api/ingest` and `/api/ollama-stream`. All other data operations go through `app/actions/` files.
- Database access: Prisma Client only. Never write raw SQL unless the agent documents it explicitly. Use a singleton Prisma client at `lib/prisma.ts`.

### 0.3 — Muted Neo Brutalist Design Directives (THE DESIGN LAW)
The agent must apply these to every single UI component with zero exceptions:

**RULE D-1: ZERO BORDER RADIUS.** `border-radius: 0px` everywhere. Set globally in `globals.css` using `* { border-radius: 0 !important; }`. Additionally set `borderRadius: { DEFAULT: '0', none: '0', sm: '0', md: '0', lg: '0', xl: '0', full: '0' }` in `tailwind.config.ts`.

**RULE D-2: MUTED PALETTE ONLY.** Use only these colors. Never introduce new color literals in components — always reference Tailwind tokens.
- `paper`: `#F1F0E8` — page background
- `ink`: `#2D2D2D` — text, borders, shadows
- `inkLight`: `#5A5A5A` — secondary text, disabled states
- `surface`: `#E8E7DF` — card/panel background (slightly darker than paper)
- `surfaceHover`: `#DDDCD4` — hover states
- `terracotta`: `#C4614A` — primary accent (muted, not bright)
- `terracottaLight`: `#EFCFC8` — accent background tints
- `sage`: `#6B7F52` — secondary accent (muted green)
- `sageLight`: `#D0D9C4` — sage background tints
- `amber`: `#B8872A` — warning states
- `amberLight`: `#EDE0C4` — warning tints
- `slate`: `#4A5568` — neutral cool surfaces

**RULE D-3: HARD OFFSET SHADOWS ONLY.** No `box-shadow` with blur radius > 0. Only flat offset shadows. Use these utility classes (defined in tailwind config):
- `shadow-brutal`: `4px 4px 0px 0px #2D2D2D`
- `shadow-brutal-sm`: `2px 2px 0px 0px #2D2D2D`
- `shadow-brutal-lg`: `6px 6px 0px 0px #2D2D2D`
- `shadow-brutal-accent`: `4px 4px 0px 0px #C4614A`
- `shadow-brutal-sage`: `4px 4px 0px 0px #6B7F52`

**RULE D-4: THICK BORDERS.** All cards, panels, dialogs, and interactive elements use `border-2 border-ink`. Buttons use `border-2 border-ink`. Inputs use `border-2 border-ink`. Never use `border` (1px) on structural elements.

**RULE D-5: TYPOGRAPHY.** Install and use `Space Grotesk` (via next/font/google) for headings — weight 700/800. Use `Inter` for body. Use `JetBrains Mono` for all data values (marks, percentages, times, step counts). Page section headers: `text-xs font-mono uppercase tracking-widest text-inkLight` with a full-width `border-b-2 border-ink mb-4`.

**RULE D-6: INTERACTIVE STATES.** On hover, interactive elements shift their box-shadow from `shadow-brutal` to `shadow-brutal-sm` AND translate: `hover:-translate-x-[2px] hover:-translate-y-[2px]`. On active/press: `translate-x-[2px] translate-y-[2px] shadow-none`. These transitions must use `transition-all duration-100`.

**RULE D-7: NO SHADCN DEFAULT STYLES.** When importing shadcn components (Button, Dialog, Input, Card, etc.), always override with Tailwind classes in `className` prop. Never rely on shadcn's default radii or shadow styles.

---

## PART 1 — PROJECT STRUCTURE

```
nexusdesk/
├── app/
│   ├── layout.tsx                     # Root layout, font imports, global providers
│   ├── globals.css                    # Global resets including border-radius: 0
│   ├── page.tsx                       # Redirects to /dashboard
│   ├── dashboard/
│   │   └── page.tsx                   # Main timeline dashboard (Server Component)
│   ├── courses/
│   │   ├── page.tsx                   # All courses overview
│   │   └── [courseId]/
│   │       ├── page.tsx               # Course detail: grades + attendance
│   │       └── grades/
│   │           └── page.tsx           # Grade ledger for a course
│   ├── tasks/
│   │   └── page.tsx                   # Kanban board: ACADEMICS / HARDWARE_DEV / ROUTINE
│   ├── ingest/
│   │   └── page.tsx                   # AI ingestion dropzone UI
│   ├── cgpa/
│   │   └── page.tsx                   # CGPA simulator & grade target calculator
│   ├── projects/
│   │   ├── page.tsx                   # Hardware project tracker list
│   │   └── [projectId]/
│   │       └── page.tsx               # Project detail with milestones
│   ├── routine/
│   │   └── page.tsx                   # Daily health tracker (steps, workout, sleep)
│   ├── planner/
│   │   └── page.tsx                   # Weekly/monthly exam planner calendar
│   ├── resources/
│   │   └── page.tsx                   # Study resources + notes linker per course
│   └── api/
│       ├── ingest/
│       │   └── route.ts               # Universal AI ingestion engine
│       ├── ollama-stream/
│       │   └── route.ts               # Streaming Ollama for chat UI
│       ├── attendance/
│       │   └── route.ts               # Attendance mark/unmark endpoint
│       └── events/
│           └── route.ts               # Event CRUD endpoint
├── components/
│   ├── ui/                            # shadcn primitives (override styles in use)
│   ├── layout/
│   │   ├── Sidebar.tsx                # Left nav (Client Component)
│   │   ├── TopBar.tsx                 # Top status bar with date + quick stats
│   │   └── SectionHeader.tsx          # Reusable mono uppercase section header
│   ├── dashboard/
│   │   ├── FluidTimeline.tsx          # The main timeline component (Client)
│   │   ├── TimelineEvent.tsx          # Single event block on timeline (Client)
│   │   ├── AttendanceButton.tsx       # Inline ATTENDED/MISSED button (Client)
│   │   ├── CurrentTimeCursor.tsx      # Animated red line for current time (Client)
│   │   └── DayNavigator.tsx           # Previous/next day navigation (Client)
│   ├── courses/
│   │   ├── CourseCard.tsx             # Course summary card with attendance %
│   │   ├── AttendanceGauge.tsx        # Brutal progress bar (not circular)
│   │   └── GradeLedger.tsx            # Grade table with scaling display
│   ├── tasks/
│   │   ├── KanbanBoard.tsx            # Three-column task board (Client)
│   │   ├── TaskCard.tsx               # Individual task card
│   │   └── AddTaskForm.tsx            # Inline form to create task (Client)
│   ├── cgpa/
│   │   ├── CGPASimulator.tsx          # Interactive CGPA calculator (Client)
│   │   └── SemesterRow.tsx            # Per-semester grade entry row
│   ├── projects/
│   │   ├── ProjectCard.tsx            # Hardware project card with status
│   │   └── MilestoneTracker.tsx       # Milestone progress display
│   ├── routine/
│   │   ├── StepTracker.tsx            # 10,000 step progress bar (Client)
│   │   ├── WorkoutLogger.tsx          # Log workout sessions (Client)
│   │   └── SleepLogger.tsx            # Sleep hours tracker (Client)
│   ├── ingest/
│   │   ├── IngestDropzone.tsx         # File/text paste dropzone (Client)
│   │   └── IngestResultPreview.tsx    # Shows parsed AI output before commit (Client)
│   └── shared/
│       ├── BrutalCard.tsx             # Reusable card primitive
│       ├── BrutalButton.tsx           # Reusable button primitive
│       ├── BrutalBadge.tsx            # Reusable badge/tag primitive
│       ├── BrutalInput.tsx            # Styled input override
│       ├── StatPill.tsx               # Key:Value stat display pill
│       └── EmptyState.tsx             # Empty state with mono text
├── lib/
│   ├── prisma.ts                      # Singleton Prisma client
│   ├── ollama.ts                      # Ollama client utilities
│   ├── pdf-parser.ts                  # pdf-parse wrapper
│   ├── ingest-parser.ts               # JSON extraction from Ollama response
│   ├── attendance.ts                  # Attendance calculation helpers
│   ├── cgpa.ts                        # CGPA computation utilities
│   └── date-utils.ts                  # Date/time helpers (no hardcoded times)
├── app/actions/
│   ├── events.ts                      # createEvent, updateEvent, deleteEvent, cancelEvent
│   ├── attendance.ts                  # markAttendance, getAttendanceSummary
│   ├── courses.ts                     # createCourse, updateCourse
│   ├── grades.ts                      # addGradeItem, updateGradeItem
│   ├── tasks.ts                       # createTask, updateTaskStatus, deleteTask
│   ├── projects.ts                    # createProject, addMilestone, updateMilestone
│   └── routine.ts                     # logSteps, logWorkout, logSleep
├── types/
│   └── index.ts                       # All shared TypeScript interfaces
├── prisma/
│   └── schema.prisma                  # Full schema (see Part 2)
├── public/
│   └── fonts/                         # Self-hosted fallbacks if needed
├── tailwind.config.ts                 # Full Neo Brutalist config (see Part 3)
├── next.config.ts
└── package.json
```

---

## PART 2 — COMPLETE PRISMA SCHEMA

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

enum EventType {
  LECTURE
  LAB
  EXAM
  TUTORIAL
  MEETING
  BREAK
  PERSONAL
}

enum AttendanceStatus {
  ATTENDED
  MISSED
  CANCELLED // event was cancelled by faculty — does not count against student
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  DONE
}

enum TaskCategory {
  ACADEMICS
  HARDWARE_DEV
  ROUTINE
  PERSONAL
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  TESTING
  ON_HOLD
  COMPLETED
}

enum MilestoneStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}

enum ExamType {
  CIA1       // Continuous Internal Assessment 1
  CIA2
  CIA3
  LAB_IA
  LAB_FINAL
  SEMESTER   // End semester exam — tracked but not in internal CGPA
  ASSIGNMENT
  QUIZ
  VIVA
  PROJECT_EVAL
  CUSTOM     // Arbitrary evaluation (e.g. /26 marks scenario)
}

enum WorkoutType {
  STRENGTH
  CARDIO
  FLEXIBILITY
  SPORT
  WALK_RUN
  REST
}

// ─────────────────────────────────────────────────────────────────
// ACADEMIC SEMESTER CONTEXT
// ─────────────────────────────────────────────────────────────────

model Semester {
  id          String    @id @default(cuid())
  name        String    // e.g. "3rd Sem — Jul–Nov 2025"
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean   @default(false)
  courses     Course[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([isActive])
}

// ─────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────

model Course {
  id                  String              @id @default(cuid())
  subjectCode         String              @unique // e.g. "EC302"
  name                String              // e.g. "Analog Circuits"
  shortName           String              // e.g. "AC" — used on timeline
  creditWeight        Float               // e.g. 4.0
  minAttendancePct    Float               @default(75.0)
  facultyName         String?
  roomNumber          String?
  color               String?             // hex color for timeline display
  semesterId          String
  semester            Semester            @relation(fields: [semesterId], references: [id], onDelete: Cascade)
  dynamicEvents       DynamicEvent[]
  attendanceRecords   AttendanceRecord[]
  gradeItems          GradeItem[]
  resources           CourseResource[]
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([semesterId])
  @@index([subjectCode])
}

// ─────────────────────────────────────────────────────────────────
// DYNAMIC EVENT ENGINE (THE TIMETABLE)
// ─────────────────────────────────────────────────────────────────

model DynamicEvent {
  id              String            @id @default(cuid())
  title           String
  description     String?
  type            EventType
  startTime       DateTime          // Full DateTime — no hardcoded grids
  endTime         DateTime          // Full DateTime
  location        String?
  isCancelled     Boolean           @default(false)
  cancellationNote String?
  isRecurring     Boolean           @default(false)
  recurringGroupId String?          // Groups recurrences together (same UUID for all in series)
  recurrenceDays  Int[]             @default([]) // 0=Sun, 1=Mon ... 6=Sat
  recurrenceUntil DateTime?
  courseId        String?
  course          Course?           @relation(fields: [courseId], references: [id], onDelete: SetNull)
  attendanceRecord AttendanceRecord?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([startTime])
  @@index([courseId])
  @@index([type])
  @@index([recurringGroupId])
}

// ─────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────

model AttendanceRecord {
  id              String            @id @default(cuid())
  status          AttendanceStatus
  markedAt        DateTime          @default(now())
  note            String?           // Optional note (e.g. "Medical leave")
  courseId        String
  course          Course            @relation(fields: [courseId], references: [id], onDelete: Cascade)
  eventId         String            @unique
  event           DynamicEvent      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([courseId])
  @@index([status])
}

// ─────────────────────────────────────────────────────────────────
// GRADE ITEMS — SUPPORTS ARBITRARY SCALING
// ─────────────────────────────────────────────────────────────────

model GradeItem {
  id              String    @id @default(cuid())
  examType        ExamType
  label           String              // Custom label e.g. "CIA-1 Part B"
  obtainedMarks   Float
  maxMarks        Float               // e.g. 26.0 for non-standard scalings
  scaledOutOf     Float?              // Optional: If /26 scales to /30, store 30 here
  date            DateTime?
  notes           String?
  isScaled        Boolean   @default(false)
  courseId        String
  course          Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([courseId])
  @@index([examType])
}

// ─────────────────────────────────────────────────────────────────
// TASKS — THREE-CATEGORY KANBAN
// ─────────────────────────────────────────────────────────────────

model Task {
  id          String        @id @default(cuid())
  title       String
  description String?
  dueDate     DateTime?
  status      TaskStatus    @default(TODO)
  category    TaskCategory
  priority    TaskPriority  @default(MEDIUM)
  tags        String[]      @default([])  // Freeform tags
  linkedCourseId String?    // Optional link to a Course
  linkedProjectId String?   // Optional link to a HardwareProject
  checklistItems TaskChecklistItem[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([status])
  @@index([category])
  @@index([dueDate])
}

model TaskChecklistItem {
  id          String    @id @default(cuid())
  text        String
  isDone      Boolean   @default(false)
  taskId      String
  task        Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())
}

// ─────────────────────────────────────────────────────────────────
// HARDWARE PROJECTS (ESP32, ARDUINO, APFC, ETC.)
// ─────────────────────────────────────────────────────────────────

model HardwareProject {
  id              String          @id @default(cuid())
  name            String
  description     String?
  status          ProjectStatus   @default(PLANNING)
  components      String[]        @default([])  // e.g. ["ESP32", "ACS712", "MOSFET"]
  githubUrl       String?
  notionUrl       String?
  startDate       DateTime?
  targetDate      DateTime?
  milestones      ProjectMilestone[]
  logEntries      ProjectLog[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model ProjectMilestone {
  id              String            @id @default(cuid())
  title           String
  description     String?
  status          MilestoneStatus   @default(PENDING)
  targetDate      DateTime?
  completedAt     DateTime?
  projectId       String
  project         HardwareProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([projectId])
}

model ProjectLog {
  id          String          @id @default(cuid())
  content     String          // What was done today on the project
  date        DateTime        @default(now())
  projectId   String
  project     HardwareProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime        @default(now())

  @@index([projectId])
}

// ─────────────────────────────────────────────────────────────────
// ROUTINE & HEALTH TRACKING
// ─────────────────────────────────────────────────────────────────

model DailyRoutineLog {
  id              String        @id @default(cuid())
  date            DateTime      @unique  // One record per calendar day
  stepCount       Int           @default(0)
  stepGoal        Int           @default(10000)
  sleepHours      Float?        // e.g. 7.5 hours
  sleepQuality    Int?          // 1–5 subjective score
  waterIntakeMl   Int           @default(0)
  morningWeight   Float?        // kg — for body recomposition tracking
  notes           String?
  workoutSessions WorkoutSession[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([date])
}

model WorkoutSession {
  id              String        @id @default(cuid())
  type            WorkoutType
  durationMinutes Int
  notes           String?
  caloriesBurned  Int?
  routineLogId    String
  routineLog      DailyRoutineLog @relation(fields: [routineLogId], references: [id], onDelete: Cascade)
  createdAt       DateTime      @default(now())

  @@index([routineLogId])
}

// ─────────────────────────────────────────────────────────────────
// CGPA TRACKING
// ─────────────────────────────────────────────────────────────────

model SemesterGradeRecord {
  id              String    @id @default(cuid())
  semesterNumber  Int       // 1 through 8
  semesterName    String?   // e.g. "3rd Sem Jul–Nov 2025"
  sgpa            Float?    // Filled after results
  creditsEarned   Float     @default(0)
  totalCredits    Float     @default(0)
  isProjected     Boolean   @default(false)  // true if this is a simulation
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([semesterNumber])
}

// ─────────────────────────────────────────────────────────────────
// COURSE RESOURCES
// ─────────────────────────────────────────────────────────────────

model CourseResource {
  id          String    @id @default(cuid())
  title       String
  url         String?
  filePath    String?   // Local path if self-hosted
  type        String    // "PDF", "VIDEO", "LINK", "NOTE"
  courseId    String
  course      Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@index([courseId])
}

// ─────────────────────────────────────────────────────────────────
// AI INGESTION AUDIT LOG
// ─────────────────────────────────────────────────────────────────

model IngestLog {
  id              String    @id @default(cuid())
  inputSummary    String    // First 200 chars of what was fed in
  actionType      String    // INITIAL_SETUP | SCHEDULE_MUTATION | TASK_EXTRACTION | GRADE_ENTRY | etc.
  rawOllamaOutput String    // Full JSON string returned by Ollama
  status          String    // SUCCESS | PARTIAL | FAILED
  errorMessage    String?
  recordsCreated  Int       @default(0)
  createdAt       DateTime  @default(now())
}
```

---

## PART 3 — TAILWIND CONFIGURATION

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: false, // No dark mode. Muted Neo Brutalism is light-paper-first.
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    // Override ALL radius to zero. This is THE LAW.
    borderRadius: {
      DEFAULT: '0',
      none: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '0',
    },
    extend: {
      colors: {
        // ── Core Palette ──────────────────────────────────
        paper:          '#F1F0E8',   // Main background
        surface:        '#E8E7DF',   // Card / panel background
        surfaceHover:   '#DDDCD4',   // Hover on cards
        ink:            '#2D2D2D',   // Primary text, borders
        inkLight:       '#5A5A5A',   // Secondary text, subtitles
        inkFaint:       '#8A8A8A',   // Placeholders, disabled
        // ── Accents ───────────────────────────────────────
        terracotta:       '#C4614A', // Primary accent
        terracottaLight:  '#EFCFC8', // Terracotta background tint
        terracottaDark:   '#A04535', // Terracotta pressed/darker
        sage:             '#6B7F52', // Secondary accent
        sageLight:        '#D0D9C4', // Sage background tint
        sageDark:         '#4F5E3C', // Sage pressed/darker
        amber:            '#B8872A', // Warning
        amberLight:       '#EDE0C4', // Warning background tint
        slate:            '#4A5568', // Cool neutral
        slateLight:       '#CBD5E0', // Slate background tint
        // ── Semantic ──────────────────────────────────────
        attended:       '#6B7F52',   // = sage (attendance ok)
        missed:         '#C4614A',   // = terracotta (missed class)
        critical:       '#A04535',   // Critical/danger
        complete:       '#6B7F52',   // Task done
        todo:           '#2D2D2D',   // Task not started
        inProgress:     '#B8872A',   // Task in progress
        blocked:        '#C4614A',   // Task blocked
      },
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Mono', 'monospace'],
      },
      fontSize: {
        'section-label': ['0.65rem', { lineHeight: '1rem', letterSpacing: '0.12em', fontWeight: '700' }],
      },
      boxShadow: {
        // Flat offset only. shadowRadius = 0. These are THE ONLY valid shadows.
        'brutal':        '4px 4px 0px 0px #2D2D2D',
        'brutal-sm':     '2px 2px 0px 0px #2D2D2D',
        'brutal-lg':     '6px 6px 0px 0px #2D2D2D',
        'brutal-xl':     '8px 8px 0px 0px #2D2D2D',
        'brutal-accent': '4px 4px 0px 0px #C4614A',
        'brutal-sage':   '4px 4px 0px 0px #6B7F52',
        'brutal-amber':  '4px 4px 0px 0px #B8872A',
        'brutal-inset':  'inset 2px 2px 0px 0px #2D2D2D',
        'none':          'none',
      },
      spacing: {
        'px2': '2px',
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in':   'slideIn 0.15s ease-out',
        'cursor-blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // Only apply form styles when we explicitly add classes
    }),
  ],
}

export default config
```

---

## PART 4 — GLOBAL CSS RESET

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* THE DESIGN LAW: Zero border radius. No exceptions. */
  * {
    border-radius: 0 !important;
    box-sizing: border-box;
  }

  html, body {
    background-color: #F1F0E8;
    color: #2D2D2D;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 700;
    line-height: 1.2;
    color: #2D2D2D;
  }

  /* Remove all focus rings — replace with brutal border */
  *:focus {
    outline: 2px solid #2D2D2D;
    outline-offset: 2px;
  }

  /* Scrollbar styling — thin and muted */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #E8E7DF; }
  ::-webkit-scrollbar-thumb { background: #5A5A5A; }
  ::-webkit-scrollbar-thumb:hover { background: #2D2D2D; }

  /* Selection color */
  ::selection {
    background-color: #EFCFC8;
    color: #2D2D2D;
  }
}

@layer components {
  /* Reusable section label pattern */
  .section-label {
    @apply text-xs font-mono font-bold uppercase tracking-widest text-inkLight border-b-2 border-ink pb-2 mb-4;
  }

  /* Mono data value */
  .data-value {
    @apply font-mono text-ink;
  }

  /* Brutal card primitive */
  .brutal-card {
    @apply bg-surface border-2 border-ink shadow-brutal p-4;
  }

  /* Brutal button base */
  .brutal-btn {
    @apply inline-flex items-center justify-center border-2 border-ink
           font-heading font-bold text-sm px-4 py-2 bg-paper
           shadow-brutal cursor-pointer select-none
           transition-all duration-100
           hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutal-lg
           active:translate-x-[2px] active:translate-y-[2px] active:shadow-none;
  }

  .brutal-btn-primary {
    @apply brutal-btn bg-terracotta text-paper border-ink;
  }

  .brutal-btn-sage {
    @apply brutal-btn bg-sage text-paper border-ink;
  }

  /* Attendance status pills */
  .pill-attended {
    @apply font-mono text-xs font-bold uppercase bg-sageLight text-sageDark border-2 border-sage px-2 py-0.5;
  }

  .pill-missed {
    @apply font-mono text-xs font-bold uppercase bg-terracottaLight text-terracottaDark border-2 border-terracotta px-2 py-0.5;
  }

  .pill-todo     { @apply font-mono text-xs font-bold uppercase bg-surface text-ink border-2 border-ink px-2 py-0.5; }
  .pill-progress { @apply font-mono text-xs font-bold uppercase bg-amberLight text-amber border-2 border-amber px-2 py-0.5; }
  .pill-blocked  { @apply font-mono text-xs font-bold uppercase bg-terracottaLight text-terracotta border-2 border-terracotta px-2 py-0.5; }
  .pill-done     { @apply font-mono text-xs font-bold uppercase bg-sageLight text-sage border-2 border-sage px-2 py-0.5; }
}
```

---

## PART 5 — SHARED TYPE DEFINITIONS

```typescript
// types/index.ts

export interface CourseWithStats {
  id: string
  subjectCode: string
  name: string
  shortName: string
  creditWeight: number
  minAttendancePct: number
  facultyName: string | null
  color: string | null
  totalClasses: number
  attendedClasses: number
  missedClasses: number
  attendancePct: number
  projectedAttendance: number | null
  classesCanSkip: number // How many more can be missed safely
  classesNeeded: number  // How many more must be attended to reach 75%
}

export interface DailyTimelineData {
  date: string // ISO date string
  events: TimelineEvent[]
  totalClasses: number
  attendedToday: number
}

export interface TimelineEvent {
  id: string
  title: string
  type: string
  startTime: string // ISO
  endTime: string   // ISO
  location: string | null
  isCancelled: boolean
  courseId: string | null
  courseShortName: string | null
  courseColor: string | null
  attendanceStatus: 'ATTENDED' | 'MISSED' | 'CANCELLED' | null // null = not yet marked
  durationMinutes: number
}

export interface GradeSummary {
  courseId: string
  courseName: string
  subjectCode: string
  items: GradeItemDisplay[]
  totalObtained: number
  totalMax: number
  percentage: number
  projectedInternal: number | null
}

export interface GradeItemDisplay {
  id: string
  label: string
  examType: string
  obtainedMarks: number
  maxMarks: number
  scaledOutOf: number | null
  isScaled: boolean
  percentage: number
}

export interface AttendanceSummary {
  courseId: string
  subjectCode: string
  courseName: string
  color: string | null
  totalRecords: number
  attended: number
  missed: number
  cancelled: number
  effectivePct: number // attended / (total - cancelled) * 100
  isAtRisk: boolean    // effectivePct < minAttendancePct
  targetPct: number
}

// ─── Ollama Ingestion Types ───────────────────────────────────────

export type OllamaActionType =
  | 'INITIAL_SETUP'
  | 'SCHEDULE_MUTATION'
  | 'TASK_EXTRACTION'
  | 'GRADE_ENTRY'
  | 'ATTENDANCE_BULK'
  | 'UNKNOWN'

export interface OllamaIngestResponse {
  action: OllamaActionType
  confidence: number // 0.0 – 1.0
  data: InitialSetupPayload | ScheduleMutationPayload | TaskExtractionPayload | GradeEntryPayload | AttendanceBulkPayload
}

export interface CourseInput {
  subjectCode: string
  name: string
  shortName: string
  creditWeight: number
  facultyName?: string
  color?: string
}

export interface EventInput {
  title: string
  type: 'LECTURE' | 'LAB' | 'EXAM' | 'TUTORIAL' | 'MEETING' | 'BREAK' | 'PERSONAL'
  startTime: string // ISO 8601 — REQUIRED
  endTime: string   // ISO 8601 — REQUIRED
  location?: string
  subjectCode?: string
  isRecurring?: boolean
  recurrenceDays?: number[] // 0=Sun...6=Sat
  recurrenceUntil?: string  // ISO date
}

export interface InitialSetupPayload {
  courses: CourseInput[]
  events: EventInput[]
}

export interface ScheduleMutationPayload {
  action: 'ADD' | 'CANCEL' | 'RESCHEDULE' | 'DELETE_RECURRING'
  events: EventInput[]
  cancelEventIds?: string[]
  cancellationNote?: string
}

export interface TaskInput {
  title: string
  description?: string
  dueDate?: string
  category: 'ACADEMICS' | 'HARDWARE_DEV' | 'ROUTINE' | 'PERSONAL'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tags?: string[]
}

export interface TaskExtractionPayload {
  tasks: TaskInput[]
}

export interface GradeInput {
  subjectCode: string
  examType: string
  label: string
  obtainedMarks: number
  maxMarks: number
  scaledOutOf?: number
  isScaled?: boolean
  date?: string
}

export interface GradeEntryPayload {
  grades: GradeInput[]
}

export interface AttendanceBulkPayload {
  records: Array<{
    eventId: string
    status: 'ATTENDED' | 'MISSED' | 'CANCELLED'
    note?: string
  }>
}

// ─── CGPA Simulation ─────────────────────────────────────────────

export interface CGPASimulationInput {
  completedSemesters: { semesterNumber: number; sgpa: number; credits: number }[]
  projectedSemesters: { semesterNumber: number; projectedSgpa: number; credits: number }[]
}

export interface CGPAResult {
  currentCGPA: number
  targetCGPA: number
  requiredFutureSGPA: number
  isAchievable: boolean
  simulatedCGPA: number
}
```

---

## PART 6 — PRISMA SINGLETON CLIENT

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## PART 7 — THE UNIVERSAL AI INGESTION ENGINE

```typescript
// app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type {
  OllamaIngestResponse,
  InitialSetupPayload,
  ScheduleMutationPayload,
  TaskExtractionPayload,
  GradeEntryPayload,
} from '@/types'

// ─── Request Validation ────────────────────────────────────────────
const IngestRequestSchema = z.object({
  rawText: z.string().min(10, 'Input too short to parse'),
  sourceType: z.enum(['PDF_TIMETABLE', 'PDF_SYLLABUS', 'WHATSAPP_TEXT', 'MANUAL_TEXT', 'PDF_GRADES', 'UNKNOWN']).default('UNKNOWN'),
  semesterId: z.string().optional(),
})

// ─── Ollama System Prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI parser for a college management system for an ECE student at NIT Karnataka.
Your ONLY job is to parse the provided text and return a single valid JSON object. 
DO NOT return any explanatory text, markdown, or code blocks. ONLY raw JSON.

The JSON must match this exact structure:
{
  "action": "<one of: INITIAL_SETUP | SCHEDULE_MUTATION | TASK_EXTRACTION | GRADE_ENTRY | ATTENDANCE_BULK | UNKNOWN>",
  "confidence": <float 0.0 to 1.0>,
  "data": <payload matching the action type below>
}

ACTION PAYLOADS:

INITIAL_SETUP — Use when text contains a full timetable or list of courses for a semester:
{
  "courses": [{ "subjectCode": "EC302", "name": "Analog Circuits", "shortName": "AC", "creditWeight": 4.0, "facultyName": "Dr. Sharma", "color": "#C4614A" }],
  "events": [{ "title": "Analog Circuits Lecture", "type": "LECTURE", "startTime": "2025-07-14T08:30:00.000Z", "endTime": "2025-07-14T09:30:00.000Z", "location": "LT1", "subjectCode": "EC302", "isRecurring": true, "recurrenceDays": [1, 3, 5], "recurrenceUntil": "2025-11-30T00:00:00.000Z" }]
}

SCHEDULE_MUTATION — Use when text describes a specific class cancellation, rescheduling, or new event:
{
  "action": "CANCEL",
  "events": [],
  "cancellationNote": "Faculty on leave"
}

TASK_EXTRACTION — Use when text contains to-dos, deadlines, or assignments:
{
  "tasks": [{ "title": "Submit PCB layout report", "description": "...", "dueDate": "2025-07-20T23:59:00.000Z", "category": "ACADEMICS", "priority": "HIGH", "tags": ["EC302", "PCB"] }]
}

GRADE_ENTRY — Use when text contains marks/scores/grades:
{
  "grades": [{ "subjectCode": "EC302", "examType": "CIA1", "label": "CIA-1 Part A", "obtainedMarks": 18.5, "maxMarks": 26, "scaledOutOf": 30, "isScaled": true }]
}

ATTENDANCE_BULK — Use when text describes multiple attendance records:
{
  "records": [{ "eventId": "<must be an actual DB event id>", "status": "ATTENDED", "note": "" }]
}

RULES:
- ALL times must be ISO 8601 format with timezone. Default to IST (UTC+5:30) if no timezone given.
- Never invent course codes or event IDs. If unsure, mark confidence below 0.5.
- For recurring events, infer recurrenceDays from patterns like "Mon/Wed/Fri" → [1, 3, 5].
- For labs, duration is typically 2–3 hours. For lectures, 1 hour. Use these as defaults only if not stated.
- If the input is ambiguous, return action: "UNKNOWN" with confidence: 0.0.`

// ─── JSON Extraction from Ollama Response ─────────────────────────
function extractJSON(raw: string): OllamaIngestResponse {
  // Strip markdown code blocks if Ollama wraps in them despite instructions
  const cleaned = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim()

  // Find the outermost JSON object
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in Ollama response')
  }

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1)

  try {
    return JSON.parse(jsonStr) as OllamaIngestResponse
  } catch (e) {
    throw new Error(`JSON parse failed: ${e instanceof Error ? e.message : 'Unknown'}`)
  }
}

// ─── Prisma Executors Per Action Type ─────────────────────────────
async function executeInitialSetup(payload: InitialSetupPayload, semesterId: string): Promise<number> {
  let recordsCreated = 0

  // 1. Upsert all courses
  for (const courseInput of payload.courses) {
    await prisma.course.upsert({
      where: { subjectCode: courseInput.subjectCode },
      update: { name: courseInput.name, shortName: courseInput.shortName, creditWeight: courseInput.creditWeight, facultyName: courseInput.facultyName },
      create: {
        subjectCode: courseInput.subjectCode,
        name: courseInput.name,
        shortName: courseInput.shortName || courseInput.subjectCode,
        creditWeight: courseInput.creditWeight,
        facultyName: courseInput.facultyName ?? null,
        color: courseInput.color ?? '#4A5568',
        semesterId,
      },
    })
    recordsCreated++
  }

  // 2. Create events (and expand recurring ones)
  for (const eventInput of payload.events) {
    let courseId: string | null = null
    if (eventInput.subjectCode) {
      const course = await prisma.course.findUnique({ where: { subjectCode: eventInput.subjectCode } })
      courseId = course?.id ?? null
    }

    if (eventInput.isRecurring && eventInput.recurrenceDays && eventInput.recurrenceUntil) {
      // Expand recurring events into individual DynamicEvent rows
      const recurringGroupId = crypto.randomUUID()
      const startDate = new Date(eventInput.startTime)
      const endDate = new Date(eventInput.endTime)
      const until = new Date(eventInput.recurrenceUntil)
      const durationMs = endDate.getTime() - startDate.getTime()

      const cursor = new Date(startDate)
      while (cursor <= until) {
        if (eventInput.recurrenceDays.includes(cursor.getDay())) {
          const evStart = new Date(cursor)
          evStart.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0)
          const evEnd = new Date(evStart.getTime() + durationMs)

          await prisma.dynamicEvent.create({
            data: {
              title: eventInput.title,
              type: eventInput.type,
              startTime: evStart,
              endTime: evEnd,
              location: eventInput.location ?? null,
              courseId,
              isRecurring: true,
              recurringGroupId,
              recurrenceDays: eventInput.recurrenceDays,
              recurrenceUntil: until,
            },
          })
          recordsCreated++
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    } else {
      // Single event
      await prisma.dynamicEvent.create({
        data: {
          title: eventInput.title,
          type: eventInput.type,
          startTime: new Date(eventInput.startTime),
          endTime: new Date(eventInput.endTime),
          location: eventInput.location ?? null,
          courseId,
        },
      })
      recordsCreated++
    }
  }

  return recordsCreated
}

async function executeScheduleMutation(payload: ScheduleMutationPayload, semesterId: string): Promise<number> {
  let count = 0

  if (payload.action === 'CANCEL' && payload.cancelEventIds) {
    await prisma.dynamicEvent.updateMany({
      where: { id: { in: payload.cancelEventIds } },
      data: { isCancelled: true, cancellationNote: payload.cancellationNote ?? null },
    })
    // Update linked attendance records to CANCELLED
    await prisma.attendanceRecord.updateMany({
      where: { eventId: { in: payload.cancelEventIds } },
      data: { status: 'CANCELLED' },
    })
    count = payload.cancelEventIds.length
  }

  if (payload.action === 'ADD' && payload.events) {
    count += await executeInitialSetup({ courses: [], events: payload.events }, semesterId)
  }

  return count
}

async function executeTaskExtraction(payload: TaskExtractionPayload): Promise<number> {
  const result = await prisma.task.createMany({
    data: payload.tasks.map(t => ({
      title: t.title,
      description: t.description ?? null,
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      category: t.category,
      priority: t.priority ?? 'MEDIUM',
      tags: t.tags ?? [],
      status: 'TODO',
    })),
  })
  return result.count
}

async function executeGradeEntry(payload: GradeEntryPayload): Promise<number> {
  let count = 0
  for (const g of payload.grades) {
    const course = await prisma.course.findUnique({ where: { subjectCode: g.subjectCode } })
    if (!course) continue

    await prisma.gradeItem.create({
      data: {
        examType: g.examType as any,
        label: g.label,
        obtainedMarks: g.obtainedMarks,
        maxMarks: g.maxMarks,
        scaledOutOf: g.scaledOutOf ?? null,
        isScaled: g.isScaled ?? false,
        date: g.date ? new Date(g.date) : null,
        courseId: course.id,
      },
    })
    count++
  }
  return count
}

// ─── Main Route Handler ────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  let recordsCreated = 0
  let rawOllamaOutput = ''
  let actionType = 'UNKNOWN'

  try {
    const body = await req.json()
    const parsed = IngestRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { rawText, semesterId } = parsed.data

    // Determine active semester if not provided
    let activeSemesterId = semesterId
    if (!activeSemesterId) {
      const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } })
      activeSemesterId = activeSemester?.id
    }

    // Call Ollama
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        system: SYSTEM_PROMPT,
        prompt: `Parse this input and return ONLY a JSON object matching the schema:\n\n${rawText}`,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for deterministic JSON output
          num_predict: 4096,
        },
      }),
    })

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama returned status ${ollamaResponse.status}. Is Ollama running at localhost:11434?`)
    }

    const ollamaData = await ollamaResponse.json() as { response: string }
    rawOllamaOutput = ollamaData.response
    const ingestResult = extractJSON(rawOllamaOutput)
    actionType = ingestResult.action

    // Route to executor based on action
    if (!activeSemesterId && ingestResult.action !== 'TASK_EXTRACTION' && ingestResult.action !== 'GRADE_ENTRY') {
      // Auto-create a default semester if none exists
      const newSemester = await prisma.semester.create({
        data: {
          name: 'Current Semester',
          startDate: new Date(),
          endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // +120 days
          isActive: true,
        },
      })
      activeSemesterId = newSemester.id
    }

    switch (ingestResult.action) {
      case 'INITIAL_SETUP':
        recordsCreated = await executeInitialSetup(ingestResult.data as InitialSetupPayload, activeSemesterId!)
        break
      case 'SCHEDULE_MUTATION':
        recordsCreated = await executeScheduleMutation(ingestResult.data as ScheduleMutationPayload, activeSemesterId!)
        break
      case 'TASK_EXTRACTION':
        recordsCreated = await executeTaskExtraction(ingestResult.data as TaskExtractionPayload)
        break
      case 'GRADE_ENTRY':
        recordsCreated = await executeGradeEntry(ingestResult.data as GradeEntryPayload)
        break
      case 'UNKNOWN':
        break
    }

    // Log the ingestion
    await prisma.ingestLog.create({
      data: {
        inputSummary: rawText.slice(0, 200),
        actionType,
        rawOllamaOutput: rawOllamaOutput.slice(0, 5000),
        status: 'SUCCESS',
        recordsCreated,
      },
    })

    return NextResponse.json({
      success: true,
      action: ingestResult.action,
      confidence: ingestResult.confidence,
      recordsCreated,
      preview: ingestResult.data,
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Log failure
    try {
      await prisma.ingestLog.create({
        data: {
          inputSummary: 'PARSE FAILED',
          actionType,
          rawOllamaOutput: rawOllamaOutput.slice(0, 5000),
          status: 'FAILED',
          errorMessage: message,
          recordsCreated: 0,
        },
      })
    } catch { /* swallow logging error */ }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

---

## PART 8 — KEY COMPONENT IMPLEMENTATIONS

### 8.1 — Root Layout

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'NexusDesk — NITK',
  description: 'Privacy-first college management for ECE sophomores',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-paper text-ink min-h-screen">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6 bg-paper">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
```

### 8.2 — Fluid Timeline Dashboard (Client Component)

```typescript
// components/dashboard/FluidTimeline.tsx
"use client"
// CLIENT COMPONENT — reason: DOM measurements for pixel-perfect time positioning, real-time cursor

import { useEffect, useRef, useState } from 'react'
import { TimelineEvent as TimelineEventComponent } from './TimelineEvent'
import { CurrentTimeCursor } from './CurrentTimeCursor'
import { DayNavigator } from './DayNavigator'
import type { TimelineEvent } from '@/types'

interface FluidTimelineProps {
  events: TimelineEvent[]
  date: Date
  onDateChange: (date: Date) => void
}

const HOUR_HEIGHT_PX = 80 // Each hour is 80px tall
const START_HOUR = 7      // Timeline starts at 7:00 AM
const END_HOUR = 22       // Timeline ends at 10:00 PM

export function FluidTimeline({ events, date, onDateChange }: FluidTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTimeOffset, setCurrentTimeOffset] = useState<number | null>(null)
  const totalHours = END_HOUR - START_HOUR
  const totalHeight = totalHours * HOUR_HEIGHT_PX

  function getOffsetForTime(dt: Date): number {
    const hours = dt.getHours() + dt.getMinutes() / 60
    return (hours - START_HOUR) * HOUR_HEIGHT_PX
  }

  function getEventStyle(event: TimelineEvent): React.CSSProperties {
    const start = new Date(event.startTime)
    const end = new Date(event.endTime)
    const top = getOffsetForTime(start)
    const height = Math.max(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * HOUR_HEIGHT_PX, 30)
    return { position: 'absolute', top: `${top}px`, height: `${height}px`, left: '72px', right: '0px' }
  }

  // Update current time cursor every minute
  useEffect(() => {
    function update() {
      const now = new Date()
      const isToday = now.toDateString() === date.toDateString()
      if (isToday) {
        const offset = getOffsetForTime(now)
        setCurrentTimeOffset(offset >= 0 && offset <= totalHeight ? offset : null)
      } else {
        setCurrentTimeOffset(null)
      }
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [date, totalHeight])

  // Scroll to current time on load
  useEffect(() => {
    if (currentTimeOffset !== null && containerRef.current) {
      containerRef.current.scrollTop = Math.max(0, currentTimeOffset - 200)
    }
  }, [currentTimeOffset])

  const hours = Array.from({ length: totalHours }, (_, i) => START_HOUR + i)

  return (
    <div className="flex flex-col h-full">
      <DayNavigator date={date} onDateChange={onDateChange} />

      <div ref={containerRef} className="flex-1 overflow-y-auto border-2 border-ink bg-surface relative">
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>

          {/* Hour grid lines */}
          {hours.map(hour => (
            <div
              key={hour}
              style={{ position: 'absolute', top: `${(hour - START_HOUR) * HOUR_HEIGHT_PX}px`, left: 0, right: 0 }}
              className="border-t border-inkFaint"
            >
              <span className="absolute left-2 top-1 font-mono text-xs text-inkLight select-none w-12">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}

          {/* Current time cursor */}
          {currentTimeOffset !== null && (
            <CurrentTimeCursor offsetPx={currentTimeOffset} />
          )}

          {/* Event blocks */}
          {events.map(event => (
            <div key={event.id} style={getEventStyle(event)}>
              <TimelineEventComponent event={event} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### 8.3 — Timeline Event Block (Client Component)

```typescript
// components/dashboard/TimelineEvent.tsx
"use client"
// CLIENT COMPONENT — reason: attendance marking interaction, optimistic state

import { useState, useTransition } from 'react'
import { markAttendance } from '@/app/actions/attendance'
import type { TimelineEvent } from '@/types'

interface TimelineEventProps {
  event: TimelineEvent
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  LECTURE:  'border-l-4 border-l-ink',
  LAB:      'border-l-4 border-l-sage',
  EXAM:     'border-l-4 border-l-terracotta',
  TUTORIAL: 'border-l-4 border-l-amber',
  MEETING:  'border-l-4 border-l-slate',
  BREAK:    'border-l-4 border-l-inkFaint',
  PERSONAL: 'border-l-4 border-l-inkLight',
}

export function TimelineEventComponent({ event }: TimelineEventProps) {
  const [status, setStatus] = useState(event.attendanceStatus)
  const [isPending, startTransition] = useTransition()

  function handleMark(newStatus: 'ATTENDED' | 'MISSED') {
    setStatus(newStatus) // Optimistic update
    startTransition(async () => {
      await markAttendance({ eventId: event.id, status: newStatus, courseId: event.courseId! })
    })
  }

  const isCancelled = event.isCancelled
  const hasAttendance = event.courseId !== null && event.type !== 'BREAK' && event.type !== 'PERSONAL'
  const startLabel = new Date(event.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const endLabel = new Date(event.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  const leftBorder = EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.LECTURE

  return (
    <div
      className={`
        h-full w-full border-2 border-ink bg-surface shadow-brutal-sm
        flex flex-col overflow-hidden
        ${isCancelled ? 'opacity-40' : ''}
        ${leftBorder}
        ${isPending ? 'opacity-70' : ''}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between px-2 pt-1.5 flex-shrink-0">
        <div className="flex flex-col">
          <span className="font-heading font-bold text-sm text-ink leading-tight truncate max-w-[140px]">
            {event.courseShortName ?? event.title}
          </span>
          <span className="font-mono text-xs text-inkLight">
            {startLabel}–{endLabel} {event.location ? `· ${event.location}` : ''}
          </span>
        </div>

        {/* Type badge */}
        <span className="font-mono text-[10px] font-bold uppercase bg-paper border border-inkFaint px-1.5 py-0.5 text-inkLight flex-shrink-0 ml-1">
          {event.type}
        </span>
      </div>

      {/* Cancelled overlay */}
      {isCancelled && (
        <div className="px-2 mt-1">
          <span className="font-mono text-[10px] font-bold uppercase text-terracotta">CANCELLED</span>
        </div>
      )}

      {/* Attendance buttons — only for academic events */}
      {hasAttendance && !isCancelled && (
        <div className="flex gap-1 mt-auto px-2 pb-1.5 flex-shrink-0">
          <button
            onClick={() => handleMark('ATTENDED')}
            disabled={isPending}
            className={`
              font-mono text-[10px] font-bold uppercase px-2 py-0.5 border
              transition-all duration-100
              ${status === 'ATTENDED'
                ? 'bg-sage text-paper border-sageDark shadow-none'
                : 'bg-paper text-inkLight border-inkFaint hover:border-sage hover:text-sage'
              }
            `}
          >
            ✓ IN
          </button>
          <button
            onClick={() => handleMark('MISSED')}
            disabled={isPending}
            className={`
              font-mono text-[10px] font-bold uppercase px-2 py-0.5 border
              transition-all duration-100
              ${status === 'MISSED'
                ? 'bg-terracotta text-paper border-terracottaDark shadow-none'
                : 'bg-paper text-inkLight border-inkFaint hover:border-terracotta hover:text-terracotta'
              }
            `}
          >
            ✗ OUT
          </button>
        </div>
      )}
    </div>
  )
}
```

### 8.4 — Attendance Gauge (Progress Bar — No Circles)

```typescript
// components/courses/AttendanceGauge.tsx
import type { AttendanceSummary } from '@/types'

interface AttendanceGaugeProps {
  summary: AttendanceSummary
}

export function AttendanceGauge({ summary }: AttendanceGaugeProps) {
  const { effectivePct, targetPct, attended, missed, isAtRisk } = summary
  const pct = Math.min(effectivePct, 100)
  const isOver = effectivePct >= targetPct

  return (
    <div className="space-y-1.5">
      {/* Bar track */}
      <div className="relative h-5 bg-paper border-2 border-ink w-full">
        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber z-10"
          style={{ left: `${targetPct}%` }}
          title={`Target: ${targetPct}%`}
        />
        {/* Fill */}
        <div
          className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${
            isAtRisk ? 'bg-terracottaLight border-r-2 border-r-terracotta' : 'bg-sageLight border-r-2 border-r-sage'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* Percentage label inside bar */}
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-ink z-20">
          {effectivePct.toFixed(1)}%
        </span>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 font-mono text-xs text-inkLight">
        <span className="text-sage font-bold">{attended} IN</span>
        <span className="text-terracotta font-bold">{missed} OUT</span>
        {isAtRisk ? (
          <span className="text-terracotta font-bold ml-auto">⚠ AT RISK</span>
        ) : (
          <span className="text-sage font-bold ml-auto">✓ SAFE</span>
        )}
      </div>
    </div>
  )
}
```

### 8.5 — CGPA Simulator (Client Component)

```typescript
// components/cgpa/CGPASimulator.tsx
"use client"
// CLIENT COMPONENT — reason: interactive real-time simulation with controlled inputs

import { useState } from 'react'
import { computeCGPA } from '@/lib/cgpa'
import type { SemesterGradeRecord } from '@prisma/client'

interface CGPASimulatorProps {
  completedSemesters: SemesterGradeRecord[]
  totalCreditsPerSemester: number
}

const GRADE_POINTS: Record<string, number> = {
  'O':  10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0,
}

export function CGPASimulator({ completedSemesters, totalCreditsPerSemester }: CGPASimulatorProps) {
  const totalSems = 8
  const remainingSems = totalSems - completedSemesters.length
  const [projectedSGPAs, setProjectedSGPAs] = useState<string[]>(
    Array(remainingSems).fill('8.0')
  )
  const [targetCGPA, setTargetCGPA] = useState('8.5')

  const completedEarned = completedSemesters.reduce((sum, s) => sum + (s.creditsEarned ?? 0), 0)
  const completedTotal  = completedSemesters.reduce((sum, s) => sum + (s.totalCredits ?? 0), 0)
  const completedWeighted = completedSemesters.reduce((sum, s) => sum + ((s.sgpa ?? 0) * (s.creditsEarned ?? 0)), 0)

  const projectedWeighted = projectedSGPAs.reduce((sum, sgpaStr, i) => {
    const sgpa = parseFloat(sgpaStr) || 0
    return sum + sgpa * totalCreditsPerSemester
  }, 0)

  const totalCredits = completedTotal + remainingSems * totalCreditsPerSemester
  const simulatedCGPA = totalCredits > 0
    ? (completedWeighted + projectedWeighted) / totalCredits
    : 0

  const targetNum = parseFloat(targetCGPA) || 0
  const requiredTotal = targetNum * totalCredits
  const requiredFuture = remainingSems > 0
    ? (requiredTotal - completedWeighted) / (remainingSems * totalCreditsPerSemester)
    : 0

  return (
    <div className="brutal-card space-y-4">
      <h2 className="font-heading text-xl font-bold">CGPA Simulator</h2>

      {/* Completed sems */}
      {completedSemesters.map((sem, i) => (
        <div key={sem.id} className="flex items-center gap-3 font-mono text-sm">
          <span className="text-inkLight w-16">Sem {sem.semesterNumber}</span>
          <span className="font-bold text-ink">{sem.sgpa?.toFixed(2) ?? '—'}</span>
          <span className="text-inkFaint text-xs">({sem.creditsEarned}/{sem.totalCredits} cr)</span>
          <span className="ml-auto text-inkLight text-xs uppercase">{sem.semesterName}</span>
        </div>
      ))}

      {/* Projected sems */}
      {Array.from({ length: remainingSems }, (_, i) => (
        <div key={`proj-${i}`} className="flex items-center gap-3">
          <span className="font-mono text-inkLight text-sm w-16">
            Sem {completedSemesters.length + i + 1}
          </span>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={projectedSGPAs[i]}
            onChange={e => {
              const next = [...projectedSGPAs]
              next[i] = e.target.value
              setProjectedSGPAs(next)
            }}
            className="w-20 border-2 border-ink bg-paper font-mono text-sm px-2 py-1 focus:outline-none focus:border-terracotta"
          />
          <span className="font-mono text-xs text-inkFaint">/ 10.0 projected</span>
        </div>
      ))}

      {/* Result panel */}
      <div className="border-t-2 border-ink pt-4 mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="font-mono text-xs text-inkLight uppercase tracking-wider">Simulated CGPA</div>
          <div className="font-heading text-4xl font-bold text-ink">{simulatedCGPA.toFixed(2)}</div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="font-mono text-xs text-inkLight uppercase tracking-wider block mb-1">
              Target CGPA
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={targetCGPA}
              onChange={e => setTargetCGPA(e.target.value)}
              className="w-full border-2 border-ink bg-paper font-mono text-sm px-2 py-1 focus:outline-none focus:border-terracotta"
            />
          </div>
          <div className="font-mono text-xs">
            <span className="text-inkLight">Required avg SGPA remaining: </span>
            <span className={`font-bold ${requiredFuture > 10 ? 'text-terracotta' : 'text-sage'}`}>
              {remainingSems > 0 ? requiredFuture.toFixed(2) : '—'}
            </span>
            {requiredFuture > 10 && (
              <div className="text-terracotta font-bold mt-1">NOT ACHIEVABLE</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 8.6 — Ingest Dropzone (Client Component)

```typescript
// components/ingest/IngestDropzone.tsx
"use client"
// CLIENT COMPONENT — reason: file drag-drop, paste handler, fetch to /api/ingest

import { useState, useCallback, useRef } from 'react'
import type { OllamaIngestResponse } from '@/types'

type IngestState = 'idle' | 'loading' | 'success' | 'error'

export function IngestDropzone() {
  const [state, setState] = useState<IngestState>('idle')
  const [text, setText] = useState('')
  const [result, setResult] = useState<OllamaIngestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleIngest(inputText: string) {
    if (!inputText.trim()) return
    setState('loading')
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: inputText, sourceType: 'MANUAL_TEXT' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ingest failed')
      setResult(data)
      setState('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setState('error')
    }
  }

  async function handleFile(file: File) {
    if (file.type === 'application/pdf') {
      const formData = new FormData()
      formData.append('file', file)
      // Parse PDF client-side via server action or dedicated route
      // For now, show placeholder
      setError('PDF upload: send to /api/parse-pdf first, then pipe to ingest')
      setState('error')
      return
    }
    const text = await file.text()
    setText(text)
    await handleIngest(text)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-ink bg-surface p-8 text-center cursor-pointer
                   hover:bg-surfaceHover transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="font-heading text-lg font-bold text-ink mb-1">Drop Anything Here</div>
        <div className="font-mono text-xs text-inkLight">
          Timetable PDF · Syllabus · WhatsApp message · Marks sheet
        </div>
      </div>

      {/* Text paste area */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Or paste raw text here — WhatsApp group messages, assignment details, marks..."
        rows={6}
        className="w-full border-2 border-ink bg-surface font-mono text-sm px-3 py-2
                   placeholder:text-inkFaint focus:outline-none focus:border-terracotta resize-none"
      />

      <button
        onClick={() => handleIngest(text)}
        disabled={state === 'loading' || !text.trim()}
        className="brutal-btn-primary w-full"
      >
        {state === 'loading' ? '⟳ PARSING WITH OLLAMA...' : '→ INGEST & PARSE'}
      </button>

      {/* Result preview */}
      {state === 'success' && result && (
        <div className="border-2 border-sage bg-sageLight p-4 space-y-2">
          <div className="font-heading font-bold text-sm">
            ✓ {(result as any).recordsCreated} records created · Action: {(result as any).action}
          </div>
          <pre className="font-mono text-xs text-ink overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify((result as any).preview, null, 2)}
          </pre>
        </div>
      )}

      {/* Error display */}
      {state === 'error' && error && (
        <div className="border-2 border-terracotta bg-terracottaLight p-4">
          <div className="font-heading font-bold text-sm text-terracottaDark">✗ INGEST FAILED</div>
          <div className="font-mono text-xs text-terracottaDark mt-1">{error}</div>
        </div>
      )}
    </div>
  )
}
```

---

## PART 9 — SERVER ACTIONS

```typescript
// app/actions/attendance.ts
'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const MarkAttendanceSchema = z.object({
  eventId: z.string().cuid(),
  courseId: z.string().cuid(),
  status: z.enum(['ATTENDED', 'MISSED', 'CANCELLED']),
  note: z.string().optional(),
})

export async function markAttendance(input: z.infer<typeof MarkAttendanceSchema>) {
  const data = MarkAttendanceSchema.parse(input)

  await prisma.attendanceRecord.upsert({
    where: { eventId: data.eventId },
    update: { status: data.status, note: data.note ?? null, markedAt: new Date() },
    create: {
      eventId: data.eventId,
      courseId: data.courseId,
      status: data.status,
      note: data.note ?? null,
    },
  })

  revalidatePath('/dashboard')
  revalidatePath('/courses')
}

export async function getAttendanceSummary(courseId: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { courseId },
  })

  const attended  = records.filter(r => r.status === 'ATTENDED').length
  const missed    = records.filter(r => r.status === 'MISSED').length
  const cancelled = records.filter(r => r.status === 'CANCELLED').length
  const effective = attended + missed
  const effectivePct = effective > 0 ? (attended / effective) * 100 : 100

  return { attended, missed, cancelled, effectivePct }
}
```

```typescript
// app/actions/tasks.ts
'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { TaskStatus, TaskCategory, TaskPriority } from '@prisma/client'

const CreateTaskSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate:     z.string().optional(),
  category:    z.enum(['ACADEMICS', 'HARDWARE_DEV', 'ROUTINE', 'PERSONAL']),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  tags:        z.array(z.string()).default([]),
})

export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  const data = CreateTaskSchema.parse(input)
  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      category: data.category as TaskCategory,
      priority: data.priority as TaskPriority,
      tags: data.tags,
      status: 'TODO',
    },
  })
  revalidatePath('/tasks')
  return task
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await prisma.task.update({
    where: { id: taskId },
    data: { status, updatedAt: new Date() },
  })
  revalidatePath('/tasks')
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } })
  revalidatePath('/tasks')
}
```

---

## PART 10 — ATTENDANCE CALCULATION HELPER

```typescript
// lib/attendance.ts
import { prisma } from './prisma'
import type { AttendanceSummary } from '@/types'

export async function getFullAttendanceSummaries(semesterId: string): Promise<AttendanceSummary[]> {
  const courses = await prisma.course.findMany({
    where: { semesterId },
    include: {
      attendanceRecords: true,
    },
  })

  return courses.map(course => {
    const records = course.attendanceRecords
    const attended  = records.filter(r => r.status === 'ATTENDED').length
    const missed    = records.filter(r => r.status === 'MISSED').length
    const cancelled = records.filter(r => r.status === 'CANCELLED').length
    const effective = attended + missed
    const effectivePct = effective > 0 ? (attended / effective) * 100 : 100

    return {
      courseId: course.id,
      subjectCode: course.subjectCode,
      courseName: course.name,
      color: course.color,
      totalRecords: records.length,
      attended,
      missed,
      cancelled,
      effectivePct,
      isAtRisk: effectivePct < course.minAttendancePct,
      targetPct: course.minAttendancePct,
    }
  })
}

export function computeClassesNeeded(attended: number, missed: number, targetPct: number): {
  canSkip: number
  mustAttend: number
} {
  const total = attended + missed
  // Solve: attended / (total + x) >= targetPct/100 for mustAttend (x future classes)
  // Solve: (attended) / (total + x) >= targetPct where x = 0, find how many to skip
  const targetDecimal = targetPct / 100

  // Classes we can still skip: (attended - targetDecimal * total) / targetDecimal
  const canSkip = Math.floor((attended - targetDecimal * total) / targetDecimal)

  // Classes we must attend to reach target:
  // (attended + x) / (total + x) >= targetDecimal => x >= (targetDecimal * total - attended) / (1 - targetDecimal)
  const mustAttend = effectivePct(attended, missed) >= targetPct
    ? 0
    : Math.ceil((targetDecimal * total - attended) / (1 - targetDecimal))

  return { canSkip: Math.max(0, canSkip), mustAttend: Math.max(0, mustAttend) }
}

function effectivePct(attended: number, missed: number): number {
  const total = attended + missed
  return total > 0 ? (attended / total) * 100 : 100
}
```

---

## PART 11 — CGPA COMPUTATION UTILITY

```typescript
// lib/cgpa.ts

export interface SemesterInput {
  semesterNumber: number
  sgpa: number
  credits: number
}

export function computeCGPA(semesters: SemesterInput[]): number {
  const totalWeighted = semesters.reduce((sum, s) => sum + s.sgpa * s.credits, 0)
  const totalCredits  = semesters.reduce((sum, s) => sum + s.credits, 0)
  return totalCredits > 0 ? totalWeighted / totalCredits : 0
}

export function requiredFutureSGPA(
  completedSemesters: SemesterInput[],
  remainingSemCount: number,
  creditsPerSem: number,
  targetCGPA: number,
): number {
  const completedWeighted = completedSemesters.reduce((sum, s) => sum + s.sgpa * s.credits, 0)
  const completedCredits  = completedSemesters.reduce((sum, s) => sum + s.credits, 0)
  const remainingCredits  = remainingSemCount * creditsPerSem
  const totalCredits      = completedCredits + remainingCredits
  const requiredTotal     = targetCGPA * totalCredits
  const requiredRemaining = requiredTotal - completedWeighted
  return remainingCredits > 0 ? requiredRemaining / remainingCredits : 0
}

// NITK 10-point grade to grade point mapping
export const GRADE_TO_POINT: Record<string, number> = {
  'O':  10,
  'A+': 9,
  'A':  8,
  'B+': 7,
  'B':  6,
  'C':  5,
  'P':  4,
  'F':  0,
  'AB': 0, // Absent
}

export function gradeToPoint(grade: string): number {
  return GRADE_TO_POINT[grade.toUpperCase().trim()] ?? 0
}
```

---

## PART 12 — ENVIRONMENT & SETUP

```env
# .env.local — DO NOT COMMIT THIS FILE

DATABASE_URL="postgresql://postgres:password@localhost:5432/nexusdesk"
OLLAMA_BASE_URL="http://localhost:11434"
NEXTAUTH_SECRET="generate-with-openssl-rand-hex-32"
```

```json
// package.json (required dependencies section)
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.14.0",
    "prisma": "^5.14.0",
    "zod": "^3.23.0",
    "pdf-parse": "^1.1.1",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/pdf-parse": "^1.1.4",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/forms": "^0.5.7",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### shadcn/ui Component Install Commands
```bash
npx shadcn@latest init
# When prompted: style=default, base-color=neutral, CSS variables=yes
# Then install ONLY these components (override their styles via className):
npx shadcn@latest add button dialog input select textarea badge separator
npx shadcn@latest add dropdown-menu tooltip popover command
```

---

## PART 13 — EXECUTION PLAN (SEQUENTIAL — DO NOT SKIP PHASES)

### PHASE 0 — Foundation (Do This First, Nothing Else)
1. `npx create-next-app@latest nexusdesk --typescript --tailwind --app --no-src-dir --import-alias "@/*"`
2. `cd nexusdesk && npm install @prisma/client prisma zod pdf-parse date-fns clsx tailwind-merge @tailwindcss/forms`
3. `npx prisma init` — creates `prisma/schema.prisma` and `.env`
4. Paste the full `schema.prisma` from Part 2 into `prisma/schema.prisma`
5. Set `DATABASE_URL` in `.env.local`
6. `npx prisma migrate dev --name init`
7. `npx prisma generate`
8. Replace `tailwind.config.ts` with Part 3 contents
9. Replace `app/globals.css` with Part 4 contents
10. Create `types/index.ts` with Part 5 contents
11. Create `lib/prisma.ts` with Part 6 contents
12. Run `npm run dev` — confirm blank app runs at `localhost:3000` with paper background

### PHASE 1 — Layout Shell
1. Create `app/layout.tsx` per Part 8.1 (fonts, sidebar, topbar structure)
2. Create `components/layout/Sidebar.tsx` — left navigation with links to all routes, brutalist style, `w-56 border-r-2 border-ink bg-surface` vertical nav. Nav items: DASHBOARD / COURSES / TASKS / CGPA / PROJECTS / ROUTINE / INGEST. Each item: `font-mono text-xs font-bold uppercase tracking-wider`, active state: `bg-ink text-paper`, hover: `bg-surfaceHover`.
3. Create `components/layout/TopBar.tsx` — `border-b-2 border-ink h-12 px-6 flex items-center justify-between bg-surface`. Left: current date in mono. Right: real-time attendance risk count badge.
4. Create `components/shared/BrutalCard.tsx`, `BrutalButton.tsx`, `BrutalBadge.tsx`, `BrutalInput.tsx`, `EmptyState.tsx`
5. Verify layout renders correctly on all routes

### PHASE 2 — Ingest Engine
1. Create `app/api/ingest/route.ts` per Part 7 — the full ingest engine
2. Create `components/ingest/IngestDropzone.tsx` per Part 8.6
3. Create `app/ingest/page.tsx` — render `IngestDropzone`
4. **Test with Ollama running:** Feed a simple WhatsApp-style text: `"EC302 class cancelled tomorrow, Analog Circuits with Dr. Sharma"` — verify it returns `SCHEDULE_MUTATION` action
5. Feed a fake timetable string: `"Mon/Wed/Fri 8:30–9:30 EC302 Analog Circuits LT1"` — verify `INITIAL_SETUP` with recurring events
6. Fix any JSON extraction issues in `extractJSON()` before proceeding

### PHASE 3 — Dashboard Timeline
1. Create `components/dashboard/FluidTimeline.tsx` per Part 8.2
2. Create `components/dashboard/TimelineEvent.tsx` per Part 8.3
3. Create `components/dashboard/CurrentTimeCursor.tsx` — `absolute w-full h-0.5 bg-terracotta z-20` with a left label showing current time in mono
4. Create `components/dashboard/DayNavigator.tsx` — `← PREV` / `TODAY` / `NEXT →` buttons in brutalist style
5. Create `app/dashboard/page.tsx` (Server Component) — fetch today's events from DB, pass to `<FluidTimeline />`
6. Create `app/actions/events.ts` — `getEventsForDate(date: Date)` server action
7. Verify timeline renders events at correct vertical positions and attendance buttons work

### PHASE 4 — Courses & Attendance
1. Create `app/courses/page.tsx` (Server Component) — fetch all courses with attendance stats, render as grid of `CourseCard`
2. Create `components/courses/CourseCard.tsx` — shows subject code, name, attendance gauge, credits
3. Create `components/courses/AttendanceGauge.tsx` per Part 8.4
4. Create `app/courses/[courseId]/page.tsx` — course detail with full grade ledger + attendance history
5. Create `components/courses/GradeLedger.tsx` — table showing all `GradeItem` rows with obtained/max/scaled display. Use `font-mono` for all numbers. Handle the `/26 → /30` scaling display explicitly: show both raw and scaled in separate columns.
6. Create `app/actions/courses.ts` and `app/actions/grades.ts`
7. Add inline grade entry form below the ledger table

### PHASE 5 — Tasks Kanban
1. Create `app/tasks/page.tsx` — fetch all tasks grouped by category and status
2. Create `components/tasks/KanbanBoard.tsx` — three column layout (`ACADEMICS` / `HARDWARE_DEV` / `ROUTINE+PERSONAL`). Each column: `border-2 border-ink bg-surface`. Column header: `section-label` class. Tasks within each column further visually grouped by status.
3. Create `components/tasks/TaskCard.tsx` — `brutal-card` with title, priority badge, due date in mono, category badge, drag-handle. Status transition buttons: `→ IN PROGRESS` / `→ DONE`
4. Create `components/tasks/AddTaskForm.tsx` — inline collapsible form within each column
5. Wire `app/actions/tasks.ts` per Part 9

### PHASE 6 — CGPA Simulator
1. Create `lib/cgpa.ts` per Part 11
2. Create `components/cgpa/CGPASimulator.tsx` per Part 8.5
3. Create `app/cgpa/page.tsx` — fetch historical `SemesterGradeRecord` rows, pass to simulator. Add a goal input: `"I want X.XX CGPA — what SGPA do I need every remaining semester?"`. Render result prominently with terracotta if not achievable, sage if achievable.
4. Add grade-to-CGPA converter tool: enter grades per course per semester, compute SGPA automatically

### PHASE 7 — Hardware Projects
1. Create `app/projects/page.tsx` (Server Component) — fetch all `HardwareProject` rows, render as `ProjectCard` grid
2. Create `components/projects/ProjectCard.tsx` — name, status badge, component tags (as mono badges), milestone progress bar, last log entry date
3. Create `app/projects/[projectId]/page.tsx` — full project detail with milestone tracker and log entries
4. Create `components/projects/MilestoneTracker.tsx` — list of milestones, each with status, target date, and a large `✓` / `○` / `✗` indicator in brutalist style
5. Wire `app/actions/projects.ts`

### PHASE 8 — Routine Tracker
1. Create `app/routine/page.tsx` — fetch today's `DailyRoutineLog` or create empty one; fetch last 30 days for trend view
2. Create `components/routine/StepTracker.tsx` — manual step count input with goal progress bar (`brutal` horizontal bar, no circle). Show steps in massive `font-mono font-bold text-5xl`. Color: sage if >= goal, amber if 70-99%, terracotta if < 70%
3. Create `components/routine/WorkoutLogger.tsx` — log session with type selector (STRENGTH / CARDIO / etc.), duration input, notes
4. Create `components/routine/SleepLogger.tsx` — sleep hours input + quality score 1-5
5. Add weight log for body recomposition: input weight in kg, show 30-day trend as a simple SVG line chart (in-component, no library) — draw path using D attribute computed from data points. Hard corners on axes (no curves), `stroke="#2D2D2D"`, `strokeWidth="2"`.
6. Wire `app/actions/routine.ts`

### PHASE 9 — Resource Linker
1. Create `app/resources/page.tsx` — course-grouped resource list
2. Allow linking a URL or noting a file path per course. Types: PDF / VIDEO / LINK / NOTE. Each resource: brutal card with title, type badge, course badge, and `→ OPEN` link button.
3. Wire add-resource Server Action

### PHASE 10 — Weekly Planner View
1. Create `app/planner/page.tsx` — 7-column weekly grid showing events per day. This is a read-only planning view. Each column: `border-r-2 border-ink`. Day header: `section-label` class. Events shown as small brutal blocks.
2. Highlight days with exams in terracottaLight column background. Highlight days with labs in sageLight.
3. Add exam countdown feature: for any upcoming `EXAM` type event, show a countdown chip: `3 DAYS` in a bold mono font with terracotta border.

### PHASE 11 — Hardening & Polish
1. Add `loading.tsx` files for each route using a mono spinner pattern: `⟳ LOADING...` in `font-mono font-bold text-inkLight animate-pulse`
2. Add `error.tsx` files for each route — brutal error card with terracotta border
3. Add `not-found.tsx` — `404 / PAGE NOT FOUND` in display font
4. Audit EVERY component: confirm zero rounded corners, zero soft shadows, zero pure black or pure white
5. Confirm all number/data values use `font-mono`
6. Confirm all section headers use the `.section-label` CSS class
7. Confirm all interactive elements have hover and active states per Rule D-6
8. Performance: Wrap all Server Components fetching data in `Suspense` boundaries with appropriate `fallback`
9. Add `<link rel="preconnect">` for Google Fonts in root layout
10. Test the full ingest pipeline with: (a) a realistic timetable paste, (b) a WhatsApp marks announcement, (c) a task extraction from a homework reminder

---

## PART 14 — CREATIVE ADDITIONS FOR NITK SOPHOMORE LIFE

### 14.1 — Mess Menu Tracker
- Schema: `MessMenu` model with `day`, `meal` (BREAKFAST/LUNCH/DINNER/SNACK), `items: String[]`, `date`
- Simple route `/mess` showing today's expected mess menu. User can paste the weekly WhatsApp mess menu into the ingest engine and it extracts it. Display as clean table: no styling gimmicks, just stark mono rows.

### 14.2 — Condonation Risk Calculator
- On the Courses page, for any course below 75%, show a modal/panel: `"You need X more classes to reach 75%. At current rate you will finish the semester at Y%. Condonation requires medical certificate + HOD approval for Z% attendance."`
- Make the threshold configurable (some faculty allow 65% with reasons).

### 14.3 — CIA Score Normalizer
- On the Grade Ledger, add a one-click "Normalize" action: if a CIA score is `/26`, compute `(obtained/26) * 30` and store both values. Show a `≈` symbol next to normalized values so the student always knows the raw vs scaled distinction.

### 14.4 — WhatsApp Group Quick-Paste Mode
- A floating button on every page: `+ QUICK PASTE`. Opens a minimal full-screen modal with just a textarea and `→ INGEST` button. Zero navigation needed to log a cancelled class or new assignment from WhatsApp.

### 14.5 — Night Study Session Tracker
- On the Routine page, a `LOG NIGHT STUDY` button. Records: start time, end time, subject, location (room/library). Stores as a `Task` with `ACADEMICS` category and a `nightStudy:true` tag. Shows weekly night study hours in mono text.

### 14.6 — Project Component Inventory
- On each Hardware Project, a `COMPONENTS` tab listing all components with: name, quantity, sourced-from (lab/bought/online), status (IN-HAND / ORDERED / MISSING). Stored in `components: String[]` on `HardwareProject` and a companion `ProjectComponent` model.
- Add: `ProjectComponent` model to schema: `{ id, name, quantity, source, status, projectId }`.

### 14.7 — Exam Prep Checklist
- When an EXAM event is < 7 days away, auto-generate a prep task in the Tasks board: `"Prepare for EC302 CIA-2"` with a checklist: `[ ] Review Chapter X, [ ] Solve PYQs, [ ] Formula sheet ready`. The agent pre-populates this checklist from the course's attached syllabus resource if available.

---

## PART 15 — AGENT FINAL CHECKLIST BEFORE HANDOFF

Before marking the build complete, the agent must verify every item:

- [ ] `border-radius: 0 !important` is in `globals.css` and applies globally
- [ ] No component uses Tailwind rounded classes (`rounded-*`) except `rounded-none`
- [ ] No component uses `shadow-sm`, `shadow-md`, `shadow-lg` (soft blur shadows). Only `shadow-brutal*` variants
- [ ] No component uses `#000000` or `#FFFFFF` as hardcoded color literals
- [ ] All monetary/numeric data is rendered in `font-mono`
- [ ] All section headings follow the `.section-label` class pattern
- [ ] The `/api/ingest` route handles all five action types and logs every call to `IngestLog`
- [ ] Attendance calculation uses `(attended) / (attended + missed)` — NOT total events including cancelled
- [ ] `GradeItem.maxMarks` is stored as-entered (e.g. `26.0`) and displayed as `/26` — the scaling is OPTIONAL and additive
- [ ] `DynamicEvent` rows are never hardcoded — every event comes from the DB
- [ ] `prisma.ts` uses the global singleton pattern to prevent connection pool exhaustion in dev
- [ ] All Server Actions use `revalidatePath` after mutations
- [ ] All API route handlers return typed `NextResponse.json()` with correct status codes
- [ ] Ollama is queried with `temperature: 0.1` for deterministic output
- [ ] The CGPA simulator correctly weights by credits (not simple average of SGPAs)
- [ ] Attendance risk display (`isAtRisk`) is computed server-side, not client-side
- [ ] Mobile layout is acceptable (sidebar collapses to hamburger on `< md` screens)
- [ ] All `"use client"` directives have a comment explaining why

---

*END OF SPECIFICATION — NexusDesk v1.0.0*
*Build target: NITK ECE Sophomore · Privacy-first · Local-first · Brutally functional*
