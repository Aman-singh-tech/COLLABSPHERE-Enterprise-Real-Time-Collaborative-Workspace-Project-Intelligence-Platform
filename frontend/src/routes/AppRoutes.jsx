import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Loader from '../components/common/Loader';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';

// Lazy-loaded pages: each route ships its own chunk instead of one large bundle
const LoginPage = lazy(() => import('../pages/LoginPage'));
const SignupPage = lazy(() => import('../pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('../pages/AuthCallbackPage'));
const WorkspaceSelectPage = lazy(() => import('../pages/WorkspaceSelectPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('../pages/ProjectDetailPage'));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const DocumentEditorPage = lazy(() => import('../pages/DocumentEditorPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const FilesPage = lazy(() => import('../pages/FilesPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loader fullScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected: workspace selection */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <WorkspaceSelectPage />
            </ProtectedRoute>
          }
        />

        {/* Protected: main workspace shell */}
        <Route
          path="/workspaces/:workspaceId"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="documents/:documentId" element={<DocumentEditorPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
