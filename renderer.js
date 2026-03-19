'use strict';

let data = { version: 1, entries: [] };

/* ── Utilities ────────────────────────────────────────────────── */

// Populate a notes-view element: plain text with URLs as clickable links,
// followed by a timestamp footer when notes were last edited.
const URL_RE = /https?:\/\/[^\s<>"']+/g;

function populateNotesView(el, entry) {
  el.innerHTML = '';
  const text = entry.notes || '';

  // Notes content with link detection
  if (text.trim()) {
    const content = document.createElement('div');
    content.className = 'notes-content';
    let last = 0;
    let match;
    URL_RE.lastIndex = 0;
    while ((match = URL_RE.exec(text)) !== null) {
      if (match.index > last) {
        content.appendChild(document.createTextNode(text.slice(last, match.index)));
      }
      const a = document.createElement('a');
      a.className = 'notes-link';
      a.textContent = match[0];
      a.href = '#';
      const url = match[0];
      a.addEventListener('click', ev => { ev.preventDefault(); window.api.openExternal(url); });
      content.appendChild(a);
      last = match.index + match[0].length;
    }
    if (last < text.length) {
      content.appendChild(document.createTextNode(text.slice(last)));
    }
    el.appendChild(content);
  }

  // Timestamp footer
  if (entry.notesEditedAt) {
    const sep = document.createElement('div');
    sep.className = 'notes-sep';
    const ts = document.createElement('div');
    ts.className = 'notes-timestamp';
    ts.textContent = 'Edited ' + fmtDateTime(entry.notesEditedAt);
    el.appendChild(sep);
    el.appendChild(ts);
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}


/* ── Persistence ──────────────────────────────────────────────── */

async function load() {
  data = await window.api.getData();
  if (!Array.isArray(data.entries)) data.entries = [];
  // Backfill notesEditedAt for entries that have notes but predate this field
  let dirty = false;
  data.entries.forEach(e => {
    if (e.notes && e.notes.trim() && !e.notesEditedAt) {
      e.notesEditedAt = new Date().toISOString();
      dirty = true;
    }
  });
  if (dirty) save();
  render();
}

function save() {
  window.api.saveData(data);
}

/* ── Mutations ────────────────────────────────────────────────── */

function addEntry() {
  data.entries.push({
    id:            uid(),
    leftLabel:     'Me',
    rightLabel:    '',
    court:         'right',
    priority:      null,
    changedAt:     new Date().toISOString(),
    notes:         '',
    notesEditedAt: null,
  });
  save();
  render();
  const inputs = document.querySelectorAll('.right-inp');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeEntry(id) {
  data.entries = data.entries.filter(e => e.id !== id);
  save();
  render();
}

function flipCourt(id) {
  const entry = data.entries.find(e => e.id === id);
  if (!entry) return;
  entry.court     = entry.court === 'left' ? 'right' : 'left';
  entry.changedAt = new Date().toISOString();
  save();
  // Update toggle pill without re-rendering
  const btn = document.querySelector(`.toggle[data-id="${id}"]`);
  if (btn) btn.classList.toggle('right', entry.court === 'right');
  // Update card accent border
  const card = btn?.closest('.entry');
  if (card) card.dataset.court = entry.court;
  // Dim the inactive label
  updateLabelDim(id, entry.court);
}

function setLabel(id, field, val) {
  const entry = data.entries.find(e => e.id === id);
  if (!entry) return;
  entry[field] = val;
  save();
}

function setNotes(id, val) {
  const entry = data.entries.find(e => e.id === id);
  if (!entry) return;
  entry.notes = val;
  if (val.trim()) entry.notesEditedAt = new Date().toISOString();
  save();
  const btn = document.querySelector(`.btn-notes[data-id="${id}"]`);
  if (btn) btn.classList.toggle('has-notes', val.trim().length > 0);
  const view = document.getElementById(`nv-${id}`);
  if (view) populateNotesView(view, entry);
}

function setPriority(id, val) {
  const entry = data.entries.find(e => e.id === id);
  if (!entry) return;
  entry.priority = val;
  save();
  render();
}

// Dim the label input of whoever does NOT currently have the ball
function updateLabelDim(id, court) {
  const leftInp  = document.querySelector(`.left-inp[data-id="${id}"]`);
  const rightInp = document.querySelector(`.right-inp[data-id="${id}"]`);
  if (leftInp)  leftInp.classList.toggle('inactive', court === 'right');
  if (rightInp) rightInp.classList.toggle('inactive', court === 'left');
}


/* ── Rendering ────────────────────────────────────────────────── */

function render() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  if (!data.entries.length) {
    list.innerHTML = '<div class="empty">No entries yet.<br/>Click "+ Add Entry" to get started.</div>';
    return;
  }

  const ORDER = { red: 0, yellow: 1, green: 2 };
  const sorted = [...data.entries].sort((a, b) =>
    (ORDER[a.priority] ?? 3) - (ORDER[b.priority] ?? 3)
  );
  sorted.forEach(e => list.appendChild(buildEntry(e)));
}

function buildEntry(e) {
  const card = document.createElement('div');
  card.className = 'entry';
  card.dataset.court    = e.court;
  card.dataset.priority = e.priority || '';

  /* ── Main row ─────────────────────────────────────────────── */
  const row = document.createElement('div');
  row.className = 'entry-row';

  const leftInp = document.createElement('input');
  leftInp.type = 'text';
  leftInp.className = `lbl-inp left-inp${e.court === 'right' ? ' inactive' : ''}`;
  leftInp.value = e.leftLabel || '';
  leftInp.placeholder = 'Me';
  leftInp.dataset.id = e.id;

  const toggle = document.createElement('button');
  toggle.className = `toggle${e.court === 'right' ? ' right' : ''}`;
  toggle.dataset.id = e.id;
  toggle.title = 'Click to flip court';
  toggle.innerHTML = '<span class="thumb"></span>';

  const rightInp = document.createElement('input');
  rightInp.type = 'text';
  rightInp.className = `lbl-inp right-inp${e.court === 'left' ? ' inactive' : ''}`;
  rightInp.value = e.rightLabel || '';
  rightInp.placeholder = 'Contact name';
  rightInp.dataset.id = e.id;

  const hasNotes = !!(e.notes && e.notes.trim().length);

  const notesBtn = document.createElement('button');
  notesBtn.className = `btn-notes${hasNotes ? ' has-notes' : ''}`;
  notesBtn.dataset.id = e.id;
  notesBtn.title = 'Edit notes';
  notesBtn.textContent = '✎';

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-del';
  delBtn.dataset.id = e.id;
  delBtn.title = 'Delete entry';
  delBtn.textContent = '×';

  row.append(leftInp, toggle, rightInp, notesBtn, delBtn);

  /* ── Notes area ───────────────────────────────────────────── */
  const wrap  = document.createElement('div');
  wrap.className = 'notes-wrap';
  wrap.id = `nw-${e.id}`;

  const inner = document.createElement('div');
  inner.className = 'notes-inner';

  // Read-only view — shown on hover
  const view = document.createElement('div');
  view.className = 'notes-view';
  view.id = `nv-${e.id}`;
  populateNotesView(view, e);

  // Editable textarea — shown only when ✎ is clicked
  const ta = document.createElement('textarea');
  ta.className = 'notes-ta';
  ta.placeholder = 'Notes for this entry…';
  ta.value = e.notes || '';

  // Priority row inside the editing area
  const editPrioRow = document.createElement('div');
  editPrioRow.className = 'notes-priority-row notes-edit-prio';
  [
    { val: 'red',    title: 'Urgent' },
    { val: 'yellow', title: 'Medium' },
    { val: 'green',  title: 'Low'    },
  ].forEach(p => {
    const btn = document.createElement('button');
    btn.className = `notes-priority-btn prio-${p.val}${e.priority === p.val ? ' active' : ''}`;
    btn.title = p.title;
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      const entry = data.entries.find(x => x.id === e.id);
      if (!entry) return;
      setNotes(e.id, ta.value);   // flush textarea before re-render
      setPriority(e.id, entry.priority === p.val ? null : p.val);
    });
    editPrioRow.appendChild(btn);
  });

  inner.append(view, ta, editPrioRow);
  wrap.appendChild(inner);
  card.append(row, wrap);

  /* ── Events ───────────────────────────────────────────────── */
  toggle.addEventListener('click', () => flipCourt(e.id));

  leftInp.addEventListener('blur',  ev => setLabel(e.id, 'leftLabel',  ev.target.value));
  rightInp.addEventListener('blur', ev => setLabel(e.id, 'rightLabel', ev.target.value));

  notesBtn.addEventListener('click', () => {
    const w = document.getElementById(`nw-${e.id}`);
    w.classList.remove('viewing');
    w.classList.add('editing');
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  });

  delBtn.addEventListener('click', () => removeEntry(e.id));

  ta.addEventListener('blur', ev => {
    setNotes(e.id, ev.target.value);
    const w = document.getElementById(`nw-${e.id}`);
    w.classList.remove('editing');
  });

  // Hover: reveal read-only notes view
  card.addEventListener('mouseenter', () => {
    const w     = document.getElementById(`nw-${e.id}`);
    const entry = data.entries.find(x => x.id === e.id);
    if (!w.classList.contains('editing') && entry?.notes?.trim()) {
      w.classList.add('viewing');
    }
  });
  card.addEventListener('mouseleave', () => {
    const w = document.getElementById(`nw-${e.id}`);
    if (!w.classList.contains('editing')) w.classList.remove('viewing');
  });

  return card;
}

/* ── Boot ─────────────────────────────────────────────────────── */

document.getElementById('btnClose').addEventListener('click', () => window.api.hideWin());
document.getElementById('btnAdd').addEventListener('click', addEntry);

load();
