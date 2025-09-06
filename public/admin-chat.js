import { dbRT } from "./firebase.js";
import { ref, push, onChildAdded, query, orderByChild, get, update } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";
import { db } from "./firebase.js";
import { collection, getDocs, query as fsQuery, where } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const chatBox = document.querySelector(".chat-box");
const inputField = document.querySelector(".chat-input input");
const enterButton = document.querySelector(".chat-input button");
const guestCode = localStorage.getItem("authCode");

let userRole = "guest";
let userName = "You";
let lastReadTimestamp = 0;
let guestChatRef;
let adminCodes = [];

async function getUserRole() {
  if (!guestCode) {
    console.error("Guest code is missing.");
    return;
  }
  try {
    const guestRef = collection(db, "guests");
    const adminRef = collection(db, "admins");

    let q = fsQuery(guestRef, where("bookingCode", "==", guestCode));
    let querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const user = querySnapshot.docs[0].data();
      userName = user.guestName || "Guest";
      userRole = "guest";
      return;
    }

    q = fsQuery(adminRef, where("adminCode", "==", guestCode));
    querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const user = querySnapshot.docs[0].data();
      userName = user.name || "Admin";
      userRole = user.role || "admin";
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
  }
}

async function getAdminCodes() {
  try {
    const adminRef = collection(db, "admins");
    const q = fsQuery(adminRef, where("role", "==", "admin"));
    const querySnapshot = await getDocs(q);
    adminCodes = querySnapshot.docs.map(doc => doc.data().adminCode);
  } catch (error) {
    console.error("Error fetching admin codes:", error);
  }
}

async function initializeChat() {
  if (!guestCode) return;

  guestChatRef = ref(dbRT, `admin_chats/${guestCode}/messages`);
  const messagesQuery = query(guestChatRef, orderByChild("timestamp"));

  onChildAdded(messagesQuery, (snapshot) => {
    const data = snapshot.val();
    addMessage(data.user, data.text, data.role, data.timestamp);
  });
}

async function sendMessage(message) {
  if (!message.trim()) return;
  const timestamp = Date.now();

  let readBy = {};
  adminCodes.forEach(code => {
    readBy[code] = false;
  });

  push(guestChatRef, {
    user: userName,
    role: userRole,
    text: message,
    timestamp: timestamp,
    read_by: readBy
  })
    .then(() => {
      lastReadTimestamp = timestamp;
    })
    .catch((error) => console.error("Error sending message:", error));
}

function addMessage(user, message, role, timestamp) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedDate = date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const messageElement = document.createElement("div");
  let messageClass = "message";
  if (role === "admin") messageClass += " admin";
  if (role === "manager") messageClass += " manager";
  if (user === userName && role === userRole) {
    messageClass += " right";
  } else {
    messageClass += " left";
  }
  messageElement.className = messageClass;
  messageElement.innerHTML = `<p><strong>${user}:</strong> ${message}</p><span class="time">${formattedDate} ${time}</span>`;
  if (role === "admin" || role === "manager") {
    messageElement.innerHTML += `<span class="role">${role}</span>`;
  }
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

enterButton.addEventListener("click", () => {
  sendMessage(inputField.value);
  inputField.value = "";
});

inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage(inputField.value);
    inputField.value = "";
  }
});

async function markMessagesAsRead() {
  const messagesRef = ref(dbRT, `admin_chats/${guestCode}/messages`);
  const snapshot = await get(messagesRef);

  if (snapshot.exists()) {
    snapshot.forEach(childSnapshot => {
      const msgKey = childSnapshot.key;
      const msgData = childSnapshot.val();

      if (msgData.user !== userName && !msgData.read_by_guest) {
        update(ref(dbRT, `admin_chats/${guestCode}/messages/${msgKey}`), {
          read_by_guest: true
        });
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await getUserRole();
  await getAdminCodes();
  await initializeChat();
  await markMessagesAsRead();
});