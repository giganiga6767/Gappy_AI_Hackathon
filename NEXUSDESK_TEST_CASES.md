# 🧪 NexusDesk: 85 Workflow, Integrity, and Chaos Test Scenarios

This document outlines the detailed system behaviors, edge cases, and recovery strategies for the 85 chaos and workflow tests (W1–W85).

---

## 📥 I. Ingestion & Data Pipeline (W1–W10)

### W1. Can I ingest the same transcript twice? What happens?
* **Behavior:** Yes, ingestion is idempotent. 
* **Details:** The backend checks the database for existing course subject codes and task titles. Instead of creating duplicates, it updates existing courses and skips creating duplicate tasks, preventing database pollution.

### W2. Upload empty transcript → expected behavior?
* **Behavior:** Immediate graceful rejection.
* **Details:** The `/api/ingest` endpoint checks if both `rawText` and `image` are missing. If so, it responds with an HTTP 400 error: `{"error": "rawText or image required"}`.

### W3. Upload transcript with random garbage.
* **Behavior:** Graceful schema parsing failure.
* **Details:** The text is sent to the LLM. If the LLM output does not match the structured JSON schema (validated by Zod), the system catches the exception and returns a payload indicating parsing failure without crashing the Node process.

### W4. Upload 100k-character transcript.
* **Behavior:** Automated text chunking.
* **Details:** The python note compiler (`gemini_note_taker.py`) automatically checks content length. If the text exceeds 12,000 characters, it splits the text at paragraph boundaries and processes each chunk sequentially to avoid token limit errors.

### W5. Upload transcript with emojis + multilingual text.
* **Behavior:** Full Unicode support.
* **Details:** The PostgreSQL database is configured with UTF-8 encoding. Emojis and multilingual scripts (e.g. Hindi, Kannada, Tamil) are saved, fetched, and displayed correctly.

### W6. Upload transcript with only numbers.
* **Behavior:** Empty extraction response.
* **Details:** The LLM evaluates the numerical sequence. Since no courses, timetables, or tasks can be semanticized, it returns empty schema arrays (e.g. `timetable: [], tasks: []`).

### W7. Upload malformed JSON.
* **Behavior:** Handled by Express JSON parser.
* **Details:** The body parser middleware intercepts invalid JSON payloads and responds with a standard HTTP 400 Bad Request, protecting the downstream API handlers.

### W8. Upload unsupported file type.
* **Behavior:** Frontend drag-and-drop block.
* **Details:** The dropzone filters accepted MIME types (PDF, text, PNG, JPG). If bypass is attempted, the backend rejects it at the validation step.

### W9. Kill ingestion halfway → refresh page.
* **Behavior:** Transaction isolation rollback.
* **Details:** Database inserts are wrapped in Drizzle/PostgreSQL transactions. If the request is aborted, the database rolls back, leaving no half-created courses or tasks.

### W10. Open 3 ingestion tabs simultaneously.
* **Behavior:** Concurrent request execution.
* **Details:** Express handles connections concurrently. PostgreSQL handles concurrent insertions using connection pools, preventing locks.

---

## 🤖 II. Agent Validation (W11–W20)

### W11. Can TriageAgent explain WHY it chose academic vs professional?
* **Behavior:** Yes, reasoning quote extraction.
* **Details:** The `TriageAgent` schema contains a `reasoningQuote` field. It must cite the specific text segment that triggered its routing decision.

### W12. Feed ambiguous transcript → routing accuracy?
* **Behavior:** Conservative default routing.
* **Details:** When context is split 50/50, the prompt directs the LLM to prioritize the "Academic" schema to prevent missing tasks.

### W13. Force agent timeout.
* **Behavior:** Graceful API abort.
* **Details:** Backend fetch requests use an AbortSignal timeout of 60 seconds. If triggered, it logs a timeout warning, runs the Gemini fallback route, or returns a 500 error.

### W14. Force invalid agent output.
* **Behavior:** Zod recovery fallback.
* **Details:** If the agent returns invalid formatting, the backend catch block redirects the query to Google Gemini or local Ollama using clean default parameters.

### W15. Disconnect agent service during execution.
* **Behavior:** Resilient endpoint fallback.
* **Details:** If the Lemma server or Ollama instance shuts down mid-run, the Node handler catches the connection failure and redirects the prompt to Google Gemini.

### W16. Can agent create duplicate records?
* **Behavior:** Duplicate check validation.
* **Details:** The triage pipeline checks for existing titles and times in the database before executing Drizzle insert queries.

### W17. Trigger blocked task → verify event bus.
* **Behavior:** Automatic AI resolution injection.
* **Details:** Setting a Sprint Task to `"Blocked"` fires an event on the Node event bus. The `EnterpriseSolutionArchitect` agent generates 2-4 solutions (with code snippets) and appends them to the task.

### W18. Trigger 20 blocked tasks simultaneously.
* **Behavior:** Event queue throttle.
* **Details:** The event bus registers listeners that throttle and execute agent calls in a controlled queue, protecting the system from API rate limits.

### W19. Does agent retry safely?
* **Behavior:** Exponential backoff.
* **Details:** Rate-limit responses (HTTP 429) or gateway issues (HTTP 503) trigger an automated retry loop with incremental delay.

### W20. Does same input always create same deterministic output?
* **Behavior:** Highly consistent output.
* **Details:** We set LLM generation temperatures to 0.1, minimizing stochastic variability. Database structures are deterministic.

---

## 🗄️ III. Database Integrity (W21–W30)

### W21. Delete semester → does UI explode?
* **Behavior:** Clean UI state transition.
* **Details:** Deleting a semester triggers cascading deletes for associated courses, timetables, and tasks. The UI displays an empty state.

### W22. Delete course → attendance survives?
* **Behavior:** Dynamic recalculated averages.
* **Details:** Removing a course deletes its associated lectures and logged attendances. Overall attendance metrics automatically recalculate.

### W23. Delete task while dashboard open.
* **Behavior:** Live state synchronizations.
* **Details:** The frontend mutates states on response. The deleted task card vanishes without page refresh.

### W24. Refresh during DB write.
* **Behavior:** Transaction integrity.
* **Details:** The write operation is finalized or rolled back by PostgreSQL. The client gets updated state upon page load.

### W25. Two users modify same task.
* **Behavior:** Last-write-wins policy.
* **Details:** Standard SQL updates execute. The database holds the state of the last modification.

### W26. Insert duplicate course IDs.
* **Behavior:** Database primary key block.
* **Details:** Prevented by PostgreSQL unique constraints. Drizzle ORM returns a constraint violation error.

### W27. Seed → wipe → reseed.
* **Behavior:** Safe database reset.
* **Details:** Wiping truncates database tables. Reseeding successfully restores fresh courses, timetables, and tasks.

### W28. Break foreign keys.
* **Behavior:** Preventive constraints.
* **Details:** The Drizzle database schema strictly enforces foreign key relations. Deleting parent nodes without cascades is blocked.

### W29. Disconnect DB.
* **Behavior:** Offline read-only mode.
* **Details:** Server endpoints return database connection errors. The client displays cached local settings and logs a warning.

### W30. Verify rollback on partial failure.
* **Behavior:** Atomic operations.
* **Details:** Multi-row inserts are grouped inside transactions. If row 10 of 12 fails, rows 1-9 are rolled back.

---

## 🎙️ IV. Recording Pipeline (W31–W40)

### W31. Record 2 seconds.
* **Behavior:** Short audio file generation.
* **Details:** Creates a small WebM file. Processed and transcribed cleanly.

### W32. Record 2 hours.
* **Behavior:** Segmented buffering.
* **Details:** Browser Web Audio API buffers recording blobs. Note takers chunk the large transcript to avoid memory overflow.

### W33. Mute mic.
* **Behavior:** Empty voice processing.
* **Details:** The browser records silence. Web Speech API returns empty text, and notes fallback to default templates.

### W34. Mic denied permission.
* **Behavior:** Graceful UI warning.
* **Details:** The browser catches the rejection, updates the button state to "Permission Blocked", and alerts the user.

### W35. System audio unavailable.
* **Behavior:** Microphone-only recording.
* **Details:** The mixer defaults to recording the user's microphone without system audio loopback.

### W36. Switch tabs during recording.
* **Behavior:** Continuous recording.
* **Details:** The Web Audio context and MediaRecorder run in the background, keeping the audio stream active.

### W37. Browser crashes mid-recording.
* **Behavior:** Current buffer loss.
* **Details:** The unsaved recording buffer is lost, but the database and previous local storage records remain safe.

### W38. Stop recording unexpectedly.
* **Behavior:** Immediate saving of partial buffer.
* **Details:** The media recorder closes the stream and uploads the partial audio buffer gathered so far.

### W39. Refresh during recording.
* **Behavior:** Safe connection reset.
* **Details:** Aborts the current recording session. The UI resets, leaving existing records untouched.

### W40. Record without internet.
* **Behavior:** Local Whisper + offline transcription.
* **Details:** Uses local browser speech recognition. The backend uses Whisper and Ollama to transcribe and generate notes 100% offline.

---

## 📅 V. Attendance Engine (W41–W50)

### W41. 100% attendance → skip calculator.
* **Behavior:** Calculates maximum allowed skips.
* **Details:** The skips-allowed calculator checks how many classes can be skipped before attendance drops to 75%.

### W42. 74.99% attendance.
* **Behavior:** Danger indicator.
* **Details:** Triggers the Danger indicator. The calculator states that 1 class must be attended consecutively to recover.

### W43. 0 classes attended.
* **Behavior:** Zero percent danger state.
* **Details:** Renders 0% attendance. Shows the total consecutive classes needed to reach 75%.

### W44. 500 classes attended.
* **Behavior:** Standard metric calculation.
* **Details:** Safely outputs standard attendance statistics.

### W45. Rapid toggle Attend/Miss.
* **Behavior:** Optimistic UI state updates.
* **Details:** Toggling updates the local state instantly while sending debounced API update calls to the server.

### W46. Delete old attendance.
* **Behavior:** Historical correction.
* **Details:** Recalculates course percentages using remaining historical values.

### W47. Timezone change.
* **Behavior:** Timezone normalization.
* **Details:** Time values are stored in UTC. The browser displays times relative to the client's local timezone.

### W48. Two lectures same slot.
* **Behavior:** Parallel rendering on timeline.
* **Details:** Both classes render side-by-side on the vertical hourly timetabletimeline.

### W49. Attendance >100%.
* **Behavior:** Mathematical cap.
* **Details:** Attendance is capped at 100% in calculation algorithms.

### W50. Course with no lectures.
* **Behavior:** Null-state display.
* **Details:** Displays a safe default message: "No lectures scheduled."

---

## 📊 VI. Dashboard (W51–W60)

### W51. Open dashboard with empty DB.
* **Behavior:** Empty states.
* **Details:** Dashboard displays placeholder cards, prompting users to upload a syllabus or schedule.

### W52. Load 1000 tasks.
* **Behavior:** Responsive layout list.
* **Details:** The board displays tasks using clean list containers without rendering lags.

### W53. Open on mobile.
* **Behavior:** Responsive Brutalist scaling.
* **Details:** The high-contrast grids wrap and scale for mobile screen sizes.

### W54. Spam refresh.
* **Behavior:** Safe database loading.
* **Details:** Standard browser refreshes load static files from cache, keeping database connections stable.

### W55. Open multiple tabs.
* **Behavior:** Synced UI tabs.
* **Details:** Local storage updates keep data synchronized across active browser instances.

### W56. Offline mode.
* **Behavior:** Connection status banner.
* **Details:** The UI displays a warning banner stating "Offline Mode - Using Local Storage".

### W57. Kill backend.
* **Behavior:** Database warning banner.
* **Details:** Displays database connection failure, falls back to local data storage cache.

### W58. Dark/light switching.
* **Behavior:** Instant CSS variable swap.
* **Details:** Swapping themes updates Tailwind colors instantly.

### W59. Slow network.
* **Behavior:** Loading skeletons.
* **Details:** Dashboard skeleton loaders prevent layout shifts while waiting for database responses.

### W60. Open after browser restart.
* **Behavior:** Session restoration.
* **Details:** Readies the dashboard immediately by loading database states and active local storage tokens.

---

## 💾 VII. Local-First Claims (W61–W70)

### W61. Delete localStorage.
* **Behavior:** Refresh settings.
* **Details:** Clear settings default back to initial system properties, reloading fresh data from the server.

### W62. Delete Desktop folder.
* **Behavior:** Folder auto-recreation.
* **Details:** The backend checks folder paths. If missing, it auto-creates `~/Desktop/notes/` and `~/Desktop/classrecordings/` on write.

### W63. Disk full.
* **Behavior:** Catch write errors.
* **Details:** The backend catches file writing errors, logs to console, and sends a warning to the client.

### W64. Desktop path inaccessible.
* **Behavior:** Temporary directory fallback.
* **Details:** The file writer falls back to writing files inside temporary operating system directories (e.g. `/tmp/`).

### W65. Move notes folder.
* **Behavior:** Folder recreation.
* **Details:** The backend writer creates a new notes folder at the default location on the desktop during the next write.

### W66. Restart machine.
* **Behavior:** Re-run launch scripts.
* **Details:** Starting the machine requires running the launcher script (`./launch.sh`) to start API services.

### W67. No Ollama installed.
* **Behavior:** Fallback to Google Gemini.
* **Details:** The system automatically executes fallback logic, routing requests to Google Gemini using the fallback API key.

### W68. Gemini unavailable.
* **Behavior:** Fallback to local Ollama.
* **Details:** Ingestion calls fall back to local Ollama models (e.g. `llama3`).

### W69. Run airplane mode.
* **Behavior:** 100% local operations.
* **Details:** Local Ollama models and local Whisper transcribe recordings and process notes offline.

### W70. Cold boot test.
* **Behavior:** Initialization checks.
* **Details:** Launcher scripts verify dependencies, start database check connections, and initialize engines.

---

## 🔥 VIII. Chaos Tests (W71–W80)

### W71. Open 20 tabs.
* **Behavior:** Normal operation.
* **Details:** Handled by React state isolation.

### W72. Click everything rapidly.
* **Behavior:** Debounced requests.
* **Details:** Event handlers and state bindings prevent duplicate requests.

### W73. Paste huge syllabus.
* **Behavior:** Text chunking.
* **Details:** Large inputs are split and processed sequentially.

### W74. Run ingestion + recording.
* **Behavior:** Concurrent task execution.
* **Details:** Handled concurrently by async runtime.

### W75. Trigger scheduler manually.
* **Behavior:** Academic copilot check.
* **Details:** Executes the daily study plan generation check.

### W76. Restart backend during operation.
* **Behavior:** Client-side reconnect attempts.
* **Details:** The frontend attempts automatic reconnects.

### W77. Force memory pressure.
* **Behavior:** Memory recovery.
* **Details:** The browser garbage-collects unused blobs.

### W78. Use unsupported browser.
* **Behavior:** Safe fallback layout.
* **Details:** Renders standard layouts, disabling Web Speech recognition if APIs are unavailable.

### W79. Disable JS partially.
* **Behavior:** Basic layout rendering.
* **Details:** Web components degrade gracefully.

### W80. Leave app idle 24 hours.
* **Behavior:** Persistent sessions.
* **Details:** Cron jobs continue executing background tasks.

---

## 🏆 IX. Final 5 tests (W81–W85)

### W81. Can a brand-new user succeed in under 3 min?
* **Yes.** Click guest login, load the demo session, and the entire app is fully populated.

### W82. Can I recover after breaking something?
* **Yes.** Re-run setup scripts, reset settings in settings modal, or clear browser cache.

### W83. Can I explain state transitions?
* **Yes.** Standard state mutations occur deterministically.

### W84. Can I trust generated output?
* **Yes.** All schemas are strictly validated.

### W85. Can I demonstrate value in one flow?
* **Yes.** Ingest a timetable to see your weekly schedule, tasks, and attendance guards configure automatically.
