let form = document.getElementById("form");
let email = document.getElementById("email");
let password = document.getElementById("password");
let btn2 = document.getElementById("btn2");

btn2.addEventListener("click", async () => {
  let loginData = {
    email: email.value,
    password: password.value,
  };

  try {
    let response = await apiRequest("/login", {
      method: "POST",
      body: loginData,
    });

    let data = await response.json();

    if (!response.ok) {
      showError("Validation error", data.message || data);
    } else {
      saveAuth(data.token, data.user);

      showSuccess("Login Successful", "Welcome Back!!").then((result) => {
        if (result.isConfirmed) {
          window.location.href = "profile.html";
        }
      });
    }
  } catch (err) {
    console.error("Login Error:", err);
    showError("Login Failed", err.message);
  }
});
