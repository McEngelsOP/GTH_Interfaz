// Filtering happens before pagination so search always covers the full batch.
export function paginateCandidates(candidates, requestedPage = 1, requestedSize = 25) {
  const pageSize = [25, 50, 100].includes(Number(requestedSize)) ? Number(requestedSize) : 25;
  const total = candidates.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const numericPage = Number(requestedPage);
  const page = Math.max(1, Math.min(pageCount, Number.isFinite(numericPage) ? Math.floor(numericPage) : 1));
  const offset = (page - 1) * pageSize;
  return {
    items: candidates.slice(offset, offset + pageSize), page, pageSize, pageCount, total,
    first: total ? offset + 1 : 0, last: Math.min(offset + pageSize, total)
  };
}

// Return only rows near the visible scroll window. Header height is removed
// because it remains sticky inside the table's scroll region.
export function getVirtualWindow(total, scrollTop, viewportHeight, rowHeight, overscan = 6, headerHeight = 0) {
  const count = Math.max(0, Number(total) || 0);
  if (!count) return { start: 0, end: 0 };

  const row = Math.max(1, Number(rowHeight) || 1);
  const header = Math.max(0, Number(headerHeight) || 0);
  const top = Math.max(0, Number(scrollTop) || 0);
  const viewport = Math.max(row, Number(viewportHeight) || row * 10);
  const firstVisible = Math.min(count - 1, Math.floor(Math.max(0, top - header) / row));
  const visibleCount = Math.max(1, Math.ceil(Math.max(row, viewport - header) / row));
  const buffer = Math.max(0, Math.floor(Number(overscan) || 0));

  return {
    start: Math.max(0, firstVisible - buffer),
    end: Math.min(count, firstVisible + visibleCount + buffer)
  };
}
