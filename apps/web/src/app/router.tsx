import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminPage } from '@/features/admin';
import { LoginPage } from '@/features/auth';
import { BoardPage, BoardsPage } from '@/features/boards';
import { DashboardPage } from '@/features/dashboard';
import { PrivacyPage, TermsPage, WelcomePage } from '@/features/legal';
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

      {/* Public by requirement, not by accident. Google will not grant a
          sensitive scope without reaching the homepage, the privacy policy and
          the terms signed out, on the same domain as the OAuth redirect. */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

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
