// Client/src/components/InternCertificatePanel.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

function InternCertificatePanel() {
  const [intern, setIntern] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [certificate, setCertificate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadCertificate = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const res = await api.get("/certificates/my");

      setIntern(res.data.intern || null);
      setEligibility(res.data.eligibility || null);
      setCertificate(res.data.certificate || null);
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to load certificate.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const internName = useMemo(() => {
    return (
      certificate?.intern_name ||
      intern?.full_name ||
      intern?.intern_name ||
      JSON.parse(localStorage.getItem("worksync_user") || "{}")?.full_name ||
      JSON.parse(localStorage.getItem("worksync_user") || "{}")?.fullName ||
      "Intern Name"
    );
  }, [certificate, intern]);

  const departmentName = useMemo(() => {
    return (
      certificate?.department_name ||
      intern?.department_name ||
      "Assigned Department"
    );
  }, [certificate, intern]);

  const issuedDate = certificate?.issued_at
    ? new Date(certificate.issued_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";

  const downloadCertificate = () => {
    window.print();
  };

  useEffect(() => {
    loadCertificate();
  }, []);

  if (loading) {
    return (
      <section className="panel">
        <div className="ws8-state-card">
          <h3>Loading Certificate</h3>
          <p>Please wait while we check your certificate eligibility.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading-row">
        <div>
          <h2>Training Certificate</h2>
          <p>
            Your certificate is generated after completing at least 75% of
            theory/video training modules.
          </p>
        </div>

        <button type="button" className="outline-small-btn" onClick={loadCertificate}>
          Refresh
        </button>
      </div>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <div className="ws8-eligibility-card">
        <div>
          <span>Training Completion</span>
          <strong>{eligibility?.trainingPercent || 0}%</strong>
          <p>
            {eligibility?.completedModules || 0} of{" "}
            {eligibility?.totalModules || 0} theory/video modules completed
          </p>
        </div>

        <div>
          <span>Eligibility</span>
          <strong>{eligibility?.eligible ? "Eligible" : "Not Eligible"}</strong>
          <p>Minimum required completion is 75%</p>
        </div>

        <div>
          <span>Certificate Status</span>
          <strong>{certificate ? "Issued" : "Not Issued"}</strong>
          <p>{certificate ? "Certificate is available" : "HR has not issued it yet"}</p>
        </div>
      </div>

      {!certificate && (
        <div className="ws8-state-card">
          <h3>Certificate Not Available</h3>
          <p>
            Complete the required theory/video training and wait for HR to
            generate your certificate.
          </p>
        </div>
      )}

      {certificate && (
        <>
          <div className="ws8-print-area">
            <div className="ws8-certificate">
              <div className="ws8-cert-border">
                <div className="ws8-cert-header">
                  <div className="ws8-cert-logo">WS</div>
                  <div>
                    <h2>WorkSync</h2>
                    <p>Internship Lifecycle Management Platform</p>
                  </div>
                </div>

                <div className="ws8-cert-body">
                  <p className="ws8-cert-small">This certificate is proudly presented to</p>

                  <h1>{internName}</h1>

                  <h3>Training Completion Certificate</h3>

                  <p className="ws8-cert-text">
                    for successfully completing the required{" "}
                    <strong>{departmentName}</strong> training program,
                    including theory and video learning modules.
                  </p>

                  <div className="ws8-cert-meta">
                    <div>
                      <span>Certificate Number</span>
                      <strong>{certificate.certificate_number}</strong>
                    </div>

                    <div>
                      <span>Issued Date</span>
                      <strong>{issuedDate}</strong>
                    </div>

                    <div>
                      <span>Verification Code</span>
                      <strong>{certificate.verification_code}</strong>
                    </div>
                  </div>
                </div>

                <div className="ws8-cert-footer">
                  <div>
                    <span></span>
                    <p>Authorized Signature</p>
                  </div>

                  <div>
                    <span></span>
                    <p>WorkSync HR Team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ws8-certificate-details">
            <p>
              <strong>Certificate Type:</strong>{" "}
              {certificate.title || "Training Completion Certificate"}
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
              <strong>Issued Date:</strong> {issuedDate}
            </p>
          </div>

          <div className="task-action-row">
            <button type="button" className="small-btn" onClick={downloadCertificate}>
              Download Certificate
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default InternCertificatePanel;