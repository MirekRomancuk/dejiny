import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Loading } from '@/components/common/Loading';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { RequireAuth } from '@/components/admin/RequireAuth';
import { HomePage } from '@/pages/HomePage';
import { KalendarPage } from '@/pages/KalendarPage';
import { PopisPage } from '@/pages/PopisPage';
import { VysvetlivkyPage } from '@/pages/VysvetlivkyPage';
import { VerzePage } from '@/pages/VerzePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { LoginPage } from '@/pages/admin/LoginPage';
import { RegisterPage } from '@/pages/admin/RegisterPage';

// Admin shell + pages are lazy-loaded (TipTap + xlsx live here, ~1MB)
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout').then(m => ({ default: m.AdminLayout })));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then(m => ({ default: m.DashboardPage })));
const EventsListPage = lazy(() => import('@/pages/admin/EventsListPage').then(m => ({ default: m.EventsListPage })));
const EventCreatePage = lazy(() => import('@/pages/admin/EventCreatePage').then(m => ({ default: m.EventCreatePage })));
const EventEditPage = lazy(() => import('@/pages/admin/EventEditPage').then(m => ({ default: m.EventEditPage })));
const PagesListPage = lazy(() => import('@/pages/admin/PagesListPage').then(m => ({ default: m.PagesListPage })));
const PageEditPage = lazy(() => import('@/pages/admin/PageEditPage').then(m => ({ default: m.PageEditPage })));
const ImportPage = lazy(() => import('@/pages/admin/ImportPage').then(m => ({ default: m.ImportPage })));
const CalendarListPage = lazy(() => import('@/pages/admin/CalendarListPage').then(m => ({ default: m.CalendarListPage })));
const ImagesPage = lazy(() => import('@/pages/admin/ImagesPage').then(m => ({ default: m.ImagesPage })));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage').then(m => ({ default: m.UsersPage })));
const BibliographyPage = lazy(() => import('@/pages/admin/BibliographyPage').then(m => ({ default: m.BibliographyPage })));

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="kalendar" element={<KalendarPage />} />
          <Route path="popis" element={<PopisPage />} />
          <Route path="verze" element={<VerzePage />} />
          <Route path="vysvetlivky" element={<VysvetlivkyPage />} />
        </Route>

        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/register" element={<RegisterPage />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <Suspense fallback={<Loading label="Načítám administraci…" />}>
                <AdminLayout />
              </Suspense>
            </RequireAuth>
          }
        >
          <Route index element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>} />
          <Route path="events" element={<Suspense fallback={<Loading />}><EventsListPage /></Suspense>} />
          <Route path="events/new" element={<Suspense fallback={<Loading />}><EventCreatePage /></Suspense>} />
          <Route path="events/:id" element={<Suspense fallback={<Loading />}><EventEditPage /></Suspense>} />
          <Route path="import" element={<Suspense fallback={<Loading />}><ImportPage /></Suspense>} />
          <Route path="pages" element={<Suspense fallback={<Loading />}><PagesListPage /></Suspense>} />
          <Route path="pages/:slug" element={<Suspense fallback={<Loading />}><PageEditPage /></Suspense>} />
          <Route path="calendar" element={<Suspense fallback={<Loading />}><CalendarListPage /></Suspense>} />
          <Route path="images" element={<Suspense fallback={<Loading />}><ImagesPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<Loading />}><SettingsPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<Loading />}><UsersPage /></Suspense>} />
          <Route path="bibliography" element={<Suspense fallback={<Loading />}><BibliographyPage /></Suspense>} />
        </Route>

        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
