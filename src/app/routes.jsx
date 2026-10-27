import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Portal from './Portal';
import Home from './Home';
import FairnessLabPage from '../features/fairness/FairnessLabPage';
import VerificationLabPage from '../features/verification/VerificationLabPage';
import RoleLabPage from '../features/role/RoleLabPage';
import AgentLabPage from '../features/agent/AgentLabPage';
import { BASE_PATH, MATERIALS_PATH } from './materialsRoute';

const BasePage = lazy(() => import('./BasePage'));

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Main Portal: ALWAYS 100% PUBLIC (Zero passcode gate) */}
      <Route path="/" element={<Portal />} />

      <Route path={BASE_PATH} element={<Suspense fallback={<p role="status">기지를 불러오는 중입니다.</p>}><BasePage /></Suspense>} />
      <Route path={MATERIALS_PATH} element={<Navigate to={BASE_PATH} replace />} />
      <Route path="/admin" element={<Navigate to={BASE_PATH} replace />} />

      {/* Educational activities stay publicly available. */}
      <Route
        path="/literacy"
        element={
          <Home />
        }
      />
      <Route
        path="/fairness"
        element={
          <FairnessLabPage />
        }
      />
      <Route
        path="/verification"
        element={
          <VerificationLabPage />
        }
      />
      <Route
        path="/role"
        element={
          <RoleLabPage />
        }
      />
      <Route
        path="/agent"
        element={
          <AgentLabPage />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
