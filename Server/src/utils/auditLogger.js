// Server/src/utils/auditLogger.js

const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "worksync_secret_key_change_this";

const getTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.token;

  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : null;

  return cookieToken || bearerToken || null;
};

const getUserFromRequest = async (req) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      `
      SELECT id, full_name, email, role
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [decoded.id]
    );

    return result.rows[0] || null;
  } catch (error) {
    return null;
  }
};

const sanitizeValue = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;

  if (typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  const blockedKeys = [
    "password",
    "newPassword",
    "oldPassword",
    "confirmPassword",
    "password_hash",
    "token",
    "refreshToken",
    "accessToken",
    "jwt",
  ];

  const cleanObject = {};

  Object.keys(value).forEach((key) => {
    if (blockedKeys.includes(key)) {
      cleanObject[key] = "[HIDDEN]";
    } else {
      cleanObject[key] = sanitizeValue(value[key]);
    }
  });

  return cleanObject;
};

const getTargetIdFromRequest = (req) => {
  const body = req.body || {};
  const pathParts = String(req.originalUrl || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);

  return (
    body.targetId ||
    body.userId ||
    body.internId ||
    body.applicantId ||
    body.departmentId ||
    body.courseId ||
    body.moduleId ||
    body.taskId ||
    body.workLogId ||
    pathParts.find((part) => /^\d+$/.test(part)) ||
    null
  );
};

const inferAuditDetails = (req) => {
  const method = req.method;
  const route = req.originalUrl.split("?")[0];
  const body = req.body || {};

  let action = `${method}_REQUEST`;
  let targetType = "System";
  let targetName = body.fullName || body.full_name || body.name || body.title || null;

  if (route.includes("/api/admin/users") && method === "POST") {
    action = "CREATE_USER";
    targetType = "User";
    targetName = body.fullName || body.full_name || body.email || "User";
  } else if (route.includes("/api/admin/users") && route.includes("/role")) {
    action = "UPDATE_USER_ROLE";
    targetType = "User";
  } else if (route.includes("/api/admin/users") && route.includes("/reset-password")) {
    action = "RESET_USER_PASSWORD";
    targetType = "User";
  } else if (route.includes("/api/admin/users") && method === "DELETE") {
    action = "DELETE_USER";
    targetType = "User";
  } else if (route.includes("/api/admin/departments") && method === "POST") {
    action = "CREATE_DEPARTMENT";
    targetType = "Department";
    targetName = body.name || "Department";
  } else if (route.includes("/api/admin/departments") && method === "DELETE") {
    action = "DELETE_DEPARTMENT";
    targetType = "Department";
  } else if (route.includes("/api/applicants") && route.includes("/status")) {
    action = "UPDATE_APPLICANT_STATUS";
    targetType = "Applicant";
    targetName = body.status || "Applicant";
  } else if (route.includes("/api/onboarding/onboard")) {
    action = "ONBOARD_INTERN";
    targetType = "Intern";
    targetName = body.applicantId ? `Applicant ${body.applicantId}` : "Intern";
  } else if (route.includes("/api/training/courses") && method === "POST") {
    action = "CREATE_TRAINING_COURSE";
    targetType = "Training Course";
    targetName = body.title || "Training Course";
  } else if (route.includes("/api/training/modules") && method === "POST" && !route.includes("/complete") && !route.includes("/test-submit")) {
    action = "CREATE_TRAINING_MODULE";
    targetType = "Training Module";
    targetName = body.title || "Training Module";
  } else if (route.includes("/api/training/assign")) {
    action = "ASSIGN_TRAINING";
    targetType = "Training Assignment";
    targetName = body.internId ? `Intern ${body.internId}` : "Training Assignment";
  } else if (route.includes("/api/training/modules") && route.includes("/complete")) {
    action = "COMPLETE_TRAINING_MODULE";
    targetType = "Training Module";
  } else if (route.includes("/api/training/modules") && route.includes("/test-submit")) {
    action = "SUBMIT_TRAINING_TEST";
    targetType = "Training Test";
  } else if (route.includes("/api/attendance/check-in")) {
    action = "CHECK_IN";
    targetType = "Attendance";
  } else if (route.includes("/api/attendance/break-start")) {
    action = "START_BREAK";
    targetType = "Attendance Break";
  } else if (route.includes("/api/attendance/break-end")) {
    action = "END_BREAK";
    targetType = "Attendance Break";
  } else if (route.includes("/api/attendance/check-out")) {
    action = "CHECK_OUT";
    targetType = "Attendance";
  } else if (route.includes("/api/work-logs") && method === "POST") {
    action = "SUBMIT_WORK_LOG";
    targetType = "Work Log";
  } else if (route.includes("/api/work-logs") && route.includes("/review")) {
    action = "REVIEW_WORK_LOG";
    targetType = "Work Log";
    targetName = body.status || "Work Log";
  } else if (route.includes("/api/certificates/generate")) {
    action = "GENERATE_CERTIFICATE";
    targetType = "Certificate";
    targetName = body.internId ? `Intern ${body.internId}` : "Certificate";
  } else if (route.includes("/api/auth/logout")) {
    action = "LOGOUT";
    targetType = "Auth";
  }

  return {
    action,
    targetType,
    targetId: getTargetIdFromRequest(req),
    targetName,
  };
};

const createAuditLog = async ({
  actor = null,
  action,
  method,
  route,
  targetType = null,
  targetId = null,
  targetName = null,
  description = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
      (
        actor_id,
        actor_name,
        actor_email,
        actor_role,
        action,
        method,
        route,
        target_type,
        target_id,
        target_name,
        description,
        metadata,
        ip_address,
        user_agent
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14)
      `,
      [
        actor?.id || null,
        actor?.full_name || actor?.fullName || "Guest/System",
        actor?.email || null,
        actor?.role || "system",
        action,
        method,
        route,
        targetType,
        targetId ? String(targetId) : null,
        targetName,
        description,
        JSON.stringify(metadata || {}),
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    console.warn("Audit log failed:", error.message);
  }
};

const shouldAuditRequest = (req) => {
  const methodAllowed = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  if (!methodAllowed) return false;

  const route = String(req.originalUrl || "");

  if (!route.startsWith("/api")) return false;
  if (route.startsWith("/api/audit")) return false;
  if (route.startsWith("/api/health")) return false;
  if (route.startsWith("/api/auth/me")) return false;
  if (route.startsWith("/api/auth/login")) return false;

  return true;
};

const auditMiddleware = async (req, res, next) => {
  if (!shouldAuditRequest(req)) {
    return next();
  }

  const actor = await getUserFromRequest(req);
  const startedAt = Date.now();

  res.on("finish", async () => {
    const statusCode = res.statusCode;

    if (statusCode < 200 || statusCode >= 400) {
      return;
    }

    const details = inferAuditDetails(req);

    const actorName =
      actor?.full_name || actor?.fullName || actor?.email || "Guest/System";

    const cleanAction = details.action.replaceAll("_", " ").toLowerCase();

    await createAuditLog({
      actor,
      action: details.action,
      method: req.method,
      route: req.originalUrl,
      targetType: details.targetType,
      targetId: details.targetId,
      targetName: details.targetName,
      description: `${actorName} performed ${cleanAction}.`,
      metadata: {
        body: sanitizeValue(req.body || {}),
        query: sanitizeValue(req.query || {}),
        statusCode,
        durationMs: Date.now() - startedAt,
      },
      ipAddress:
        req.headers["x-forwarded-for"] ||
        req.socket?.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    });
  });

  return next();
};

module.exports = {
  createAuditLog,
  auditMiddleware,
};