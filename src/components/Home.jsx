import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  ClipboardList,
  MessageCircle,
  Users
} from "lucide-react";

import psuLogo from "../assets/psu-logo.jpg";
import psuCampus from "../assets/psu-campus.png";

import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const services = [
    {
      title: "Mental Health Assessment",
      text: "Complete mental health assessments to check your well-being.",
      icon: ClipboardList,
      color: "blue"
    },
    {
      title: "Counseling Requests",
      text: "Request a counseling session with the Guidance and Counseling Office.",
      icon: MessageCircle,
      color: "teal"
    },
    {
      title: "Referral Support",
      text: "Get connected to appropriate support services when needed.",
      icon: Users,
      color: "gold"
    },
    {
      title: "Case Monitoring",
      text: "Track the status of your requests, cases, and follow-ups.",
      icon: Activity,
      color: "violet"
    }
  ];

  return (
    <div className="home-page">
      <div className="home-shell">

        <header className="home-header">
          <div className="home-brand">
            <img
              src={psuLogo}
              alt="Pangasinan State University Logo"
              className="home-logo"
            />

            <div className="home-brand-name">
              MindTrack
            </div>
          </div>

          <div className="home-system-name">
            PSU Lingayen Mental Health Monitoring System
          </div>
        </header>

        <main className="home-main">

          <section className="home-hero">

            <div className="home-copy">
              <div className="home-eyebrow">
                SUPPORT TODAY, A BRIGHTER TOMORROW
              </div>

              <h1>
                A private and accessible way to request psychosocial support.
              </h1>

              <p className="home-description">
                MindTrack provides students, faculty, and personnel with a
                private and accessible way to complete mental health assessments,
                request counseling, and stay connected
                with the PSU Lingayen Guidance and Counseling Office.
              </p>

              <div className="home-actions">
                <button
                  className="home-button home-button-primary"
                  onClick={() => navigate("/login")}
                >
                  Login
                  <ArrowRight size={20} />
                </button>

                <button
                  className="home-button home-button-secondary"
                  onClick={() => navigate("/register")}
                >
                  Register
                  <ArrowRight size={20} />
                </button>
              </div>

              <p className="home-support-line">
                Your well-being matters. We&apos;re here to listen.
              </p>
            </div>

            <div className="home-campus-wrap">
              <img
                src={psuCampus}
                alt="Pangasinan State University Lingayen Campus"
                className="home-campus-image"
              />
              <div className="home-campus-fade" />
            </div>
          </section>

          <aside className="home-services">
            <h2>Services Offered</h2>

            <p className="home-services-intro">
              Access the following mental health support services through
              MindTrack.
            </p>

            <div className="home-service-list">
              {services.map(service => {
                const Icon = service.icon;

                return (
                  <button
                    key={service.title}
                    type="button"
                    className="home-service-item"
                    onClick={() => navigate("/login")}
                  >
                    <span
                      className={`home-service-icon ${service.color}`}
                    >
                      <Icon size={25} />
                    </span>

                    <span className="home-service-copy">
                      <strong>{service.title}</strong>
                      <small>{service.text}</small>
                    </span>

                    <ChevronRight
                      size={20}
                      className="home-service-chevron"
                    />
                  </button>
                );
              })}
            </div>
          </aside>

        </main>

      </div>
    </div>
  );
}
