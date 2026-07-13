import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getTasks, getTaskStats } from '../api/tasks';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import KanbanBoard from '../components/KanbanBoard';
import ActivityLog from '../components/ActivityLog';

const STATUS_FILTERS = ['all', 'todo', 'in_progress', 'done'];
const PRIORITY_FILTERS = ['all', 'low', 'medium', 'high'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showActivity, setShowActivity] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchAll = useCallback(async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([getTasks(), getTaskStats()]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load tasks.');
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const handleEdit = (task) => { setEditTask(task); setShowModal(true); };
  const handleCreate = () => { setEditTask(null); setShowModal(true); };
  const handleModalClose = () => { setShowModal(false); setEditTask(null); };
  const handleSaved = () => { fetchAll(); handleModalClose(); };

  const pieData = stats ? [
    { name: 'Todo', value: stats.todo, color: '#6366f1' },
    { name: 'In Progress', value: stats.in_progress, color: '#f59e0b' },
    { name: 'Done', value: stats.done, color: '#22c55e' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">✓</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Hi, {user?.username}</span>
            <button onClick={() => setShowActivity(!showActivity)} className="btn-secondary text-sm py-1.5 px-3">Activity</button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={logout} className="btn-secondary text-sm py-1.5 px-3">Sign out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">{stats.completion_rate}%</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Due This Week</p>
              <p className="text-3xl font-bold text-amber-500 mt-1">{stats.due_this_week}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">🔥 Streak</p>
              <p className="text-3xl font-bold text-orange-500 mt-1">{stats.streak} days</p>
            </div>
          </motion.div>
        )}

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Task Breakdown</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 min-w-max">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600 dark:text-gray-300">{d.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input flex-1 min-w-48"
            />
            <button onClick={handleCreate} className="btn-primary whitespace-nowrap">+ New Task</button>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs font-medium text-gray-400">Status:</span>
            {STATUS_FILTERS.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <span className="text-xs font-medium text-gray-400 ml-2">Priority:</span>
            {PRIORITY_FILTERS.map(p => (
              <button key={p} onClick={() => setFilterPriority(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterPriority === p ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button onClick={() => setView('list')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                List
              </button>
              <button onClick={() => setView('kanban')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Task List or Kanban */}
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {filtered.length === 0 ? (
                <div className="card p-12 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No tasks found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                    {tasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your filters.'}
                  </p>
                  {tasks.length === 0 && <button onClick={handleCreate} className="btn-primary mt-4">+ Create Task</button>}
                </div>
              ) : (
                filtered.map((task, i) => (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <TaskCard task={task} onEdit={handleEdit} onRefresh={fetchAll} />
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <KanbanBoard tasks={filtered} onEdit={handleEdit} onRefresh={fetchAll} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showModal && <TaskModal task={editTask} onClose={handleModalClose} onSaved={handleSaved} />}
      </AnimatePresence>
      <AnimatePresence>
        {showActivity && <ActivityLog onClose={() => setShowActivity(false)} />}
      </AnimatePresence>
    </div>
  );
}