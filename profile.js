document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  // If not logged in, redirect to login
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Use safe DOM manipulation instead of innerHTML to prevent XSS
  const profileInfo = document.getElementById("profile-info");
  profileInfo.textContent = "";

  const avatar = document.createElement("img");
  avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=007bff&color=fff`;
  avatar.alt = "User Avatar";
  avatar.className = "avatar";
  profileInfo.appendChild(avatar);

  const usernameP = document.createElement("p");
  usernameP.innerHTML = "<strong>Username:</strong> ";
  usernameP.appendChild(document.createTextNode(user.username));
  profileInfo.appendChild(usernameP);

  const emailP = document.createElement("p");
  emailP.innerHTML = "<strong>Email:</strong> ";
  emailP.appendChild(document.createTextNode(user.email));
  profileInfo.appendChild(emailP);

  if (user.age) {
    const ageP = document.createElement("p");
    ageP.innerHTML = "<strong>Age:</strong> ";
    ageP.appendChild(document.createTextNode(user.age));
    profileInfo.appendChild(ageP);
  }

  if (user.bio) {
    const bioP = document.createElement("p");
    bioP.innerHTML = "<strong>Bio:</strong> ";
    bioP.appendChild(document.createTextNode(user.bio));
    profileInfo.appendChild(bioP);
  }

  const logoutBtn = document.createElement("button");
  logoutBtn.id = "logout-btn";
  logoutBtn.className = "groupbtn";
  logoutBtn.textContent = "Logout";
  profileInfo.appendChild(logoutBtn);

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
  });
});
