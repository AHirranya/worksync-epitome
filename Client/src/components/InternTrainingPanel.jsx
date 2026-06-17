// Client/src/components/InternTrainingPanel.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";

function InternTrainingPanel() {
  const [intern, setIntern] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");

  const [studyTimers, setStudyTimers] = useState({});
  const [confirmations, setConfirmations] = useState({});
  const [testAnswers, setTestAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadTraining = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await api.get("/training/my");

      const loadedCourses = res.data.courses || [];

      setIntern(res.data.intern || null);
      setCourses(loadedCourses);

      if (loadedCourses.length > 0) {
        const firstCourse = loadedCourses[0];
        setSelectedCourseId(String(firstCourse.courseId));

        const firstAvailableModule =
          firstCourse.modules.find((module) => !module.is_completed) ||
          firstCourse.modules[0];

        if (firstAvailableModule) {
          setSelectedModuleId(String(firstAvailableModule.id));
        }
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to load training modules."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraining();
  }, []);

  const selectedCourse = useMemo(() => {
    return courses.find(
      (course) => String(course.courseId) === String(selectedCourseId)
    );
  }, [courses, selectedCourseId]);

  const selectedModule = useMemo(() => {
    if (!selectedCourse) return null;

    return selectedCourse.modules.find(
      (module) => String(module.id) === String(selectedModuleId)
    );
  }, [selectedCourse, selectedModuleId]);

  const selectedModuleType = String(
    selectedModule?.module_type || ""
  ).toLowerCase();

  const selectedModuleTimer = studyTimers[selectedModule?.id] || 0;

  const requiredStudySeconds = selectedModule
    ? Math.min(Math.max(Number(selectedModule.estimated_minutes || 3), 1) * 60, 300)
    : 0;

  const studiedEnough = selectedModuleTimer >= requiredStudySeconds;

  const confirmation = confirmations[selectedModule?.id] || {};

  const questions = Array.isArray(selectedModule?.test_questions)
    ? selectedModule.test_questions
    : [];

  const answeredQuestionCount = questions.filter(
    (_, index) => testAnswers[index] !== undefined
  ).length;

  const testProgress =
    questions.length > 0
      ? Math.round((answeredQuestionCount / questions.length) * 100)
      : 0;

  useEffect(() => {
    if (
      !selectedModule ||
      selectedModule.is_locked ||
      selectedModule.is_completed ||
      selectedModuleType !== "theory"
    ) {
      return;
    }

    const timer = setInterval(() => {
      setStudyTimers((prev) => ({
        ...prev,
        [selectedModule.id]: (prev[selectedModule.id] || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [
    selectedModule?.id,
    selectedModule?.is_locked,
    selectedModule?.is_completed,
    selectedModuleType,
  ]);

  const formatSeconds = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const getModuleStatusLabel = (module) => {
    if (module.is_locked) return "Locked";
    if (module.is_completed) return "Completed";
    if (String(module.progress_status || "").toLowerCase() === "failed") {
      return "Failed";
    }

    return "Unlocked";
  };

  const getModuleStatusClass = (module) => {
    if (module.is_locked) return "locked";
    if (module.is_completed) return "completed";
    if (String(module.progress_status || "").toLowerCase() === "failed") {
      return "failed";
    }

    return "unlocked";
  };

  const selectCourse = (courseId) => {
    setSelectedCourseId(String(courseId));
    setTestResult(null);
    setTestAnswers({});

    const course = courses.find(
      (item) => String(item.courseId) === String(courseId)
    );

    if (course) {
      const firstAvailableModule =
        course.modules.find((module) => !module.is_completed) ||
        course.modules[0];

      if (firstAvailableModule) {
        setSelectedModuleId(String(firstAvailableModule.id));
      }
    }
  };

  const selectModule = (module) => {
    if (module.is_locked) {
      showMessage("Complete previous modules before opening this module.", "error");
      return;
    }

    setSelectedModuleId(String(module.id));
    setTestResult(null);
    setTestAnswers({});
    setMessage("");
    setMessageType("");
  };

  const updateConfirmation = (field, value) => {
    setConfirmations((prev) => ({
      ...prev,
      [selectedModule.id]: {
        ...(prev[selectedModule.id] || {}),
        [field]: value,
      },
    }));
  };

  const completeModule = async () => {
    if (!selectedModule) return;

    setMessage("");
    setMessageType("");

    try {
      const res = await api.post(`/training/modules/${selectedModule.id}/complete`, {
        confirmStudied: Boolean(confirmation.confirmStudied),
        confirmWatched: Boolean(confirmation.confirmWatched),
        studySeconds: selectedModuleTimer,
      });

      showMessage(res.data.message || "Module completed successfully.");
      await loadTraining();
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to complete module.",
        "error"
      );
    }
  };

  const updateTestAnswer = (questionIndex, optionIndex) => {
    setTestAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const submitTest = async () => {
    if (!selectedModule) return;

    setMessage("");
    setMessageType("");
    setTestResult(null);

    if (questions.length > 0 && answeredQuestionCount !== questions.length) {
      showMessage("Please answer all questions before submitting.", "error");
      return;
    }

    try {
      const res = await api.post(
        `/training/modules/${selectedModule.id}/test-submit`,
        {
          answers: testAnswers,
        }
      );

      setTestResult(res.data);

      showMessage(res.data.message || "Test submitted.");

      if (res.data.passed) {
        await loadTraining();
      }
    } catch (error) {
      showMessage(
        error.response?.data?.message || "Failed to submit test.",
        "error"
      );
    }
  };

  if (loading) {
    return (
      <section className="panel">
        <LoadingState
          title="Loading training"
          message="Please wait while we load your assigned modules."
        />
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="panel">
        <ErrorState
          title="Training not loaded"
          message={errorMessage}
          onRetry={loadTraining}
        />
      </section>
    );
  }

  if (courses.length === 0) {
    return (
      <section className="panel">
        <EmptyState
          title="No training assigned"
          message="Your training modules will appear here once HR assigns a course."
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-heading-row">
        <div>
          <h2>Training & Theory Modules</h2>
          <p>
            Study each module carefully. The next module unlocks only after the
            current module is completed.
          </p>
        </div>
      </div>

      {message && (
        <div className={`message-box ${messageType === "error" ? "error" : ""}`}>
          {message}
        </div>
      )}

      <div className="ws-learning-layout">
        <aside className="ws-learning-sidebar">
          <div className="ws-learning-intern">
            <strong>{intern?.full_name || "Intern"}</strong>
            <span>{intern?.email}</span>
          </div>

          <label className="ws-course-select">
            Course
            <select
              value={selectedCourseId}
              onChange={(e) => selectCourse(e.target.value)}
            >
              {courses.map((course) => (
                <option key={course.courseId} value={course.courseId}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>

          <div className="ws-module-list">
            {selectedCourse?.modules.map((module, index) => (
              <button
                type="button"
                key={module.id}
                className={`ws-module-item ${
                  String(selectedModuleId) === String(module.id) ? "active" : ""
                } ${getModuleStatusClass(module)}`}
                onClick={() => selectModule(module)}
              >
                <span className="ws-module-number">{index + 1}</span>

                <span className="ws-module-info">
                  <strong>{module.title}</strong>
                  <small>
                    {String(module.module_type || "").toUpperCase()} •{" "}
                    {getModuleStatusLabel(module)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="ws-learning-content">
          {!selectedModule && (
            <EmptyState
              title="Select a module"
              message="Choose a module from the left side to start learning."
            />
          )}

          {selectedModule && selectedModule.is_locked && (
            <div className="ws-locked-module">
              <div className="ws-state-icon">🔒</div>
              <h3>{selectedModule.title}</h3>
              <p>
                This module is locked. Complete all previous modules to unlock
                it.
              </p>
            </div>
          )}

          {selectedModule && !selectedModule.is_locked && (
            <>
              <div className="ws-module-header">
                <div>
                  <span className="ws-module-type">
                    {selectedModuleType || "module"}
                  </span>
                  <h3>{selectedModule.title}</h3>
                  <p>{selectedModule.description || "Complete this module."}</p>
                </div>

                <span
                  className={`ws-module-status ${getModuleStatusClass(
                    selectedModule
                  )}`}
                >
                  {getModuleStatusLabel(selectedModule)}
                </span>
              </div>

              {selectedModuleType === "theory" && (
                <div className="ws-theory-box">
                  <div className="ws-study-progress">
                    <div>
                      <strong>Study Timer</strong>
                      <span>
                        {formatSeconds(selectedModuleTimer)} /{" "}
                        {formatSeconds(requiredStudySeconds)}
                      </span>
                    </div>

                    <div className="ws-progress-track">
                      <div
                        className="ws-progress-fill"
                        style={{
                          width: `${Math.min(
                            (selectedModuleTimer / requiredStudySeconds) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="ws-theory-content">
                    {(selectedModule.theory_content ||
                      selectedModule.content ||
                      selectedModule.description ||
                      "Theory content is not available for this module.")
                      .split("\n")
                      .map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                  </div>

                  <label className="ws-confirm-check">
                    <input
                      type="checkbox"
                      checked={Boolean(confirmation.confirmStudied)}
                      onChange={(e) =>
                        updateConfirmation("confirmStudied", e.target.checked)
                      }
                      disabled={selectedModule.is_completed}
                    />
                    I studied this theory module completely and understood it.
                  </label>

                  <button
                    type="button"
                    className="small-btn"
                    onClick={completeModule}
                    disabled={
                      selectedModule.is_completed ||
                      !confirmation.confirmStudied ||
                      !studiedEnough
                    }
                  >
                    {selectedModule.is_completed
                      ? "Theory Completed"
                      : studiedEnough
                      ? "Mark Theory Complete"
                      : "Study Time Required"}
                  </button>
                </div>
              )}

              {selectedModuleType === "video" && (
                <div className="ws-video-box">
                  {selectedModule.video_url ? (
                    <a
                      href={selectedModule.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="ws-video-link"
                    >
                      Open Training Video
                    </a>
                  ) : (
                    <p>No video link added for this module.</p>
                  )}

                  <label className="ws-confirm-check">
                    <input
                      type="checkbox"
                      checked={Boolean(confirmation.confirmWatched)}
                      onChange={(e) =>
                        updateConfirmation("confirmWatched", e.target.checked)
                      }
                      disabled={selectedModule.is_completed}
                    />
                    I watched this video module completely.
                  </label>

                  <button
                    type="button"
                    className="small-btn"
                    onClick={completeModule}
                    disabled={
                      selectedModule.is_completed || !confirmation.confirmWatched
                    }
                  >
                    {selectedModule.is_completed
                      ? "Video Completed"
                      : "Mark Video Complete"}
                  </button>
                </div>
              )}

              {selectedModuleType === "test" && (
                <div className="ws-test-box">
                  <div className="ws-test-progress">
                    <div>
                      <strong>Test Progress</strong>
                      <span>
                        {answeredQuestionCount} / {questions.length} answered
                      </span>
                    </div>

                    <div className="ws-progress-track">
                      <div
                        className="ws-progress-fill"
                        style={{ width: `${testProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  {questions.length === 0 && (
                    <EmptyState
                      title="No questions added"
                      message="This test has no questions. Submit to complete it."
                    />
                  )}

                  {questions.map((question, questionIndex) => (
                    <div className="ws-question-card" key={questionIndex}>
                      <div className="ws-question-top">
                        <span>
                          Question {questionIndex + 1} of {questions.length}
                        </span>
                        <strong>{question.question}</strong>
                      </div>

                      <div className="ws-option-list">
                        {(question.options || []).map((option, optionIndex) => (
                          <label
                            className={`ws-option-card ${
                              Number(testAnswers[questionIndex]) === optionIndex
                                ? "selected"
                                : ""
                            }`}
                            key={optionIndex}
                          >
                            <input
                              type="radio"
                              name={`question-${questionIndex}`}
                              checked={
                                Number(testAnswers[questionIndex]) === optionIndex
                              }
                              onChange={() =>
                                updateTestAnswer(questionIndex, optionIndex)
                              }
                              disabled={selectedModule.is_completed}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {testResult && (
                    <div
                      className={`ws-test-result ${
                        testResult.passed ? "passed" : "failed"
                      }`}
                    >
                      <h3>{testResult.passed ? "Passed" : "Try Again"}</h3>
                      <p>
                        Score: <strong>{testResult.score}%</strong>
                      </p>
                      <p>
                        Correct Answers: {testResult.correctCount} /{" "}
                        {testResult.totalQuestions}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="small-btn"
                    onClick={submitTest}
                    disabled={selectedModule.is_completed}
                  >
                    {selectedModule.is_completed ? "Test Completed" : "Submit Test"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default InternTrainingPanel;