import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { HttpError } from '@/services';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.'),
  senha: z.string().min(1, 'Informe a senha.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginLocationState {
  from?: string;
  email?: string;
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 400 || error.status === 401 || error.status === 403) return 'E-mail ou senha inválidos.';
    return error.message;
  }
  return 'Não foi possível entrar. Tente novamente em instantes.';
}

export function LoginPage() {
  const { isAuthenticated, sessionExpired, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LoginLocationState;
  const destination = state.from ?? '/';

  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state.email ?? '', senha: '' },
  });
  const { errors, isSubmitting } = form.formState;

  if (isAuthenticated) return <Navigate to={destination} replace />;

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values);
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(loginErrorMessage(error));
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      description="Acesse sua carteira de investimentos."
      footer={
        <span>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-foreground underline underline-offset-4">
            Cadastre-se
          </Link>
        </span>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          {sessionExpired && !formError && (
            <p role="status" className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Sua sessão expirou. Faça login novamente.
            </p>
          )}

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <FieldContent>
              <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register('email')} />
              <FieldError errors={errors.email ? [errors.email] : undefined} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.senha}>
            <FieldLabel htmlFor="senha">Senha</FieldLabel>
            <FieldContent>
              <Input
                id="senha"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.senha}
                {...form.register('senha')}
              />
              <FieldError errors={errors.senha ? [errors.senha] : undefined} />
            </FieldContent>
          </Field>

          {formError && <FieldError>{formError}</FieldError>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
