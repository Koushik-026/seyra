# Interface redesign and control verification

Implemented 2 November 2026, following the user's request for a less generic visual style and a review of failing controls.

## Visual direction

Reference sites reviewed: [Apple](https://www.apple.com/) for hierarchy/spacing and [Google Antigravity](https://antigravity.google/) for a spacious motion-led presentation. The result is an original exam-planning interface, not copied brand artwork or source code.

The local design combines deep navy, icy blue and violet; translucent glass panels; softly raised clay-style buttons; a floating navigation bar; a CSS 3D bench sculpture; and canvas particles/orbital lines. Scroll position changes the backdrop depth and bench perspective. No remote video, paid asset, external font or graphics library is needed.

The decorative scene is an illustration, not a preview claiming to represent the selected room. Actual assignments remain in the room-wise plan renderer. `motion.js` stops its animation loop when the page is hidden, caps canvas resolution, honors reduced-motion preference by default and offers a persistent Motion on/off control.

## Bugs corrected

1. **Edit -> create reused the prior ID.** Hidden input values change their default value, so `form.reset()` retained an edited ID. The shared editor now explicitly clears it before populating edit data. Student/session/room checks verified the actual `input.value` and creation preserved separate records.
2. **Empty session dropdown looked active.** The selector now explains that a session must be created, is disabled when there are no sessions, and shows session names/dates once available. Creating and switching multiple sittings was verified.
3. **Form errors appeared behind the modal.** Failed saves now display errors inside the open dialog as well as the notification.
4. **Unchecking membership did not remove it.** The student editor now updates appearing/not-appearing membership in both directions.
5. **Button state could become stale.** A central control-state function recomputes availability from current data and request state instead of restoring an old blanket snapshot.
6. **Unsaved session changes could disappear silently.** Switching sessions or refreshing asks before discarding pending roster/room choices.
7. **CSV download timing and feedback.** The temporary download link is attached before activation, its URL is released later, and completed imports no longer keep a misleading ready-to-import message.
8. **Unclear confirmation behavior.** Publish/discard/withdraw/demo/delete confirmations use an accessible local dialog with Cancel/explicit action labels. Cancelling publication was verified to leave the draft private.
9. **Long requests could leave the UI waiting indefinitely.** Coordinator requests have a timeout and recoverable message; the user is told to reload authoritative state before retrying an uncertain operation.

10. **Branch search spelling.** Searching the visible `AI-ML` label now matches canonical `AI_ML` records.

## Actual verification

- **28 focused CUA browser checks: PASS**, including dropdown states/switching; student form, errors and membership; edit-to-create reset behavior; unsaved-change cancellation; room selections/exclusions; generation; publication/cancel; CSV import/export; print snapshot; student lookup; stale-draft controls; discard/withdrawal; scroll motion and Motion off; no uncaught script errors.
- **13 isolated API checks: PASS**, covering synthetic student/room create/update/delete, invalid time/exclusion values, lookup errors and cross-site rejection.
- **3 Node asset/syntax/theme checks: PASS**. The pre-existing Java allocation/SQL implementation was unchanged by this UI revision.
- The downloaded CSV was reopened with a CSV parser: exactly two PUBLISHED rows, rolls `0001` and `0002`, correct room `UI-ROOM`.

Evidence is in `output/ui-redesign/`. Browser testing used port 3001 and `tmp/ui-redesign-verification`; the main port-3000 workspace remained unchanged. The viewport override did not change the browser's actual dimensions, so current mobile runtime behavior is not claimed as retested. Responsive breakpoints and reduced-motion CSS are included; previous baseline mobile evidence remains historical.

During verification an initial hidden-ID assertion used the browser adapter's `getAttribute('value')`, which returned null for an empty value. The check was repeated against the observable input `.value`, and all three resets passed. This was a test-accessor issue separate from the actual editor bug fixed above.

## Source files

`web/public/theme-base.css`, `theme-components.css`, `theme-responsive.css`, `motion.js`, `app.js`, `index.html`, `student.html` and the light print-page class. The Java backend, allocation rules and SQL publication protocol were preserved.
