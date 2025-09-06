document.addEventListener("DOMContentLoaded", () => {
  const notifBtnImg = document.querySelector("#notifications-btn img");
  if (!notifBtnImg) return; 
  
  function updateNotificationIcon() {
    if (document.body.classList.contains("dark")) {
      notifBtnImg.src = "img/notifications-dark.png";
    } else {
      notifBtnImg.src = "img/notifications.png";
    }
  }

  updateNotificationIcon();

  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", updateNotificationIcon);
  }
});