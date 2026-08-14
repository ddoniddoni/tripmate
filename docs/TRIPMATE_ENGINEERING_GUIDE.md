# TripMate Engineering Guide

## 1. Product mission

TripMate is a collaborative travel itinerary editor designed to demonstrate strong frontend application engineering.

Primary journey:

1. Open a trip.
2. Search for a place.
3. Add it to a day.
4. Reorder it within the day or move it to another day.
5. See timeline and map update together.
6. Collaborate with another user.
7. Undo or redo the editing action.
8. Recover from loading, offline, permission, and provider failures.

The editor is the product. Prioritize interaction quality, explicit state ownership, real-time UX, accessibility, tests, and measured performance.

## 2. Scope

Core:

- `/trips` for a simple trip list.
- `/trips/[tripId]` for the editor.
- Day navigation and itinerary timeline.
- Place search and normalized place data.
- Add, edit, duplicate, and delete itinerary items.
- Drag and drop within and across days.
- Timeline-to-map and map-to-timeline synchronization.
- Route visualization after committed order changes.
- Shared document state, presence, and reconnect UI.
- Owner, editor, and viewer permissions.
- Undo/redo with one drag represented as one history entry.
- Loading, empty, error, offline, saving, synced, and unauthorized states.
- Desktop and mobile experiences.
- Tests for high-risk interactions.
- Real profiling evidence for portfolio case studies.

Defer until the editor is complete:

- Booking and payment.
- Flight or hotel search.
- Reviews and social feeds.
- Custom WebSocket/CRDT infrastructure.
- Native mobile apps.
- AI itinerary generation.
- Dark mode and decorative landing animations.
- Backend infrastructure unrelated to editor correctness.

## 3. Repository shape

```text
src/
  app/
    trips/
    api/
  features/
    itinerary-editor/
    itinerary-dnd/
    place-search/
    map-sync/
    collaboration/
    trip-sharing/
  entities/
    trip/
    itinerary/
    place/
    user/
  shared/
    api/
    config/
    hooks/
    lib/
    ui/
tests/
  e2e/
```

Responsibilities:

- `app`: routes, layouts, providers, route handlers, and composition.
- `features`: user capabilities and interaction logic.
- `entities`: domain types, rules, selectors, and reusable domain UI.
- `shared`: generic UI and infrastructure with no TripMate business behavior.

Keep public boundaries small and avoid broad barrel files that mix client and server modules.

## 4. State ownership

Each value has one source of truth.

### URL

Use URL state for refreshable or shareable navigation:

- `tripId` in the route.
- Selected day when deep linking is useful.
- Optional editor view mode only when intentionally shareable.

### TanStack Query

Use for ordinary remote resources:

- Trip list and metadata.
- Current user and membership.
- Place search.
- Route results.
- Invitations and permission resources.

Use stable query keys, cancellation where supported, useful stale times, and explicit error states. Never copy query data into Zustand.

### Liveblocks Storage

Use for durable state edited by collaborators:

- Day order.
- Item order.
- Attached places.
- Item time, duration, and note.
- Shared editor document fields.

Do not maintain a second local or query-cache copy of the collaborative document.

### Liveblocks Presence

Use for temporary collaborator state:

- Online users.
- Selected item.
- Optional cursor, active item, or editing indicator.

Presence is not durable storage.

### Local React state or Zustand

Use local React state first. Use Zustand only when local UI state crosses distant editor components:

- Panels and dialogs.
- Hovered item or marker.
- Local map center and zoom.
- Drag preview.
- Mobile sheet.
- Local selection that does not require presence.

Never synchronize another user's map viewport, hover, or panel state.

### React Hook Form

Use for form state. Validate with Zod and submit a domain mutation. Do not mirror every input into global state.

### Derived state

Compute labels, counts, ordered coordinates, and selected objects from canonical IDs and data. Do not persist redundant values.

## 5. Domain model

Use stable string IDs, preferably `crypto.randomUUID()`.

```ts
type Trip = {
  id: string;
  title: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  timeZone: string;  // IANA time zone
};

type TripDay = {
  id: string;
  tripId: string;
  date: string;      // YYYY-MM-DD in trip calendar
  itemIds: string[];
};

type PlaceSnapshot = {
  provider: "mapbox";
  providerPlaceId: string;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  category?: string;
};

type ItineraryItem = {
  id: string;
  dayId: string;
  place: PlaceSnapshot;
  startTime?: string;       // HH:mm in trip time zone
  durationMinutes?: number;
  note?: string;
  createdBy: string;
  updatedAt: string;
};
```

Invariants:

- Each item belongs to exactly one day.
- An item ID appears at most once across all day lists.
- Day item IDs reference existing items.
- Dates stay within the trip range.
- Duration is positive and bounded.
- Coordinates are finite and within valid ranges.
- Schedule times are interpreted in the trip time zone, not silently in the browser time zone.
- Shared mutations preserve invariants after cancellation and concurrent edits.

Expose typed operations:

```text
addItineraryItem
moveItineraryItem
updateItineraryItem
removeItineraryItem
duplicateItineraryItem
```

Keep these operations independent from visual components where practical.

## 6. Drag-and-drop interaction

This is a principal portfolio case study.

Required:

- Reorder inside one day.
- Move across days.
- Pointer, touch, and keyboard interaction.
- Clear overlay and valid drop targets.
- Empty-day, first-position, last-position, cancellation, and rapid-move handling.

Interaction model:

```text
drag start
  -> capture source and local preview
drag over
  -> update local preview only
drag end
  -> revalidate source/destination
  -> commit one domain mutation
  -> create one history entry
  -> invalidate/recalculate route once
drag cancel
  -> discard preview without document mutation
```

Do not write to shared state or call directions APIs on every pointer movement.

Concurrent-edit rule:

- The document may change while a local drag is active.
- Revalidate item existence, current source, destination, and permissions at commit time.
- Fail gracefully with an explanatory toast or accessible status message.

Accessibility:

- Provide keyboard instructions.
- Announce moves through an `aria-live` region.
- Restore focus after drop or cancellation.
- Test same-day, cross-day, empty-day, invalid destination, keyboard move, and cancellation.

## 7. Collaboration, history, and permissions

- Derive one documented room ID format from `tripId`.
- Authenticate rooms through a server endpoint.
- Check trip membership and role before granting access.
- Never expose the Liveblocks secret.
- Use `owner`, `editor`, and `viewer`.
- Viewer is read-only.
- Enforce permissions server-side; disabled buttons alone are insufficient.
- Group drag intermediate updates into one undo history step.
- Test undo/redo after add, move, edit, and delete.
- Verify remote updates and presence with two browser contexts.
- Display connecting, connected, reconnecting, offline, and failed states.
- Do not block read-only access unnecessarily during reconnection.
- Presence may indicate another editor, but do not build fake hard locks.
- Remote changes must not steal local focus, selection, scroll, or map viewport.

Recommended ownership:

```text
Liveblocks Storage:
  day order, item order, place snapshot, time, duration, note

Liveblocks Presence:
  online user, selected item, optional editing indicator

Zustand/local:
  panel, hover, map viewport, drag preview, mobile sheet

TanStack Query:
  trip list, membership, place search, directions
```

## 8. Map and search behavior

Hide Mapbox response shapes behind project-owned interfaces.

Place search:

- Debounce input.
- Cancel or ignore stale requests.
- Normalize results into `PlaceSnapshot`.
- Handle loading, empty, provider error, rate limit, and invalid coordinates.
- Keep external calls mockable.

Route:

- Query key includes travel mode and committed ordered coordinates.
- No route call during pointer movement.
- Reuse cached identical routes.
- Handle zero points, one point, missing points, no route, and provider failure.
- Route failure must not make itinerary editing unusable.

Bidirectional selection:

- Timeline item selection highlights and optionally focuses its marker.
- Marker selection selects and scrolls the item into view.
- Prevent feedback loops by using one selection source and idempotent effects.
- Fit bounds on first load or explicit action, not on every remote edit.
- Preserve the local user's viewport unless a deliberate focus action occurs.

## 9. UI and responsive design

Desktop:

```text
Header: title | sync state | collaborators | share
Body: day navigation | timeline editor | map
```

Mobile:

- Do not squeeze three desktop columns.
- Use a bottom sheet or a clear itinerary/map view switcher.
- Keep primary editing actions reachable and touch-friendly.
- Complete desktop behavior before advanced gestures.

Required product states:

- Loading skeleton.
- Empty trip and empty day.
- Search with no results.
- Provider failure with retry.
- Offline and reconnecting.
- Saving, saved, and save failed.
- Unauthorized and read-only viewer.
- Destructive-action confirmation where undo is insufficient.

Avoid design noise. Use restrained motion, clear hierarchy, and product-like density rather than a flashy portfolio landing page.

## 10. Accessibility

- Use semantic HTML and real buttons.
- Name icon-only controls.
- Maintain visible focus.
- Trap and restore focus in dialogs.
- Make core actions available without a mouse.
- Provide keyboard drag instructions and announcements.
- Do not communicate status by color alone.
- Respect reduced motion.
- Avoid auto-focus, auto-scroll, or viewport jumps caused by collaborator activity.
- Keep UI copy in one language unless localization is intentionally implemented.
- Test critical flows with keyboard-only navigation.

## 11. Performance

Measure first. Record only real results.

Use representative fixtures, such as 7-10 days and 100 items.

Profile for:

- All timeline cards rerendering on one selection.
- All markers rerendering on form input.
- Broad Zustand or Context subscriptions.
- Route requests during drag.
- Recreated map, query, or collaboration providers.
- Leaked listeners, observers, timers, or presence updates.
- Heavy client bundles caused by incorrect server/client boundaries.

Rules:

- Subscribe to the smallest necessary state slice.
- Keep drag preview isolated.
- Memoize only with evidence or a stable boundary.
- Add virtualization only when measured list cost justifies complexity.
- Lazy-load map/editor-only code when it improves navigation.
- Do not present performance targets as measured results.

A portfolio measurement must state:

- Fixture and data size.
- Device and browser.
- Reproduction procedure.
- Before and after metrics.
- Trade-offs and remaining limits.

## 12. Testing plan

Unit:

- Invariant validation.
- Same-day reorder.
- Cross-day move.
- Permissions.
- Route query-key construction.
- Time-zone utilities.
- Place normalization.

Integration/component:

- Search loading, success, empty, and error.
- Add, edit, delete, and failure recovery.
- Timeline/marker synchronization.
- Viewer read-only behavior.
- Keyboard DnD and accessible announcements.
- Reconnect/offline UI where deterministic.

Playwright:

- Open a trip.
- Search and add a place.
- Reorder within a day.
- Move across days.
- Undo and redo.
- Select item and marker in both directions.
- Confirm viewer cannot edit.
- Use two browser contexts for remote update and presence.
- Verify the primary mobile viewport.

Use MSW for network boundaries and avoid real paid calls in test suites.

## 13. Environment and persistence

Typical variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
LIVEBLOCKS_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
```

- Keep an accurate `.env.example`.
- Validate variables at startup.
- Only safe browser values use `NEXT_PUBLIC_`.
- Keep secret and service-role keys server-only.
- Restrict provider tokens by origin and least privilege where supported.
- Use synthetic demo data.
- Do not log sensitive trip, invitation, or credential data.

When Supabase is introduced, recommended persistent resources are:

```text
profiles
trips
trip_members
trip_invitations (only when sharing is implemented)
```

The collaborative itinerary document remains in Liveblocks unless an explicit architecture change is approved.

## 14. Delivery order

Deliver one reviewable vertical slice at a time:

1. Foundation, npm scripts, environment validation, and static editor shell.
2. Typed model and deterministic mock data.
3. Single-user add, edit, delete, and same-day reorder.
4. Cross-day drag with invariant tests.
5. Place-search adapter and timeline/map selection.
6. Route calculation after committed edits.
7. Authentication, membership, and secure room auth.
8. Shared storage, presence, reconnect UI, and permissions.
9. Undo/redo transaction grouping.
10. Keyboard accessibility and mobile editor.
11. E2E tests, profiling, optimization, and case-study evidence.

Do not attempt the entire application in one task. Each task should define one focused outcome and its verification.
