import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppFrame } from './app-frame.js';

export function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
