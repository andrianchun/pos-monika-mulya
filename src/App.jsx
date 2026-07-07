import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterSaaS from './pages/RegisterSaaS';
import PosApp from './PosApp';
import TenantWrapper from './components/TenantWrapper';

import SuperAdminApp from './SuperAdminApp';

import GlobalLogin from './pages/GlobalLogin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterSaaS />} />
        <Route path="/login" element={<GlobalLogin />} />
        <Route path="/superadmin/*" element={<SuperAdminApp />} />
        <Route path="/:tenantId/*" element={<TenantWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}
