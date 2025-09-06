import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  const overlay = document.querySelector(".overlay");
  const eventBookingConfirmation = document.querySelector(
    ".event-booking-confirmation"
  );
  const bookingForm = document.querySelector(".booking-form");
  const closeModalButtons = document.querySelectorAll(".close-modal");

  document.body.addEventListener("click", function (event) {
    if (event.target && event.target.matches(".book-event")) {
      checkAuthorization(event);
    }
  });

  closeModalButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  function checkAuthorization(event) {
    const eventId = event.target
      .closest(".event-card-container")
      .getAttribute("data-event-id");
    const reservationCode = localStorage.getItem("authCode");

    if (reservationCode) {
      checkReservationCode(reservationCode, eventId);
    } else {
      showBookingForm(eventId);
    }
  }

  async function checkReservationCode(reservationCode, eventId) {
    const guestsCollection = collection(db, "guests");
    const querySnapshot = await getDocs(guestsCollection);
    let isValidCode = false;
    let eventData = null;

    for (const doc of querySnapshot.docs) {
      const guestData = doc.data();
      if (guestData.bookingCode === reservationCode) {
        const checkoutDate = new Date(guestData.checkOutDate);
        checkoutDate.setHours(23, 59, 59, 999);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        if (checkoutDate < currentDate) {
          const btn = document.querySelector(".booking-form button");
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Enter"; 
          }
          alert("Your booking has expired. You are no longer authorized!");
          localStorage.removeItem("authCode");
          showBookingForm(eventId);
          return;
        }
        localStorage.setItem("authCode", reservationCode);
        isValidCode = true;
        eventData = await getEventData(eventId);
        showEventBookingConfirmation(eventData, eventId, guestData);
        break;
      }
    }

    if (!isValidCode) {
      alert("Invalid reservation code.");
      localStorage.removeItem("authCode");
    }
  }

  async function getEventData(eventId) {
    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);
    return eventDoc.exists() ? eventDoc.data() : null;
  }

  function showBookingForm(eventId) {
    resetBookingForm();

    bookingForm.classList.remove("d-none");
    overlay.classList.remove("d-none");

    const enterButton = bookingForm.querySelector("button");
    const newEnterButton = enterButton.cloneNode(true);
    enterButton.replaceWith(newEnterButton);

    const notGuestSubmitButton = bookingForm.querySelector(
      ".not-guest-form button"
    );
    const newNotGuestSubmitButton = notGuestSubmitButton.cloneNode(true);
    notGuestSubmitButton.replaceWith(newNotGuestSubmitButton);

    newEnterButton.addEventListener("click", async () => {
      const reservationCode = document.getElementById("reservation-code").value;

      if (reservationCode) {
        newEnterButton.disabled = true;
        const oldText = newEnterButton.textContent;
        newEnterButton.textContent = "Checking...";

        try {
          await checkReservationCode(reservationCode, eventId);
        } finally {
          newEnterButton.disabled = false;
          newEnterButton.textContent = oldText;
        }
      } else {
        alert("Please enter a valid reservation code.");
      }
    });

    newNotGuestSubmitButton.addEventListener("click", async () => {
      const name = document.getElementById("not-guest-name").value;
      const number = document.getElementById("not-guest-number").value;
      const email = document.getElementById("not-guest-email").value;

      if (name && number && email) {
        newNotGuestSubmitButton.disabled = true;
        const oldText = newNotGuestSubmitButton.textContent;
        newNotGuestSubmitButton.textContent = "Processing...";

        try {
          localStorage.setItem("guestName", name);
          localStorage.setItem("guestPhone", number);
          localStorage.setItem("guestEmail", email);
          const guestData = {
            name: localStorage.getItem("guestName") || "Guest",
            phone: localStorage.getItem("guestPhone") || "Unknown",
            email: localStorage.getItem("guestEmail") || "Unknown",
          };

          const eventData = await getEventData(eventId);
          showEventBookingConfirmation(eventData, eventId, guestData);
        } finally {
          newNotGuestSubmitButton.disabled = false;
          newNotGuestSubmitButton.textContent = oldText;
        }
      } else {
        alert("Please fill out all the fields.");
      }
    });
  }


  function resetBookingForm() {
    bookingForm.classList.add("d-none");
    overlay.classList.add("d-none");

    document.getElementById("reservation-code").value = "";
    document.getElementById("not-guest-name").value = "";
    document.getElementById("not-guest-number").value = "";
    document.getElementById("not-guest-email").value = "";

    bookingForm
      .querySelectorAll(".error")
      .forEach((el) => el.classList.remove("error"));
  }

  function showEventBookingConfirmation(eventData, eventId, guestData) {
    resetEventBookingConfirmation();

    if (eventData) {
      const eventTitle = eventBookingConfirmation.querySelector(".event-title");
      const eventDate = eventBookingConfirmation.querySelector(".event-date");
      const eventDescription =
        eventBookingConfirmation.querySelector(".event-description");
      const eventLocation =
        eventBookingConfirmation.querySelector(".event-location");
      const eventContainer = document.querySelector(
        `[data-event-id="${eventId}"]`
      );

      if (!eventContainer) {
        alert("Event container not found.");
        return;
      }

      const currentSelectedDate =
        eventContainer.querySelector(".choose-date")?.value ||
        eventContainer.querySelector(".fixed-date")?.textContent ||
        eventData.dates[0]; 

      eventDate.textContent = `Date: ${currentSelectedDate}`;
      
      eventTitle.textContent = eventData.title;
      const eventName = eventData.title;
      eventDescription.textContent = eventData.description;
      eventLocation.textContent = `Location: ${eventData.location}`;

      bookingForm.classList.add("d-none");
      eventBookingConfirmation.classList.remove("d-none");
      overlay.classList.remove("d-none");

      const confirmButton =
        eventBookingConfirmation.querySelector(".confirm-event");

      confirmButton.replaceWith(confirmButton.cloneNode(true));
      const newConfirmButton =
        eventBookingConfirmation.querySelector(".confirm-event");

      newConfirmButton.addEventListener("click", async () => {
        newConfirmButton.disabled = true;
        const oldText = newConfirmButton.textContent;
        newConfirmButton.textContent = "Saving...";

        try {
          await saveBookingToEvent(
            eventId,
            guestData,
            currentSelectedDate,
            eventName
          );
          eventBookingConfirmation.classList.add("d-none");
          console.log("Booking confirmed successfully!");
        } finally {
          newConfirmButton.disabled = false;
          newConfirmButton.textContent = oldText;
        }
      });
    } else {
      alert("Event not found.");
    }
  }

  function resetEventBookingConfirmation() {
    eventBookingConfirmation.classList.add("d-none");

    eventBookingConfirmation.querySelector(".event-title").textContent = "";
    eventBookingConfirmation.querySelector(".event-date").textContent = "";
    eventBookingConfirmation.querySelector(".event-description").textContent =
      "";
    eventBookingConfirmation.querySelector(".event-location").textContent = "";

    eventBookingConfirmation
      .querySelectorAll(".error")
      .forEach((el) => el.classList.remove("error"));
  }

  async function saveBookingToEvent(eventId, guestData, selectedDate, eventName) {
    console.log("Selected Date:", selectedDate);
    console.log("Guest Data:", guestData);
    console.log("Event ID:", eventId);

    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);

    if (eventDoc.exists()) {
      const eventData = eventDoc.data();

      if (!eventData.dates || !Array.isArray(eventData.dates)) {
        console.error("Invalid event data or missing dates:", eventData);
        return;
      }

      const eventDates = eventData.dates;
      if (!eventDates.includes(selectedDate)) {
        console.error(
          `Selected date ${selectedDate} is not available for this event.`
        );
        return;
      }

      const capacityDocRef = doc(
        db,
        "capacities",
        `${eventId}_${selectedDate}`
      );
      const capacityDoc = await getDoc(capacityDocRef);

      if (capacityDoc.exists()) {
        const capacityData = capacityDoc.data();

        if (capacityData.remainingCapacity > 0) {
          const newCapacity = capacityData.remainingCapacity - 1;

          await updateDoc(capacityDocRef, { remainingCapacity: newCapacity });

          console.log(
            `Updated remaining capacity for ${selectedDate}: ${newCapacity}`
          );

          if (!eventData.guests) {
            eventData.guests = {};
          }

          if (!eventData.guests[selectedDate]) {
            eventData.guests[selectedDate] = [];
          }

          eventData.guests[selectedDate].push(guestData);

          await updateDoc(eventRef, {
            [`guests.${selectedDate}`]: eventData.guests[selectedDate],
          });

          console.log(`Booking saved for selected date: ${selectedDate}`);

          const adminsRef = collection(db, "admins");
          const adminSnapshot = await getDocs(adminsRef);

          const adminList = adminSnapshot.docs
            .filter((doc) => doc.data().role === "admin")
            .map((doc) => doc.data().adminCode);

          const notificationsRef = collection(db, "notifications");
          await addDoc(notificationsRef, {
            eventName: eventName,
            eventDate: selectedDate,
            guestData,
            type: "New booking for an event",
            timestamp: new Date(),
            unreadBy: adminList,
            undeletedBy: adminList,
          });

          showSuccessMessage();
        } else {
          alert("No more spots available for the selected date.");
        }
      } else {
        console.error(
          `Capacity document for event ${eventId} and date ${selectedDate} not found.`
        );
      }
    } else {
      console.error(`Event with ID ${eventId} not found.`);
    }
  }

  function closeModal() {
    overlay.classList.add("d-none");
    eventBookingConfirmation.classList.add("d-none");
    bookingForm.classList.add("d-none");

    const successMessage = document.querySelector(".event-booking-success");
    if (successMessage && !successMessage.classList.contains("d-none")) {
      successMessage.classList.add("d-none");
      location.reload();
    }
  }

  function showSuccessMessage() {
  const successMessage = document.querySelector(".event-booking-success");
  const closeModalButton = successMessage.querySelector(".close-modal");
  
  overlay.classList.remove("d-none");
  successMessage.classList.remove("d-none");
  
  closeModalButton.onclick = () => {
    successMessage.classList.add("d-none");
    overlay.classList.add("d-none");
    location.reload();
  };
  
  overlay.onclick = () => {
    successMessage.classList.add("d-none");
    overlay.classList.add("d-none");
    location.reload();
  };
  
  successMessage.onclick = (e) => {
    e.stopPropagation();
  };
}

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
  
  bookingForm.addEventListener("click", (event) => event.stopPropagation());
  eventBookingConfirmation.addEventListener("click", (event) =>
    event.stopPropagation()
  );
});
