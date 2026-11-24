import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { cn, getApiErrorMessage } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardHeader } from '../../components/ui/Card';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  gymName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  weightUnit: z.enum(['kg', 'lb']),
  defaultSessionDuration: z.coerce
    .number()
    .int()
    .min(15, 'Minimum 15 minutes')
    .max(240, 'Maximum 240 minutes'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128),
    confirmNewPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  });

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const { trainer, updateProfile, changePassword, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: trainer?.name || '',
      gymName: trainer?.gymName || '',
      phone: trainer?.phone || '',
      weightUnit: trainer?.preferences?.weightUnit || 'kg',
      defaultSessionDuration: trainer?.preferences?.defaultSessionDuration || 60,
    },
  });

  useEffect(() => {
    if (trainer) {
      profileForm.reset({
        name: trainer.name || '',
        gymName: trainer.gymName || '',
        phone: trainer.phone || '',
        weightUnit: trainer.preferences?.weightUnit || 'kg',
        defaultSessionDuration: trainer.preferences?.defaultSessionDuration || 60,
      });
    }
  }, [trainer, profileForm]);

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const handleProfileSave = async (values) => {
    try {
      await updateProfile({
        name: values.name,
        gymName: values.gymName || '',
        phone: values.phone || '',
        preferences: {
          weightUnit: values.weightUnit,
          defaultSessionDuration: values.defaultSessionDuration,
          theme,
        },
      });
      toast.success('Profile preferences saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save profile'));
    }
  };

  const handleThemeSelect = async (nextTheme) => {
    setTheme(nextTheme);
    try {
      await updateProfile({ preferences: { theme: nextTheme } });
    } catch (_err) {
      // Local theme already updated
    }
  };

  const handlePasswordChange = async (values) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      toast.success('Password updated');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update password'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="text-sm text-ink-secondary">
          Manage your coaching profile, default training units, theme, and password
        </p>
      </div>

      <Card>
        <CardHeader
          title="Profile and defaults"
          description="Used across client plans, workout logs, and session scheduling"
        />
        <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              error={profileForm.formState.errors.name?.message}
              {...profileForm.register('name')}
            />
            <Input
              label="Email"
              value={trainer?.email || ''}
              disabled
              className="opacity-70 cursor-not-allowed"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Gym or studio"
              placeholder="Iron Craft Studio"
              error={profileForm.formState.errors.gymName?.message}
              {...profileForm.register('gymName')}
            />
            <Input
              label="Phone"
              placeholder="+1 555 0140"
              error={profileForm.formState.errors.phone?.message}
              {...profileForm.register('phone')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="weightUnit" className="block text-sm font-medium text-ink">
                Default weight unit
              </label>
              <select
                id="weightUnit"
                className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink"
                {...profileForm.register('weightUnit')}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </div>

            <Input
              label="Default session length (min)"
              type="number"
              min={15}
              max={240}
              className="tabular-nums"
              error={profileForm.formState.errors.defaultSessionDuration?.message}
              {...profileForm.register('defaultSessionDuration')}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={profileForm.formState.isSubmitting}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Appearance"
          description="Choose light mode for bright gym floors or dark mode for low-light spaces"
        />
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeSelect(value)}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors',
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface text-ink-secondary hover:bg-surface-raised hover:text-ink'
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Security"
          description="Update your password. Existing sessions on other devices will be signed out."
        />
        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register('currentPassword')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmNewPassword?.message}
              {...passwordForm.register('confirmNewPassword')}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={passwordForm.formState.isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Session</h2>
          <p className="text-sm text-ink-secondary">
            Signed in as <span className="font-medium text-ink">{trainer?.email}</span>
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign out
        </Button>
      </Card>
    </div>
  );
}
