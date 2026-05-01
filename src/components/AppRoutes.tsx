import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BalloonRunPage from '../pages/BalloonRun';

function ProtectedAppLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <ProtectedAppLayout>
      <Routes>
        <Route path="/" element={<BalloonRunPage />} />
        <Route path="/balloon-run" element={<BalloonRunPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProtectedAppLayout>
  );
}
