import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const CustomerMenu = lazy(() => import('./components/CustomerMenu'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

// v1.0.3 - Force reload
export default function App() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>}>
        <Routes>
          <Route path="/" element={<CustomerMenu />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
