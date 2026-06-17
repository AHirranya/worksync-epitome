// Client/src/pages/SessionExpiredPage.jsx

import { Link } from "react-router-dom";

function SessionExpiredPage() {
  return (
    <main className="error-page-wrapper">
      <section className="error-page-card">
        <div className="error-code danger">401</div>

        <h1>Session Expired</h1>

        <p>
          Your login session has expired or is no longer valid. Please login
          again to continue using WorkSync.
        </p>

        <div className="error-page-actions">
          <Link to="/login" className="small-btn">
            Login Again
          </Link>

          <Link to="/" className="outline-small-btn">
            Go Home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default SessionExpiredPage;