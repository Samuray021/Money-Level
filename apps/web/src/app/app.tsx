import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppFrame } from './app-frame.js';

import { Dashboard } from '../features/dashboard/dashboard.js';
import { TransactionEntry } from '../features/transactions/transaction-entry.js';
import { Onboarding } from '../features/onboarding/onboarding.js';
import { useJournal } from './journal-context.js';
import { JournalProvider } from './journal-provider.js';

function AppRoutes() {
  const { profile } = useJournal();
  if (!profile?.onboardingCompleted) {
    return (
      <Routes>
        <Route element={<AppFrame showNavigation={false} />}>
          <Route path="setup" element={<Onboarding />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppFrame />}>
        <Route index element={<Dashboard />} />
        <Route
          path="transactions/income"
          element={<TransactionEntry kind="income" />}
        />
        <Route path="setup" element={<Navigate to="/" replace />} />
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
