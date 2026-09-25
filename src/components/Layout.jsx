import React, { useEffect, useState } from "react";
import {
  NavLink,
  useNavigate
} from "react-router-dom";

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


const menu = {

  student: [
    ["/dashboard", "Home", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/monitoring", "Monitoring", Activity],
    ["/consultations", "Counseling", Calendar],
    ["/notifications", "Notifications", Bell],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User]
  ],


  faculty: [
    ["/dashboard", "Home", Home],
    ["/assessment", "Assessment", ClipboardList],
    ["/monitoring", "Monitoring", Activity],
    ["/consultations", "Counseling", Calendar],
    ["/notifications", "Notifications", Bell],
    ["/referrals", "Referrals", Users],
    ["/history", "History", FileText],
    ["/feedback", "Ratings & Feedback", Star],
    ["/profile", "Profile", User]
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
    ["/profile", "Profile", User]
  ],


  counselor: [
    ["/dashboard", "Dashboard", Home],
    ["/cases", "Assessment Cases", ClipboardList],
    ["/counseling-requests", "Counseling Requests", Calendar],
    ["/user-profiles", "User Profiles", Users],
    ["/schedule", "Schedule", Calendar],
    ["/reports", "Reports", BarChart3]
  ],


  super_admin: [
    ["/dashboard", "Dashboard", Shield],
    ["/accounts", "Accounts", Users],
    ["/user-profiles", "User Profiles", Users],
    ["/cases", "Assessment Cases", ClipboardList],
    ["/counseling-requests", "Counseling Requests", Calendar],
    ["/reports", "Reports", BarChart3]
  ]
};


export default function Layout({
  children
}) {

  const {
    user,
    logout
  } = useAuth();


  const navigate =
    useNavigate();


  // Do not fall back to Student menu when user is logged out.
  const links =
    user?.role
      ? menu[user.role] || []
      : [];


  const [
    unreadNotifications,
    setUnreadNotifications
  ] = useState(0);


  // =====================================================
  // USER NOTIFICATION BADGE
  // =====================================================

  useEffect(
    () => {

      const isGeneralUser =
        [
          "student",
          "faculty",
          "personnel"
        ].includes(
          user?.role
        );


      if (
        !user?.id ||
        !isGeneralUser
      ) {

        setUnreadNotifications(0);

        return undefined;
      }


      const unsubscribe =
        subscribeCollection(
          "notifications",

          rows => {

            const unreadCount =
              rows.filter(
                row =>
                  row.read !== true &&
                  row.notificationType ===
                    "counselor_update" &&
                  row.senderRole ===
                    "counselor"
              ).length;


            setUnreadNotifications(
              unreadCount
            );
          },

          {
            ownerId:
              user.id
          }
        );


      return () => {

        if (
          typeof unsubscribe ===
          "function"
        ) {

          unsubscribe();
        }
      };

    },

    [
      user?.id,
      user?.role
    ]
  );


  // =====================================================
  // LOGOUT
  // =====================================================

  async function handleLogout() {

    const confirmed =
      window.confirm(
        "Are you sure you want to log out?"
      );


    if (!confirmed) {
      return;
    }


    try {

      // Sign out from Firebase/Auth first.
      await logout();


      // Return ALL roles to the public website Home page.
      navigate(
        "/",
        {
          replace: true
        }
      );

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );


      window.alert(
        "Unable to log out. Please try again."
      );
    }
  }


  // =====================================================
  // ROLE DISPLAY
  // =====================================================

  const roleLabel =
    user?.role
      ? user.role
          .replaceAll(
            "_",
            " "
          )
      : "user";


  return (

    <div className="app-shell">

      {/* ================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="brand">

          <img
            src={psuLogo}
            alt="Pangasinan State University Logo"
            className="sidebar-logo-image"
          />


          <div>

            <strong>
              MindTrack
            </strong>


            <small>
              {roleLabel}
            </small>

          </div>

        </div>


        <nav>

          {links.map(
            ([
              to,
              label,
              Icon
            ]) => (

              <NavLink

                key={to}

                to={to}

                className={
                  ({
                    isActive
                  }) =>
                    isActive
                      ? "nav-link active"
                      : "nav-link"
                }

              >

                <Icon
                  size={19}
                />


                <span>
                  {label}
                </span>


                {
                  to ===
                    "/notifications" &&
                  unreadNotifications >
                    0 && (

                    <span className="sidebar-notification-badge">

                      {
                        unreadNotifications >
                        99
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

          onClick={
            handleLogout
          }

        >

          <LogOut
            size={19}
          />


          <span>
            Logout
          </span>

        </button>

      </aside>


      {/* ================================================
          MAIN WORKSPACE
      ================================================= */}

      <div className="workspace">

        <header className="topbar">

          <div>

            <strong>
              Mental Health Monitoring System
            </strong>

          </div>


          <div className="top-user">

            <strong>
              {
                user?.name ||
                "User"
              }
            </strong>


            <small>
              {
                user?.department ||
                ""
              }
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