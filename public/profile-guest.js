import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const reservationName = document.querySelector(".reservation-name");
  const guestRoom = document.querySelector(".guest-room");
  const checkIn = document.querySelector(".checkin");
  const checkOut = document.querySelector(".checkout");
  const guestNameDisplay = document.querySelector(".guest-name");
  const guestNameInput = document.getElementById("guest-name-input");
  const saveButton = document.getElementById("save-guest-name");
  const title = document.querySelector(".main-title");

  const guestCode = localStorage.getItem("authCode");

  if (!guestCode) {
    console.error("Guest code is missing in localStorage.");
    return;
  }

  let guestDocId = null; // Сохраняем ID документа для обновления

  try {
    const guestRef = collection(db, "guests");
    const q = query(guestRef, where("bookingCode", "==", guestCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const guestDoc = querySnapshot.docs[0];
      const guest = guestDoc.data();
      guestDocId = guestDoc.id; // Сохраняем ID документа

      reservationName.textContent = `Reservation Name: ${guest.reservationName}`;
      guestRoom.textContent = `Room: ${guest.roomNumber}`;
      checkIn.textContent = `Check-in: ${guest.checkInDate}`;
      checkOut.textContent = `Check-out: ${guest.checkOutDate}`;
      guestNameDisplay.textContent = `Guest: ${guest.guestName}`;
      guestNameInput.value = guest.guestName; 
      title.textContent = `WELCOME, ${guest.guestName}`;
    } else {
      console.error("Guest not found.");
      guestNameDisplay.textContent = "UNKNOWN";
    }
  } catch (error) {
    console.error("Error fetching guest:", error);
    guestNameDisplay.textContent = "Error loading guest";
  }

  saveButton.addEventListener("click", async () => {
    if (!guestDocId) return;

    const newGuestName = guestNameInput.value.trim();
    if (!newGuestName) {
      alert("Name cannot be empty!");
      return;
    }

    try {
      const guestDocRef = doc(db, "guests", guestDocId);
      await updateDoc(guestDocRef, { guestName: newGuestName });

      guestNameDisplay.textContent = `Guest: ${newGuestName}`;
      title.textContent = `WELCOME, ${newGuestName}`;
      alert("Name updated successfully!");
    } catch (error) {
      console.error("Error updating guest name:", error);
      alert("Failed to update name. Please try again.");
    }

    editNameContainer.classList.add("d-none");
    editNameBtn.classList.remove("d-none");
  });

  const editNameContainer = document.querySelector(".edit-name");
  const editNameBtn = document.querySelector(".edit-name-btn");

  editNameBtn.addEventListener("click", function () {
    editNameContainer.classList.remove("d-none");
    editNameBtn.classList.add("d-none");
  });
});

// if (localStorage.getItem("authCode")) {
//   import("./firebase.js").then(({ requestPermission }) => {
//     requestPermission();
//   });
// }
