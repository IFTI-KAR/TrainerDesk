import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  LogOut,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/ui/Avatar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const MENU_LINKS = [
  { to: '/calendar', label: 'Schedule calendar', description: 'Week and month view', icon: CalendarDays },
  { to: '/templates', label: 'Templates', description: 'Reusable workout and diet plans', icon: ClipboardList },
  { to: '/reports', label: 'Reports', description: 'Attendance and CSV exports', icon: FileBarChart2 },
  { to: '/settings', label: 'Settings', description: 'Profile, units, theme, password', icon: Settings },
];

export default function MenuPage() {
  const { trainer, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Menu</h1>

      <Card className="flex items-center gap-3 p-4">
        <Avatar src={trainer?.avatarUrl} name={trainer?.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-ink">{trainer?.name}</p>
          <p className="truncate text-sm text-ink-secondary">
            {trainer?.gymName || trainer?.email}
          </p>
        </div>
      </Card>

      <Card className="divide-y divide-line p-0 overflow-hidden">
        {MENU_LINKS.map(({ to, label, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-raised transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ink-secondary">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{label}</p>
              <p className="text-xs text-ink-secondary">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
          </Link>
        ))}

        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-raised transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ink-secondary">
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.75} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Theme</p>
            <p className="text-xs text-ink-secondary">
              Currently {resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode'}
            </p>
          </div>
        </button>
      </Card>

      <Button variant="outline" className="w-full" onClick={logout}>
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        Sign out
      </Button>
    </div>
  );
}
