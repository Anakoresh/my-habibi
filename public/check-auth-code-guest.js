import { db, dbRT } from "./firebase.js";
import { ref, remove } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc, 
  doc
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
  const storedCode = localStorage.getItem("authCode");

  if (storedCode) {
    await checkCode(storedCode);
    return;
  }

  if (!storedCode) {
    window.location.href = "profile.html";
    return;
  }

  async function checkCode(code) {
    const guestData = await fetchGuest(code);
    if (guestData) {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      if (guestData.checkOutDate < today) {
        await deleteGuestCompletely(guestData, code);
        alert("Your stay has ended!");
        localStorage.removeItem("authCode", code);
        window.location.href = "profile.html";
        return;
      }
    } else {
      localStorage.removeItem("authCode", code);
      window.location.href = "profile.html";
    }
  }

  async function fetchGuest(code) {
    const guestRef = collection(db, "guests");
    const q = query(guestRef, where("bookingCode", "==", code));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
    return null;
  }

  async function deleteGuestCompletely(guestData, bookingCode) {
    try {
      const guestsRef = collection(db, "guests");
      const q = query(guestsRef, where("bookingCode", "==", bookingCode));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, "guests", docSnap.id));
        console.log(`Guest ${bookingCode} deleted from Firestore`);
      });

      await remove(ref(dbRT, `users/${bookingCode}`));
      await remove(ref(dbRT, `admin_chats/${bookingCode}`));
      await remove(ref(dbRT, `tokens/${bookingCode}`));
      console.log(`Guest ${bookingCode} deleted from Realtime Database`);
    } catch (error) {
      console.error("Error deleting guest completely:", error);
    }
  }
})