import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import { GuestRoute, ProtectedRoute } from './components/layout/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SettingsPage from './pages/auth/SettingsPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientProfilePage from './pages/ClientProfilePage';
import ExercisesPage from './pages/ExercisesPage';
import DietPage from './pages/DietPage';
import CalendarPage from './pages/CalendarPage';
import TemplatesPage from './pages/TemplatesPage';
import ReportsPage from './pages/ReportsPage';
import MenuPage from './pages/MenuPage';
import LiveSessionPage from './pages/LiveSessionPage';
import SharedDietPlanPage from './pages/SharedDietPlanPage';

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style:
          resolvedTheme === 'dark'
            ? {
                background: '#22252B',
                color: '#F4F4F5',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '14px',
              }
            : {
                background: '#FFFFFF',
                color: '#18181B',
                border: '1px solid rgba(24,24,27,0.09)',
                fontSize: '14px',
              },
      }}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/share/diet/:shareToken" element={<SharedDietPlanPage />} />

              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/clients/:id" element={<ClientProfilePage />} />
                  <Route path="/exercises" element={<ExercisesPage />} />
                  <Route path="/diet" element={<DietPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/sessions/:id" element={<LiveSessionPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <ThemedToaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
