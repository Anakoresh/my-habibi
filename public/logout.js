document.getElementById("logout-btn").addEventListener("click", function () {
    localStorage.removeItem("authCode");
    window.location.href = "profile.html";
  });