import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/FormAlert';
import { PendingNotice } from '@/components/ui/PendingNotice';
import { TextField } from '@/components/ui/TextField';
import { useDirtyGuard } from '@/hooks/useDirtyGuard';
import { SESSION_END_KEY, SESSION_KEY } from '@/hooks/useSession';
import { registerSchema, type RegisterInput } from '@/schemas/auth';
import { authService } from '@/services/authService';
import { ui } from '@/styles/tokens';
import { applyServerFieldErrors } from '@/utils/serverErrors';
import { AuthLayout } from './AuthLayout';
import { describeAuthFailure, type AuthFailure } from './authErrors';

const FIELDS = ['displayName', 'email', 'password', 'confirmPassword'] as const;

export function RegisterPage() {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const inFlight = useRef(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });
  const guard = useDirtyGuard(form.formState.isDirty);

  const register = useMutation({
    mutationFn: authService.register,
    onSuccess: (session) => {
      guard.allowNavigation();
      queryClient.removeQueries({ queryKey: SESSION_END_KEY });
      queryClient.setQueryData(SESSION_KEY, session);
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFailure(null);
    try {
      await register.mutateAsync(values);
    } catch (error) {
      const next = describeAuthFailure(error, 'register');
      applyServerFieldErrors(form.setError, next.fieldErrors, FIELDS);
      setFailure(next);
    } finally {
      inFlight.current = false;
    }
  });

  const { errors } = form.formState;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up CareCircle so your family can share the plan."
    >
      <form noValidate onSubmit={onSubmit} aria-busy={register.isPending} className="space-y-5">
        {failure && (
          <FormAlert tone={failure.tone} title={failure.title}>
            {failure.message}
          </FormAlert>
        )}
        <TextField
          label="Your name"
          autoComplete="name"
          required
          error={errors.displayName?.message}
          {...form.register('displayName')}
        />
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="Use at least 10 characters."
          required
          error={errors.password?.message}
          {...form.register('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <PendingNotice pending={register.isPending} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={register.isPending}
          loadingText="Creating account…"
        >
          Create account
        </Button>
      </form>
      <p className="mt-8 text-lg">
        Already have an account?{' '}
        <Link to={ROUTES.login} className={ui.link}>
          Sign in
        </Link>
      </p>
      {guard.dialog}
    </AuthLayout>
  );
}
