import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminPage } from '@/features/admin';
import { LoginPage } from '@/features/auth';
import { BoardPage, BoardsPage } from '@/features/boards';
import { DashboardPage } from '@/features/dashboard';
import { MeetingsPage } from '@/features/meetings';
import { MembersPage } from '@/features/members';

import { AppShell } from './layout/AppShell';
import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';

/** One route table. A feature exports pages; it never registers its own routes. */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/sign-in" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="boards" element={<BoardsPage />} />
        <Route path="boards/:boardId" element={<BoardPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="people" element={<MembersPage />} />
        <Route
          path="admin"
          element={
            <RequireRole minRole="ADMIN">
              <AdminPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
