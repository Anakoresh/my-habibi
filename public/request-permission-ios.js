import { requestPermission } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("enable-push");

  if (isIos() && isInStandaloneMode() && Notification.permission !== "granted") {
    btn.style.display = "block";
  }

  btn.addEventListener("click", async () => {
    await requestPermission();
    if (Notification.permission === "granted") {
      btn.style.display = "none";
    }
  });
});

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.navigator.standalone === true;
}
