// Client/src/pages/HomePage.jsx

import { Link } from "react-router-dom";

function HomePage() {
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("worksync_user"));
  } catch (error) {
    user = null;
  }

  const getDashboardPath = () => {
    if (!user) return "/login";

    const role = String(user.role || "").toLowerCase();

    if (["hr", "admin", "mentor"].includes(role)) {
      return "/hr-dashboard";
    }

    if (role === "intern") {
      return "/intern-dashboard";
    }

    return "/apply";
  };

  const flowSteps = [
    "Recruitment",
    "Application Review",
    "Onboarding",
    "Training",
    "Attendance & Logs",
    "Task Management",
    "Performance Review",
    "Certificate",
  ];

  const features = [
    {
      title: "Applicant Management",
      text: "Track applications, shortlist candidates, update status, and onboard selected interns.",
    },
    {
      title: "Automated Onboarding",
      text: "Generate intern accounts, temporary credentials, departments, mentors, and joining details.",
    },
    {
      title: "Department Training",
      text: "Assign theory modules, video resources, tests, and progress tracking based on department.",
    },
    {
      title: "Attendance & Work Logs",
      text: "Interns can check in, check out, and submit daily work updates for HR review.",
    },
    {
      title: "Task Management",
      text: "HR can assign tasks, set priority, track due dates, and monitor task completion.",
    },
    {
      title: "Performance & Certificate",
      text: "Calculate performance using training, tasks, attendance, logs, and issue certificates.",
    },
  ];

  return (
    <>
      <style>
        {`
          .home-pro-page {
            background: #050505;
            color: #ffffff;
            min-height: calc(100vh - 90px);
          }

          .home-pro-hero {
            padding: 76px 6% 64px;
            border-bottom: 1px solid rgba(255, 122, 0, 0.2);
            background:
              linear-gradient(90deg, rgba(255, 122, 0, 0.08), transparent 45%),
              #050505;
          }

          .home-pro-hero-grid {
            max-width: 1360px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 58px;
            align-items: center;
          }

          .home-pro-eyebrow {
            color: #ff7a00;
            font-size: 14px;
            font-weight: 1000;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            margin-bottom: 22px;
          }

          .home-pro-title {
            font-size: clamp(46px, 7vw, 88px);
            line-height: 0.98;
            letter-spacing: -0.06em;
            margin-bottom: 24px;
            max-width: 820px;
          }

          .home-pro-title span {
            color: #ff7a00;
          }

          .home-pro-subtitle {
            color: #d3d3d3;
            font-size: 20px;
            line-height: 1.7;
            max-width: 760px;
            margin-bottom: 34px;
          }

          .home-pro-actions {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 36px;
          }

          .home-pro-btn {
            min-height: 56px;
            padding: 0 28px;
            border-radius: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-weight: 1000;
            font-size: 16px;
            transition: 0.2s ease;
          }

          .home-pro-btn.primary {
            background: #ff7a00;
            color: #000000;
          }

          .home-pro-btn.secondary {
            background: transparent;
            color: #ffffff;
            border: 1px solid rgba(255, 122, 0, 0.55);
          }

          .home-pro-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 42px rgba(255, 122, 0, 0.18);
          }

          .home-pro-metrics {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            max-width: 860px;
          }

          .home-pro-metric {
            background: #0d0d0d;
            border: 1px solid rgba(255, 122, 0, 0.18);
            border-radius: 18px;
            padding: 18px;
          }

          .home-pro-metric strong {
            display: block;
            color: #ff7a00;
            font-size: 26px;
            margin-bottom: 6px;
          }

          .home-pro-metric span {
            color: #bdbdbd;
            font-size: 13px;
            font-weight: 800;
          }

          .home-pro-flow-card {
            background: #0b0b0b;
            border: 1px solid rgba(255, 122, 0, 0.28);
            border-radius: 30px;
            padding: 36px;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
          }

          .home-pro-flow-card h2 {
            color: #ff7a00;
            font-size: 34px;
            margin-bottom: 26px;
            letter-spacing: -0.03em;
          }

          .home-pro-flow-list {
            display: grid;
            gap: 14px;
          }

          .home-pro-flow-item {
            display: flex;
            align-items: center;
            gap: 16px;
            background: #050505;
            border: 1px solid #252525;
            border-radius: 18px;
            padding: 18px;
          }

          .home-pro-flow-number {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(255, 122, 0, 0.14);
            color: #ff7a00;
            display: grid;
            place-items: center;
            font-weight: 1000;
            border: 1px solid rgba(255, 122, 0, 0.35);
          }

          .home-pro-flow-item strong {
            color: #ffffff;
            font-size: 17px;
          }

          .home-pro-section {
            padding: 74px 6%;
          }

          .home-pro-section-inner {
            max-width: 1360px;
            margin: 0 auto;
          }

          .home-pro-section-header {
            max-width: 780px;
            margin-bottom: 34px;
          }

          .home-pro-section-header p {
            color: #ff7a00;
            font-size: 13px;
            font-weight: 1000;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            margin-bottom: 10px;
          }

          .home-pro-section-header h2 {
            color: #ffffff;
            font-size: clamp(32px, 5vw, 52px);
            letter-spacing: -0.05em;
            margin-bottom: 14px;
          }

          .home-pro-section-header span {
            color: #bdbdbd;
            font-size: 17px;
            line-height: 1.7;
          }

          .home-pro-feature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 22px;
          }

          .home-pro-feature-card {
            background: #0b0b0b;
            border: 1px solid rgba(255, 122, 0, 0.18);
            border-radius: 24px;
            padding: 28px;
            min-height: 210px;
            transition: 0.2s ease;
          }

          .home-pro-feature-card:hover {
            transform: translateY(-4px);
            border-color: rgba(255, 122, 0, 0.45);
          }

          .home-pro-feature-icon {
            width: 46px;
            height: 46px;
            border-radius: 14px;
            background: #ff7a00;
            color: #000000;
            display: grid;
            place-items: center;
            font-weight: 1000;
            margin-bottom: 18px;
          }

          .home-pro-feature-card h3 {
            color: #ffffff;
            font-size: 21px;
            margin-bottom: 12px;
          }

          .home-pro-feature-card p {
            color: #bdbdbd;
            line-height: 1.65;
          }

          .home-pro-process {
            background: #080808;
            border-top: 1px solid rgba(255, 122, 0, 0.18);
            border-bottom: 1px solid rgba(255, 122, 0, 0.18);
          }

          .home-pro-process-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 18px;
          }

          .home-pro-process-step {
            background: #050505;
            border: 1px solid #242424;
            border-radius: 20px;
            padding: 24px;
          }

          .home-pro-process-step span {
            color: #ff7a00;
            font-weight: 1000;
            font-size: 13px;
            letter-spacing: 0.12em;
          }

          .home-pro-process-step h3 {
            color: #ffffff;
            margin: 12px 0 10px;
            font-size: 20px;
          }

          .home-pro-process-step p {
            color: #bdbdbd;
            line-height: 1.6;
          }

          .home-pro-cta {
            padding: 70px 6%;
          }

          .home-pro-cta-box {
            max-width: 1360px;
            margin: 0 auto;
            background: #0b0b0b;
            border: 1px solid rgba(255, 122, 0, 0.28);
            border-radius: 30px;
            padding: 42px;
            display: flex;
            justify-content: space-between;
            gap: 30px;
            align-items: center;
          }

          .home-pro-cta-box h2 {
            font-size: clamp(30px, 5vw, 48px);
            letter-spacing: -0.04em;
            margin-bottom: 10px;
          }

          .home-pro-cta-box p {
            color: #bdbdbd;
            font-size: 17px;
            line-height: 1.6;
          }

          .home-pro-footer {
            padding: 34px 6%;
            border-top: 1px solid rgba(255, 122, 0, 0.18);
            color: #8f8f8f;
            display: flex;
            justify-content: space-between;
            gap: 20px;
            flex-wrap: wrap;
          }

          .home-pro-footer strong {
            color: #ffffff;
          }

          @media (max-width: 1100px) {
            .home-pro-hero-grid,
            .home-pro-feature-grid,
            .home-pro-process-grid {
              grid-template-columns: 1fr 1fr;
            }

            .home-pro-flow-card {
              grid-column: span 2;
            }
          }

          @media (max-width: 760px) {
            .home-pro-hero {
              padding-top: 48px;
            }

            .home-pro-hero-grid,
            .home-pro-feature-grid,
            .home-pro-process-grid,
            .home-pro-metrics {
              grid-template-columns: 1fr;
            }

            .home-pro-flow-card {
              grid-column: span 1;
              padding: 26px;
            }

            .home-pro-cta-box {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}
      </style>

      <main className="home-pro-page">
        <section className="home-pro-hero">
          <div className="home-pro-hero-grid">
            <div>
              <p className="home-pro-eyebrow">
                Internship Lifecycle Management Platform
              </p>

              <h1 className="home-pro-title">
                Manage every intern from{" "}
                <span>application</span> to <span>certificate.</span>
              </h1>

              <p className="home-pro-subtitle">
                WorkSync manages recruitment, onboarding, department-wise
                training, attendance, daily work logs, task management,
                performance evaluation, and certificate generation.
              </p>

              <div className="home-pro-actions">
                {!user && (
                  <>
                    <Link className="home-pro-btn primary" to="/apply">
                      Apply Now
                    </Link>

                    <Link className="home-pro-btn secondary" to="/login">
                      Login to Dashboard
                    </Link>
                  </>
                )}

                {user && (
                  <Link className="home-pro-btn primary" to={getDashboardPath()}>
                    Go to Dashboard
                  </Link>
                )}
              </div>

              <div className="home-pro-metrics">
                <div className="home-pro-metric">
                  <strong>12+</strong>
                  <span>Departments</span>
                </div>

                <div className="home-pro-metric">
                  <strong>Auto</strong>
                  <span>Training Assignment</span>
                </div>

                <div className="home-pro-metric">
                  <strong>Live</strong>
                  <span>Progress Tracking</span>
                </div>

                <div className="home-pro-metric">
                  <strong>1 Click</strong>
                  <span>Certificate Flow</span>
                </div>
              </div>
            </div>

            <aside className="home-pro-flow-card">
              <h2>WorkSync Flow</h2>

              <div className="home-pro-flow-list">
                {flowSteps.map((step, index) => (
                  <div className="home-pro-flow-item" key={step}>
                    <div className="home-pro-flow-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <strong>{step}</strong>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="home-pro-section">
          <div className="home-pro-section-inner">
            <div className="home-pro-section-header">
              <p>Platform Modules</p>
              <h2>Everything needed to manage internships professionally.</h2>
              <span>
                Built for HR teams, mentors, and interns to work from one
                connected dashboard.
              </span>
            </div>

            <div className="home-pro-feature-grid">
              {features.map((feature, index) => (
                <div className="home-pro-feature-card" key={feature.title}>
                  <div className="home-pro-feature-icon">{index + 1}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="home-pro-section home-pro-process">
          <div className="home-pro-section-inner">
            <div className="home-pro-section-header">
              <p>How It Works</p>
              <h2>A simple lifecycle from applicant to certified intern.</h2>
            </div>

            <div className="home-pro-process-grid">
              <div className="home-pro-process-step">
                <span>STEP 01</span>
                <h3>Apply</h3>
                <p>Applicants submit details, skills, links, and role interest.</p>
              </div>

              <div className="home-pro-process-step">
                <span>STEP 02</span>
                <h3>Onboard</h3>
                <p>HR selects applicants and generates intern credentials.</p>
              </div>

              <div className="home-pro-process-step">
                <span>STEP 03</span>
                <h3>Track</h3>
                <p>Interns complete training, tasks, attendance, and logs.</p>
              </div>

              <div className="home-pro-process-step">
                <span>STEP 04</span>
                <h3>Certify</h3>
                <p>HR reviews performance and generates certificates.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="home-pro-cta">
          <div className="home-pro-cta-box">
            <div>
              <h2>Ready to continue?</h2>
              <p>
                Apply for an internship or login to manage your WorkSync
                dashboard.
              </p>
            </div>

            <div className="home-pro-actions">
              {!user && (
                <>
                  <Link className="home-pro-btn primary" to="/apply">
                    Apply Now
                  </Link>

                  <Link className="home-pro-btn secondary" to="/login">
                    Login
                  </Link>
                </>
              )}

              {user && (
                <Link className="home-pro-btn primary" to={getDashboardPath()}>
                  Open Dashboard
                </Link>
              )}
            </div>
          </div>
        </section>

        <footer className="home-pro-footer">
          <div>
            <strong>WorkSync</strong> — Internship Lifecycle Management Platform
          </div>

          <div>© 2026 WorkSync. All rights reserved.</div>
        </footer>
      </main>
    </>
  );
}

export default HomePage;