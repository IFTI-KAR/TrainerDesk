import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const fillDemoCredentials = () => {
    setValue('email', 'demo@trainerdesk.dev', { shouldValidate: true });
    setValue('password', 'DemoPassword123!', { shouldValidate: true });
  };

  const onSubmit = async (values) => {
    try {
      await login(values);
      toast.success('Signed in');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to sign in'));
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
              Sign in to TrainerDesk
            </h1>
            <p className="text-sm text-ink-secondary">
              Access your daily client roster, training logs, and nutrition plans
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="coach@studio.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
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

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-secondary">
            New trainer?{' '}
            <Link to="/register" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </p>

          {import.meta.env.DEV && (
            <div className="mt-5 border-t border-line pt-4 text-center">
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs font-medium text-ink-secondary hover:text-ink underline-offset-4 hover:underline transition-colors"
              >
                Fill local demo account (Coach Arjun Mehta)
              </button>
            </div>
          )}
        </Card>
      </div>

      <p className="text-center text-xs text-ink-muted">
        TrainerDesk coaching workspace
      </p>
    </div>
  );
}
