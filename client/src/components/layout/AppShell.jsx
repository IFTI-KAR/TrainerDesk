import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import BottomNav from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-60">
        <MobileHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default AppShell;
