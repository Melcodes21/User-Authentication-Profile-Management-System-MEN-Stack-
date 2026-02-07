const updateinfo = document.getElementById("updateinfo");
let username = document.getElementById("username");
let email = document.getElementById("email");
let password = document.getElementById("password");
let age = document.getElementById("age");
let bio = document.getElementById("bio");

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  //  If not logged in, redirect to login
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  

  //  If logged in, show profile
  document.getElementById("profile-info").innerHTML = `
  <img src="https://ui-avatars.com/api/?name=${
    user.username
  }&background=007bff&color=fff" 
         alt="User Avatar" class="avatar" />
   
    <p><strong>Username:</strong> ${user.username}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    ${user.age ? `<p><strong>Age:</strong> ${user.age}</p>` : ""}
    ${user.bio ? `<p><strong>Bio:</strong> ${user.bio}</p>` : ""}
     <button id="logout-btn" class"groupbtn">Logout</button>
      
  `;
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });
  
});
