import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CustomerMenu from './components/CustomerMenu';
import AdminDashboard from './components/AdminDashboard';

// v1.0.3 - Force reload
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CustomerMenu />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}
