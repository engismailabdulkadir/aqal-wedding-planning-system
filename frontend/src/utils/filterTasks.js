export function filterTasks(tasks, { search, status, category, priority }) {
  const query = search.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesSearch = !query || `${task.title} ${task.description || ''}`.toLowerCase().includes(query);
    return matchesSearch && (status === 'all' || task.status === status) && (category === 'all' || task.category === category) && (priority === 'all' || task.priority === priority);
  });
}

export function isTaskOverdue(task) {
  if (!task.dueDate || task.status === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.dueDate) < today;
}

export function formatTaskDate(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}
