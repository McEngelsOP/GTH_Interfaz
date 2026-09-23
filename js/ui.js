export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

// Only use for HTML text/quoted attribute contexts, never for inline JavaScript.
export function escapeRecord(value) {
  if (typeof value === 'string') return escapeHTML(value);
  if (Array.isArray(value)) return value.map(escapeRecord);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, escapeRecord(v)]));
  return value;
}

export function notify(message, isError = false) {
  if (typeof document === 'undefined') return;
  let box = document.getElementById('appNotice');
  if (!box) { box = document.createElement('div'); box.id = 'appNotice'; box.className = 'app-notice'; document.body.append(box); }
  box.setAttribute('role', isError ? 'alert' : 'status');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { box.hidden = true; }, isError ? 9000 : 5000);
}

const dialogs = [];
export function openDialog(overlay, dialog) {
  if (dialogs.some(d => d.overlay === overlay)) return;
  const previous = document.activeElement;
  const suppressed = [];
  for (const sibling of document.body.children) {
    if (sibling === overlay || sibling.contains(overlay)) continue;
    suppressed.push([sibling, sibling.inert]); sibling.inert = true;
  }
  const focusables = () => [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
  const trap = e => {
    if (dialogs.at(-1)?.overlay !== overlay || e.key !== 'Tab') return;
    const list = focusables(), first = list[0], last = list.at(-1);
    if (!first) { e.preventDefault(); dialog.focus(); return; }
    if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  };
  dialogs.push({ overlay, previous, suppressed, trap });
  document.addEventListener('keydown', trap);
  document.body.style.overflow = 'hidden';
  dialog.tabIndex = -1;
  (focusables()[0] || dialog).focus();
}

export function closeDialog(overlay) {
  const index = dialogs.findIndex(d => d.overlay === overlay);
  if (index < 0) return;
  const [entry] = dialogs.splice(index,1);
  document.removeEventListener('keydown',entry.trap);
  entry.suppressed.forEach(([el,previous]) => { el.inert = previous; });
  document.body.style.overflow = dialogs.length ? 'hidden' : '';
  if (entry.previous?.isConnected) entry.previous.focus({ preventScroll: true });
}

export function exportCSV(filename, rows) {
  const cell = value => { const raw = String(value ?? ''); return '"' + (/^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw).replace(/"/g, '""') + '"'; };
  const url = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
