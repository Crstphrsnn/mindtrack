import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ======================================================
// PROTECTED ROUTES
// ======================================================

export function Protected({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        Loading MindTrack…
      </div>
    );
  }

  return user
    ? children
    : <Navigate to="/" replace />;
}


export function RoleProtected({
  children,
  allowedRoles = []
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        Loading MindTrack…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return allowedRoles.includes(user.role)
    ? children
    : <Navigate to="/dashboard" replace />;
}
