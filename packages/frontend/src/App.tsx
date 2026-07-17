import { NavLink, Route, Routes } from "react-router-dom";
import { SelectorPage } from "./pages/SelectorPage";
import { ImportPage } from "./pages/ImportPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NotificationsPage } from "./pages/NotificationsPage";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>EOL Tracker</h1>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/selector">Selector</NavLink>
          <NavLink to="/import">Import / Export</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/selector" element={<SelectorPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </main>
    </div>
  );
}
