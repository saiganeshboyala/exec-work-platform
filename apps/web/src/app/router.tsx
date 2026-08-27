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
        <Route
          path="boards"
          element={
            <RequireRole minRole="MANAGER">
              <BoardsPage />
            </RequireRole>
          }
        />
        {/* Deliberately open: Todo links straight here for task details, and the
            API already limits a member to the departments they are actually on. */}
        <Route path="boards/:boardId" element={<BoardPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route
          path="people"
          element={
            <RequireRole minRole="MANAGER">
              <MembersPage />
            </RequireRole>
          }
        />
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
