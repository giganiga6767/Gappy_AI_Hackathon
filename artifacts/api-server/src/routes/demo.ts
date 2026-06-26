import { Router } from "express";
import { db, client } from "@workspace/db";
import {
  semestersTable,
  coursesTable,
  eventsTable,
  tasksTable,
  attendanceTable,
  cgpaRecordsTable,
  gradesTable,
  artifactsTable,
  resourcesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function ensureExtraColumns(): Promise<void> {
  const alters = [
    "ALTER TABLE tasks ADD COLUMN triageNote TEXT",
    "ALTER TABLE resources ADD COLUMN description TEXT",
    "ALTER TABLE resources ADD COLUMN source TEXT",
  ];
  for (const sql of alters) {
    try {
      await client.execute(sql);
    } catch {
      // Column may already exist
    }
  }
}

router.post("/demo/seed", async (req, res): Promise<void> => {
  try {
    await ensureExtraColumns();

    // Clear existing data in correct order (FKs)
    await db.delete(gradesTable);
    await db.delete(attendanceTable);
    await db.delete(eventsTable);
    await db.delete(tasksTable);
    await db.delete(resourcesTable);
    await db.delete(artifactsTable);
    await db.delete(cgpaRecordsTable);
    await db.delete(coursesTable);
    await db.delete(semestersTable);

    // ── 1. Semester ───────────────────────────────────────────────────
    const [semester] = await db
      .insert(semestersTable)
      .values({
        name: "2025-26 Even Semester",
        startDate: "2026-01-20",
        endDate: "2026-07-20",
        isActive: true,
      })
      .returning();

    // ── 2. Courses ────────────────────────────────────────────────────
    const courseData = [
      {
        subjectCode: "CS301",
        name: "Data Structures & Algorithms",
        shortName: "DSA",
        creditWeight: 4,
        minAttendancePct: 75,
        facultyName: "Prof. R. Mehta",
        roomNumber: "Room 204",
        color: "#C4614A",
        semesterId: semester.id,
      },
      {
        subjectCode: "EC201",
        name: "Signals & Systems",
        shortName: "S&S",
        creditWeight: 4,
        minAttendancePct: 75,
        facultyName: "Prof. K. Rao",
        roomNumber: "Room 301",
        color: "#6B7F52",
        semesterId: semester.id,
      },
      {
        subjectCode: "MA201",
        name: "Engineering Mathematics III",
        shortName: "EM3",
        creditWeight: 3,
        minAttendancePct: 75,
        facultyName: "Prof. A. Singh",
        roomNumber: "Room 101",
        color: "#B8872A",
        semesterId: semester.id,
      },
      {
        subjectCode: "CS302",
        name: "Database Systems",
        shortName: "DBMS",
        creditWeight: 3,
        minAttendancePct: 75,
        facultyName: "Prof. S. Kumar",
        roomNumber: "Room 205",
        color: "#4A5568",
        semesterId: semester.id,
      },
      {
        subjectCode: "HS101",
        name: "Communication Skills Lab",
        shortName: "CommLab",
        creditWeight: 2,
        minAttendancePct: 85,
        facultyName: "Prof. P. Nair",
        roomNumber: "Lab L1",
        color: "#5A6A8A",
        semesterId: semester.id,
      },
    ];

    const courses = await db.insert(coursesTable).values(courseData).returning();
    const courseMap = Object.fromEntries(courses.map((c) => [c.subjectCode, c]));

    // ── 3. Recurring Events ───────────────────────────────────────────
    // Schedule: Mon=1 Tue=2 Wed=3 Thu=4 Fri=5
    const recurringSchedules = [
      // CS301: Mon/Thu 10-11am
      { course: "CS301", days: [1, 4], startH: 10, startM: 0, endH: 11, endM: 0, type: "LECTURE", title: "CS301 Lecture" },
      // EC201: Mon/Wed/Fri 9-10am
      { course: "EC201", days: [1, 3, 5], startH: 9, startM: 0, endH: 10, endM: 0, type: "LECTURE", title: "EC201 Lecture" },
      // MA201: Tue/Thu/Fri 11am-12pm
      { course: "MA201", days: [2, 4, 5], startH: 11, startM: 0, endH: 12, endM: 0, type: "LECTURE", title: "MA201 Lecture" },
      // CS302: Mon/Wed 2-3pm
      { course: "CS302", days: [1, 3], startH: 14, startM: 0, endH: 15, endM: 0, type: "LECTURE", title: "CS302 Lecture" },
      // HS101: Tue 2-4pm (lab)
      { course: "HS101", days: [2], startH: 14, startM: 0, endH: 16, endM: 0, type: "LAB", title: "CommLab Session" },
    ];

    const semStart = new Date("2026-01-20");
    const semEnd = new Date("2026-07-20");
    const today = new Date();
    const eventsToInsert: any[] = [];

    for (const sched of recurringSchedules) {
      const courseId = courseMap[sched.course]?.id;
      if (!courseId) continue;
      const groupId = crypto.randomUUID();
      const cursor = new Date(semStart);

      while (cursor <= semEnd) {
        if (sched.days.includes(cursor.getDay())) {
          const s = new Date(cursor);
          s.setHours(sched.startH, sched.startM, 0, 0);
          const e = new Date(cursor);
          e.setHours(sched.endH, sched.endM, 0, 0);
          eventsToInsert.push({
            title: sched.title,
            type: sched.type,
            startTime: s,
            endTime: e,
            location: courseMap[sched.course].roomNumber,
            courseId,
            isRecurring: true,
            recurringGroupId: groupId,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // One-shot exams
    eventsToInsert.push(
      {
        title: "CS301 Mid-Semester Exam",
        type: "EXAM",
        startTime: new Date("2026-03-18T10:00:00"),
        endTime: new Date("2026-03-18T12:00:00"),
        location: "Exam Hall A",
        courseId: courseMap["CS301"]?.id,
        isRecurring: false,
        isCancelled: false,
      },
      {
        title: "EC201 Mid-Semester Exam",
        type: "EXAM",
        startTime: new Date("2026-03-20T09:00:00"),
        endTime: new Date("2026-03-20T11:00:00"),
        location: "Exam Hall B",
        courseId: courseMap["EC201"]?.id,
        isRecurring: false,
        isCancelled: false,
      },
      {
        title: "CS302 End-Semester Exam",
        type: "EXAM",
        startTime: new Date("2026-07-08T10:00:00"),
        endTime: new Date("2026-07-08T13:00:00"),
        location: "Exam Hall A",
        courseId: courseMap["CS302"]?.id,
        isRecurring: false,
        isCancelled: false,
      },
      {
        title: "CS301 End-Semester Exam",
        type: "EXAM",
        startTime: new Date("2026-07-10T10:00:00"),
        endTime: new Date("2026-07-10T13:00:00"),
        location: "Exam Hall A",
        courseId: courseMap["CS301"]?.id,
        isRecurring: false,
        isCancelled: false,
      },
    );

    // Insert events in chunks to avoid SQLite limits
    const CHUNK = 200;
    const insertedEvents: any[] = [];
    for (let i = 0; i < eventsToInsert.length; i += CHUNK) {
      const chunk = eventsToInsert.slice(i, i + CHUNK);
      const rows = await db.insert(eventsTable).values(chunk).returning();
      insertedEvents.push(...rows);
    }

    // ── 4. Attendance for past events ─────────────────────────────────
    const pastEvents = insertedEvents.filter((e) => new Date(e.startTime) < today);
    const attToInsert: any[] = [];
    for (const ev of pastEvents) {
      if (!ev.courseId || ev.type === "EXAM") continue;
      // 85% attendance rate simulation
      const attended = Math.random() > 0.15;
      attToInsert.push({
        eventId: ev.id,
        courseId: ev.courseId,
        status: attended ? "ATTENDED" : "ABSENT",
        note: attended ? null : "Missed class",
      });
    }

    if (attToInsert.length > 0) {
      for (let i = 0; i < attToInsert.length; i += CHUNK) {
        await db.insert(attendanceTable).values(attToInsert.slice(i, i + CHUNK));
      }
    }

    // ── 5. Tasks ──────────────────────────────────────────────────────
    const todayStr = today.toISOString().split("T")[0];
    const inOneWeek = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
    const inTwoWeeks = new Date(today.getTime() + 14 * 86400000).toISOString().split("T")[0];
    const inThreeWeeks = new Date(today.getTime() + 21 * 86400000).toISOString().split("T")[0];

    await db.insert(tasksTable).values([
      {
        title: "CS301 Assignment 2 — AVL Tree Implementation",
        description: "Implement insert, delete, and rotation operations. Submit via GitHub.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        category: "ACADEMICS",
        dueDate: inOneWeek,
        linkedCourseId: courseMap["CS301"]?.id,
      },
      {
        title: "EC201 Lab Report — Filter Design",
        description: "Submit the low-pass Butterworth filter design report with MATLAB plots.",
        status: "TODO",
        priority: "MEDIUM",
        category: "ACADEMICS",
        dueDate: inTwoWeeks,
        linkedCourseId: courseMap["EC201"]?.id,
      },
      {
        title: "MA201 Tutorial Sheet 4 — Fourier Series",
        description: "Complete problems 1-12 from the tutorial sheet.",
        status: "TODO",
        priority: "LOW",
        category: "ACADEMICS",
        dueDate: inTwoWeeks,
        linkedCourseId: courseMap["MA201"]?.id,
      },
      {
        title: "CS302 ER Diagram Assignment",
        description: "Design the ER diagram for the library management system case study.",
        status: "TODO",
        priority: "HIGH",
        category: "ACADEMICS",
        dueDate: inOneWeek,
        linkedCourseId: courseMap["CS302"]?.id,
      },
      {
        title: "Prepare HS101 Group Presentation",
        description: "Topic: 'Effective Technical Communication'. 10-minute slot.",
        status: "TODO",
        priority: "MEDIUM",
        category: "ACADEMICS",
        dueDate: inThreeWeeks,
        linkedCourseId: courseMap["HS101"]?.id,
      },
      {
        title: "Submit internship application — TechCore Ltd",
        description: "Upload resume + cover letter on the portal before deadline.",
        status: "TODO",
        priority: "CRITICAL",
        category: "PERSONAL",
        dueDate: inOneWeek,
      },
      {
        title: "Review mid-sem slides for all subjects",
        description: "Systematic revision: CS301 → EC201 → MA201 → CS302.",
        status: "TODO",
        priority: "HIGH",
        category: "ACADEMICS",
        dueDate: todayStr,
      },
      {
        title: "Set up GitHub classroom repo for CS302 project",
        description: "Fork the base repo, set up branching strategy, add teammates.",
        status: "DONE",
        priority: "MEDIUM",
        category: "ACADEMICS",
        linkedCourseId: courseMap["CS302"]?.id,
      },
    ]);

    // ── 6. Grades ─────────────────────────────────────────────────────
    await db.insert(gradesTable).values([
      {
        courseId: courseMap["CS301"]?.id,
        examType: "CIE",
        label: "CIE 1",
        obtainedMarks: 22,
        maxMarks: 25,
        date: "2026-02-28",
      },
      {
        courseId: courseMap["CS301"]?.id,
        examType: "CIE",
        label: "CIE 2",
        obtainedMarks: 20,
        maxMarks: 25,
        date: "2026-04-15",
      },
      {
        courseId: courseMap["EC201"]?.id,
        examType: "CIE",
        label: "CIE 1",
        obtainedMarks: 18,
        maxMarks: 25,
        date: "2026-03-01",
      },
      {
        courseId: courseMap["MA201"]?.id,
        examType: "CIE",
        label: "CIE 1",
        obtainedMarks: 21,
        maxMarks: 25,
        date: "2026-02-27",
      },
      {
        courseId: courseMap["CS302"]?.id,
        examType: "CIE",
        label: "CIE 1",
        obtainedMarks: 23,
        maxMarks: 25,
        date: "2026-03-05",
      },
    ]);

    // ── 7. Past CGPA Records ──────────────────────────────────────────
    await db.insert(cgpaRecordsTable).values([
      { semesterNumber: 1, semesterName: "Sem 1 (2024)", sgpa: 8.2, creditsEarned: 20, totalCredits: 20, isProjected: false },
      { semesterNumber: 2, semesterName: "Sem 2 (2024)", sgpa: 8.5, creditsEarned: 21, totalCredits: 21, isProjected: false },
      { semesterNumber: 3, semesterName: "Sem 3 (2025)", sgpa: 7.8, creditsEarned: 22, totalCredits: 22, isProjected: false },
      { semesterNumber: 4, semesterName: "Sem 4 (2025)", sgpa: 8.1, creditsEarned: 21, totalCredits: 21, isProjected: false },
    ]);

    // ── 8. AI Study Plan Tasks ────────────────────────────────────────
    const studyPlanDates = [
      todayStr,
      new Date(today.getTime() + 1 * 86400000).toISOString().split("T")[0],
      new Date(today.getTime() + 2 * 86400000).toISOString().split("T")[0],
      new Date(today.getTime() + 3 * 86400000).toISOString().split("T")[0],
      new Date(today.getTime() + 4 * 86400000).toISOString().split("T")[0],
    ];
    const studyPlanTasks = [
      { title: "Revise AVL tree rotations — CS301", course: "CS301", priority: "CRITICAL" },
      { title: "Practice Fourier series problems — MA201", course: "MA201", priority: "HIGH" },
      { title: "Review Butterworth filter design — EC201", course: "EC201", priority: "HIGH" },
      { title: "SQL join exercises — CS302", course: "CS302", priority: "MEDIUM" },
      { title: "Presentation outline draft — HS101", course: "HS101", priority: "MEDIUM" },
    ];
    for (let i = 0; i < studyPlanTasks.length; i++) {
      const sp = studyPlanTasks[i];
      await client.execute({
        sql: `INSERT INTO tasks (id, title, due_date, category, priority, status, tags, linked_course_id, created_at, updated_at)
              VALUES (?, ?, ?, 'ACADEMICS', ?, 'TODO', ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          sp.title,
          studyPlanDates[i],
          sp.priority,
          JSON.stringify(["ai-study-plan"]),
          courseMap[sp.course]?.id ?? null,
          Date.now(),
          Date.now(),
        ],
      });
    }

    // ── 9. Sample AI Resources (3 per course) ─────────────────────────
    const sampleResources = [
      { course: "CS301", title: "AVL Trees Explained", url: "https://www.youtube.com/watch?v=example-dsa", type: "VIDEO", desc: "Visual guide to tree rotations" },
      { course: "CS301", title: "CLRS Chapter 13 Notes", url: "https://mitpress.mit.edu/books/introduction-algorithms", type: "LINK", desc: "Official textbook reference" },
      { course: "CS301", title: "LeetCode Tree Practice", url: "https://leetcode.com/tag/tree/", type: "LINK", desc: "Balanced BST problem set" },
      { course: "EC201", title: "Signals & Systems MIT OCW", url: "https://ocw.mit.edu/courses/6-003-signals-and-systems-fall-2011/", type: "LINK", desc: "Full lecture series" },
      { course: "EC201", title: "Filter Design Tutorial", url: "https://www.youtube.com/watch?v=example-filters", type: "VIDEO", desc: "Butterworth filter walkthrough" },
      { course: "EC201", title: "MATLAB Filter Examples", url: "https://www.mathworks.com/help/signal/ref/butter.html", type: "LINK", desc: "Official MATLAB docs" },
      { course: "MA201", title: "Fourier Series Khan Academy", url: "https://www.khanacademy.org/math/differential-equations", type: "VIDEO", desc: "Step-by-step Fourier basics" },
      { course: "MA201", title: "Complex Analysis Notes", url: "https://ocw.mit.edu/courses/18-04-complex-variables", type: "PDF", desc: "MIT open course notes" },
      { course: "MA201", title: "Tutorial Sheet Solutions", url: "https://example.edu/ma201/tutorials", type: "LINK", desc: "Practice problem solutions" },
      { course: "CS302", title: "SQL Joins Visualizer", url: "https://sqljoin.com/", type: "LINK", desc: "Interactive join practice" },
      { course: "CS302", title: "Database Normalization Guide", url: "https://www.youtube.com/watch?v=example-dbms", type: "VIDEO", desc: "1NF through BCNF explained" },
      { course: "CS302", title: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/", type: "LINK", desc: "Official SQL reference" },
      { course: "HS101", title: "Technical Writing Guide", url: "https://developers.google.com/tech-writing", type: "LINK", desc: "Google tech writing course" },
      { course: "HS101", title: "Presentation Skills", url: "https://www.youtube.com/watch?v=example-present", type: "VIDEO", desc: "Academic presentation tips" },
      { course: "HS101", title: "Communication Lab Rubric", url: "https://example.edu/hs101/rubric.pdf", type: "PDF", desc: "Grading criteria reference" },
    ];
    for (const res of sampleResources) {
      const courseId = courseMap[res.course]?.id;
      if (!courseId) continue;
      await client.execute({
        sql: `INSERT INTO resources (id, title, url, type, course_id, description, source, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 'ai', ?)`,
        args: [crypto.randomUUID(), res.title, res.url, res.type, courseId, res.desc, Date.now()],
      });
    }

    // ── 10. Sample Weekly Digest ──────────────────────────────────────
    const digestDate = todayStr;
    const digestMarkdown = `# Weekly Digest — ${digestDate}

## 1) Attendance Alerts
- **EC201 Signals & Systems** — attendance below 75% threshold. Attend next 2 classes.

## 2) This Week's Priority Tasks
### CRITICAL
- Submit internship application — TechCore Ltd (due ${inOneWeek})

### HIGH
- CS301 Assignment 2 — AVL Tree Implementation
- CS302 ER Diagram Assignment
- Review mid-sem slides for all subjects

### MEDIUM
- EC201 Lab Report — Filter Design
- Prepare HS101 Group Presentation

## 3) Grade Gaps
| Course | Current CIE % | SEE Needed |
|--------|--------------|------------|
| CS301  | 84%          | ~32%       |
| EC201  | 72%          | ~38%       |
| MA201  | 84%          | ~32%       |
| CS302  | 92%          | ~28%       |

## 4) Top 3 Focus Recommendations
1. **CS301 AVL trees** — weakest relative score; do 5 rotation problems daily.
2. **EC201 attendance** — one more miss puts you at risk.
3. **Internship deadline** — CRITICAL personal task due this week.
`;
    await db.insert(artifactsTable).values({
      title: `Weekly Digest — ${digestDate}`,
      type: "REPORT",
      content: digestMarkdown,
      tags: JSON.stringify(["weekly-digest"]),
    });

    res.json({
      success: true,
      message: "Demo data loaded successfully!",
      summary: {
        semester: semester.name,
        courses: courses.length,
        events: insertedEvents.length,
        attendanceRecords: attToInsert.length,
        tasks: 8 + studyPlanTasks.length,
        grades: 5,
        cgpaRecords: 4,
        studyPlanTasks: studyPlanTasks.length,
        aiResources: sampleResources.length,
        weeklyDigest: 1,
      },
    });
  } catch (err: any) {
    console.error("[Demo] Seed error:", err);
    res.status(500).json({ error: "Failed to seed demo data", details: err.message });
  }
});

export default router;
