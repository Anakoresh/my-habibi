import { dbRT } from "./firebase.js";
import {
  ref,
  push,
  onChildAdded,
  query,
  orderByChild,
  update,
  get,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";

import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query as fsQuery,
  where,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const chatBox = document.querySelector(".chat-box");
const inputField = document.querySelector(".chat-input input");
const enterButton = document.querySelector(".chat-input button");
const guestCode = localStorage.getItem("authCode");

let userRole = "guest";
let userName = "You";
let lastReadTimestamp = 0;

async function getUserRole() {
  if (!guestCode) {
    console.error("Guest code is missing.");
    window.location.href = "profile.html";
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

async function getLastReadTimestamp() {
  if (!guestCode) return;
  const userRef = ref(dbRT, `users/${guestCode}/lastReadTimestamp`);
  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    lastReadTimestamp = snapshot.val();
  }
}

async function updateLastReadTimestamp() {
  if (!guestCode) return;

  const messagesRef = ref(dbRT, "messages");
  const messagesQuery = query(messagesRef, orderByChild("timestamp"));
  const snapshot = await get(messagesQuery);

  if (snapshot.exists()) {
    const messages = Object.values(snapshot.val());
    const lastMessage = messages[messages.length - 1]; 
    if (lastMessage) {
      lastReadTimestamp = lastMessage.timestamp; 
      const userRef = ref(dbRT, `users/${guestCode}`);
      await update(userRef, { lastReadTimestamp });
    }
  }
}

function hideUnreadDivider() {
  const unreadDivider = document.querySelector(".unread-divider");
  if (unreadDivider) {
    unreadDivider.remove();
  }
}

async function sendMessage(message) {
  if (!message.trim()) return;

  const timestamp = Date.now();
  push(ref(dbRT, "messages"), {
    user: userName, 
    userCode: guestCode,  
    role: userRole,
    text: message,
    timestamp: timestamp,
  })
  .then(async () => {
    lastReadTimestamp = timestamp;
    updateLastReadTimestamp();
    hideUnreadDivider();
  })
  .catch((error) => console.error("Error sending message:", error));
}

function addUnreadDivider(firstUnreadMessage) {
  if (!document.querySelector(".unread-divider") && firstUnreadMessage) {
    const divider = document.createElement("div");
    divider.className = "unread-divider";
    divider.textContent = "Unread messages";
    firstUnreadMessage.parentNode.insertBefore(
      divider,
      firstUnreadMessage.nextSibling
    );
  }
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
  return messageElement;
}

enterButton.addEventListener("click", () => {
  sendMessage(inputField.value);
  inputField.value = "";
  updateLastReadTimestamp();
});

inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage(inputField.value);
    inputField.value = "";
    updateLastReadTimestamp();
  }
});

document.addEventListener("DOMContentLoaded", async function () {
  await getUserRole();
  await getLastReadTimestamp();

  const messagesRef = ref(dbRT, "messages");
  const messagesQuery = query(messagesRef, orderByChild("timestamp"));

  let firstUnreadMessage = null;
  let isFirstVisit = lastReadTimestamp === 0; 

  onChildAdded(messagesQuery, (snapshot) => {
    const data = snapshot.val();
    const messageElement = addMessage(
      data.user,
      data.text,
      data.role,
      data.timestamp
    );

    if (data.timestamp > lastReadTimestamp && !firstUnreadMessage) {
      firstUnreadMessage = messageElement;
    }
  });

  setTimeout(() => {
    if (!isFirstVisit && firstUnreadMessage) {
      addUnreadDivider(firstUnreadMessage.previousSibling);
      firstUnreadMessage.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      chatBox.scrollTop = chatBox.scrollHeight; 
    }
  }, 1000);
});

document.querySelector(".chat-box").addEventListener("mouseenter", () => {
  updateLastReadTimestamp();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    updateLastReadTimestamp();
  }

  chatBox.addEventListener("scroll", () => {
    if (chatBox.scrollTop + chatBox.clientHeight >= chatBox.scrollHeight) {
      updateLastReadTimestamp(); 
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      updateLastReadTimestamp();
    }
  });
});

const updateMembersCount = async () => {
  const usersRef = ref(dbRT, "users"); 

  try {
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const users = snapshot.val();
      const userCount = Object.keys(users).length;

      document.querySelector(
        ".members-number"
      ).textContent = `${userCount} members`;
    } else {
      document.querySelector(".members-number").textContent = "0 members";
    }
  } catch (error) {
    console.error("Ошибка при получении пользователей:", error);
    document.querySelector(".members-number").textContent = "Error";
  }
};

document.addEventListener("DOMContentLoaded", updateMembersCount);
