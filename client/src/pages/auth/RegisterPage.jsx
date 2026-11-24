import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getApiErrorMessage } from '../../lib/utils';
import { BrandMark } from '../../components/layout/Sidebar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().trim().email('Enter a valid email address'),
    gymName: z.string().trim().max(100).optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function RegisterPage() {
  const { register: registerTrainer } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      gymName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await registerTrainer({
        name: values.name,
        email: values.email,
        gymName: values.gymName || '',
        password: values.password,
      });
      toast.success('Trainer account created');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to create account'));
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-canvas px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <BrandMark />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary hover:text-ink transition-colors"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <div className="mx-auto my-8 w-full max-w-md">
        <Card className="p-6 sm:p-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Create your trainer account
            </h1>
            <p className="text-sm text-ink-secondary">
              Each trainer has an isolated workspace for clients, plans, and logs
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Alex Mercer"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="coach@studio.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Gym or studio name (optional)"
              type="text"
              placeholder="Iron Craft Studio"
              error={errors.gymName?.message}
              {...register('gymName')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-ink transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              }
              {...register('password')}
            />

            <Input
              label="Confirm password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-secondary">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </Card>
      </div>

      <p className="text-center text-xs text-ink-muted">
        TrainerDesk coaching workspace
      </p>
    </div>
  );
}
