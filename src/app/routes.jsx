import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Portal from './Portal';
import Home from './Home';
import FairnessLabPage from '../features/fairness/FairnessLabPage';
import VerificationLabPage from '../features/verification/VerificationLabPage';
import RoleLabPage from '../features/role/RoleLabPage';
import AgentLabPage from '../features/agent/AgentLabPage';
import AdminPage from './AdminPage';
import ContentProtected from './ContentProtected';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Main Portal: ALWAYS 100% PUBLIC (Zero passcode gate) */}
      <Route path="/" element={<Portal />} />

      {/* 2. Admin Console: Separate admin route (Protected by admin master code) */}
      <Route path="/admin" element={<AdminPage />} />

      {/* 3. Educational Labs: Protected by Content Lock when admin enables it */}
      <Route
        path="/literacy"
        element={
          <ContentProtected contentName="초등 AI 리터러시 실험 연구실">
            <Home />
          </ContentProtected>
        }
      />
      <Route
        path="/fairness"
        element={
          <ContentProtected contentName="공정성 실험실">
            <FairnessLabPage />
          </ContentProtected>
        }
      />
      <Route
        path="/verification"
        element={
          <ContentProtected contentName="팩트체크 실험실">
            <VerificationLabPage />
          </ContentProtected>
        }
      />
      <Route
        path="/role"
        element={
          <ContentProtected contentName="역할과 통제 실험실">
            <RoleLabPage />
          </ContentProtected>
        }
      />
      <Route
        path="/agent"
        element={
          <ContentProtected contentName="자율 에이전트 실험실">
            <AgentLabPage />
          </ContentProtected>
        }
      />
    </Routes>
  );
}
