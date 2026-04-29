import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LayoutDashboard, ScanLine, GitCompare, Shield, LogOut, User, Code } from "lucide-react";
import HUDOverlay from "../components/HUDOverlay";
import "../styles/main.css";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analyze", icon: ScanLine, label: "Analyze" },
  { to: "/compare", icon: GitCompare, label: "Compare" },
  { to: "/developer", icon: Code, label: "Developer API" },
];

export default function AppLayout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const mobileNavItems = isAdmin
    ? [...navItems, { to: "/admin", icon: Shield, label: "Admin" }]
    : navItems;

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <div className="app-shell">
      <HUDOverlay />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">A</span>
          <span className="brand-name">AuthentiScan</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
              {React.createElement(icon, { size: 16 })}
              <span>{label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
              <Shield size={16} />
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <User size={14} />
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role">{user?.role}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} aria-label="Log out">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <main className="main-stage">
        {children}
      </main>

      <nav className="mobile-nav" aria-label="Primary navigation">
        {mobileNavItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-item ${isActive ? "mobile-nav-item-active" : ""}`}>
            {React.createElement(icon, { size: 17 })}
            <span>{label}</span>
          </NavLink>
        ))}
        <button className="mobile-nav-item mobile-nav-logout" onClick={handleLogout} aria-label="Log out">
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
