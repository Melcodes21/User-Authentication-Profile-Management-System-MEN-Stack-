let form = document.getElementById("form");
let username = document.getElementById("username");
let email = document.getElementById("email");
let password = document.getElementById("password");
let age = document.getElementById("age");
let bio = document.getElementById("bio");
let btn1 = document.getElementById("btn1");

btn1.addEventListener("click", async () => {
  let registerData = {
    username: username.value.trim(),
    email: email.value,
    password: password.value,
    age: age.value,
    bio: bio.value,
  };

  try {
    let response = await apiRequest("/register", {
      method: "POST",
      body: registerData,
    });

    let data = await response.text();
    console.log("server response:", data);

    if (!response.ok) {
      showError("Validation error", data);
    } else {
      showSuccess("Registration Successful", "Account created").then(
        (result) => {
          if (result.isConfirmed) {
            window.location.href = "login.html";
          }
        }
      );
    }
  } catch (err) {
    console.error("Error:", err);
    showError("Registration Failed", err.message);
  }
});
