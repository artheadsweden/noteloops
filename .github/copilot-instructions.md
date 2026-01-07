## Role & Project Context

You are a **Senior Full-Stack Architect** building the "Beta Reader Platform."
**Objective:** Create a multi-book, data-driven web application where readers can read synchronized text, listen to audio, and provide paragraph-level feedback.

---

## I. Data Contract: The "Input Package"

The application is **book-agnostic**. It consumes processed book data from the `/public/input/` directory. You must never hardcode book titles or paths.

### 1. Folder Hierarchy

Each book resides in its own folder under `/public/input/[book-id]/`.

```text
/public/input/[book-id]/
├── manifest.json            # The "Source of Truth" for the book structure
├── chapters/
│   ├── [chapter-id]/        # e.g., preface, chapter01, about-the-author
│   │   ├── text.html        # Clean HTML content with <p data-pid="p001"> tags
│   │   ├── text.json        # Array of { "pid": "p001", "text": "..." }
│   │   ├── align.json       # Array of { "pid": "p001", "begin": 0.0, "end": 5.2 }
│   │   └── audio.mp3        # ElevenLabs generated audio

```

### 2. Manifest Schema (`manifest.json`)

The agent must use this file to build navigation and locate assets:

* `book_id`: Unique slug (e.g., "the-enemy-within").
* `chapters`: Array of objects.
* `order_index`: Sort order (Preface is usually low/negative, Author is high).
* `chapter_id`: Unique string ID.
* `title`: Display name.
* `assets`: Object containing relative paths to `text_html`, `text_json`, `align_json`, and `audio_mp3`.



---

## II. Tech Stack & Architecture

* **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Shadcn/UI.
* **Database/Auth:** Supabase (Auth for readers, Postgres for feedback/progress).
* **Audio:** `Howler.js` or standard HTML5 Audio with a custom synchronization wrapper.
* **Component Standards:** Functional components, Server Components by default, Lucide-React icons.

---

## III. Core Logic Implementations

### 1. The "Whispersync" Bridge

* **Audio → Text (Highlighting):** * Monitor audio `currentTime`.
* Find the segment in `align.json` where `begin <= currentTime < end`.
* Identify the `pid`. Apply a `.bg-yellow-200` (or similar) highlight class to the corresponding element in the DOM.


* **Text → Audio (Seeking):** * Use an `IntersectionObserver` on the reader view.
* Identify the `pid` of the first visible paragraph at the top of the viewport.
* Update `last_read_pid` in the local state.
* When "Sync to Audio" is triggered, look up that `pid`'s `begin` time and seek the audio player.



### 2. Persistence & Progress

* On every "Pause" or "Chapter Change," update the `user_progress` table in Supabase:
* `last_chapter_id`, `last_pid`, `last_timestamp`.


* When a user returns to a book, offer a "Resume" button that jumps to these coordinates.

### 3. Feedback Engine

* **Inline:** Every `<p>` in `text.html` should be clickable/tappable.
* **UI:** Clicking a paragraph opens a side-drawer or popover to leave a comment.
* **Storage:** Save to `feedback` table: `book_id`, `chapter_id`, `pid`, `user_id`, `comment_text`.

---

## IV. Step-by-Step Implementation Roadmap

### Phase 1: Authentication & Global Hub

1. **Invite Wall:** A landing page requiring an "Invite Code."
2. **Auth:** User registration/login via Supabase.
3. **Dashboard:** Read all `manifest.json` files in `/public/input/`. Display a grid of available books.
* *Multi-title navigation:* Use breadcrumbs (e.g., `Library > Book Title > Chapter`).



### Phase 2: The Reader Engine (Local Development)

1. **Dynamic Routing:** `/book/[slug]/[chapter]`.
2. **Reader Component:** Fetch and inject `text.html`. Ensure `data-pid` attributes are preserved.
3. **Player Component:** Custom audio player with speed control and "Sync" buttons.
4. **Sync Logic:** Implement the mapping between `align.json` and the HTML DOM.

### Phase 3: Feedback & Extras

1. **Feedback Drawer:** Implement the UI for paragraph-level and general-chapter feedback.
2. **Extras Page:** Build a `/book/[slug]/extras` route.
* Render a vertical timeline of historical events from the book's metadata.
* Display "About the Author" using the same component logic.



### Phase 4: Admin Controls

1. **Admin Dashboard:** Protected route `/admin`.
2. **Reader Tracking:** A table showing all 20 users and their % completion per book.
3. **Invite Management:** Generate and revoke codes.

---

## V. Critical Constraints

1. **Book Agnostic:** No strings like "The Enemy Within" should exist in the logic. Use variables derived from manifests.
2. **Local-to-Cloud:** Write all data fetching in a separate `services/` layer.
* Initial: Read from `fs` (local file system/public folder).
* Final: Fetch from Supabase API/Storage.


3. **Responsive:** The reader must be comfortable on mobile (listening on the go) and desktop (typing long feedback).

**Your first task is to initialize the project structure and create the `manifest.json` parser to populate the /dashboard.**

