import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import DispenseLabels from './pages/DispenseLabels';
import DrugDatabase from './pages/DrugDatabase';
import WarningTemplates from './pages/WarningTemplates';
import PharmacyProfile from './pages/PharmacyProfile';
import LabelSettings from './pages/LabelSettings';
import { ensureCJKFont } from './lib/pdfFont';

export default function App() {
  useEffect(() => { ensureCJKFont(); }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DispenseLabels />} />
          <Route path="/drugs" element={<DrugDatabase />} />
          <Route path="/warnings" element={<WarningTemplates />} />
          <Route path="/profile" element={<PharmacyProfile />} />
          <Route path="/settings" element={<LabelSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
