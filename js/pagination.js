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
