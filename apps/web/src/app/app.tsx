import { ReactionProvider } from '../features/companion/reaction-provider.js';
import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppFrame } from './app-frame.js';

import { Dashboard } from '../features/dashboard/dashboard.js';
import { TransactionEntry } from '../features/transactions/transaction-entry.js';
import { History, HistoryDetail } from '../features/history/history.js';
import { Profile } from '../features/profile/profile.js';
import { Onboarding } from '../features/onboarding/onboarding.js';
import { useJournal } from './journal-context.js';
import { JournalProvider } from './journal-provider.js';

const EditEntry = lazy(() =>
  import('../features/history/edit-entry.js').then((section) => ({
    default: section.EditEntry,
  })),
);
const ManageAccounts = lazy(() =>
  import('../features/profile/manage-accounts.js').then((section) => ({
    default: section.ManageAccounts,
  })),
);
const ManageCategories = lazy(() =>
  import('../features/profile/manage-categories.js').then((section) => ({
    default: section.ManageCategories,
  })),
);

const Analytics = lazy(() =>
  import('../features/analytics/analytics.js').then((section) => ({
    default: section.Analytics,
  })),
);

const Budgets = lazy(() =>
  import('../features/budgets/budgets.js').then((section) => ({
    default: section.Budgets,
  })),
);

const Goals = lazy(() =>
  import('../features/goals/goals.js').then((section) => ({
    default: section.Goals,
  })),
);

const HumorPreferences = lazy(() =>
  import('../features/profile/humor-settings.js').then((section) => ({
    default: section.HumorPreferences,
  })),
);

const RoastReport = lazy(() =>
  import('../features/analytics/roast-report.js').then((section) => ({
    default: section.RoastReport,
  })),
);

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
        <Route
          path="transactions/expense"
          element={<TransactionEntry kind="expense" />}
        />
        <Route
          path="transactions/transfer"
          element={<TransactionEntry kind="transfer" />}
        />
        <Route path="setup" element={<Navigate to="/" replace />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<HistoryDetail />} />
        <Route path="history/:id/edit" element={<EditEntry />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="analytics/budgets" element={<Budgets />} />
        <Route path="analytics/roast" element={<RoastReport />} />
        <Route path="goals" element={<Goals />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/humor" element={<HumorPreferences />} />
        <Route path="profile/categories" element={<ManageCategories />} />
        <Route path="profile/accounts" element={<ManageAccounts />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <JournalProvider>
        <ReactionProvider>
          <AppRoutes />
        </ReactionProvider>
      </JournalProvider>
    </BrowserRouter>
  );
}
