import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, tasksTable, coursesTable, semestersTable, attendanceTable } from "@workspace/db";
import { eq, and, gte, lte, sql, notInArray } from "drizzle-orm";

const router = Router();

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

async function callOllama(prompt: string, base64Image?: string): Promise<string> {
  const model = base64Image ? "llama3.2-vision" : "llama3";
  const cleanImage = base64Image ? base64Image.replace(/^data:image\/\w+;base64,/, "") : undefined;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: "json",
      images: cleanImage ? [cleanImage] : undefined,
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json() as { response: string };
  return data.response.trim();
}

async function callGemini(prompt: string, apiKey: string, base64Image?: string): Promise<string> {
  const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
  let lastError: Error | null = null;

  for (const model of models) {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const parts: any[] = [{ text: prompt }];

        if (base64Image) {
          const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          } else {
            parts.push({
              inlineData: {
                mimeType: "image/png",
                data: base64Image
              }
            });
          }
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error (${model}): ${response.status} - ${errorText}`);
        }

        const data = await response.json() as any;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error(`Empty response from Gemini API (${model})`);
        }
        return text.trim();
      } catch (err: any) {
        lastError = err;
        attempts++;
        if (err.message && (err.message.includes("503") || err.message.includes("429"))) {
          console.warn(`Gemini model ${model} temporary error (attempt ${attempts}/${maxAttempts}): ${err.message}. Retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        } else {
          break;
        }
      }
    }
    console.warn(`Model ${model} failed, falling back to next available model...`);
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || lastError}`);
}

function buildUniversalPrompt(rawText: string, currentDate: string, hasImage: boolean): string {
  return `You are an AI assistant designed to parse college academic documents, screenshots of timetables, academic calendars, syllabus, tasks, and schedules.
Analyze the provided input (which can be text, an image, or both) and extract all relevant information to populate the database tables: Semesters, Courses, Schedules/Events, Calendar Events, and Tasks.
Current Date context: ${currentDate}
${hasImage ? "You have been provided with an image (screenshot of a timetable or academic calendar). Carefully extract the text from the image." : ""}

Additionally, check if the input contains a request or announcement to change schedules, cancel classes, reschedule timetables, record attendance, mark a date off as a holiday/break, or complete a task.
Example WhatsApp messages or quick-pastes:
- "EC302 class cancelled tomorrow": action: "CANCEL", subjectCode: "EC302", date: [tomorrow's date YYYY-MM-DD]
- "Mark me as attended ECE class today": action: "ATTENDANCE", subjectCode: "EC302" (or matching code), date: [today's date], attendanceStatus: "ATTENDED"
- "Mark EC302 as missed yesterday": action: "ATTENDANCE", subjectCode: "EC302", date: [yesterday's date], attendanceStatus: "MISSED"
- "Reschedule EC302 next Monday to Tuesday at 11 AM": action: "RESCHEDULE", subjectCode: "EC302", date: [next Monday's date], newDate: [next Tuesday's date], newStartTime: "11:00", newEndTime: "12:00"
- "No classes on July 15th for college festival" or "holiday tomorrow": action: "CREATE_HOLIDAY", date: [target date YYYY-MM-DD], holidayTitle: "College Festival"
- "tie off Analog assignment" or "completed Schematic task": action: "TASK_COMPLETE", taskTitle: "Analog assignment" or "Schematic task"

Please extract:
1. Semester Context: If the document/image mentions a semester name (e.g. "Fall 2026", "Sophomore ECE") or start/end dates, extract them.
2. Courses: All courses or subjects listed. Extract their subject code (e.g., EC302), full name (e.g., Analog Circuits), room number, faculty name, and credits.
3. Recurring Class Schedule: Regular weekly classes, labs, and tutorials. For each class, extract the subject code, day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday), start hour and minute, end hour and minute, and location/room.
4. Specific Calendar Events / Holidays / Exams: Non-recurring events. E.g. Holidays (Independence Day, breaks, festivals), Mid-sem/End-sem exams, registration dates. Extract title, type ("EXAM", "BREAK", "MEETING", "PERSONAL"), start date (YYYY-MM-DD), end date (YYYY-MM-DD), and description.
5. Tasks / Action Items: Homework, assignments, syllabus milestones, and reminders. Extract title, category ("ACADEMICS", "HARDWARE_DEV", "PERSONAL"), priority ("LOW", "MEDIUM", "HIGH", "CRITICAL"), due date (YYYY-MM-DD), and subject code.

Respond ONLY with a valid JSON object matching this TypeScript interface (do NOT wrap in markdown blocks, do not write any additional text):
interface Output {
  semester?: {
    name: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
  courses: Array<{
    subjectCode: string;
    name: string;
    shortName: string; // 2-4 letter abbreviation e.g., "AC" for Analog Circuits
    creditWeight: number; // default to 3 if not specified
    minAttendancePct?: number; // default to 75
    facultyName?: string;
    roomNumber?: string;
  }>;
  schedules: Array<{
    subjectCode: string; // matches one of the courses above
    title: string; // e.g. "EC302 Lecture" or "ECE301 Lab"
    type: "LECTURE" | "LAB" | "TUTORIAL" | "MEETING";
    dayOfWeek: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    startHour: number; // 24-hour format
    startMinute: number;
    endHour: number;
    endMinute: number;
    roomNumber?: string;
  }>;
  calendarEvents: Array<{
    title: string;
    description?: string;
    type: "EXAM" | "BREAK" | "MEETING" | "PERSONAL";
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    location?: string;
  }>;
  tasks: Array<{
    title: string;
    description?: string;
    category: "ACADEMICS" | "HARDWARE_DEV" | "PERSONAL";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    dueDate?: string; // YYYY-MM-DD
    subjectCode?: string; // matches one of the courses
  }>;
  mutation?: {
    action: "CANCEL" | "RESCHEDULE" | "ATTENDANCE" | "TASK_COMPLETE" | "CREATE_HOLIDAY";
    subjectCode?: string; // e.g. EC302
    date?: string; // YYYY-MM-DD (target date of class to mutate)
    cancellationNote?: string; // reason for cancellation
    newDate?: string; // YYYY-MM-DD (for RESCHEDULE)
    newStartTime?: string; // HH:MM (for RESCHEDULE)
    newEndTime?: string; // HH:MM (for RESCHEDULE)
    attendanceStatus?: "ATTENDED" | "MISSED"; // for ATTENDANCE
    taskTitle?: string; // for TASK_COMPLETE (the title of the task to mark completed)
    holidayTitle?: string; // for CREATE_HOLIDAY (the name/title of the holiday)
  };
}

Document/Context text (if any):
${rawText}
`;
}

router.post("/ingest", async (req, res): Promise<void> => {
  const { rawText, sourceType, semesterId, provider, apiKey, scanMode, image } = req.body;
  if (!rawText && !image) {
    res.status(400).json({ error: "rawText or image required" });
    return;
  }

  // 1. Determine the provider and API key
  const llmProvider = provider === "antigravity" || provider === "gemini" ? "antigravity" : "ollama";
  const geminiApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.ANTIGRAVITY_API_KEY;

  if (llmProvider === "antigravity" && !geminiApiKey) {
    res.status(400).json({
      success: false,
      action: "API_KEY_REQUIRED",
      recordsCreated: 0,
      error: "Gemini API key is required when using Antigravity provider. Please provide it in settings.",
    });
    return;
  }

  // 2. Query LLM
  let rawResponse = "";
  try {
    const currentDate = new Date().toISOString().split("T")[0];
    const prompt = buildUniversalPrompt(rawText || "", currentDate, !!image);

    if (llmProvider === "antigravity") {
      rawResponse = await callGemini(prompt, geminiApiKey!, image);
    } else {
      rawResponse = await callOllama(prompt, image);
    }
  } catch (err: any) {
    req.log.error({ err }, "LLM parsing failed");
    res.status(200).json({
      success: false,
      action: "LLM_FAILED",
      recordsCreated: 0,
      error: `AI parsing failed: ${err.message || err}`,
    });
    return;
  }

  // 3. Parse JSON from response
  let parsed: any;
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err: any) {
    req.log.error({ err, rawResponse }, "JSON extraction failed");
    res.status(200).json({
      success: false,
      action: "PARSE_FAILED",
      recordsCreated: 0,
      error: `Could not parse AI response as JSON: ${err.message}. Raw output: ${rawResponse.slice(0, 300)}`,
      preview: { raw: rawResponse },
    });
    return;
  }

  try {
    let recordsCreated = 0;

    // 4. Handle Semester
    let activeSemesterId = semesterId;
    let semesterStartDate = new Date();
    let semesterEndDate = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000);

    if (parsed.semester && parsed.semester.name) {
      // Find or create semester
      const semName = parsed.semester.name;
      const semStart = parsed.semester.startDate || new Date().toISOString().split("T")[0];
      const semEnd = parsed.semester.endDate || new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [existingSem] = await db.select().from(semestersTable).where(eq(semestersTable.name, semName)).limit(1);
      if (existingSem) {
        activeSemesterId = existingSem.id;
        semesterStartDate = new Date(existingSem.startDate);
        semesterEndDate = new Date(existingSem.endDate);
      } else {
        // Set all others inactive
        await db.update(semestersTable).set({ isActive: false });
        const [newSem] = await db.insert(semestersTable).values({
          name: semName,
          startDate: semStart,
          endDate: semEnd,
          isActive: true
        }).returning();
        activeSemesterId = newSem.id;
        semesterStartDate = new Date(semStart);
        semesterEndDate = new Date(semEnd);
        recordsCreated++;
      }
    }

    // If still no semester ID, query active one or create default
    if (!activeSemesterId) {
      const [activeSem] = await db.select().from(semestersTable).where(eq(semestersTable.isActive, true)).limit(1);
      if (activeSem) {
        activeSemesterId = activeSem.id;
        semesterStartDate = new Date(activeSem.startDate);
        semesterEndDate = new Date(activeSem.endDate);
      } else {
        // Create a default active semester
        const semStart = new Date().toISOString().split("T")[0];
        const semEnd = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const [defaultSem] = await db.insert(semestersTable).values({
          name: "Academic Semester 2026",
          startDate: semStart,
          endDate: semEnd,
          isActive: true
        }).returning();
        activeSemesterId = defaultSem.id;
        semesterStartDate = new Date(semStart);
        semesterEndDate = new Date(semEnd);
        recordsCreated++;
      }
    }

    // 5. Handle Courses
    const courseMap = new Map<string, string>(); // subjectCode -> database course.id
    const mutedColors = ["#C4614A", "#6B7F52", "#B8872A", "#4A5568", "#5A5A5A"];

    // Fetch existing courses for mapping
    const existingCourses = await db.select().from(coursesTable).where(eq(coursesTable.semesterId, activeSemesterId));
    for (const c of existingCourses) {
      courseMap.set(c.subjectCode.toUpperCase(), c.id);
    }

    if (parsed.courses && Array.isArray(parsed.courses)) {
      for (let i = 0; i < parsed.courses.length; i++) {
        const c = parsed.courses[i];
        if (!c.subjectCode || !c.name) continue;
        const codeUpper = c.subjectCode.toUpperCase();

        if (courseMap.has(codeUpper)) {
          // Update course
          const cId = courseMap.get(codeUpper)!;
          await db.update(coursesTable).set({
            name: c.name,
            shortName: c.shortName || codeUpper,
            creditWeight: c.creditWeight ?? 3,
            ...(c.facultyName && { facultyName: c.facultyName }),
            ...(c.roomNumber && { roomNumber: c.roomNumber }),
          }).where(eq(coursesTable.id, cId));
        } else {
          // Insert course
          const [newCourse] = await db.insert(coursesTable).values({
            subjectCode: c.subjectCode,
            name: c.name,
            shortName: c.shortName || codeUpper,
            creditWeight: c.creditWeight ?? 3,
            minAttendancePct: c.minAttendancePct ?? 75,
            facultyName: c.facultyName || null,
            roomNumber: c.roomNumber || null,
            color: mutedColors[i % mutedColors.length],
            semesterId: activeSemesterId,
          }).returning();
          courseMap.set(codeUpper, newCourse.id);
          recordsCreated++;
        }
      }
    }

    // 6. Handle Schedules (Timetable Events)
    if (parsed.schedules && Array.isArray(parsed.schedules)) {
      // First clean up old recurring schedules for all courses present in the new schedule
      const courseIdsToClean = new Set<string>();
      for (const sched of parsed.schedules) {
        if (sched.subjectCode) {
          const cId = courseMap.get(sched.subjectCode.toUpperCase());
          if (cId) courseIdsToClean.add(cId);
        }
      }

      for (const courseId of courseIdsToClean) {
        const attendedEvents = await db.select({ eventId: attendanceTable.eventId })
          .from(attendanceTable)
          .where(eq(attendanceTable.courseId, courseId));
        const excludeIds = attendedEvents.map(a => a.eventId).filter(Boolean);

        if (excludeIds.length > 0) {
          await db.delete(eventsTable).where(
            and(
              eq(eventsTable.courseId, courseId),
              eq(eventsTable.isRecurring, true),
              notInArray(eventsTable.id, excludeIds)
            )
          );
        } else {
          await db.delete(eventsTable).where(
            and(
              eq(eventsTable.courseId, courseId),
              eq(eventsTable.isRecurring, true)
            )
          );
        }
      }

      // Now insert the new recurring weekly occurrences
      for (const sched of parsed.schedules) {
        if (sched.dayOfWeek === undefined || !sched.title) continue;

        // Try to associate with a course
        let courseId: string | null = null;
        if (sched.subjectCode) {
          courseId = courseMap.get(sched.subjectCode.toUpperCase()) || null;
        }

        // Generate weekly occurrences throughout the semester
        const toInsert = [];
        const cursor = new Date(semesterStartDate);
        const recurringGroupId = crypto.randomUUID();

        // Bring cursor to first occurrence of this day of week
        let limit = 0;
        while (cursor.getDay() !== sched.dayOfWeek && limit < 7) {
          cursor.setDate(cursor.getDate() + 1);
          limit++;
        }

        while (cursor <= semesterEndDate) {
          if (cursor.getDay() === sched.dayOfWeek) {
            const start = new Date(cursor);
            start.setHours(sched.startHour ?? 9, sched.startMinute ?? 0, 0, 0);
            const end = new Date(cursor);
            end.setHours(sched.endHour ?? 10, sched.endMinute ?? 0, 0, 0);

            toInsert.push({
              title: sched.title,
              type: sched.type || "LECTURE",
              startTime: start,
              endTime: end,
              location: sched.roomNumber || sched.location || null,
              isRecurring: true,
              recurringGroupId,
              courseId,
            });
          }
          cursor.setDate(cursor.getDate() + 7);
        }

        if (toInsert.length > 0) {
          await db.insert(eventsTable).values(toInsert);
          recordsCreated += toInsert.length;
        }
      }
    }

    // 7. Handle Calendar Events (Holidays, Exams, etc.)
    if (parsed.calendarEvents && Array.isArray(parsed.calendarEvents)) {
      for (const ev of parsed.calendarEvents) {
        if (!ev.title || !ev.startDate) continue;
        const start = new Date(ev.startDate + "T00:00:00.000Z");
        const end = new Date((ev.endDate || ev.startDate) + "T23:59:59.999Z");

        await db.insert(eventsTable).values({
          title: ev.title,
          type: ev.type || "BREAK",
          startTime: start,
          endTime: end,
          location: ev.location || null,
          isRecurring: false,
        });
        recordsCreated++;
      }
    }

    // 8. Handle Tasks
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      for (const task of parsed.tasks) {
        if (!task.title) continue;

        let courseId: string | null = null;
        if (task.subjectCode) {
          courseId = courseMap.get(task.subjectCode.toUpperCase()) || null;
        }

        await db.insert(tasksTable).values({
          title: task.title,
          description: task.description || null,
          category: task.category || "ACADEMICS",
          priority: task.priority || "MEDIUM",
          dueDate: task.dueDate || null,
          linkedCourseId: courseId,
        });
        recordsCreated++;
      }
    }

    // 9. Handle Mutations (class cancellations, rescheduling, attendance updates, task completion, holidays)
    if (parsed.mutation && parsed.mutation.action) {
      const mut = parsed.mutation;
      const defaultDate = new Date().toISOString().split("T")[0];
      const targetDate = mut.date || defaultDate;

      if (mut.action === "TASK_COMPLETE" && mut.taskTitle) {
        // Find incomplete tasks
        const allTasks = await db.select().from(tasksTable);
        const searchTitle = mut.taskTitle.toLowerCase();
        const matchingTasks = allTasks.filter(t => 
          t.status !== "DONE" && 
          (t.title.toLowerCase().includes(searchTitle) || searchTitle.includes(t.title.toLowerCase()))
        );

        for (const t of matchingTasks) {
          await db.update(tasksTable).set({ status: "DONE" }).where(eq(tasksTable.id, t.id));
          recordsCreated++;
        }
      } else if (mut.action === "CREATE_HOLIDAY" && targetDate) {
        const start = new Date(targetDate + "T00:00:00.000Z");
        const end = new Date(targetDate + "T23:59:59.999Z");
        const title = mut.holidayTitle || "Holiday / Day Off";

        // Insert holiday break event
        await db.insert(eventsTable).values({
          title,
          type: "BREAK",
          startTime: start,
          endTime: end,
          isRecurring: false,
        });
        recordsCreated++;

        // Cancel any classes on this day
        const dayEvents = await db.select().from(eventsTable).where(
          and(
            gte(eventsTable.startTime, start),
            lte(eventsTable.startTime, end),
            sql`${eventsTable.courseId} is not null`
          )
        );

        for (const dev of dayEvents) {
          await db.update(eventsTable).set({
            isCancelled: true,
            cancellationNote: `Holiday: ${title}`
          }).where(eq(eventsTable.id, dev.id));

          // Record attendance as CANCELLED
          const [existingAtt] = await db.select().from(attendanceTable).where(
            and(eq(attendanceTable.eventId, dev.id), eq(attendanceTable.courseId, dev.courseId!))
          ).limit(1);

          if (existingAtt) {
            await db.update(attendanceTable).set({ status: "CANCELLED" }).where(eq(attendanceTable.id, existingAtt.id));
          } else {
            await db.insert(attendanceTable).values({
              status: "CANCELLED",
              courseId: dev.courseId!,
              eventId: dev.id,
              note: `Cancelled due to Holiday: ${title}`
            });
          }
          recordsCreated++;
        }
      } else if (mut.subjectCode) {
        // Find course
        const [course] = await db.select().from(coursesTable).where(eq(coursesTable.subjectCode, mut.subjectCode.toUpperCase())).limit(1);
        
        if (course) {
          const targetDayStart = new Date(targetDate + "T00:00:00.000Z");
          const targetDayEnd = new Date(targetDate + "T23:59:59.999Z");
          
          const [event] = await db.select().from(eventsTable).where(
            and(
              eq(eventsTable.courseId, course.id),
              gte(eventsTable.startTime, targetDayStart),
              lte(eventsTable.startTime, targetDayEnd)
            )
          ).limit(1);

          if (mut.action === "CANCEL") {
            if (event) {
              await db.update(eventsTable).set({
                isCancelled: true,
                cancellationNote: mut.cancellationNote || "Class cancelled via message"
              }).where(eq(eventsTable.id, event.id));

              // Record attendance as CANCELLED
              const [existingAtt] = await db.select().from(attendanceTable).where(
                and(eq(attendanceTable.eventId, event.id), eq(attendanceTable.courseId, course.id))
              ).limit(1);

              if (existingAtt) {
                await db.update(attendanceTable).set({ status: "CANCELLED" }).where(eq(attendanceTable.id, existingAtt.id));
              } else {
                await db.insert(attendanceTable).values({
                  status: "CANCELLED",
                  courseId: course.id,
                  eventId: event.id,
                  note: mut.cancellationNote || "Cancelled via AI Sync"
                });
              }
              recordsCreated++;
            } else {
              // Create single instance event for cancellation if it didn't exist
              const start = new Date(targetDate + "T09:00:00.000Z");
              const end = new Date(targetDate + "T10:00:00.000Z");
              const [newEvent] = await db.insert(eventsTable).values({
                title: `${course.subjectCode} Class (Cancelled)`,
                type: "LECTURE",
                startTime: start,
                endTime: end,
                isCancelled: true,
                cancellationNote: mut.cancellationNote || "Cancelled",
                courseId: course.id
              }).returning();

              await db.insert(attendanceTable).values({
                status: "CANCELLED",
                courseId: course.id,
                eventId: newEvent.id,
                note: mut.cancellationNote || "Cancelled via AI Sync"
              });
              recordsCreated++;
            }
          } else if (mut.action === "RESCHEDULE") {
            if (event && mut.newDate && mut.newStartTime) {
              const newStart = new Date(`${mut.newDate}T${mut.newStartTime}:00`);
              const newEnd = new Date(`${mut.newDate}T${mut.newEndTime || '11:00'}:00`);
              
              await db.update(eventsTable).set({
                startTime: newStart,
                endTime: newEnd,
                title: `${event.title} (Rescheduled)`
              }).where(eq(eventsTable.id, event.id));
              
              recordsCreated++;
            }
          } else if (mut.action === "ATTENDANCE" && mut.attendanceStatus) {
            if (event) {
              const [existingAtt] = await db.select().from(attendanceTable).where(
                and(eq(attendanceTable.eventId, event.id), eq(attendanceTable.courseId, course.id))
              ).limit(1);

              if (existingAtt) {
                await db.update(attendanceTable).set({ status: mut.attendanceStatus }).where(eq(attendanceTable.id, existingAtt.id));
              } else {
                await db.insert(attendanceTable).values({
                  status: mut.attendanceStatus,
                  courseId: course.id,
                  eventId: event.id
                });
              }
              recordsCreated++;
            } else {
              // Create single instance event for attendance if it didn't exist
              const start = new Date(targetDate + "T09:00:00.000Z");
              const end = new Date(targetDate + "T10:00:00.000Z");
              const [newEvent] = await db.insert(eventsTable).values({
                title: `${course.subjectCode} Class`,
                type: "LECTURE",
                startTime: start,
                endTime: end,
                courseId: course.id,
                isRecurring: false
              }).returning();

              await db.insert(attendanceTable).values({
                status: mut.attendanceStatus,
                courseId: course.id,
                eventId: newEvent.id
              });
              recordsCreated++;
            }
          }
        }
      }
    }

    res.json({
      success: true,
      action: "UNIVERSAL_SCAN_COMPLETE",
      confidence: 0.9,
      recordsCreated,
      preview: parsed,
    });
  } catch (err: any) {
    req.log.error({ err }, "Ingestion database insertion failed");
    res.status(500).json({
      success: false,
      action: "ERROR",
      recordsCreated: 0,
      error: `Failed to insert parsed records into database: ${err.message || err}`,
    });
  }
});

export default router;
