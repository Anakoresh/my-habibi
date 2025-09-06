import { dbRT } from "./firebase.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  async function countUnreadMessagesForAdmin(adminId) {
    const chatsRef = ref(dbRT, "admin_chats");
    const snapshot = await get(chatsRef);

    let totalUnread = 0;
    let unreadChats = {};

    if (snapshot.exists()) {
      snapshot.forEach((chatSnapshot) => {
        const guestCode = chatSnapshot.key;
        const messages = chatSnapshot.child("messages");

        let unreadForChat = 0;

        messages.forEach((msgSnapshot) => {
          const msgData = msgSnapshot.val();
          if (
            msgData.role === "guest" &&
            (msgData.read_by && !msgData.read_by[adminId])
          ) {
            unreadForChat++;
          }
        });

        if (unreadForChat > 0) {
          unreadChats[guestCode] = unreadForChat;
          totalUnread += unreadForChat;
        }
      });
    }

    return { totalUnread, unreadChats };
  }

  async function updateAdminChatIndicator(adminId) {
    const { totalUnread, unreadChats } = await countUnreadMessagesForAdmin(
      adminId
    );
    const chatBadge = document.querySelector(".admin-unread-badge");
    if (chatBadge) {
      if (totalUnread > 0) {
        chatBadge.textContent = totalUnread;
        chatBadge.style.display = "flex"; 
      } else {
        chatBadge.style.display = "none"; 
      }
    }

    setTimeout(() => {
        Object.keys(unreadChats).forEach((guestCode) => {
          const chatItem = document.querySelector(`.chat-list-item[data-code="${guestCode}"]`);
          if (chatItem) {
            chatItem.classList.add("unread");
          }
        });
      }, 500);
  }

  const adminId = localStorage.getItem("authCode");

  updateAdminChatIndicator(adminId);
});
