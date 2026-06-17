// Client/src/components/HRCertificatePanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function HRCertificatePanel() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const res = await api.get("/certificates/hr");

      setInterns(res.data.interns || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load certificates.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (internId) => {
    try {
      const res = await api.post(`/certificates/generate/${internId}`);

      showMessage(res.data.message || "Certificate generated successfully.");
      await loadCertificates();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to generate certificate.",
        "error"
      );
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  if (loading) {
    return (
      <section className="panel">
        <div className="ws8-state-card">
          <h3>Loading Certificates</h3>
          <p>Please wait while certificate records are loaded.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading-row">
        <div>
          <h2>Certificate Management</h2>
          <p>
            Generate certificates for interns who completed at least 75% of
            theory/video training modules.
          </p>
        </div>

        <button type="button" className="outline-small-btn" onClick={loadCertificates}>
          Refresh
        </button>
      </div>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <div className="ws8-hr-certificate-list">
        {interns.length === 0 && (
          <div className="ws8-state-card">
            <h3>No interns found</h3>
            <p>Onboarded interns will appear here.</p>
          </div>
        )}

        {interns.map((intern) => {
          const eligibility = intern.eligibility || {};
          const certificate = intern.certificate || null;

          return (
            <div className="ws8-hr-cert-card" key={intern.id}>
              <div className="ws8-hr-cert-top">
                <div>
                  <h3>{intern.full_name || intern.intern_name}</h3>
                  <p>
                    {intern.email} | {intern.department_name || "No department"}
                  </p>
                </div>

                <span className={`status ${certificate ? "selected" : "info"}`}>
                  {certificate ? "Issued" : "Pending"}
                </span>
              </div>

              <div className="ws8-hr-cert-metrics">
                <div>
                  <span>Training Progress</span>
                  <strong>{eligibility.trainingPercent || 0}%</strong>
                </div>

                <div>
                  <span>Modules</span>
                  <strong>
                    {eligibility.completedModules || 0}/
                    {eligibility.totalModules || 0}
                  </strong>
                </div>

                <div>
                  <span>Eligibility</span>
                  <strong>{eligibility.eligible ? "Eligible" : "Not Eligible"}</strong>
                </div>
              </div>

              {certificate && (
                <div className="ws8-cert-mini-details">
                  <p>
                    <strong>Certificate Number:</strong>{" "}
                    {certificate.certificate_number}
                  </p>
                  <p>
                    <strong>Verification Code:</strong>{" "}
                    {certificate.verification_code}
                  </p>
                  <p>
                    <strong>Issued:</strong> {formatDate(certificate.issued_at)}
                  </p>
                </div>
              )}

              {!certificate && !eligibility.eligible && (
                <p className="small-text">
                  Intern must complete at least 75% of theory/video training
                  modules before certificate generation.
                </p>
              )}

              <div className="task-action-row">
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => generateCertificate(intern.id)}
                  disabled={Boolean(certificate) || !eligibility.eligible}
                >
                  {certificate ? "Certificate Issued" : "Generate Certificate"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default HRCertificatePanel;