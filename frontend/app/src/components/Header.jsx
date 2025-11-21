import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navStyles = ({ isActive }) => ({
  padding: "8px 12px",
  borderRadius: "8px",
  backgroundColor: isActive ? "var(--accent-soft)" : "transparent",
  color: isActive ? "var(--accent)" : "inherit",
  textDecoration: "none",
  fontWeight: 500,
});

export default function Header() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header
      style={{
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(255,255,255,0.9)",
        borderBottom: "1px solid #e2e8f0",
        padding: "16px 5vw",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong>CareForAll Control Room</strong>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            Single base URL · http://localhost:8080 via nginx gateway
          </div>
        </div>
        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <NavLink to="/" style={navStyles} end>
            Overview
          </NavLink>
          <NavLink to="/admin" style={navStyles}>
            Admin
          </NavLink>
          {token ? (
            <>
              <span className="chip">{user?.name ?? "operator"}</span>
              <button className="btn secondary" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/admin" style={navStyles}>
              Sign in
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
