import React, { useEffect, useState } from "react";
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
import {
  subscribeCollection
} from "../services/dataService";
import psuLogo from "../assets/psu-logo.jpg";

function accountRoleLabel(role) {
  if (role === "student") return "Student";
  if (role === "teaching" || role === "faculty") return "Teaching";
  if (role === "non_teaching" || role === "personnel") return "Non-teaching";
  if (role === "counselor") return "Guidance Counselor";
  if (role === "super_admin") return "Super Admin";
  return role || "User";
}


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
    ["/assessment", "Assessment", ClipboardList],
    ["/monitoring", "Monitoring", Activity],
    ["/consultations", "Counseling", Calendar],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  non_teaching: [
    ["/dashboard", "Home", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/monitoring", "Monitoring", Activity],
    ["/consultations", "Counseling", Calendar],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  // Legacy role values remain supported so existing accounts continue
  // working without a risky Firestore migration.
  faculty: [
    ["/dashboard", "Home", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/monitoring", "Monitoring", Activity],
    ["/consultations", "Counseling", Calendar],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User],
  ],

  personnel: [
    ["/dashboard", "Home", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/monitoring", "Monitoring", Activity],
    ["/consultations", "Counseling", Calendar],
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
    menu[user?.role] ||
    menu.student;


  const [
    unreadNotifications,
    setUnreadNotifications
  ] = useState(0);


  const notificationAccess =
    Boolean(
      user?.id &&
      (
        [
          "student",
          "teaching",
          "non_teaching",
          "faculty",
          "personnel"
        ].includes(
          user?.role
        )
        ||
        user?.role ===
          "counselor"
      )
    );


  useEffect(
    () => {

      if (
        !notificationAccess
      ) {

        setUnreadNotifications(0);

        return undefined;
      }


      return subscribeCollection(
        "notifications",
        rows => {

          const visibleUnread =
            rows.filter(
              row => {

                if (row.read) {
                  return false;
                }


                if (
                  user?.role ===
                  "counselor"
                ) {

                  return [
                    "assessment_submitted",
                    "counseling_request_submitted",
                    "referral_submitted",
                    "transfer_request",
                    "transfer_status"
                  ].includes(
                    row.notificationType
                  );
                }


                return [
                  "counselor_update",
                  "counselor_transfer_update"
                ].includes(
                  row.notificationType
                ) &&
                row.senderRole ===
                  "counselor";
              }
            );


          setUnreadNotifications(
            visibleUnread.length
          );
        },
        {
          ownerId:
            user.id
        }
      );

    },

    [
      notificationAccess,
      user?.id,
      user?.role
    ]
  );


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
              {
                accountRoleLabel(
                  user?.role
                )
              }
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

          <div className="top-user-area">

            {notificationAccess && (

              <button

                type="button"

                className="topbar-notification-button"

                onClick={
                  () =>
                    navigate(
                      "/notifications"
                    )
                }

                aria-label={
                  unreadNotifications > 0
                    ? `${unreadNotifications} unread notifications`
                    : "Open notifications"
                }

                title="Notifications"

              >

                <Bell
                  size={20}
                />


                {unreadNotifications > 0 && (

                  <span className="topbar-notification-badge">

                    {
                      unreadNotifications > 99
                        ? "99+"
                        : unreadNotifications
                    }

                  </span>

                )}

              </button>

            )}


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
