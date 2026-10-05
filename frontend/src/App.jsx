import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import StudentsSearchPage from './pages/StudentsSearchPage';
import StudentDashboardPage from './pages/StudentDashboardPage';

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
      <Route path="/niveaux" element={<PrivateRoute><PlaceholderPage title="Analyse des niveaux" description="Vue détaillée par niveau académique" /></PrivateRoute>} />
      <Route path="/modules" element={<PrivateRoute><PlaceholderPage title="Analyse des modules" description="Performances et surveillance des modules" /></PrivateRoute>} />
      <Route path="/students" element={<PrivateRoute><StudentsSearchPage /></PrivateRoute>} />
      <Route path="/students/:id" element={<PrivateRoute><StudentDashboardPage /></PrivateRoute>} />
      <Route path="/rattrapages" element={<PrivateRoute><PlaceholderPage title="Rattrapages" description="Suivi des sessions et passages en rattrapage" /></PrivateRoute>} />
      <Route path="/alertes" element={<PrivateRoute><PlaceholderPage title="Alertes" description="Notification et détection des situations critiques" /></PrivateRoute>} />
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