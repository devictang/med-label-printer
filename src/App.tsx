import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DispenseLabelsPage from './pages/DispenseLabels';
import DrugDatabasePage from './pages/DrugDatabase';
import PharmacyProfilePage from './pages/PharmacyProfile';
import LabelSettingsPage from './pages/LabelSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DispenseLabelsPage />} />
          <Route path="/drugs" element={<DrugDatabasePage />} />
          <Route path="/profile" element={<PharmacyProfilePage />} />
          <Route path="/settings" element={<LabelSettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
