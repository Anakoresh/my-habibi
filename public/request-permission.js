import { requestPermission } from "./firebase.js";

// --- Проверка iOS ---
function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.navigator.standalone === true;
}

// --- iOS PWA кнопка ---
const btn = document.getElementById("enable-push");

if (btn && isIos() && isInStandaloneMode() && Notification.permission !== "granted") {
  btn.style.display = "block";

  btn.addEventListener("click", async () => {
    if ("serviceWorker" in navigator) {
      try {
        // Регистрируем Service Worker перед запросом разрешения
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("SW registered:", registration.scope);

        // Теперь безопасно запрашиваем разрешение и получаем FCM токен
        await requestPermission();

        if (Notification.permission === "granted") {
          btn.style.display = "none";
        }
      } catch (error) {
        console.error("SW registration failed:", error);
      }
    }
  });
}

// --- Android / Desktop ---
async function initMessaging() {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("Firebase Messaging SW registered:", registration.scope);

      const authCode = localStorage.getItem("authCode");

      // Только если не iOS (iOS уже обрабатывается кнопкой)
      if (!isIos() && authCode) {
        await requestPermission();
      }

    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }
}

// Регистрируем SW и инициализируем уведомления после полной загрузки страницы
window.addEventListener("load", initMessaging);
