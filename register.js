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
    let response = await fetch(`http://localhost:5000/api/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
    });
    let data = await response.text();
    console.log("server response:", data);
    if (!response.ok)
      Swal.fire({
        title: "Validation error 🎉",
        text: data,
        icon: "error",
        confirmButtonText: "OK",
        width: "350px",
      });
    else {
      Swal.fire({
        title: "Registration Successful 🎉",
        text: "Account created",
        icon: "success",
        confirmButtonText: "OK",
        width: "350px",
      }).then((result) => {
        if (result.isConfirmed) {
          // Code to update profile
          window.location.href = "Login.html";
        }
      });
    }
  } catch (err) {
    console.error("Error:", err);
    Swal.fire({
      title: "registration Failed ",
      text: err.message,
      icon: "error",
      confirmButtonText: "OK",
      width: "350px",
    });
  }
});
