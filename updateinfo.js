document.addEventListener("DOMContentLoaded", () => {
  let user;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch (err) {
    console.error("Failed to parse user data:", err.message);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
    return;
  }
  if (user) {
    document.getElementById("username").value = user.username || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("age").value = user.age || "";
    document.getElementById("bio").value = user.bio || "";
  }

  const form = document.getElementById("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let token = localStorage.getItem("authToken");
    if (!token) {
      Swal.fire({
        title: "Unauthorized",
        text: "You must be logged in to update your information.",
        icon: "error",
        confirmButtonText: "Login",
      }).then(() => (window.location.href = "login.html"));
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

    let userInfo;
    try {
      userInfo = JSON.parse(localStorage.getItem("user"));
    } catch (err) {
      console.error("Failed to parse user data:", err.message);
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      window.location.href = "login.html";
      return;
    }
    if (!userInfo) {
      Swal.fire({
        title: "Unauthorized",
        text: "You must be logged in to update your information.",
        icon: "error",
        confirmButtonText: "Login",
      }).then(() => (window.location.href = "login.html"));
      return;
    }
    try {
      let response = await fetch(
        `http://localhost:5000/api/users/update/${userInfo.username}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify(updateData),
        }
      );

      let data = await response.json();

      if (!response.ok) {
        Swal.fire({
          title: "Validation Error",
          text: data.message || "Something went wrong",
          icon: "error",
          confirmButtonText: "OK",
        });
      } else {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("authToken", data.token);
        Swal.fire({
          title: "Update Successful 🎉",
          text: "Information updated",
          icon: "success",
          confirmButtonText: "OK",
        }).then(() => (window.location.href = "profile.html"));
      }
    } catch (err) {
      console.error("Update error:", err.message);
      Swal.fire({
        title: "Update Failed",
        text: "Could not connect to the server. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  });
});
