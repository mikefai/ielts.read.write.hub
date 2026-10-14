// Approximate Academic Reading raw-score to band table (widely published; not an official IELTS conversion).
const TABLE = [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4]];

export function bandFor(raw) {
  return TABLE.find(([min]) => raw >= min)?.[1] ?? 'below 4';
}
