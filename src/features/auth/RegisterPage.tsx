import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { register as registerUser } from '@/features/auth/services/auth.service';
import { HttpError, parseValidationErrors } from '@/services';

const registerSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe seu nome.'),
    email: z.string().trim().min(1, 'Informe o e-mail.').email('Informe um e-mail válido.'),
    // Mesma regra da API (8 a 72 caracteres), para avisar antes de enviar.
    senha: z.string().min(8, 'A senha deve ter entre 8 e 72 caracteres.').max(72, 'A senha deve ter entre 8 e 72 caracteres.'),
    confirmarSenha: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((values) => values.senha === values.confirmarSenha, {
    path: ['confirmarSenha'],
    message: 'As senhas não conferem.',
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const API_FIELDS = ['nome', 'email', 'senha'] as const;

export function RegisterPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nome: '', email: '', senha: '', confirmarSenha: '' },
  });
  const { errors, isSubmitting } = form.formState;

  if (isAuthenticated) return <Navigate to="/" replace />;

  function handleRegisterError(error: unknown) {
    if (!(error instanceof HttpError)) {
      setFormError('Não foi possível concluir o cadastro. Tente novamente em instantes.');
      return;
    }

    if (error.status === 409) {
      form.setError('email', { message: 'Este e-mail já está cadastrado.' }, { shouldFocus: true });
      return;
    }

    if (error.status === 400) {
      const { fields, general } = parseValidationErrors(error.body);
      const unmatched = [...general];

      for (const [field, message] of Object.entries(fields)) {
        const known = API_FIELDS.find((name) => name === field);
        if (known) form.setError(known, { message });
        else unmatched.push(message);
      }

      const hasFieldErrors = API_FIELDS.some((name) => name in fields);
      if (unmatched.length > 0) setFormError(unmatched.join(' '));
      else if (!hasFieldErrors) setFormError('Dados inválidos. Revise os campos e tente novamente.');
      return;
    }

    setFormError(error.message);
  }

  async function onSubmit({ nome, email, senha }: RegisterFormValues) {
    setFormError(null);

    try {
      await registerUser({ nome, email, senha });
    } catch (error) {
      handleRegisterError(error);
      return;
    }

    try {
      await login({ email, senha });
      toast.success('Conta criada', { description: 'Bem-vindo ao Palm Invest.' });
      navigate('/', { replace: true });
    } catch {
      toast.success('Conta criada', { description: 'Faça login para continuar.' });
      navigate('/login', { replace: true, state: { email } });
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      description="Cadastre-se para acompanhar sua carteira."
      footer={
        <span>
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </span>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.nome}>
            <FieldLabel htmlFor="nome">Nome</FieldLabel>
            <FieldContent>
              <Input id="nome" autoComplete="name" aria-invalid={!!errors.nome} {...form.register('nome')} />
              <FieldError errors={errors.nome ? [errors.nome] : undefined} />
            </FieldContent>
          </Field>

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
                autoComplete="new-password"
                aria-invalid={!!errors.senha}
                {...form.register('senha')}
              />
              <FieldError errors={errors.senha ? [errors.senha] : undefined} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.confirmarSenha}>
            <FieldLabel htmlFor="confirmarSenha">Confirmar senha</FieldLabel>
            <FieldContent>
              <Input
                id="confirmarSenha"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmarSenha}
                {...form.register('confirmarSenha')}
              />
              <FieldError errors={errors.confirmarSenha ? [errors.confirmarSenha] : undefined} />
            </FieldContent>
          </Field>

          {formError && <FieldError>{formError}</FieldError>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando conta…' : 'Criar conta'}
          </Button>
        </FieldGroup>
      </form>
    </AuthLayout>
  );
}
