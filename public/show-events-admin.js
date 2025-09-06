import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  setDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

async function loadEvents() {
  const eventsRef = collection(db, "events");
  const eventsSnapshot = await getDocs(eventsRef);
  const eventsData = eventsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const capacitiesRef = collection(db, "capacities");
  const capacitiesSnapshot = await getDocs(capacitiesRef);

  const capacitiesData = {};
  capacitiesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (!capacitiesData[data.eventId]) capacitiesData[data.eventId] = [];
    capacitiesData[data.eventId].push({ id: doc.id, ...data });
  });

  renderEvents(eventsData, capacitiesData);
}

function renderEvents(events, capacities) {
  const allEventsContainer = document.querySelector(".events-for-all-admin");
  const guestsEventsContainer = document.querySelector(
    ".events-for-guests-admin"
  );

  allEventsContainer.innerHTML = "";
  guestsEventsContainer.innerHTML = "";

  events.forEach((event) => {
    const container = event.audience === "all" ? allEventsContainer : guestsEventsContainer;

    const eventCapacities = capacities[event.id] || [];
    let capacitiesText = "No limit";

    if (event.dates && event.dates.length > 0) {
      capacitiesText = event.dates
        .map(date => {
          const cap = eventCapacities.find(c => c.date === date);
          return `${date}: ${cap ? (cap.remainingCapacity ?? "No limit") : "No limit"}`;
        })
        .join("<br>");
    }

    const content = document.createElement("div");
    content.classList.add("event"),
    content.innerHTML = `
          <p><strong>NAME:</strong> ${event.title}</p>
          <p><strong>DESCRIPTION:</strong> ${event.description}</p>
          <p><strong>LOCATION:</strong> ${event.location}</p>
          <p><strong>PRICE:</strong> ${
            event.price.isFree
              ? "Free"
              : `guests: ${event.price.guests} LKR; not guests: ${event.price.nonGuests} LKR`
          }</p>
          <p><strong>AVAILABILITY:</strong> ${capacitiesText}</p>
          <p><strong>BOOKERS:</strong> ${formatBookers(event.guests)}</p>
          <div class="d-flex justify-content-between">
            <button class="custom-btn" onclick="deleteEvent('${event.id}', this)">DELETE</button>
            <button class="custom-btn" onclick="editEvent('${event.id}', '${
      event.title
    }', '${encodeURIComponent(JSON.stringify(eventCapacities))}')">EDIT</button>
          </div>
        `;
    container.appendChild(content);
  });
}

function formatBookers(guests) {
    if (!guests || Object.keys(guests).length === 0) {
      return "No bookings";
    }
  
    let formattedBookings = [];
    Object.entries(guests).forEach(([date, dateGuests]) => {
      let bookersList = dateGuests.map((guest) => {
        if (guest.bookingCode) {
          return `${guest.guestName} (Room: ${guest.roomNumber})`;
        } else {
          return `${guest.name} (Email: ${guest.email}, Phone: ${guest.phone})`;
        }
      });
  
      formattedBookings.push(`${date}: ${bookersList.join(", ")}`);
    });
  
    return formattedBookings.join("\n");
  }

async function deleteEvent(eventId, button) {
  if (!confirm("Delete this event?")) return;

  await disableButtonWhileProcessing(button, async () => {
    await deleteDoc(doc(db, "events", eventId));

    const capacitiesRef = collection(db, "capacities");
    const q = query(capacitiesRef, where("eventId", "==", eventId));
    const capacitiesSnapshot = await getDocs(q);

    for (const capacityDoc of capacitiesSnapshot.docs) {
      await deleteDoc(doc(db, "capacities", capacityDoc.id));
    }

    alert("Event and all capacities deleted!");
    loadEvents();
  });
}

function editEvent(eventId, title, encodedCapacities) {
  const capacities = JSON.parse(decodeURIComponent(encodedCapacities));

  let menu = "Select a date to update:\n";
  capacities.forEach((cap, index) => {
    menu += `${index + 1}: ${cap.date} (current: ${cap.remainingCapacity})\n`;
  });
  menu += "0: Add a new date\n";

  menu += "Enter the number of the date to delete:\n";

  let choice = prompt(menu);
  if (choice === null) return;
  choice = parseInt(choice);

  if (choice === 0) {
    addNewCapacity(eventId, title);
  } else if (choice > 0 && choice <= capacities.length) {
    const capacity = capacities[choice - 1];
    const deleteConfirmation = confirm(
      `Do you want to delete the date ${capacity.date}?`
    );
    if (deleteConfirmation) {
      deleteCapacity(capacity.id, eventId, capacity.date);
    } else {
      updateCapacity(capacity);
    }
  } else {
    alert("Invalid choice!");
  }
}

async function updateCapacity(capacity) {
  const newCapacity = prompt(
    `Change available spots for ${capacity.date} (current: ${capacity.remainingCapacity})`
  );
  if (newCapacity === null) return;

  await updateDoc(doc(db, "capacities", capacity.id), {
    remainingCapacity: parseInt(newCapacity),
  });

  alert("Capacity updated!");
  loadEvents();
}

async function addNewCapacity(eventId, title) {
  const dateInput = prompt(
    `Enter the new date for "${title}" (format: yyyy-mm-dd):`
  );

  if (!dateInput) return;

  const date = new Date(dateInput);
  if (isNaN(date)) {
    alert("Invalid date format. Please use yyyy-mm-dd.");
    return;
  }

  const formattedDate = date.toISOString().split("T")[0]; 

  const newCapacity = prompt(`Enter capacity for ${formattedDate}:`);
  if (!newCapacity) return;

  const capacityDocId = `${eventId}_${formattedDate}`;

  const capacityRef = doc(db, "capacities", capacityDocId);

  await setDoc(capacityRef, {
    eventId,
    date: formattedDate,
    remainingCapacity: parseInt(newCapacity),
  });

  const eventRef = doc(db, "events", eventId);

  await updateDoc(eventRef, {
    dates: arrayUnion(formattedDate),
  });

  alert("New date and capacity added!");
  loadEvents();
}

async function deleteCapacity(capacityId, eventId, date) {
  if (!confirm(`Delete capacity for date ${date}?`)) return;

  await deleteDoc(doc(db, "capacities", capacityId));

  const eventRef = doc(db, "events", eventId);
  const eventSnapshot = await getDoc(eventRef);
  const eventData = eventSnapshot.data();
  const updatedDates = eventData.dates.filter(
    (existingDate) => existingDate !== date
  );

  await updateDoc(eventRef, {
    dates: updatedDates,
  });

  alert("Date and capacity deleted!");
  loadEvents();
}

function disableButtonWhileProcessing(button, asyncFunc) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Processing...";
  asyncFunc().finally(() => {
    button.disabled = false;
    button.textContent = originalText;
  });
}

loadEvents();
window.deleteEvent = deleteEvent;
window.deleteCapacity = deleteCapacity;
window.editEvent = editEvent;
