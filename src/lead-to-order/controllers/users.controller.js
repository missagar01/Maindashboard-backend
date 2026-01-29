const {
  fetchUsers,
  fetchUserById,
  fetchUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  fetchDepartments,
} = require("../services/users.service.js");

const ADMIN_ONLY_MESSAGE = "Admin role required to manage users.";

function ensureAdmin(req, res) {
  if (req.user?.userType !== "admin") {
    res.status(403).json({ success: false, message: ADMIN_ONLY_MESSAGE });
    return false;
  }
  return true;
}

const listUsers = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    const users = await fetchUsers();
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error("List users error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

const getUser = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }
  try {
    const user = await fetchUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Fetch user error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

const createUserHandler = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const {
    user_name,
    password,
    email_id,
    number,
    department,
    role,
    status,
    user_access,
    remark,
    employee_id,
    page_access,
    system_access,
  } = req.body;

  if (!user_name || !password || !department || (typeof department === 'string' && department.trim() === '')) {
    return res.status(400).json({
      success: false,
      message: "user_name, password, and department are required",
    });
  }

  try {
    const existing = await fetchUserByUsername(user_name);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with that username already exists",
      });
    }

    const newUser = await createUser({
      user_name,
      password,
      email_id,
      number,
      department,
      role,
      status,
      user_access,
      remark,
      employee_id,
      page_access,
      system_access,
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.error("Create user error:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    const errorMessage = error.detail || error.message || "Failed to create user";
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateUserHandler = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  const allowedFields = [
    "user_name",
    "password",
    "email_id",
    "number",
    "department",
    "role",
    "status",
    "user_access",
    "remark",
    "employee_id",
    "page_access",
    "system_access",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (field in req.body) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields provided for update",
    });
  }

  try {
    const updated = await updateUser(userId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update user error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

const deleteUserHandler = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid user id" });
  }

  try {
    const deleted = await deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await fetchDepartments();
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error("Fetch departments error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch departments" });
  }
};

module.exports = {
  listUsers,
  getUser,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  getDepartments,
};



