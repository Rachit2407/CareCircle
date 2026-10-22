import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { createTaskInputSchema, type CreateTaskInput, type Task } from '@/schemas/tasks';
import { taskService } from '@/services/taskService';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit?: Task | null;
}

export function TaskDialog({ open, onOpenChange, taskToEdit }: TaskDialogProps) {
  const { circle } = useAuthedSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const patientId = circle?.id || 'pat_raghav';

  // Format default dueAt to local datetime-local format: YYYY-MM-DDTHH:mm
  const defaultDueDate = taskToEdit
    ? new Date(taskToEdit.dueAt).toISOString().slice(0, 16)
    : new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16);

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskInputSchema),
    defaultValues: {
      patientId,
      title: taskToEdit?.title || '',
      description: taskToEdit?.description || '',
      dueAt: defaultDueDate,
      recurrence: taskToEdit?.recurrence || 'none',
      priority: taskToEdit?.priority || 'medium',
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CreateTaskInput) => {
      // Convert dueAt to ISO string
      const isoDueAt = new Date(values.dueAt).toISOString();
      if (taskToEdit) {
        return taskService.update(taskToEdit.id, {
          title: values.title,
          description: values.description,
          dueAt: isoDueAt,
          recurrence: values.recurrence,
          priority: values.priority,
        });
      }
      return taskService.create({
        ...values,
        dueAt: isoDueAt,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.show(taskToEdit ? 'task_updated' : 'task_created');
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={taskToEdit ? 'Edit care task' : 'Create new care task'}
      description="Assign a daily responsibility, check-in, or routine task for the care recipient."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Task title"
          required
          placeholder="e.g. Afternoon hydration or Blood pressure check"
          error={errors.title?.message}
          {...form.register('title')}
        />

        <div className="space-y-1.5">
          <label htmlFor="task-desc" className="block text-base font-bold text-ink">
            Description <span className="text-sm font-normal text-ink-muted">(optional)</span>
          </label>
          <textarea
            id="task-desc"
            rows={3}
            placeholder="Helpful details, instructions, or equipment needed..."
            className="w-full rounded-xl border-2 border-line bg-paper px-4 py-2.5 text-base text-ink placeholder:text-ink-muted hover:border-navy-200 focus-visible:border-navy-700"
            {...form.register('description')}
          />
        </div>

        <TextField
          label="Due date & time"
          type="datetime-local"
          required
          error={errors.dueAt?.message}
          {...form.register('dueAt')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="task-priority" className="block text-base font-bold text-ink">
              Priority
            </label>
            <select
              id="task-priority"
              className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
              {...form.register('priority')}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-recurrence" className="block text-base font-bold text-ink">
              Recurrence
            </label>
            <select
              id="task-recurrence"
              className="h-12 w-full rounded-xl border-2 border-line bg-paper px-3 text-base font-medium text-ink focus-visible:border-navy-700"
              {...form.register('recurrence')}
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saveMutation.isPending}
            loadingText={taskToEdit ? 'Updating…' : 'Saving…'}
          >
            {taskToEdit ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
