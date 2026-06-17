// Client/src/pages/HRDashboard.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";

import HRAttendanceWorkLogPanel from "../components/HRAttendanceWorkLogPanel";
import HRCertificatePanel from "../components/HRCertificatePanel";
import ReportsPanel from "../components/ReportsPanel";

function HRDashboard() {
  const [activeSection, setActiveSection] = useState("applicants");

  const [applicants, setApplicants] = useState([]);
  const [interns, setInterns] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [internsLoading, setInternsLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  const [applicantsError, setApplicantsError] = useState("");
  const [internsError, setInternsError] = useState("");
  const [departmentsError, setDepartmentsError] = useState("");

  const [applicantSearch, setApplicantSearch] = useState("");
  const [applicantStatusFilter, setApplicantStatusFilter] = useState("all");
  const [applicantDomainFilter, setApplicantDomainFilter] = useState("all");

  const [internSearch, setInternSearch] = useState("");
  const [internDepartmentFilter, setInternDepartmentFilter] = useState("all");
  const [internStatusFilter, setInternStatusFilter] = useState("all");

  const [onboardingForm, setOnboardingForm] = useState({
    applicantId: "",
    departmentId: "",
    joiningDate: "",
    endDate: "",
  });

  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadApplicants = async () => {
    try {
      setApplicantsLoading(true);
      setApplicantsError("");

      const res = await api.get("/applicants");
      setApplicants(res.data.applicants || []);
    } catch (error) {
      setApplicantsError(
        error.response?.data?.message || "Failed to load applicants."
      );
    } finally {
      setApplicantsLoading(false);
    }
  };

  const loadInterns = async () => {
    try {
      setInternsLoading(true);
      setInternsError("");

      const res = await api.get("/onboarding/interns");
      setInterns(res.data.interns || []);
    } catch (error) {
      setInternsError(error.response?.data?.message || "Failed to load interns.");
    } finally {
      setInternsLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      setDepartmentsError("");

      const res = await api.get("/onboarding/departments");
      setDepartments(res.data.departments || []);
    } catch (error) {
      setDepartmentsError(
        error.response?.data?.message || "Failed to load departments."
      );
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([loadApplicants(), loadInterns(), loadDepartments()]);
  };

  const applicantStatuses = useMemo(() => {
    const values = applicants
      .map((item) => item.status || "Applied")
      .filter(Boolean);

    return [...new Set(values)];
  }, [applicants]);

  const applicantDomains = useMemo(() => {
    const values = applicants
      .map((item) => item.preferred_domain || item.applied_role || "")
      .filter(Boolean);

    return [...new Set(values)];
  }, [applicants]);

  const internDepartments = useMemo(() => {
    const values = interns
      .map((item) => item.department_name || "")
      .filter(Boolean);

    return [...new Set(values)];
  }, [interns]);

  const internStatuses = useMemo(() => {
    const values = interns
      .map((item) => item.status || "Active")
      .filter(Boolean);

    return [...new Set(values)];
  }, [interns]);

  const filteredApplicants = useMemo(() => {
    const searchText = applicantSearch.trim().toLowerCase();

    return applicants.filter((applicant) => {
      const name = String(applicant.full_name || "").toLowerCase();
      const email = String(applicant.email || "").toLowerCase();
      const college = String(applicant.college_name || "").toLowerCase();
      const city = String(applicant.city || "").toLowerCase();
      const skills = String(applicant.skills || "").toLowerCase();
      const status = String(applicant.status || "Applied").toLowerCase();
      const domain = String(
        applicant.preferred_domain || applicant.applied_role || ""
      ).toLowerCase();

      const matchesSearch =
        !searchText ||
        name.includes(searchText) ||
        email.includes(searchText) ||
        college.includes(searchText) ||
        city.includes(searchText) ||
        skills.includes(searchText);

      const matchesStatus =
        applicantStatusFilter === "all" ||
        status === applicantStatusFilter.toLowerCase();

      const matchesDomain =
        applicantDomainFilter === "all" ||
        domain === applicantDomainFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesDomain;
    });
  }, [applicants, applicantSearch, applicantStatusFilter, applicantDomainFilter]);

  const filteredInterns = useMemo(() => {
    const searchText = internSearch.trim().toLowerCase();

    return interns.filter((intern) => {
      const name = String(intern.full_name || "").toLowerCase();
      const email = String(intern.email || "").toLowerCase();
      const code = String(intern.intern_code || intern.intern_id || "").toLowerCase();
      const department = String(intern.department_name || "").toLowerCase();
      const status = String(intern.status || "Active").toLowerCase();

      const matchesSearch =
        !searchText ||
        name.includes(searchText) ||
        email.includes(searchText) ||
        code.includes(searchText);

      const matchesDepartment =
        internDepartmentFilter === "all" ||
        department === internDepartmentFilter.toLowerCase();

      const matchesStatus =
        internStatusFilter === "all" ||
        status === internStatusFilter.toLowerCase();

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [interns, internSearch, internDepartmentFilter, internStatusFilter]);

  const availableApplicants = applicants.filter(
    (item) => String(item.status || "").toLowerCase() !== "onboarded"
  );

  const updateApplicantStatus = async (applicantId, status) => {
    try {
      const res = await api.patch(`/applicants/${applicantId}/status`, {
        status,
      });

      showMessage(res.data.message || "Applicant status updated.");
      await loadApplicants();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to update applicant status.",
        "error"
      );
    }
  };

  const selectForOnboarding = (applicant) => {
    setOnboardingForm({
      ...onboardingForm,
      applicantId: applicant.id,
    });

    setActiveSection("onboarding");
    showMessage(`${applicant.full_name} selected for onboarding.`);
  };

  const updateOnboardingForm = (e) => {
    setOnboardingForm({
      ...onboardingForm,
      [e.target.name]: e.target.value,
    });
  };

  const onboardApplicant = async (e) => {
    e.preventDefault();

    setGeneratedCredentials(null);
    setMessage("");
    setMessageType("");

    try {
      const res = await api.post("/onboarding/onboard", onboardingForm);

      showMessage(res.data.message || "Applicant onboarded successfully.");
      setGeneratedCredentials(res.data.credentials || null);

      setOnboardingForm({
        applicantId: "",
        departmentId: "",
        joiningDate: "",
        endDate: "",
      });

      await loadApplicants();
      await loadInterns();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to onboard applicant.",
        "error"
      );
    }
  };

  const clearApplicantFilters = () => {
    setApplicantSearch("");
    setApplicantStatusFilter("all");
    setApplicantDomainFilter("all");
  };

  const clearInternFilters = () => {
    setInternSearch("");
    setInternDepartmentFilter("all");
    setInternStatusFilter("all");
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="dashboard-page">
      <section className="dashboard-header">
        <h1>HR Dashboard</h1>
        <p>
          Manage applicants, onboarding, interns, attendance, work logs,
          certificates, and reports.
        </p>
      </section>

      <section className="panel">
        <div className="task-action-row">
          <button
            type="button"
            className={
              activeSection === "applicants" ? "small-btn" : "outline-small-btn"
            }
            onClick={() => setActiveSection("applicants")}
          >
            Applicants
          </button>

          <button
            type="button"
            className={
              activeSection === "onboarding" ? "small-btn" : "outline-small-btn"
            }
            onClick={() => setActiveSection("onboarding")}
          >
            Onboarding
          </button>

          <button
            type="button"
            className={
              activeSection === "interns" ? "small-btn" : "outline-small-btn"
            }
            onClick={() => setActiveSection("interns")}
          >
            Interns
          </button>

          <button
            type="button"
            className={
              activeSection === "attendance" ? "small-btn" : "outline-small-btn"
            }
            onClick={() => setActiveSection("attendance")}
          >
            Attendance & Work Logs
          </button>

          <button
            type="button"
            className={
              activeSection === "certificates"
                ? "small-btn"
                : "outline-small-btn"
            }
            onClick={() => setActiveSection("certificates")}
          >
            Certificates
          </button>

          <button
            type="button"
            className={
              activeSection === "reports" ? "small-btn" : "outline-small-btn"
            }
            onClick={() => setActiveSection("reports")}
          >
            Reports
          </button>
        </div>
      </section>

      {message && (
        <section className="panel">
          <div
            className={`message-box ${messageType === "error" ? "error" : ""}`}
          >
            {message}
          </div>

          {generatedCredentials && (
            <div className="ws-highlight-box">
              <strong>Generated Intern Login</strong>
              <p>Email: {generatedCredentials.email}</p>
              <p>Password: {generatedCredentials.password}</p>
            </div>
          )}
        </section>
      )}

      {activeSection === "applicants" && (
        <section className="panel">
          <div className="panel-heading-row">
            <div>
              <h2>Applicant Pipeline</h2>
              <p>Search, filter, shortlist, reject, and onboard applicants.</p>
            </div>

            <button
              type="button"
              className="outline-small-btn"
              onClick={loadApplicants}
            >
              Refresh
            </button>
          </div>

          <div className="ws-filter-bar">
            <div className="ws-filter-field ws-filter-wide">
              <label>Search Applicants</label>
              <input
                type="text"
                value={applicantSearch}
                onChange={(e) => setApplicantSearch(e.target.value)}
                placeholder="Search by name, email, city, college, or skills"
              />
            </div>

            <div className="ws-filter-field">
              <label>Status</label>
              <select
                value={applicantStatusFilter}
                onChange={(e) => setApplicantStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>

                {applicantStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="ws-filter-field">
              <label>Domain</label>
              <select
                value={applicantDomainFilter}
                onChange={(e) => setApplicantDomainFilter(e.target.value)}
              >
                <option value="all">All Domains</option>

                {applicantDomains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>

            <div className="ws-filter-actions">
              <button
                type="button"
                className="outline-small-btn"
                onClick={clearApplicantFilters}
              >
                Clear
              </button>
            </div>
          </div>

          <p className="ws-result-count">
            Showing {filteredApplicants.length} of {applicants.length} applicants
          </p>

          {applicantsLoading && <LoadingState type="table" />}

          {!applicantsLoading && applicantsError && (
            <ErrorState
              title="Applicants not loaded"
              message={applicantsError}
              onRetry={loadApplicants}
            />
          )}

          {!applicantsLoading && !applicantsError && applicants.length === 0 && (
            <EmptyState
              title="No applicants found"
              message="New internship applications will appear here."
            />
          )}

          {!applicantsLoading &&
            !applicantsError &&
            applicants.length > 0 &&
            filteredApplicants.length === 0 && (
              <EmptyState
                title="No matching applicants"
                message="Try changing the search text, status, or domain filter."
              />
            )}

          {!applicantsLoading &&
            !applicantsError &&
            filteredApplicants.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Email</th>
                      <th>Preferred Domain</th>
                      <th>Skills</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredApplicants.map((applicant) => (
                      <tr key={applicant.id}>
                        <td>
                          {applicant.full_name}
                          <br />
                          <span className="small-text">
                            {applicant.college_name || applicant.city || "-"}
                          </span>
                        </td>
                        <td>{applicant.email}</td>
                        <td>
                          {applicant.preferred_domain ||
                            applicant.applied_role ||
                            "-"}
                        </td>
                        <td>{applicant.skills || "-"}</td>
                        <td>
                          <span className="status selected">
                            {applicant.status || "Applied"}
                          </span>
                        </td>
                        <td>
                          <div className="task-action-row">
                            <button
                              type="button"
                              className="small-btn"
                              onClick={() =>
                                updateApplicantStatus(
                                  applicant.id,
                                  "Shortlisted"
                                )
                              }
                            >
                              Shortlist
                            </button>

                            <button
                              type="button"
                              className="outline-small-btn"
                              onClick={() =>
                                updateApplicantStatus(applicant.id, "Rejected")
                              }
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              className="outline-small-btn"
                              onClick={() => selectForOnboarding(applicant)}
                            >
                              Onboard
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      )}

      {activeSection === "onboarding" && (
        <section className="panel">
          <div className="panel-heading-row">
            <div>
              <h2>Onboard Intern</h2>
              <p>
                Select applicant, department, joining date, and end date. The
                system creates intern login credentials.
              </p>
            </div>
          </div>

          {departmentsLoading && (
            <LoadingState
              title="Loading onboarding data"
              message="Please wait while departments are loaded."
            />
          )}

          {!departmentsLoading && departmentsError && (
            <ErrorState
              title="Departments not loaded"
              message={departmentsError}
              onRetry={loadDepartments}
            />
          )}

          {!departmentsLoading && !departmentsError && (
            <form className="form-grid" onSubmit={onboardApplicant}>
              <label>
                Applicant
                <select
                  name="applicantId"
                  value={onboardingForm.applicantId}
                  onChange={updateOnboardingForm}
                  required
                >
                  <option value="">Select applicant</option>

                  {availableApplicants.map((applicant) => (
                    <option key={applicant.id} value={applicant.id}>
                      {applicant.full_name} - {applicant.email}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Department
                <select
                  name="departmentId"
                  value={onboardingForm.departmentId}
                  onChange={updateOnboardingForm}
                  required
                >
                  <option value="">Select department</option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Joining Date
                <input
                  type="date"
                  name="joiningDate"
                  value={onboardingForm.joiningDate}
                  onChange={updateOnboardingForm}
                  required
                />
              </label>

              <label>
                End Date
                <input
                  type="date"
                  name="endDate"
                  value={onboardingForm.endDate}
                  onChange={updateOnboardingForm}
                  required
                />
              </label>

              <div className="form-grid-full">
                <button type="submit">Onboard Intern</button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeSection === "interns" && (
        <section className="panel">
          <div className="panel-heading-row">
            <div>
              <h2>Onboarded Interns</h2>
              <p>Search interns by name/email and filter by department/status.</p>
            </div>

            <button
              type="button"
              className="outline-small-btn"
              onClick={loadInterns}
            >
              Refresh
            </button>
          </div>

          <div className="ws-filter-bar">
            <div className="ws-filter-field ws-filter-wide">
              <label>Search Interns</label>
              <input
                type="text"
                value={internSearch}
                onChange={(e) => setInternSearch(e.target.value)}
                placeholder="Search by name, email, or intern code"
              />
            </div>

            <div className="ws-filter-field">
              <label>Department</label>
              <select
                value={internDepartmentFilter}
                onChange={(e) => setInternDepartmentFilter(e.target.value)}
              >
                <option value="all">All Departments</option>

                {internDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            <div className="ws-filter-field">
              <label>Status</label>
              <select
                value={internStatusFilter}
                onChange={(e) => setInternStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>

                {internStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="ws-filter-actions">
              <button
                type="button"
                className="outline-small-btn"
                onClick={clearInternFilters}
              >
                Clear
              </button>
            </div>
          </div>

          <p className="ws-result-count">
            Showing {filteredInterns.length} of {interns.length} interns
          </p>

          {internsLoading && <LoadingState type="table" />}

          {!internsLoading && internsError && (
            <ErrorState
              title="Interns not loaded"
              message={internsError}
              onRetry={loadInterns}
            />
          )}

          {!internsLoading && !internsError && interns.length === 0 && (
            <EmptyState
              title="No interns onboarded yet"
              message="Onboarded interns will appear here."
            />
          )}

          {!internsLoading &&
            !internsError &&
            interns.length > 0 &&
            filteredInterns.length === 0 && (
              <EmptyState
                title="No matching interns"
                message="Try changing the search text, department, or status filter."
              />
            )}

          {!internsLoading && !internsError && filteredInterns.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Intern</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Joining Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInterns.map((intern) => (
                    <tr key={intern.id}>
                      <td>
                        {intern.full_name}
                        <br />
                        <span className="small-text">
                          {intern.intern_code || intern.intern_id || "-"}
                        </span>
                      </td>
                      <td>{intern.email}</td>
                      <td>{intern.department_name || "-"}</td>
                      <td>
                        {intern.joining_date
                          ? new Date(intern.joining_date).toLocaleDateString(
                              "en-IN"
                            )
                          : "-"}
                      </td>
                      <td>
                        {intern.end_date
                          ? new Date(intern.end_date).toLocaleDateString(
                              "en-IN"
                            )
                          : "-"}
                      </td>
                      <td>
                        <span className="status selected">
                          {intern.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeSection === "attendance" && <HRAttendanceWorkLogPanel />}

      {activeSection === "certificates" && <HRCertificatePanel />}

      {activeSection === "reports" && <ReportsPanel />}
    </main>
  );
}

export default HRDashboard;