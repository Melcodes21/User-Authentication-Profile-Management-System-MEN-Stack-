document.addEventListener("DOMContentLoaded", () => {
  const user = requireAuth();
  if (!user) return;

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
    clearAuth();
    window.location.href = "login.html";
  });
});
