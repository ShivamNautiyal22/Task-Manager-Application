import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { updateTask } from '../api/tasks';
import toast from 'react-hot-toast';

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'todo',
    label: 'Todo',
    headerColor: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    borderColor: 'border-gray-200 dark:border-gray-700',
    dotColor: 'bg-indigo-500',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    headerColor: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50/50 dark:bg-amber-900/10',
    borderColor: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'done',
    label: 'Done',
    headerColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50/50 dark:bg-green-900/10',
    borderColor: 'border-green-200 dark:border-green-800',
    dotColor: 'bg-green-500',
  },
];

const PRIORITY_DOT = {
  low: 'bg-green-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
};

// ── Draggable Task Card ───────────────────────────────────────────────────────
function KanbanCard({ task, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(task.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 select-none ${isDragging ? 'shadow-lg ring-2 ring-primary-400' : ''}`}
    >
      {/* Drag handle area + content */}
      <div className="flex items-start gap-2">
        {/* Drag handle — only this area triggers drag */}
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 flex-shrink-0 touch-none"
          title="Drag to move"
        >
          ⠿
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
            <p className={`text-sm font-medium text-gray-900 dark:text-white leading-snug ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
              {task.title}
            </p>
          </div>

          {task.description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {task.category && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md px-1.5 py-0.5">
                {task.category}
              </span>
            )}
            {task.due_date && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                📅 {task.due_date}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ml-auto ${
              task.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
              task.priority === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
              'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {task.priority}
            </span>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={() => onEdit(task)}
          onPointerDown={(e) => e.stopPropagation()}  // prevent drag when clicking edit
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-0.5 rounded"
          title="Edit task"
        >
          ✏️
        </button>
      </div>
    </div>
  );
}

// ── Droppable Column ──────────────────────────────────────────────────────────
function KanbanColumn({ column, tasks, onEdit, activeId }) {
  // useDroppable makes this column a valid drop target
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={`flex flex-col rounded-2xl border ${column.borderColor} ${column.bgColor} min-h-96`}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-inherit">
        <div className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
        <h3 className={`font-semibold text-sm ${column.headerColor}`}>{column.label}</h3>
        <span className="ml-auto text-xs font-medium bg-white dark:bg-gray-800 text-gray-400 rounded-full px-2 py-0.5 border border-gray-100 dark:border-gray-700">
          {tasks.length}
        </span>
      </div>

      {/* Drop area — this is what receives the dragged card */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-3 space-y-2 transition-colors duration-150 rounded-b-2xl ${
          isOver ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-inset ring-primary-300 dark:ring-primary-700' : ''
        }`}
      >
        <SortableContext
          items={tasks.map(t => String(t.id))}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} onEdit={onEdit} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed transition-colors ${
            isOver
              ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}>
            <p className="text-2xl mb-1">{isOver ? '📥' : '📋'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isOver ? 'Drop here!' : 'No tasks'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main KanbanBoard ──────────────────────────────────────────────────────────
export default function KanbanBoard({ tasks, onEdit, onRefresh }) {
  const [activeTask, setActiveTask] = useState(null);

  // PointerSensor with a small activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,   // must move 5px before drag starts
      },
    })
  );

  const handleDragStart = ({ active }) => {
    const task = tasks.find(t => String(t.id) === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);

    if (!over) return;  // dropped outside any droppable

    // Figure out where the card was dropped
    // `over.id` could be a column id ('todo', 'in_progress', 'done')
    // OR another task id (when dropped on top of a task in the same/different column)
    const draggedTask = tasks.find(t => String(t.id) === active.id);
    if (!draggedTask) return;

    let targetStatus = null;

    // Case 1: dropped directly onto a column header/body
    const targetColumn = COLUMNS.find(col => col.id === over.id);
    if (targetColumn) {
      targetStatus = targetColumn.id;
    }

    // Case 2: dropped onto another task card — use that task's column
    if (!targetStatus) {
      const overTask = tasks.find(t => String(t.id) === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    // If we found a target and it's different from current status, update
    if (targetStatus && targetStatus !== draggedTask.status) {
      try {
        await updateTask(draggedTask.id, { status: targetStatus });
        const label = COLUMNS.find(c => c.id === targetStatus)?.label || targetStatus;
        toast.success(`Moved to "${label}"`);
        onRefresh();
      } catch {
        toast.error('Failed to move task. Please try again.');
      }
    }
  };

  const handleDragCancel = () => setActiveTask(null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter(t => t.status === col.id)}
            onEdit={onEdit}
            activeId={activeTask?.id}
          />
        ))}
      </div>

      {/* DragOverlay: the ghost card that follows your cursor while dragging */}
      <DragOverlay dropAnimation={{ duration: 150 }}>
        {activeTask ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-primary-400 shadow-2xl p-3 opacity-95 rotate-1 max-w-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[activeTask.priority]}`} />
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activeTask.title}</p>
            </div>
            {activeTask.category && (
              <p className="text-xs text-gray-400 mt-1 ml-4">{activeTask.category}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}