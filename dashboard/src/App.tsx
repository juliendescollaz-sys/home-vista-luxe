import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import {
  Dashboard,
  SitesPage,
  SitePage,
  SettingsPage,
  MonitoringPage,
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/sites/:siteId" element={<SitePage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
