// Client/src/components/HRCertificatePanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function HRCertificatePanel() {
  const [certificates, setCertificates] = useState([]);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return String(dateValue).slice(0, 10);
  };

  const loadCertificates = async () => {
    try {
      const res = await api.get("/certificates/hr");
      setCertificates(res.data.certificates || []);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load certificates.",
        "error"
      );
    }
  };

  const generateCertificate = async (internId) => {
    try {
      const res = await api.post(`/certificates/generate/${internId}`);

      showMessage(res.data.message || "Certificate generated successfully.");

      await loadCertificates();
    } catch (error) {
      const missing = error.response?.data?.missingRequirements || [];

      if (missing.length > 0) {
        showMessage(missing.join(" "), "error");
      } else {
        showMessage(
          error.response?.data?.message || "Failed to generate certificate.",
          "error"
        );
      }
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  return (
    <section className="panel">
      <h2>Certificate Generation</h2>
      <p>
        Certificates are generated based only on training completion. Intern must
        complete at least <strong>75%</strong> of theory/video modules.
      </p>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      {certificates.length === 0 && (
        <div className="empty-state">
          <h3>No intern certificate data yet</h3>
          <p>Onboard interns first to generate certificates.</p>
        </div>
      )}

      <div className="certificate-list">
        {certificates.map((item) => {
          const progress = item.eligibility?.trainingPercent || 0;
          const completed = item.eligibility?.completedRequiredModules || 0;
          const total = item.eligibility?.totalRequiredModules || 0;
          const eligible = item.eligibility?.eligible;

          return (
            <div className="certificate-card" key={item.id}>
              <div className="certificate-header">
                <div>
                  <h3>{item.full_name}</h3>
                  <p>
                    {item.intern_id} | {item.department_name || "-"}
                  </p>
                  <p>{item.email}</p>
                </div>

                <div className="certificate-status-box">
                  <strong>
                    {item.certificate ? "Issued" : eligible ? "Eligible" : "Pending"}
                  </strong>

                  <span>
                    {item.certificate
                      ? formatDate(item.certificate.issued_at)
                      : "Certificate Status"}
                  </span>
                </div>
              </div>

              <div className="certificate-progress-box">
                <div className="certificate-progress-top">
                  <span>Theory/Video Completion</span>
                  <strong>{progress}%</strong>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${progress}%`,
                    }}
                  ></div>
                </div>

                <p>
                  Completed {completed}/{total} required theory/video modules.
                  Minimum required: 75%.
                </p>
              </div>

              <div
                className={`requirement-item ${
                  progress >= 75 ? "done" : "pending"
                }`}
              >
                Training Requirement: {progress >= 75 ? "Completed" : "Pending"}
              </div>

              {item.certificate ? (
                <div className="certificate-details">
                  <p>
                    <strong>Certificate Number:</strong>{" "}
                    {item.certificate.certificate_number}
                  </p>

                  <p>
                    <strong>Verification Code:</strong>{" "}
                    {item.certificate.verification_code}
                  </p>

                  <p>
                    <strong>Issued By:</strong>{" "}
                    {item.certificate.issued_by_name || "-"}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  className="small-btn"
                  disabled={!eligible}
                  onClick={() => generateCertificate(item.id)}
                >
                  Generate Certificate
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default HRCertificatePanel;