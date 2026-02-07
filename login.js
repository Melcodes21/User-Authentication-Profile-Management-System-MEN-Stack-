// login
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
    let response = await fetch(`http://localhost:5000/api/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    let data = await response.json(); 

    if (!response.ok) {
      Swal.fire({
        title: "Validation error 🎉",
        text: data.message || data,
        icon: "error",
        confirmButtonText: "OK",
        width: "350px",
      });
    } else {
      // ✅ Save token & user info
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      Swal.fire({
        title: "Login Successful 🎉",
        text: "Welcome Back!!",
        icon: "success",
        confirmButtonText: "OK",
        width: "350px",
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "profile.html";
        }
      });
    }
  } catch (err) {
    console.error("Login Error:", err);
    Swal.fire({
      title: "Login Failed",
      text: err.message,
      icon: "error",
      confirmButtonText: "OK",
      width: "350px",
    });
  }
});
