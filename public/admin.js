import { dbRT } from "./firebase.js";
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";
import {
  ref,
  remove,
  get,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";

document.addEventListener("DOMContentLoaded", async () => {
  const adminName = document.querySelector(".admin-name");
  const adminCode = localStorage.getItem("authCode");

  if (!adminCode) {
    console.error("Admin code is missing in localStorage.");
    localStorage.removeItem("authCode");
    window.location.href = "profile.html";
    return;
  }

  try {
    const adminRef = collection(db, "admins");
    const q = query(adminRef, where("adminCode", "==", adminCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const admin = querySnapshot.docs[0].data();
      adminName.textContent = `ADMIN: ${admin.name}`;
    } else {
      console.error("Admin not found.");
      adminName.textContent = "UNKNOWN ADMIN";
    }
  } catch (error) {
    console.error("Error fetching admin:", error);
    adminName.textContent = "Error loading admin";
  }
});

if (localStorage.getItem("authcode")) {
    import("/firebase.js").then(({ requestPermission }) => {
      requestPermission();
    });
}

const deleteOldGuests = async () => {
  const btn = document.getElementById("deleteGuestsBtn");
  btn.disabled = true;
  btn.textContent = "Processing...";

  const guestsRef = collection(db, "guests");
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  try {
    const snapshot = await getDocs(guestsRef);
    for (const docSnap of snapshot.docs) {
      const guestData = docSnap.data();
      const checkOutDate = guestData.checkOutDate
        ? new Date(guestData.checkOutDate)
        : null;

      if (checkOutDate && checkOutDate <= oneDayAgo) {
        await deleteDoc(doc(db, "guests", docSnap.id));

        if (guestData.bookingCode) {
          await remove(ref(dbRT, `users/${guestData.bookingCode}`));
          await remove(ref(dbRT, `admin_chats/${guestData.bookingCode}`));
          await remove(ref(dbRT, `tokens/${guestData.bookingCode}`));
          console.log(
            `BookingCode ${guestData.bookingCode} удалён из Realtime Database`
          );
        }
      }
    }

    alert("OLD GUESTS ARE DELETED");
  } catch (error) {
    console.error("ERROR:", error);
    alert("THERE IS AN ERROR");
  } finally {
    btn.disabled = false;
    btn.textContent = "DELETE OLD GUESTS";
  }
};

const deleteOldMessages = async () => {
  const btn = document.getElementById("deleteMessagesBtn");
  btn.disabled = true;
  btn.textContent = "Processing...";

  const messagesRef = ref(dbRT, "messages");
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  try {
    const snapshot = await get(messagesRef);
    if (snapshot.exists()) {
      const messages = snapshot.val();

      for (const messageId in messages) {
        const message = messages[messageId];
        if (message.timestamp && message.timestamp <= sevenDaysAgo) {
          await remove(ref(dbRT, `messages/${messageId}`));
          console.log(`Сообщение ${messageId} удалено`);
        }
      }
    }

    alert("OLD MESSAGES ARE DELETED");
  } catch (error) {
    console.error("ERROR:", error);
    alert("THERE IS AN ERROR");
  } finally {
    btn.disabled = false;
    btn.textContent = "DELETE OLD MESSAGES";
  }
};

document
  .getElementById("deleteGuestsBtn")
  .addEventListener("click", deleteOldGuests);

document
  .getElementById("deleteMessagesBtn")
  .addEventListener("click", deleteOldMessages);

