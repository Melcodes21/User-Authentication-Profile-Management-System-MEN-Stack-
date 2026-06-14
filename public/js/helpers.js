const API_BASE = "http://localhost:5000/api/users";

// --- SweetAlert Wrappers ---

function showAlert({ title, text, icon, confirmButtonText = "OK", width = "350px" }) {
  return Swal.fire({ title, text, icon, confirmButtonText, width });
}

function showError(title, text) {
  return showAlert({ title, text, icon: "error" });
}

function showSuccess(title, text) {
  return showAlert({ title, text, icon: "success" });
}

// --- API Request Helper ---

async function apiRequest(endpoint, { method = "GET", body = null, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getAuthToken();
    if (token) headers["Authorization"] = "Bearer " + token;
  }
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  return fetch(`${API_BASE}${endpoint}`, options);
}

// --- Auth / LocalStorage Helpers ---

function getStoredUser() {
  return JSON.parse(localStorage.getItem("user"));
}

function getAuthToken() {
  return localStorage.getItem("authToken");
}

function requireAuth(redirectUrl = "login.html") {
  const user = getStoredUser();
  if (!user) {
    window.location.href = redirectUrl;
    return null;
  }
  return user;
}

function saveAuth(token, user) {
  localStorage.setItem("authToken", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem("user");
  localStorage.removeItem("authToken");
}

// --- Shared UI Helpers ---

function togglePassword() {
  const pw = document.getElementById("password");
  pw.type = pw.type === "password" ? "text" : "password";
}
