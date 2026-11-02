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
      title: "Psychological Assessment (Students)",
      text: "Students complete mental health screening tools for guidance counselor review.",
      icon: ClipboardList,
      color: "blue"
    },
    {
      title: "Counseling Requests (Students)",
      text: "Students request counseling and track approvals or rescheduling.",
      icon: MessageCircle,
      color: "teal"
    },
    {
      title: "Guidance Referrals (Teaching & Non-teaching)",
      text: "Teaching and non-teaching personnel submit student referrals and track their status.",
      icon: Users,
      color: "gold"
    },
    {
      title: "Monitoring & Case Follow-ups",
      text: "Students view reviewed monitoring results; counselors follow assigned cases.",
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

        </header>

        <main className="home-main">

          <section className="home-hero">

            <div className="home-copy">
              <div className="home-eyebrow">
                SUPPORT TODAY, A BRIGHTER TOMORROW
              </div>

              <h1>
                Student well-being monitoring and guidance support.
              </h1>

              <p className="home-description">
                MindTrack is a web-based mental health monitoring and guidance
                support system for PSU Lingayen. Students can complete psychological
                screening assessments, view counselor-reviewed monitoring results,
                and request counseling. Teaching and non-teaching personnel can
                submit and track student referrals to the Guidance and Counseling Office.
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
              MindTrack services depend on your account role. Students can access
              assessments and counseling; teaching and non-teaching personnel use referrals.
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
