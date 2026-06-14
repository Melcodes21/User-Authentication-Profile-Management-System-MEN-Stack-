document.addEventListener("DOMContentLoaded", () => {
  let user = requireAuth();
  if (!user) return;

  document.getElementById("username").value = user.username || "";
  document.getElementById("email").value = user.email || "";
  document.getElementById("age").value = user.age || "";
  document.getElementById("bio").value = user.bio || "";

  const form = document.getElementById("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let token = getAuthToken();
    if (!token) {
      showError("Unauthorized", "You must be logged in to update your information.").then(
        () => (window.location.href = "login.html")
      );
      return;
    }

    let updateData = {
      newUsername: document.getElementById("username").value,
      email: document.getElementById("email").value,
      age: document.getElementById("age").value,
      bio: document.getElementById("bio").value,
    };
    const password = document.getElementById("password").value;
    if (password) updateData.password = password;

    let userInfo = getStoredUser();
    if (!userInfo) {
      showError("Unauthorized", "You must be logged in to update your information.").then(
        () => (window.location.href = "login.html")
      );
      return;
    }

    let response = await apiRequest(`/update/${userInfo.username}`, {
      method: "PUT",
      body: updateData,
      auth: true,
    });

    let data = await response.json();

    if (!response.ok) {
      showError("Validation Error", data.message || "Something went wrong");
    } else {
      saveAuth(data.token, data.user);
      showSuccess("Update Successful", "Information updated").then(
        () => (window.location.href = "profile.html")
      );
    }
  });
});
