import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bell,
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
import { useRows } from "../hooks/useRows";
import psuLogo from "../assets/psu-logo.jpg";

const menu = {
  student: [
    ["/dashboard", "Home", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/monitoring", "Monitoring", Activity],
    ["/consultations", "Counseling", Calendar],
    ["/notifications", "Notifications", Bell],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  teaching: [
    ["/dashboard", "Home", Home],
    ["/monitoring", "Monitoring", Activity],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  non_teaching: [
    ["/dashboard", "Home", Home],
    ["/monitoring", "Monitoring", Activity],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  // Legacy role aliases retained for older accounts.
  faculty: [
    ["/dashboard", "Home", Home],
    ["/monitoring", "Monitoring", Activity],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  personnel: [
    ["/dashboard", "Home", Home],
    ["/monitoring", "Monitoring", Activity],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  counselor: [
    ["/dashboard", "Dashboard", Home],
    ["/cases", "Assessment Cases", ClipboardList],
    ["/counseling-requests", "Counseling Requests", Calendar],
    ["/referrals", "Referrals", Users],
    ["/user-profiles", "User Profiles", Users],
    ["/schedule", "Schedule", Calendar],
    ["/notifications", "Notifications", Bell],
    ["/reports", "Reports", BarChart3],
  ],

  super_admin: [
    ["/dashboard", "Dashboard", Shield],
    ["/accounts", "Accounts", Users],
    ["/user-profiles", "User Profiles", Users],
    ["/cases", "Assessment Cases", ClipboardList],
    ["/counseling-requests", "Counseling Requests", Calendar],
    ["/referrals", "Referrals", Users],
    ["/reports", "Reports", BarChart3],
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    user?.role
      ? menu[user.role] || []
      : [];


  // The Notifications page and the sidebar must use the same Supabase
  // data source. RLS independently restricts rows to the signed-in owner.
  const notificationRoleSupported = [
    "student", "teaching", "non_teaching", "faculty", "personnel", "counselor"
  ].includes(user?.role);
  const notificationRows = useRows("notifications", {
    ownerId: notificationRoleSupported ? user?.id : undefined
  });
  const unreadNotifications = notificationRows.error
    ? 0
    : notificationRows.filter(row => row.read !== true).length;

  async function handleLogout() {

    const confirmed =
      window.confirm(
        "Are you sure you want to log out?"
      );

    if (!confirmed) {
      return;
    }

    try {

      await logout();

      // Force the browser to load the public Home page.
      // This prevents a protected-route redirect from sending
      // the user to /login during the logout state change.
      window.location.replace("/");

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

      alert(
        "Unable to log out. Please try again."
      );
    }
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

          {links.map(
            ([to, label, Icon]) => (

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


                {
                  to === "/notifications" &&
                  unreadNotifications > 0 && (

                    <span className="sidebar-notification-badge">
                      {
                        unreadNotifications > 99
                          ? "99+"
                          : unreadNotifications
                      }
                    </span>

                  )
                }

              </NavLink>

            )
          )}

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

          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >

            {
              [
                "student",
                "teaching",
                "non_teaching",
                "faculty",
                "personnel",
                "counselor"
              ].includes(user?.role) && (
                <button
                  type="button"
                  onClick={() => navigate("/notifications")}
                  aria-label={
                    unreadNotifications > 0
                      ? `Notifications, ${unreadNotifications} unread`
                      : "Notifications"
                  }
                  title="Notifications"
                  style={{
                    position: "relative",
                    width: "42px",
                    height: "42px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <Bell size={20} />

                  {unreadNotifications > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        minWidth: "19px",
                        height: "19px",
                        padding: "0 5px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        background: "#dc2626",
                        color: "#ffffff",
                        fontSize: "10px",
                        fontWeight: 800,
                        lineHeight: 1,
                        border: "2px solid #173f8f"
                      }}
                    >
                      {
                        unreadNotifications > 99
                          ? "99+"
                          : unreadNotifications
                      }
                    </span>
                  )}
                </button>
              )
            }

            <div className="top-user">
              <strong>
                {user?.name || "User"}
              </strong>

              <small>
                {user?.department || ""}
              </small>
            </div>

          </div>

        </header>

        <main className="content">
          {children}
        </main>

      </div>

    </div>
  );
}