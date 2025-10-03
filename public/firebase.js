import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-storage.js"; 
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdBYAy9vai5LroJJoIDca3jSk_HNw5YJA",
  authDomain: "my-habibi.firebaseapp.com",
  databaseURL: "https://my-habibi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-habibi",
  storageBucket: "my-habibi.appspot.app",
  messagingSenderId: "253698705073",
  appId: "1:253698705073:web:72e5b138e029f66fe28490",
  measurementId: "G-18TMPB3LE7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dbRT = getDatabase(app);
const messaging = getMessaging(app);

// async function saveFcmToken(userId, token) {
//   try {
//     const tokenRef = ref(dbRT, 'tokens/' + userId + '/fcmToken');
//     await set(tokenRef, token);
//     console.log("Token saved to database for user:", userId);
//   } catch (error) {
//     console.error('Error saving token to database:', error);
//   }
// }

async function saveFcmToken(userId, token) {
  try {
    const tokenRef = ref(dbRT, 'tokens/' + userId + '/fcmTokens');
    const snapshot = await get(tokenRef);
    let tokens = [];

    if (snapshot.exists()) {
      tokens = snapshot.val(); // уже массив
      if (!Array.isArray(tokens)) {
        tokens = []; // вдруг там строка
      }
    }

    if (!tokens.includes(token)) {
      tokens.push(token);
      await set(tokenRef, tokens);
      console.log("Token saved for user:", userId);
    } else {
      console.log("Token already exists for user:", userId);
    }
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

export const requestPermission = async () => {
  const userId = localStorage.getItem("authCode");
  if (!userId) {
    console.log("No authcode found. Skipping notification request.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return;
    }
    console.log("Notification permission granted.");

    const token = await getToken(messaging, {
      vapidKey: 'BDgr5rLt40rr1Fbzv9ofKnDXkSgevtSbnV_KQrsHkicdacSDxp79zH05DJkuKJIJJRXr6mLEQxyqJ7WWBNgsN6s'
    });

    if (token) {
      console.log("FCM Token:", token);
      saveFcmToken(userId, token);
    } else {
      console.log("No registration token available.");
    }
  } catch (error) {
    console.error("Error during notification permission request:", error);
  }
};

onMessage(messaging, (payload) => {
  console.log("Foreground message received:", payload);
  if (Notification.permission === "granted") {
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: "/img/firebase-logo.jpg"
    });
  }
});

export { dbRT, db };
