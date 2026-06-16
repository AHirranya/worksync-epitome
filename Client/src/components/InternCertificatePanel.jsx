// Client/src/components/InternCertificatePanel.jsx

import { useEffect, useState } from "react";
import api from "../api/api";

function InternCertificatePanel() {
  const [intern, setIntern] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [certificate, setCertificate] = useState(null);

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

  const loadCertificate = async () => {
    try {
      const res = await api.get("/certificates/my");

      setIntern(res.data.intern);
      setEligibility(res.data.eligibility);
      setCertificate(res.data.certificate);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load certificate.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadCertificate();
  }, []);

  const progress = eligibility?.trainingPercent || 0;

  return (
    <section className="panel">
      <h2>My Training Certificate</h2>
      <p>
        Your certificate unlocks after completing at least <strong>75%</strong>{" "}
        of theory/video training modules.
      </p>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      {!eligibility && (
        <div className="empty-state">
          <h3>Certificate data loading</h3>
          <p>Please wait...</p>
        </div>
      )}

      {eligibility && (
        <div className="certificate-card">
          <div className="certificate-header">
            <div>
              <h3>{intern?.full_name}</h3>
              <p>
                {intern?.intern_id} | {intern?.department_name || "-"}
              </p>
              <p>{intern?.email}</p>
            </div>

            <div className="certificate-status-box">
              <strong>
                {certificate
                  ? "Issued"
                  : eligibility.eligible
                  ? "Eligible"
                  : "Pending"}
              </strong>

              <span>
                {certificate
                  ? formatDate(certificate.issued_at)
                  : "Certificate Status"}
              </span>
            </div>
          </div>

          {!certificate && (
            <>
              <div className="certificate-progress-box">
                <div className="certificate-progress-top">
                  <span>Theory/Video Training Completion</span>
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
                  Completed {eligibility.completedRequiredModules}/
                  {eligibility.totalRequiredModules} required theory/video
                  training modules. Minimum required: 75%.
                </p>
              </div>

              <div
                className={`requirement-item ${
                  progress >= 75 ? "done" : "pending"
                }`}
              >
                Training Requirement: {progress >= 75 ? "Completed" : "Pending"}
              </div>

              {eligibility.missingRequirements.length > 0 && (
                <div className="empty-state">
                  <h3>Pending Requirements</h3>

                  {eligibility.missingRequirements.map((item, index) => (
                    <p key={index}>{item}</p>
                  ))}
                </div>
              )}
            </>
          )}

          {certificate && (
            <>
              <div className="certificate-preview">
                <h2>Training Completion Certificate</h2>

                <p>This certificate is proudly presented to</p>

                <h3>{intern?.full_name}</h3>

                <p>
                  for successfully completing the required{" "}
                  <strong>{intern?.department_name || "department"}</strong>{" "}
                  training program, including theory and video learning modules.
                </p>

                <p>
                  Certificate Number:{" "}
                  <strong>{certificate.certificate_number}</strong>
                </p>

                <small>Verification Code: {certificate.verification_code}</small>
              </div>

              <div className="certificate-details">
                <p>
                  <strong>Certificate Type:</strong> Training Completion
                  Certificate
                </p>

                <p>
                  <strong>Certificate Number:</strong>{" "}
                  {certificate.certificate_number}
                </p>

                <p>
                  <strong>Verification Code:</strong>{" "}
                  {certificate.verification_code}
                </p>

                <p>
                  <strong>Issued Date:</strong>{" "}
                  {formatDate(certificate.issued_at)}
                </p>

                <p>
                  <strong>Issued By:</strong> {certificate.issued_by_name || "-"}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default InternCertificatePanel;