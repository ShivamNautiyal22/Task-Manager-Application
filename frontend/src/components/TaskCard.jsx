import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { deleteTask, updateTask } from '../api/tasks';
import toast from 'react-hot-toast';

const PRIORITY_STYLES = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function TaskCard({ task, onEdit, onRefresh }) {
  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(task.id);
      toast.success('Task deleted.');
      onRefresh();
    } catch {
      toast.error('Failed to delete task.');
    }
  };

  const handleStatusChange = async (e) => {
    try {
      await updateTask(task.id, { status: e.target.value });
      toast.success('Status updated!');
      onRefresh();
    } catch {
      toast.error('Failed to update status.');
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <motion.div
      whileHover={{ scale: 1.005, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
      className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className={`font-medium text-gray-900 dark:text-white ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
          {task.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{task.category}</span>
          )}
        </div>
        {task.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{task.description}</p>}
        {task.due_date && (
          <p className={`text-xs mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {isOverdue ? '⚠️ Overdue · ' : '📅 '}
            {format(new Date(task.due_date), 'MMM d, yyyy')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <select value={task.status} onChange={handleStatusChange}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500">
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="Edit">✏️</button>
        <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title="Delete">🗑️</button>
      </div>
    </motion.div>
  );
}