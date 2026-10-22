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
import { loginSchema, type LoginInput } from '@/schemas/auth';
import { authService } from '@/services/authService';
import { ui } from '@/styles/tokens';
import { applyServerFieldErrors } from '@/utils/serverErrors';
import { AuthLayout } from './AuthLayout';
import { describeAuthFailure, type AuthFailure } from './authErrors';

export function LoginPage() {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const inFlight = useRef(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  const guard = useDirtyGuard(form.formState.isDirty);

  const login = useMutation({
    mutationFn: authService.login,
    // Runs only after a 2xx. PublicOnly then redirects, so the dirty-form prompt is bypassed first.
    onSuccess: (session) => {
      guard.allowNavigation();
      queryClient.removeQueries({ queryKey: SESSION_END_KEY });
      queryClient.setQueryData(SESSION_KEY, session);
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (inFlight.current) return; // blocks a double submit (for example a second Enter key press)
    inFlight.current = true;
    setFailure(null);
    try {
      await login.mutateAsync(values);
    } catch (error) {
      const next = describeAuthFailure(error, 'login');
      applyServerFieldErrors(form.setError, next.fieldErrors, ['email', 'password']);
      setFailure(next); // input is kept so the person can correct it
    } finally {
      inFlight.current = false;
    }
  });

  const { errors } = form.formState;

  return (
    <AuthLayout title="Sign in" subtitle="Pick up where your family circle left off.">
      <form noValidate onSubmit={onSubmit} aria-busy={login.isPending} className="space-y-5">
        {failure && (
          <FormAlert tone={failure.tone} title={failure.title}>
            {failure.message}
          </FormAlert>
        )}
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
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...form.register('password')}
        />
        <PendingNotice pending={login.isPending} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={login.isPending}
          loadingText="Signing in…"
        >
          Sign in
        </Button>
      </form>
      <p className="mt-8 text-lg">
        New to CareCircle?{' '}
        <Link to={ROUTES.register} className={ui.link}>
          Create an account
        </Link>
      </p>
      {guard.dialog}
    </AuthLayout>
  );
}
