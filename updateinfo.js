document.addEventListener("DOMContentLoaded", () => {
  let user = JSON.parse(localStorage.getItem("user"));
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

    let userInfo = JSON.parse(localStorage.getItem("user"));
    if (!userInfo) {
      Swal.fire({
        title: "Unauthorized",
        text: "You must be logged in to update your information.",
        icon: "error",
        confirmButtonText: "Login",
      }).then(() => (window.location.href = "login.html"));
      return;
    }
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
  });
});
