import { NavLink } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileBarChart2,
  LayoutGrid,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
  Utensils,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';
import Avatar from '../ui/Avatar';

const PRIMARY_NAV = [
  { to: '/', label: 'Today', icon: LayoutGrid, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/diet', label: 'Diet', icon: Utensils },
];

const SECONDARY_NAV = [
  { to: '/templates', label: 'Templates', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors',
          isActive
            ? 'bg-surface-raised text-ink border border-line'
            : 'text-ink-secondary hover:bg-surface-raised/60 hover:text-ink border border-transparent'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
        <Dumbbell className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <span className="block truncate text-sm font-semibold tracking-tight text-ink">
          TrainerDesk
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { trainer, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col border-r border-line bg-surface">
      <div className="flex h-16 items-center justify-between border-b border-line px-4">
        <BrandMark />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-raised hover:text-ink transition-colors"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        <div className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-medium text-ink-muted">Workspace</p>
          {SECONDARY_NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-2">
          <Avatar src={trainer?.avatarUrl} name={trainer?.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{trainer?.name}</p>
            <p className="truncate text-xs text-ink-muted">
              {trainer?.gymName || trainer?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-raised hover:text-danger transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
