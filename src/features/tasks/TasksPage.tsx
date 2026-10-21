import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  ListChecks,
  Pencil,
  Plus,
  Repeat,
  Search,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { taskService } from '@/services/taskService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/datetime';
import { TaskDialog } from './TaskDialog';
import type { Task, TaskPriority, TaskStatus } from '@/schemas/tasks';

export function TasksPage() {
  const { user } = useAuthedSession();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const isNewRoute = location.pathname.endsWith('/new');
  const [dialogOpen, setDialogOpen] = useState(isNewRoute);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today'>('all');

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.list(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      taskService.update(id, { status }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.show(variables.status === 'completed' ? 'task_completed' : 'task_updated');
    },
  });

  const allTasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const filteredTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allTasks.filter((task) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesDesc) return false;
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (timeFilter === 'today') {
        const taskDay = task.dueAt.slice(0, 10);
        if (taskDay !== today) return false;
      }
      return true;
    });
  }, [allTasks, search, statusFilter, priorityFilter, timeFilter]);

  const handleOpenCreate = () => {
    setTaskToEdit(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Care Tasks"
        description="Daily care coordination, recurring wellness checks, and caregiver duties."
        action={
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            <span>Create task</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className={cn(ui.surface.saved, 'p-4 md:p-5')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="h-11 w-full rounded-xl border border-line bg-paper pl-10 pr-4 text-sm text-ink placeholder:text-ink-muted focus:border-navy-700 focus:outline-none"
            />
          </div>

          {/* Timeframe Tab */}
          <div className="flex rounded-xl bg-navy-50 p-1">
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-sm font-bold transition-colors',
                timeFilter === 'all'
                  ? 'bg-paper text-navy-900 shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              All tasks
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-sm font-bold transition-colors',
                timeFilter === 'today'
                  ? 'bg-paper text-navy-900 shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              Today only
            </button>
          </div>

          {/* Status Filter */}
          <div className="relative flex items-center">
            <Filter aria-hidden="true" className="absolute left-3 h-4 w-4 text-ink-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by task status"
              className="h-11 w-full rounded-xl border border-line bg-paper pl-9 pr-3 text-sm text-ink focus:border-navy-700"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by task priority"
              className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink focus:border-navy-700"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent priority</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Content */}
      {tasksQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-bubble" />
          <Skeleton className="h-24 w-full rounded-bubble" />
          <Skeleton className="h-24 w-full rounded-bubble" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks found"
          description={
            allTasks.length === 0
              ? 'No care tasks have been scheduled yet. Create your first task to start organizing care routines.'
              : 'No care tasks matched your current search or filter criteria.'
          }
          action={
            <Button variant="primary" onClick={handleOpenCreate}>
              <Plus aria-hidden="true" className="h-5 w-5" />
              <span>Create new task</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                ui.surface.saved,
                'flex flex-col justify-between gap-4 p-5 transition-shadow hover:shadow-lift sm:flex-row sm:items-center',
                task.status === 'completed' && 'bg-navy-50/50',
              )}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className={cn(
                      'text-lg font-bold',
                      task.status === 'completed' && 'line-through text-ink-muted',
                    )}
                  >
                    {task.title}
                  </h3>
                  <StatusBadge status={task.status as TaskStatus} />
                  <StatusBadge status={task.priority as TaskPriority} />
                  {task.recurrence !== 'none' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
                      <Repeat aria-hidden="true" className="h-3 w-3" />
                      {task.recurrence}
                    </span>
                  )}
                </div>

                {task.description && (
                  <p className="text-sm text-ink-soft line-clamp-2">{task.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Calendar aria-hidden="true" className="h-3.5 w-3.5" />
                    Due: {formatDateTime(task.dueAt, user.timeZone)}
                  </span>
                  {task.createdAt && (
                    <span className="inline-flex items-center gap-1">
                      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                      Scheduled
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex shrink-0 items-center gap-2">
                {task.status !== 'completed' ? (
                  <Button
                    size="md"
                    variant="primary"
                    loading={updateStatusMutation.isPending}
                    onClick={() =>
                      updateStatusMutation.mutate({ id: task.id, status: 'completed' })
                    }
                  >
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    <span>Complete</span>
                  </Button>
                ) : (
                  <Button
                    size="md"
                    variant="ghost"
                    loading={updateStatusMutation.isPending}
                    onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'pending' })}
                  >
                    <span>Reopen</span>
                  </Button>
                )}

                <Button
                  size="md"
                  variant="ghost"
                  aria-label={`Edit task: ${task.title}`}
                  onClick={() => handleOpenEdit(task)}
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Creation & Edit Dialog */}
      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} taskToEdit={taskToEdit} />
    </div>
  );
}
