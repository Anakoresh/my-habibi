import { dbRT } from "./firebase.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
    async function countUnreadMessagesForGuest(guestCode) {
        const messagesRef = ref(dbRT, `admin_chats/${guestCode}/messages`);
        const snapshot = await get(messagesRef);
    
        let unreadCount = 0;
    
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const msgData = childSnapshot.val();
                if (msgData.user === "admin" && !msgData.read_by_guest) {
                    unreadCount++;
                }
            });
        }
    
        return unreadCount;
    }
    
    async function updateGuestChatIndicator(guestCode) {
        const unreadCount = await countUnreadMessagesForGuest(guestCode);
        const chatBadge = document.querySelector(".guest-unread-badge");
        if (chatBadge) {
            if (unreadCount > 0) {
              chatBadge.textContent = unreadCount;
              chatBadge.style.display = "flex";
            } else {
              chatBadge.style.display = "none";
            }
          }
    }
    
    const guestCode = localStorage.getItem("authCode");

    updateGuestChatIndicator(guestCode);
});