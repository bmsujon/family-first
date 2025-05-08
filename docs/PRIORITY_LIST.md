# FamilyMatters Project - Feature Priority List

This list outlines the prioritized order for implementing remaining features based on the current codebase status (as of late April 2025, after Event CRUD implementation) and project documentation (SRS, Technical Requirements, TASKLIST).

**I. Complete Core Family & Task Management Loop (High Priority - Finishing Phase 1/2 Tasks):**

1.  **Member Management Actions (SRS §3.2.1, FR1.2, FR1.5):**
    *   [ ] Implement "Add Member" functionality (UI Modal/Form + API integration).
    *   [ ] Implement "Remove Member" functionality (UI Confirmation + API integration).
    *   [ ] Implement "Change Member Role" functionality (UI Modal/Dropdown + API integration).
2.  **Task Management Actions (SRS §3.2.5):**
    *   [ ] Implement Task Update functionality (UI: Clicking task opens edit modal/form + API integration).
    *   [ ] Implement Task Delete functionality (UI: Delete button/icon + Confirmation + API integration).
    *   [ ] Implement Task Status update (UI: Checkbox or similar + API integration for FR5.4).
3.  **User Profile Management (SRS §3.2.1, FR1.3):**
    *   [ ] Implement a dedicated UI (Page or Modal) for viewing and editing the current user's profile (firstName, lastName, potentially profilePicture later).

**II. Enhance Core User Experience (Medium-High Priority - Phase 2/3 Tasks):**

4.  **Real-time Updates (SRS §3.1.4):**
    *   [ ] Implement specific WebSocket event handlers on the frontend to update lists (Tasks, Members) in real-time when changes occur.
5.  **Basic Notifications (SRS §3.2.7, FR7.1, FR7.4):**
    *   [ ] Implement backend logic to *generate* notifications for key events (e.g., task assigned, event upcoming, member added).
    *   [ ] Implement a basic in-app notification UI element (e.g., a dropdown list in the header) to display these stored notifications.

**III. Begin Next Major Feature Module (Medium Priority - Starting Phase 2/3 Tasks):**

6.  **Health Management Basics (SRS §3.2.2):**
    *   [ ] Implement/Verify `Health Profile` model (backend).
    *   [ ] Implement basic UI for viewing/editing core health profile details (FR2.1).
    *   [ ] Implement UI/backend for recording basic Vital Statistics (FR2.3).
    *   [ ] Implement UI/backend for tracking Appointments (FR2.4).
    *   *(Alternative: Could start with basic Financial Management)*

**IV. Implement Foundational Supporting Features (Medium Priority - Phase 3 Tasks):**

7.  **File Storage Setup (Tech Req §2.2.5):**
    *   [ ] Set up backend integration with a storage service (S3/local).
    *   [ ] Implement a basic file upload endpoint.
8.  **Background Job Setup (Tech Req §2.2.7):**
    *   [ ] Integrate a job queue (Bull/Redis) on the backend.
    *   [ ] Implement a basic recurring job (e.g., placeholder for task reminders or verify existing `generateRecurringTasks`).

**V. Future Modules & Advanced Features (Lower Priority / Future Phases):**

*   [ ] Complete Financial Management Module (SRS §3.2.3).
*   [ ] Complete Education Management Module (SRS §3.2.4).
*   [ ] Implement Reporting & Analytics Module (SRS §3.2.8).
*   [ ] Implement Advanced PWA / Offline Functionality (SRS §3.2.9).
*   [ ] Implement Advanced Security Features (OAuth, 2FA - FR1.6, NFR2.2).
*   [ ] Implement Localization (SRS §2.4, NFR7).
*   [ ] Complete Full Test Suite.
*   [ ] Perform Performance Optimization & UI Polish (Phase 4).

**Ongoing Tasks (Continuous):**

*   Write Unit/Integration/E2E Tests for new features.
*   Conduct Code Reviews & Refactoring.
*   Manage Dependencies & Security Patching.
*   Ensure UI/UX Consistency & Accessibility.
*   Update Documentation. 