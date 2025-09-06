import { dbRT, db } from "./firebase.js";
import {
  ref,
  onValue,
  push,
  set,
  get,
  update,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const chatList = document.querySelector(".chat-list");
const chatBox = document.querySelector(".chat-box");
const inputField = document.querySelector(".chat-input input");
const enterButton = document.querySelector(".chat-input button");
const adminId = localStorage.getItem("authCode");

let currentGuestCode = null;

async function loadGuests() {
  const guestsCollection = collection(db, "guests");
  const guestsSnapshot = await getDocs(guestsCollection);

  let guestsData = [];

  for (const doc of guestsSnapshot.docs) {
    const guest = doc.data();
    const guestCode = guest.bookingCode;

    const lastMessage = await getLastMessageTimestamp(guestCode);

    guestsData.push({
      guestName: guest.guestName,
      roomNumber: guest.roomNumber,
      guestCode,
      lastMessageTime: lastMessage,
    });
  }

  guestsData.sort(
    (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
  );

  chatList.innerHTML = ""; 

  guestsData.forEach((guest) => {
    const chatItem = document.createElement("div");
    chatItem.className = "chat-list-item";
    chatItem.textContent = `${guest.guestName} (Room: ${guest.roomNumber})`;
    chatItem.textContent += ` ${guest.guestCode}`;
    chatItem.dataset.code = guest.guestCode;

    chatItem.addEventListener("click", () => {
      document
        .querySelectorAll(".chat-list-item")
        .forEach((item) => item.classList.remove("active"));
      chatItem.classList.add("active");
      openChat(guest.guestCode);
    });

    chatList.appendChild(chatItem);
  });
}

async function getLastMessageTimestamp(guestCode) {
  const messagesRef = ref(dbRT, `admin_chats/${guestCode}/messages`);
  const snapshot = await get(messagesRef);

  let lastTimestamp = null;

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      const msgData = childSnapshot.val();
      if (msgData && msgData.timestamp) {
        const msgTime = new Date(msgData.timestamp).getTime();
        if (!lastTimestamp || msgTime > lastTimestamp) {
          lastTimestamp = msgTime;
        }
      }
    });
  }

  return lastTimestamp;
}

function openChat(guestCode) {
  currentGuestCode = guestCode;
  chatBox.innerHTML = ""; 

  const messagesRef = ref(dbRT, `admin_chats/${guestCode}/messages`);

  onValue(messagesRef, (snapshot) => {
    chatBox.innerHTML = "";

    snapshot.forEach((childSnapshot) => {
      const msgData = childSnapshot.val();
      const senderType = msgData.user === "admin" ? "right" : "left";
      addMessage(msgData.text, senderType, msgData.user, msgData.timestamp);

      if (
        msgData.user !== "admin" &&
        (!msgData.read_by || !msgData.read_by[adminId])
      ) {
        const msgKey = childSnapshot.key; 

        update(ref(dbRT, `admin_chats/${guestCode}/messages/${msgKey}`), {
          [`read_by/${adminId}`]: true, 
        });
      }
    });
  });
  const chatItem = document.querySelector(`.chat-list-item[data-code="${currentGuestCode}"]`);
  chatItem.classList.remove("unread");
}

function addMessage(message, type = "right", user = "You", timestamp = null) {
  let timeString = "";
  if (timestamp) {
    const dateObj = new Date(timestamp);
    const datePart = dateObj.toLocaleDateString(); 
    const timePart = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }); 
    timeString = `${datePart} ${timePart}`;
  } else {
    timeString = new Date().toLocaleString();
  }

  const messageElement = document.createElement("div");
  messageElement.className = `message ${type}`;
  messageElement.innerHTML = `<p><strong>${user}:</strong> ${message}</p><span class="time">${timeString}</span>`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

enterButton.addEventListener("click", sendMessage);
inputField.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  if (!currentGuestCode) return alert("Выберите гостя для отправки сообщения!");

  const messageText = inputField.value.trim();
  if (!messageText) return;

  const messagesRef = ref(dbRT, `admin_chats/${currentGuestCode}/messages`);
  const newMessageRef = push(messagesRef);
  const timestamp = new Date().toISOString();

  set(newMessageRef, {
    text: messageText,
    user: "admin",
    timestamp,
    read_by_guest: false,
  });

  inputField.value = "";

  updateGuestPosition(currentGuestCode, timestamp);
}

async function updateGuestPosition(guestCode, timestamp) {
  const guestItem = document.querySelector(
    `.chat-list-item[data-code="${guestCode}"]`
  );

  if (guestItem) {
    guestItem.dataset.lastMessageTime = new Date(timestamp).getTime();

    const chatItems = [...document.querySelectorAll(".chat-list-item")];
    chatItems.sort(
      (a, b) =>
        (b.dataset.lastMessageTime || 0) - (a.dataset.lastMessageTime || 0)
    );

    chatList.innerHTML = "";
    chatItems.forEach((item) => chatList.appendChild(item));
  }
}

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", () => {
  const searchText = searchInput.value.toLowerCase();

  document.querySelectorAll(".chat-list-item").forEach((item) => {
    const guestText = item.textContent.toLowerCase();
    if (guestText.includes(searchText)) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", loadGuests);
