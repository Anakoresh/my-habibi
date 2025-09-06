import { db } from "./firebase.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const addGuestForm = document.getElementById("add-guest-form");

addGuestForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const addButton = addGuestForm.querySelector('button[type="submit"]');
  addButton.disabled = true; 
  addButton.textContent = "ADDING..."; 

  const reservationName = document.getElementById("reservation-name").value.trim();
  const roomNumber = document.getElementById("room-number").value.trim();
  const guestEmail = document.getElementById("add-guest-email").value.trim();
  const checkInDate = document.getElementById("check-in-date").value.trim();
  const checkOutDate = document.getElementById("check-out-date").value.trim();
  const bookingCode = document.getElementById("booking-code").value.trim();
  const isGroupBooking = document.getElementById("is-group-booking").checked;

  if (new Date(checkInDate) >= new Date(checkOutDate)) {
    alert("Check-out date must be later than check-in date.");
    addButton.disabled = false; 
    addButton.textContent = "ADD GUEST";
    return;
  }

  const groupCode = bookingCode.substring(0, 5); 

  try {
    const guestsCollection = collection(db, "guests");
    const querySnapshot = await getDocs(guestsCollection);

    let maxGuestNumber = 0;
    
    querySnapshot.forEach((docSnap) => {
      const guest = docSnap.data();
      if (guest.guestName && guest.guestName.startsWith("Guest")) {
        const num = parseInt(guest.guestName.replace("Guest", ""), 10);
        if (!isNaN(num) && num > maxGuestNumber) {
          maxGuestNumber = num;
        }
      }
    });

    const newGuestNumber = maxGuestNumber + 1;
    const guestName = `Guest${newGuestNumber}`;

    await addDoc(guestsCollection, {
      reservationName,
      guestName,
      roomNumber,
      guestEmail,
      checkInDate,
      checkOutDate,
      bookingCode,
      isGroupBooking,
      groupCode: isGroupBooking ? groupCode : null,
    });

    alert("Guest added successfully!");
    addGuestForm.reset();
  } catch (error) {
    console.error("Error adding guest:", error);
    alert("Failed to add guest. Please try again.");
  } finally {
    addButton.disabled = false;
    addButton.textContent = "ADD GUEST";
  }
});
