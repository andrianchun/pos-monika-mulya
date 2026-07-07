import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterSaaS from './pages/RegisterSaaS';
import PosApp from './PosApp';

import SuperAdminApp from './SuperAdminApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterSaaS />} />
        <Route path="/superadmin/*" element={<SuperAdminApp />} />
        {/* Tenant Area: Menangkap tenantId dari URL, lalu melemparkan kontrol ke PosApp */}
        <Route path="/:tenantId/*" element={<PosApp />} />
      </Routes>
    </BrowserRouter>
  );
}
