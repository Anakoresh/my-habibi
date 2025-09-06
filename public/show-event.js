import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const eventsContainerForAll = document.getElementById("events-for-everyone"); 
const eventsContainerForGuests = document.getElementById("events-for-guests"); 
const noEventsMessageForAll = document.querySelector(".no-events-for-everyone"); 
const noEventsMessageForGuests = document.querySelector(".no-events-for-guests"); 
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const filterButton = document.querySelector(".filter-button");
const noEventsAccessMessage = document.querySelector(".no-access-events");
const noBenefitsAccessMessage = document.querySelector(".no-access-benefits");

async function getCheckoutDateFromGuests() {
  const reservationCode = localStorage.getItem("authCode");
  if (!reservationCode) return null; 

  const guestsCol = collection(db, "guests");
  const q = query(guestsCol, where("bookingCode", "==", reservationCode));

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const guestData = querySnapshot.docs[0].data();
    return new Date(guestData.checkOutDate); 
  }

  return null;  
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function fetchAndDisplayEvents(filterDates = null) {
  try {
    const checkoutDate = await getCheckoutDateFromGuests();
    const currentDate = stripTime(new Date());
    const hasAccessToGuestsEvents = checkoutDate && stripTime(checkoutDate) >= currentDate;

    const eventsCol = collection(db, "events");
    const capacitiesCol = collection(db, "capacities");

    const eventsSnapshot = await getDocs(eventsCol);
    const eventsForAll = [];
    const eventsForGuests = [];

    const capacitiesSnapshot = await getDocs(capacitiesCol);
    const capacitiesMap = {};

    capacitiesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!capacitiesMap[data.eventId]) capacitiesMap[data.eventId] = {};
      capacitiesMap[data.eventId][data.date] = data.remainingCapacity;
    });

    eventsSnapshot.forEach((doc) => {
      const event = { id: doc.id, ...doc.data() };

      if (filterDates) {
        const [startDate, endDate] = filterDates;
        const isWithinRange = event.dates.some((date) => {
          const eventDate = new Date(date);
          return eventDate >= startDate && eventDate <= endDate;
        });
        if (!isWithinRange) return; 
      }

      const availableDates = event.dates.filter((date) => {
        const capacity = capacitiesMap[event.id]?.[date];
        return capacity === undefined || capacity > 0; 
      });

      if (availableDates.length === 0) return;

      event.dates = availableDates;
      event.availability = availableDates
        .map((date) => {
          const capacity = capacitiesMap[event.id]?.[date];
          return capacity !== undefined ? `${date} (${capacity})` : `${date} (no limit)`;
        })
        .join(", ");

      if (event.audience === "all") {
        eventsForAll.push(event);
      } else if (event.audience === "guests") {
        eventsForGuests.push(event);
      }
    });

    eventsContainerForAll.innerHTML = "";
    eventsContainerForGuests.innerHTML = "";

    if (eventsForAll.length === 0) {
      noEventsMessageForAll.classList.remove("d-none");
    } else {
      noEventsMessageForAll.classList.add("d-none");
    }

    if (hasAccessToGuestsEvents) {
      noEventsAccessMessage.classList.add("d-none"); 
      noBenefitsAccessMessage.classList.add("d-none");
      benefitsContainer.classList.remove("d-none");
      eventsContainerForGuests.classList.remove("d-none");
      noEventsMessageForGuests.classList.add("d-none");
      if (eventsForGuests.length === 0) {
        noEventsMessageForGuests.classList.remove("d-none");
      }
    } else {
      noEventsMessageForGuests.classList.add("d-none");
      noBenefitsAccessMessage.classList.remove("d-none");
      noEventsAccessMessage.classList.remove("d-none");
      eventsContainerForGuests.classList.add("d-none");
      benefitsContainer.classList.add("d-none");
    }

    eventsForAll.forEach((event) => {
      const eventCard = createEventCard(event);
      eventsContainerForAll.appendChild(eventCard);
    });

    eventsForGuests.forEach((event) => {
      const eventCard = createEventCard(event);
      eventsContainerForGuests.appendChild(eventCard);
    });

    addDatePickerListeners();
  } catch (error) {
    console.error("Error fetching events:", error);
  }
}

function createEventCard(event) {
  const eventCard = document.createElement("div");
  eventCard.classList.add("event-card-container");
  eventCard.setAttribute("data-event-id", event.id);

  const dateHTML =
    event.dates.length > 1
      ? `<div class="date-picker">
           <input type="text" class="choose-date" placeholder="choose date" readonly>
           <div class="date-dropdown">
             ${event.dates
               .map((date) => `<p class="date-option">${date}</p>`)
               .join("")}
           </div>
         </div>`
      : `<p class="fixed-date">${event.dates[0]}</p>`;
  eventCard.innerHTML = `
      <div class="event-card-shadow"></div>
      <div class="event-card d-flex align-items-center flex-column">
        <h3 class="event-title">${event.title}</h3>
        <p class="event-description">${event.description}</p>
        ${dateHTML}
        <p class="event-location">location: <mark>${event.location}</mark></p>
        <p class="event-price">price: ${
          event.price.isFree
            ? "Free"
            : event.price.guests === event.price.nonGuests
            ? `${event.price.guests} lkr`
            : `${event.price.guests} lkr ( for habibi guests) / ${event.price.nonGuests} lkr (for other)`
        }</p>
        <p class="event-availability">availability: ${event.availability}</p>
        ${
          event.availability && !event.availability.includes("no limit")
            ? '<button class="book-event custom-btn">BOOK</button>'
            : ""
        }
      </div>
    `;
  return eventCard;
}

function addDatePickerListeners() {
    const datePickers = document.querySelectorAll('.date-picker');
    datePickers.forEach((picker) => {
        const input = picker.querySelector('.choose-date');
        const dropdown = picker.querySelector('.date-dropdown');

        input.addEventListener('click', () => {
            dropdown.classList.toggle('d-block');
        });

        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-option')) {
                input.value = e.target.textContent;
                dropdown.classList.remove('d-block');
            }
        });
    });
}

filterButton.addEventListener("click", async () => {
  const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
  const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

  if (startDate && endDate && startDate <= endDate) {
    filterButton.disabled = true;
    filterButton.textContent = "Loading...";
    try {
      await fetchAndDisplayEvents([startDate, endDate]); 
    } finally {
      filterButton.disabled = false; 
      filterButton.textContent = "SEARCH";
    }
  } else if (!startDate && !endDate) {
    filterButton.disabled = true;
    filterButton.textContent = "Loading...";
    try {
      await fetchAndDisplayEvents();
    } finally {
      filterButton.disabled = false;
      filterButton.textContent = "SEARCH";
    }
  } else {
    alert("Please select a valid date range.");
  }
});

fetchAndDisplayEvents();

const benefitsContainer = document.querySelector(".benefits");

async function loadBenefits() {
    const querySnapshot = await getDocs(collection(db, "benefits"));
    querySnapshot.forEach((doc) => {
        const benefit = doc.data();
        const benefitCard = document.createElement("div");
        benefitCard.classList.add("event-card-container");
        benefitCard.innerHTML = `
            <div class="event-card-shadow"></div>
            <div class="event-card d-flex align-items-center flex-column">
                <h3 class="event-title">${benefit.title}</h3>
                <p class="event-description">${benefit.description}</p>
                <p class="event-location">Location: <mark>${benefit.location}</mark></p>
            </div>
        `;
        benefitsContainer.appendChild(benefitCard);
    });
}

loadBenefits();







