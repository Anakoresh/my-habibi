import { db } from "./firebase.js";
import {
  collection,
  setDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.querySelector(".overlay");
  const bookingForm = document.querySelector(".booking-form");
  const successMessage = document.querySelector(".request-trip-success");
  const closeModalButtons = document.querySelectorAll(".close-modal");

  document.body.addEventListener("click", function (event) {
    if (event.target && event.target.matches(".request-trip")) {
      const button = event.target;
      setButtonProcessing(button, true);

      const tripId = button.closest("[data-trip-id]")?.getAttribute("data-trip-id");
      const tripName = button.closest(".trip")?.querySelector(".trip-title")?.textContent.trim();

      if (!tripId || !tripName) {
        alert("Ошибка: не удалось получить информацию о туре.");
        setButtonProcessing(button, false);
        return;
      }

      checkAuthorization(tripId, tripName)
        .finally(() => setButtonProcessing(button, false));
    }

  });

  closeModalButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  function checkAuthorization(tripId, tripName) {
    const reservationCode = localStorage.getItem("authCode");

    if (reservationCode) {
      checkReservationCode(reservationCode, tripId, tripName);
    } else {
      showBookingForm(tripId, tripName);
    }
  }

  async function checkReservationCode(reservationCode, tripId, tripName) {
    const guestsCollection = collection(db, "guests");
    const querySnapshot = await getDocs(guestsCollection);
    let isValidCode = false;
    let guestData = null;

    for (const doc of querySnapshot.docs) {
      const guest = doc.data();
      if (guest.bookingCode === reservationCode) {
        const checkoutDate = new Date(guest.checkOutDate);
        checkoutDate.setHours(23, 59, 59, 999);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        if (checkoutDate < currentDate) {
          alert("Your booking has expired. You are no longer authorized!");
          localStorage.removeItem("authCode");
          document.querySelectorAll("button").forEach((btn) => {
            if (btn.disabled && btn.dataset.originalText) {
              setButtonProcessing(btn, false);
            }
          });
          showBookingForm(tripId, tripName);
          return;
        }

        localStorage.setItem("authCode", reservationCode);
        isValidCode = true;
        guestData = guest;
        saveTripRequest(guestData, tripId, tripName);
        bookingForm.classList.add("d-none");
        break;
      }
    }

    if (!isValidCode) {
      alert("Invalid reservation code.");
      localStorage.removeItem("authCode");
    }
  }

  function showBookingForm(tripId, tripName) {
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
      if (!reservationCode) {
        alert("Please enter a valid reservation code.");
        return;
      }

      setButtonProcessing(newEnterButton, true);

      try {
        await checkReservationCode(reservationCode, tripId, tripName);
      } finally {
        setButtonProcessing(newEnterButton, false);
      }
    });

    newNotGuestSubmitButton.addEventListener("click", async () => {
      const name = document.getElementById("not-guest-name").value;
      const number = document.getElementById("not-guest-number").value;
      const email = document.getElementById("not-guest-email").value;

      if (!(name && number && email)) {
        alert("Please fill out all the fields.");
        return;
      }

      setButtonProcessing(newNotGuestSubmitButton, true);

      try {
        localStorage.setItem("guestName", name);
        localStorage.setItem("guestPhone", number);
        localStorage.setItem("guestEmail", email);

        const guestData = {
          name: localStorage.getItem("guestName") || "Guest",
          phone: localStorage.getItem("guestPhone") || "Unknown",
          email: localStorage.getItem("guestEmail") || "Unknown",
        };

        await saveTripRequest(guestData, tripId, tripName);
        resetBookingForm();
      } finally {
        setButtonProcessing(newNotGuestSubmitButton, false);
      }
    });
  }

  function resetBookingForm() {
    bookingForm.classList.add("d-none");

    document.getElementById("reservation-code").value = "";
    document.getElementById("not-guest-name").value = "";
    document.getElementById("not-guest-number").value = "";
    document.getElementById("not-guest-email").value = "";

    bookingForm
      .querySelectorAll(".error")
      .forEach((el) => el.classList.remove("error"));
  }

  async function saveTripRequest(guestData, tripId, tripName) {
    try {
      const tripRequestsRef = collection(db, "trip_requests");

      await addDoc(tripRequestsRef, {
        tripId,
        tripName,
        guestData,
        timestamp: new Date(),
      });

      console.log("Booking request saved successfully!");

      const adminsRef = collection(db, "admins");
      const adminSnapshot = await getDocs(adminsRef);
      
      const adminList = adminSnapshot.docs
        .filter((doc) => doc.data().role === "admin")
        .map((doc) => doc.data().adminCode);

      const notificationsRef = collection(db, "notifications");
      await addDoc(notificationsRef, {
        tripId,
        tripName,
        guestData,
        type: "Request for a day trip",
        timestamp: new Date(),
        unreadBy: adminList,
        undeletedBy: adminList,
      });

      showSuccessMessage();

      document.querySelectorAll("button").forEach((btn) => {
        if (btn.disabled && btn.dataset.originalText) {
          setButtonProcessing(btn, false);
        }
      });

    } catch (error) {
      console.error("Error saving booking request:", error);
      alert("An error occurred while saving the request.");
    }
  }

  function closeModal() {
    overlay.classList.add("d-none");
    bookingForm.classList.add("d-none");
    successMessage.classList.add("d-none");

    document.querySelectorAll("button").forEach((btn) => {
      if (btn.disabled && btn.dataset.originalText) {
        setButtonProcessing(btn, false);
      }
    });
  }

  function showSuccessMessage() {
    successMessage.classList.remove("d-none");
    overlay.classList.remove("d-none");

    const closeModalButton = successMessage.querySelector(".close-modal");
    closeModalButton.addEventListener("click", () => {
      successMessage.classList.add("d-none");
      overlay.classList.add("d-none");
      location.reload();
    });
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  }); 

  bookingForm.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  successMessage.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  function setButtonProcessing(button, isProcessing) {
    if (isProcessing) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = "Processing...";
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }
});
