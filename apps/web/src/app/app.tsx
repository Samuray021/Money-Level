import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppFrame } from './app-frame.js';

import { ProfileSetup } from '../features/onboarding/profile-setup.js';
import { useJournal } from './journal-context.js';
import { JournalProvider } from './journal-provider.js';

function AppRoutes() {
  const { profile } = useJournal();
  if (!profile?.onboardingCompleted) {
    return (
      <Routes>
        <Route element={<AppFrame showNavigation={false} />}>
          <Route path="setup" element={<ProfileSetup />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppFrame />}>
        <Route index element={<h1>Главная</h1>} />
        <Route path="history" element={<h1>История</h1>} />
        <Route path="analytics" element={<h1>Аналитика</h1>} />
        <Route path="goals" element={<h1>Цели</h1>} />
        <Route path="profile" element={<h1>Профиль</h1>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <JournalProvider>
        <AppRoutes />
      </JournalProvider>
    </BrowserRouter>
  );
}
