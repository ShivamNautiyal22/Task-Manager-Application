import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { getActivityLog } from '../api/tasks';

const ACTION_ICONS = {
  created: '✨',
  updated: '✏️',
  deleted: '🗑️',
  status_changed: '🔄',
};

const ACTION_COLORS = {
  created: 'text-green-600 dark:text-green-400',
  updated: 'text-blue-600 dark:text-blue-400',
  deleted: 'text-red-500',
  status_changed: 'text-amber-600 dark:text-amber-400',
};

export default function ActivityLog({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivityLog()
      .then(res => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 z-50 shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-12">
              <p className="text-3xl mb-2">📜</p>
              <p>No activity yet</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              >
                <span className="text-lg flex-shrink-0">{ACTION_ICONS[log.action] || '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className={`font-medium ${ACTION_COLORS[log.action]}`}>
                      {log.action.replace('_', ' ')}
                    </span>{' '}
                    <span className="font-medium">"{log.task_title}"</span>
                  </p>
                  {log.detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.detail}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}