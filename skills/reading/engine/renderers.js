const $ = (tag, props = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k.startsWith('aria-') ? el.setAttribute(k, v) : (el[k] = v); // a property named 'aria-label' is not an attribute
  el.append(...kids);
  return el;
};
const wordCount = s => s.trim() ? s.trim().split(/\s+/).length : 0;

function counter(input, limit) {
  const c = $('span', { className: 'muted counter' });
  const upd = () => { const n = wordCount(input.value); c.textContent = limit ? `${n}/${limit} word${limit > 1 ? 's' : ''}` : ''; c.classList.toggle('over', limit && n > limit); };
  input.addEventListener('input', upd); upd();
  return c;
}

// Every renderer is (set, box, offset = 0) => () => string[]; offset continues numbering across groups in a full test.
function radios(options) {
  return (set, box, offset = 0) => {
    set.items.forEach((it, i) => {
      const opts = options ?? it.options;
      const f = $('fieldset', { className: 'q' }, $('legend', {}, it.prompt));
      opts.forEach(o => f.append($('label', { className: 'opt' }, $('input', { type: 'radio', name: `${set.id}-${it.id}`, value: o }), ' ', o)));
      box.append(f);
    });
    return () => set.items.map(it => box.querySelector(`input[name="${set.id}-${it.id}"]:checked`)?.value ?? '');
  };
}

function gaps(flow, notes) {
  return (set, box, offset = 0) => {
    const wrap = $('div', { className: flow ? 'flow' : notes ? 'notes' : '' });
    const inputs = set.items.map((it, i) => {
      const input = $('input', { type: 'text', className: 'gap', autocomplete: 'off', 'aria-label': `Answer ${i + 1 + offset}` });
      const parts = it.prompt.split('____');
      if (notes && it.heading) wrap.append($('h4', { className: 'note-h' }, it.heading));
      // numbered circles (.q::before) already number plain questions; flow boxes and notes have none
      const row = $('div', { className: flow ? 'box' : 'q' }, flow || notes ? `${i + 1 + offset}. ` : '', parts[0]);
      if (parts.length > 1) row.append(input, parts.slice(1).join('____'));
      else row.append($('br'), input);
      row.append(' ', counter(input, set.wordLimit));
      wrap.append(row);
      if (flow && i < set.items.length - 1) wrap.append($('div', { className: 'arrow', ariaHidden: 'true' }, '↓'));
      return input;
    });
    box.append(wrap);
    return () => inputs.map(i => i.value);
  };
}

function matching(once, inline) {
  return (set, box, offset = 0) => {
    const pool = $('div', { className: 'pool' }, $('p', { className: 'muted' }, 'Drag an option onto a question, or use the drop-downs.'));
    const opts = set.items[0].options;
    const selects = [];
    const sync = () => {
      const used = selects.map(s => s.value);
      pool.querySelectorAll('.chip').forEach(c => c.classList.toggle('used', once && used.includes(c.dataset.v)));
    };
    opts.forEach(o => {
      const chip = $('span', { className: 'chip', draggable: true, textContent: o });
      chip.dataset.v = o;
      chip.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', o));
      pool.append(chip);
    });
    box.append(pool);
    set.items.forEach((it, i) => {
      const sel = $('select', { 'aria-label': `Answer ${i + 1 + offset}` }, $('option', { value: '' }, '— choose —'), ...it.options.map(o => $('option', { value: o }, o)));
      sel.addEventListener('change', sync);
      sel.addEventListener('dragover', ev => ev.preventDefault());
      sel.addEventListener('drop', ev => { ev.preventDefault(); sel.value = ev.dataTransfer.getData('text/plain'); sync(); });
      selects.push(sel);
      const parts = it.prompt.split('____'), para = it.prompt.match(/^Paragraph ([A-Z])$/);
      const show = para ? $('button', { type: 'button', className: 'btn ghost mini', textContent: 'Show paragraph', onclick: () => box.dispatchEvent(new CustomEvent('showpara', { bubbles: true, detail: para[1] })) }) : '';
      box.append(inline && parts.length > 1
        ? $('div', { className: 'q' }, parts[0], sel, parts.slice(1).join('____'))
        : $('div', { className: 'q' }, $('p', { className: para ? 'qhead' : '' }, it.prompt), sel, ' ', show));
    });
    return () => selects.map(s => s.value);
  };
}

export const renderers = {
  tfng: radios(['TRUE', 'FALSE', 'NOT GIVEN']),
  ynng: radios(['YES', 'NO', 'NOT GIVEN']),
  mcq: radios(),
  'short-answer': gaps(),
  'sentence-completion': gaps(),
  'summary-completion': gaps(),
  'notes-completion': gaps(false, true),
  'diagram-labelling': gaps(true),
  'matching-headings': matching(true),
  'matching-information': matching(false),
  'matching-features': matching(false),
  'matching-endings': matching(true),
  'summary-wordbank': matching(true, true),
};
