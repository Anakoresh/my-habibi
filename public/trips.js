import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

async function loadGuestTrips() {
  try {
    const tripsRef = collection(db, "trips");
    const querySnapshot = await getDocs(tripsRef);
    const trips = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    displayAllTrips(trips);
    displayUpcomingTrip(trips);
  } catch (error) {
    console.error("Error loading trips:", error);
  }
}

function displayAllTrips(trips) {
  const allTripsContainer = document.querySelector(".all-trips");
  if (!allTripsContainer) return;

  allTripsContainer.innerHTML = trips.map(trip => `
    <div class="trip" data-trip-id="${trip.id}" data-title="${trip.title}" data-description="${trip.description}">
      <h3 class="trip-title">${trip.title}</h3>
      <div class="trip-container">
        <div class="trip-shadow"></div>
        <div class="trip-img" style="background-image: url('${trip.image}')"></div>
        <button onclick="showModal('${trip.id}')">about this trip</button>
      </div>
      <p class="trip-price">price: ${trip.price} LKR</p>
      <button class="request-trip custom-btn">REQUEST</button>
    </div>
  `).join("");
}

function displayUpcomingTrip(trips) {
  const upcomingTripsContainer = document.querySelector(".upcoming-trips");
  if (!upcomingTripsContainer) return;

  let upcomingTripsHTML = "";

  trips.forEach(trip => {
    if (trip.upcoming && trip.dates && trip.dates.length > 0) {
      trip.dates.forEach(dateInfo => {
        if (dateInfo.availability > 0) {
          upcomingTripsHTML += `
            <div class="trip" data-trip-id="${trip.id}" data-title="${trip.title}" data-description="${trip.description}">
              <h3 class="trip-title">${trip.title}</h3>
              <p class="trip-date">${dateInfo.date}</p>
              <div class="trip-container">
                <div class="trip-shadow"></div>
                <div class="trip-img" style="background-image: url('${trip.image}')"></div>
                <button onclick="showModal('${trip.id}')">about this trip</button>
              </div>
              <p class="trip-price">price: ${trip.price} LKR</p>
              <p class="trip-availability">available spots: ${dateInfo.availability}</p>
              <button class="book-trip custom-btn">BOOK</button>
            </div>
          `;
        }
      });
    }
  });

  upcomingTripsContainer.innerHTML = upcomingTripsHTML || "<p>No upcoming trips</p>";
}

window.showModal = function(tripId) {
  const tripElement = document.querySelector(`[data-trip-id="${tripId}"]`);
  if (!tripElement) return;

  const title = tripElement.dataset.title;
  const description = tripElement.dataset.description;

  document.getElementById("trip-title").innerText = title;
  document.getElementById("trip-description").innerText = description;
  document.getElementById("trip-info").classList.remove("d-none");
  document.querySelector(".overlay").classList.remove("d-none");
};

window.closeModalDescription = function() {
  document.getElementById("trip-info").classList.add("d-none");
  document.querySelector(".overlay").classList.add("d-none");
};

const closeModalButton = document.querySelector(".close-modal-trip-description");
closeModalButton.addEventListener("click", closeModalDescription);

const overlay = document.querySelector(".overlay");
overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModalDescription();
    }
  });

document.addEventListener("DOMContentLoaded", loadGuestTrips);

