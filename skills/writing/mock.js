// Where to go after finishing a task inside a mock exam
export function mockNext(mocks, mockId, taskId) {
  const m = mocks.find(x => x.id === mockId);
  if (!m) return null;
  if (taskId === m.task1) return { label: 'Next: Task 2', href: `?id=${m.task2}&mock=${m.id}` };
  if (taskId === m.task2) return { label: 'Back to mock exams', href: '../#mocks' };
  return null;
}
