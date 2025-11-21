import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CampaignDetails from "./pages/CampaignDetails.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

export default function App() {
  return (
    <div>
      <Header />
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaign/:id" element={<CampaignDetails />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </div>
  );
}
