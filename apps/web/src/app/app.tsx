import { BrowserRouter, Route, Routes } from 'react-router-dom';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<main aria-label="Money Level" />} />
      </Routes>
    </BrowserRouter>
  );
}
