importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCdBYAy9vai5LroJJoIDca3jSk_HNw5YJA",
  authDomain: "my-habibi.firebaseapp.com",
  projectId: "my-habibi",
  storageBucket: "my-habibi.appspot.app",
  messagingSenderId: "253698705073",
  appId: "1:253698705073:web:72e5b138e029f66fe28490",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Background message received: ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/img/firebase-logo.jpg",
    data: {
      click_action: payload.data?.click_action || "/"
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || "/";
  event.waitUntil(clients.openWindow(clickAction));
});
