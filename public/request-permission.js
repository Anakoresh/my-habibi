import { requestPermission } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const authCode = localStorage.getItem("authCode");
  if (authCode) {
    await requestPermission();
  }
});
