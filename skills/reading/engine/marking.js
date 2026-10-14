const norm = s => String(s ?? '').toLowerCase().trim().replace(/[.,;:!?]+$/, '').replace(/\s+/g, ' ');

export function markItem(item, response, wordLimit) {
  const r = norm(response);
  if (!r) return false;
  if (wordLimit && r.split(' ').length > wordLimit) return false;
  return [item.answer, ...(item.accept ?? [])].some(a => norm(a) === r);
}
