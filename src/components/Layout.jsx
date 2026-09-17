import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Shield,
  Star,
  User,
  Users
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import psuLogo from "../assets/psu-logo.jpg";

const menu = {
  student: [
    ["/dashboard", "Dashboard", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/consultations", "Counseling", Calendar],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  faculty: [
    ["/dashboard", "Dashboard", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/consultations", "Counseling", Calendar],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  personnel: [
    ["/dashboard", "Dashboard", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/consultations", "Counseling", Calendar],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  counselor: [
    ["/dashboard", "Dashboard", Home],
    ["/cases", "Cases", ClipboardList],
    ["/user-profiles", "User Profiles", Users],
    ["/schedule", "Schedule", Calendar],
    ["/reports", "Reports", BarChart3],
  ],

  super_admin: [
    ["/dashboard", "Dashboard", Shield],
    ["/accounts", "Accounts", Users],
    ["/user-profiles", "User Profiles", Users],
    ["/cases", "All Cases", ClipboardList],
    ["/reports", "Reports", BarChart3],
  ],
};

export default function Layout({ children }) {
  const { user, logout, firebaseEnabled } = useAuth();
  const navigate = useNavigate();

  const links = menu[user?.role] || menu.student;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="brand">

          <img
            src={psuLogo}
            alt="Pangasinan State University Logo"
            className="sidebar-logo-image"
          />

          <div>
            <strong>MindTrack</strong>
            <small>
              {user?.role
                ? user.role.replace("_", " ")
                : "user"}
            </small>
          </div>

        </div>

        <nav>

          {links.map(([to, label, Icon]) => (

            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>

          ))}

        </nav>

        <button
          type="button"
          className="nav-link logout"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>

      </aside>

      <div className="workspace">

        <header className="topbar">

          <div>

            <strong>
              Mental Health Monitoring System
            </strong>

            <span
              className={
                firebaseEnabled
                  ? "live-pill"
                  : "demo-pill"
              }
            >
              {firebaseEnabled
                ? "● Firebase real-time"
                : "Demo mode"}
            </span>

          </div>

          <div className="top-user">

            <strong>
              {user?.name || "User"}
            </strong>

            <small>
              {user?.department || ""}
            </small>

          </div>

        </header>

        <main className="content">
          {children}
        </main>

      </div>

    </div>
  );
}
