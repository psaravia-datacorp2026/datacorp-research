import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { PrioritizationSetupPage } from './pages/PrioritizationSetupPage';
import { PrioritizationCanvasPage } from './pages/PrioritizationCanvasPage';
import { PrioritizationResultsPage } from './pages/PrioritizationResultsPage';
import { AssumptionSetupPage } from './pages/AssumptionSetupPage';
import { AssumptionCanvasPage } from './pages/AssumptionCanvasPage';
import { AssumptionResultsPage } from './pages/AssumptionResultsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/project/:projectId" element={<ProjectDetailsPage />} />
          <Route
            path="/prioritization/setup"
            element={<PrioritizationSetupPage />}
          />
          <Route
            path="/prioritization/canvas"
            element={<PrioritizationCanvasPage />}
          />
          <Route
            path="/prioritization/results"
            element={<PrioritizationResultsPage />}
          />
          <Route
            path="/assumptions/setup"
            element={<AssumptionSetupPage />}
          />
          <Route
            path="/assumptions/canvas"
            element={<AssumptionCanvasPage />}
          />
          <Route
            path="/assumptions/results"
            element={<AssumptionResultsPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
