import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { BoardProvider } from '@/lib/board';
import { DisplayApp } from '@/display/DisplayApp';
import { RequireAdmin } from '@/control/RequireAdmin';

const ControlApp = lazy(() => import('@/control/ControlApp').then((module) => ({ default: module.ControlApp })));

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BoardProvider>
          <Routes>
            <Route path="/" element={<DisplayApp />} />
            <Route path="/screen/:screenId" element={<DisplayApp />} />
            <Route
              path="/control"
              element={
                <RequireAdmin>
                  <Suspense fallback={<div className="cb-control flex min-h-screen items-center justify-center bg-paper text-sm text-muted">Opening the control panel…</div>}>
                    <ControlApp />
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BoardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
