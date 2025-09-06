import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const form = document.getElementById("add-event-form");
const submitBtn = form.querySelector("button[type='submit']");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Adding...";

    try {
      const title = document.getElementById("event-name").value;
      const description = document.getElementById("event-description").value;
      const dateInput = document.getElementById("event-date").value;
      const priceGuests =
        parseInt(document.getElementById("event-price-guests").value) || 0;
      const priceNonGuests =
        parseInt(document.getElementById("event-price-non-guests").value) || 0;
      const isFree = document.getElementById("is-free").checked;
      const maxCapacity =
        parseInt(document.getElementById("event-max-capacity").value) || null;
      const location = document.getElementById("event-location").value;
      const audience = document.getElementById("event-audience").value;

      const dates = dateInput
        .split(",")
        .map((date) => date.trim())
        .filter((date) => date.length > 0);

      const isValidDate = (dateString) => {
        const parsedDate = new Date(dateString);
        return (
          !isNaN(parsedDate.getTime()) &&
          /^\d{4}-\d{2}-\d{2}$/.test(dateString)
        );
      };

      if (dates.some((date) => !isValidDate(date))) {
        alert("One or more dates are invalid. Please use the format YYYY-MM-DD.");
        return;
      }

      const sortedDates = dates.sort((a, b) => new Date(a) - new Date(b));

      if (isFree && (priceGuests > 0 || priceNonGuests > 0)) {
        alert("For free event the price must be 0");
        return;
      }

      if (dates.length === 0) {
        alert("Add at least one date");
        return;
      }

      const eventData = {
        title,
        description,
        dates: sortedDates,
        price: { guests: priceGuests, nonGuests: priceNonGuests, isFree },
        location,
        audience,
      };

      const eventRef = await addDoc(collection(db, "events"), eventData);

      if (maxCapacity) {
        for (const date of sortedDates) {
          const capacityData = {
            eventId: eventRef.id,
            date,
            remainingCapacity: maxCapacity,
          };
          await setDoc(doc(db, "capacities", `${eventRef.id}_${date}`), capacityData);
        }
      }

      form.reset();
      location.reload();
    } catch (error) {
      console.error("Event adding error:", error);
      // alert("Try again!");
      location.reload();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

