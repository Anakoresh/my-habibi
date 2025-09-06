import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const guestList = document.getElementById("guest-list");
const dateFilter = document.getElementById("date-filter");
const today = new Date().toISOString().split("T")[0];
dateFilter.value = today;

async function loadGuests(filterDate = today) {
  guestList.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "guests"));
  const roomFilter = document.getElementById("room-filter").value;

  let guests = [];

  querySnapshot.forEach((doc) => {
    const guest = { id: doc.id, ...doc.data() };
    if (guest.checkInDate <= filterDate && guest.checkOutDate >= filterDate) {
      if (!roomFilter || guest.roomNumber == roomFilter) {
        guests.push(guest);
      }
    }
  });

  guests.sort((a, b) => parseInt(a.roomNumber) - parseInt(b.roomNumber));

  const checkingOutToday = guests.filter((g) => g.checkOutDate === filterDate);
  const stayingGuests = guests.filter((g) => g.checkOutDate !== filterDate);

  if (checkingOutToday.length > 0) {
    const checkOutDiv = document.createElement("div");
    checkOutDiv.innerHTML = `<h2 class="section-title">CHECK OUT TODAY</h2>`;
    guestList.appendChild(checkOutDiv);
    checkingOutToday.forEach(renderGuest);
  }

  if (stayingGuests.length > 0) {
    const stayDiv = document.createElement("div");
    stayDiv.innerHTML = `<h2 class="section-title">CURRENTLY STAYING</h2>`;
    guestList.appendChild(stayDiv);
    stayingGuests.forEach(renderGuest);
  }
}

document.getElementById("room-filter").addEventListener("change", () => {
  loadGuests(dateFilter.value);
});

function renderGuest(guest) {
  const guestDiv = document.createElement("div");
  guestDiv.classList.add("guest-item");

  if (guest.groupCode) {
    guestDiv.classList.add("group-booking");
  }

  guestDiv.innerHTML = `
        <p><strong>${guest.reservationName}</strong> (${guest.guestName} - ${guest.bookingCode})</p>
        <p>Room: <input type="number" value="${
          guest.roomNumber
        }" onchange="updateGuest('${guest.id}', 'roomNumber', this.value)"></p>
        <p>Check-in: <input type="date" value="${
          guest.checkInDate
        }" onchange="updateGuest('${guest.id}', 'checkInDate', this.value)"></p>
        <p>Check-out: <input type="date" value="${
          guest.checkOutDate
        }" onchange="updateGuest('${
    guest.id
  }', 'checkOutDate', this.value)"></p>
        ${
          guest.groupCode
            ? `<p class="group-label">Group Code: ${guest.groupCode}</p>`
            : ""
        }
        <button class="custom-btn" onclick="openOrdersModal('${
          guest.bookingCode 
        }')">orders</button>
    `;

  guestList.appendChild(guestDiv);
}

window.updateGuest = async (id, field, value) => {
  await updateDoc(doc(db, "guests", id), { [field]: value });
  loadGuests(dateFilter.value);
};

dateFilter.addEventListener("change", () => {
  loadGuests(dateFilter.value);
});

loadGuests();