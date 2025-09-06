const profileMenu = document.querySelector(".profile-menu");
const prevBtn = document.querySelector(".prev-btn");
const nextBtn = document.querySelector(".next-btn");

function updateButtons() {
  const scrollLeft = profileMenu.scrollLeft;
  const scrollWidth = profileMenu.scrollWidth;
  const clientWidth = profileMenu.clientWidth;

  if (scrollLeft === 0) {
    prevBtn.classList.add("hidden");
  } else {
    prevBtn.classList.remove("hidden");
  }

  if (scrollLeft + clientWidth >= scrollWidth) {
    nextBtn.classList.add("hidden");
  } else {
    nextBtn.classList.remove("hidden");
  }
}

prevBtn.addEventListener("click", () => {
  profileMenu.scrollBy({ left: -200, behavior: "smooth" });
});

nextBtn.addEventListener("click", () => {
  profileMenu.scrollBy({ left: 200, behavior: "smooth" });
});

profileMenu.addEventListener("scroll", updateButtons);

updateButtons();

import { dbRT } from "./firebase.js";
import { ref, query, orderByChild, get } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";

async function updateUnreadMessagesCount(userCode) {
  if (!userCode) {
    console.error("User code is missing.");
    return;
  }

  try {
    const lastReadRef = ref(dbRT, `users/${userCode}/lastReadTimestamp`);
    const snapshot = await get(lastReadRef);

    let lastReadTimestamp = snapshot.exists() ? snapshot.val() : 0;

    const messagesRef = ref(dbRT, "messages");
    const messagesQuery = query(messagesRef, orderByChild("timestamp"));
    const messagesSnapshot = await get(messagesQuery);

    if (!messagesSnapshot.exists()) {
      console.log("No messages found.");
      return;
    }

    const messages = Object.values(messagesSnapshot.val());
    let unreadCount = 0;

    messages.forEach((message) => {
      if (lastReadTimestamp && message.timestamp > lastReadTimestamp) {
        unreadCount++;
      }
    });

    const badgeElement = document.querySelector(".chat-icon-badge");
    if (badgeElement) {
      if (unreadCount > 0) {
        badgeElement.textContent = unreadCount;
        badgeElement.style.display = "flex"; 
      } else {
        badgeElement.style.display = "none"; 
      }
    }

  } catch (error) {
    console.error("Error fetching unread messages count:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const userCode = localStorage.getItem("authCode"); 
  if (userCode) {
    await updateUnreadMessagesCount(userCode);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const profileMenu = document.querySelector(".profile-menu");
  const profileMenuItems = profileMenu?.querySelectorAll(".profile-menu-item a") || [];
  const prevBtn = document.querySelector(".prev-btn");
  const nextBtn = document.querySelector(".next-btn");

  function updateButtons() {
    if (!profileMenu) return;
    const scrollLeft = profileMenu.scrollLeft;
    const scrollWidth = profileMenu.scrollWidth;
    const clientWidth = profileMenu.clientWidth;

    if (scrollLeft <= 0) prevBtn?.classList.add("hidden");
    else prevBtn?.classList.remove("hidden");

    if (scrollLeft + clientWidth >= scrollWidth) nextBtn?.classList.add("hidden");
    else nextBtn?.classList.remove("hidden");
  }

  prevBtn?.addEventListener("click", () => {
    profileMenu?.scrollBy({ left: -200, behavior: "smooth" });
  });

  nextBtn?.addEventListener("click", () => {
    profileMenu?.scrollBy({ left: 200, behavior: "smooth" });
  });

  profileMenu?.addEventListener("scroll", updateButtons);
  updateButtons();

  const currentFile = window.location.pathname.split("/").pop();

  profileMenuItems.forEach(link => {
    const linkHref = link.getAttribute("href")?.split("/").pop();
    if (!linkHref) return;

    if (linkHref === currentFile || linkHref.replace(/\..+$/, "") === currentFile.replace(/\..+$/, "")) {
      link.classList.add("active");
      link.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else {
      link.classList.remove("active");
    }
  });
});









