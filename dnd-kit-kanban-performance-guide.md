# Optimizing dnd-kit Performance for a React Kanban

## 1. Prevent unnecessary re-renders

-   Wrap `Card` and `Column` with `React.memo`.
-   Memoize derived props with `useMemo`.
-   Avoid `filter`, `sort`, or other expensive operations during render.

## 2. Keep drag state isolated

-   Store only lightweight drag state such as `activeId`.
-   Derive the active card instead of storing the full object.

## 3. Use `DragOverlay`

Render the dragged item inside `DragOverlay` so the original card stays
in place and only the overlay moves.

## 4. Avoid updating the entire board on every drag event

-   Don't replace the whole board in `onDragOver`.
-   Update only the affected columns or lightweight drag metadata.
-   Commit the final board state in `onDragEnd` whenever possible.

## 5. Memoize columns

Structure the board so each column is an independent memoized component.
Ideally, only the source and destination columns should update during a
drag.

## 6. Use stable keys

Always use stable IDs:

``` tsx
key={card.id}
```

Avoid using array indexes as keys.

## 7. Memoize expensive computations

Move grouping, filtering, and sorting into `useMemo`.

## 8. Use CSS transforms

Prefer `transform: translate3d(...)` instead of changing `top`, `left`,
`width`, or `height`.

## 9. Enable GPU acceleration

``` css
.card {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

## 10. Keep sensors stable

Create sensors once so they are not recreated during renders.

## 11. Virtualize large columns

For hundreds or thousands of cards, use virtualization libraries such
as: - `react-window` - `@tanstack/react-virtual`

## 12. Avoid deep cloning

Update only the modified portions of the board instead of cloning the
entire structure.

## 13. Cache lookups

Use maps for frequent lookups:

``` tsx
const columnMap = useMemo(() => new Map(...), [board]);
```

## 14. Choose an efficient collision detection strategy

For Kanban boards, `closestCenter` or `pointerWithin` are generally good
choices depending on the desired UX.

## 15. Customize `animateLayoutChanges`

Use `animateLayoutChanges` to reduce unnecessary layout animations when
using `useSortable`.

## 16. Defer non-essential work

Move analytics, autosave, and server synchronization to `onDragEnd` or
debounce them so they do not compete with drag rendering.
