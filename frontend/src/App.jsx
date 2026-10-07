import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import NiveauxPage from './pages/NiveauxPage';
import ModulesPage from './pages/ModulesPage';
import StudentsSearchPage from './pages/StudentsSearchPage';
import StudentDashboardPage from './pages/StudentDashboardPage';

import RattrapagesPage from './pages/RattrapagesPage';
import RecommandationsPage from './pages/RecommandationsPage';
import PlaceholderPage from './pages/PlaceholderPage';

function PrivateRoute({ children }) {
  const { isAuth } = useAuth();
  return isAuth ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/import" element={<PrivateRoute><ImportPage /></PrivateRoute>} />
      <Route path="/niveaux" element={<PrivateRoute><NiveauxPage /></PrivateRoute>} />
      <Route path="/modules" element={<PrivateRoute><ModulesPage /></PrivateRoute>} />
      <Route path="/students" element={<PrivateRoute><StudentsSearchPage /></PrivateRoute>} />
      <Route path="/students/:id" element={<PrivateRoute><StudentDashboardPage /></PrivateRoute>} />
      <Route path="/rattrapages" element={<PrivateRoute><RattrapagesPage /></PrivateRoute>} />
      <Route path="/recommandations" element={<PrivateRoute><RecommandationsPage /></PrivateRoute>} />
      <Route path="/recommandations-decisionnelles" element={<PrivateRoute><RecommandationsPage /></PrivateRoute>} />
      <Route path="/alertes" element={<Navigate to="/recommandations" replace />} />
      <Route path="/settings" element={<PrivateRoute><PlaceholderPage title="Paramètres" description="Configuration et préférences" /></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}