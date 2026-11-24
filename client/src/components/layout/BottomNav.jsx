import { NavLink } from 'react-router-dom';
import { Dumbbell, LayoutGrid, Menu, Users, Utensils } from 'lucide-react';
import { cn } from '../../lib/utils';

const MOBILE_NAV = [
  { to: '/', label: 'Today', icon: LayoutGrid, end: true },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/diet', label: 'Diet', icon: Utensils },
  { to: '/menu', label: 'Menu', icon: Menu },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-accent' : 'text-ink-secondary hover:text-ink'
              )
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav;
