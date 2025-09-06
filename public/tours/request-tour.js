import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  const overlay = document.querySelector(".overlay");
  const bookingForm = document.querySelector(".booking-form");
  const successMessage = document.querySelector(".request-tour-success");
  const closeModalButtons = document.querySelectorAll(".close-modal");

  const tourId = document.location.pathname.match(/tour-(\d+)\.html/)[1];

  document.body.addEventListener("click", async function (event) {
    const requestBtn = event.target.closest(".request-tour");
    if (!requestBtn) return; 

    requestBtn.disabled = true;
    const oldText = requestBtn.textContent;
    requestBtn.textContent = "Loading...";

    try {
      await checkAuthorization();
    } finally {
      requestBtn.disabled = false;
      requestBtn.textContent = oldText;
    }
  });

  closeModalButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  function checkAuthorization() {
    const reservationCode = localStorage.getItem("authCode");
    return reservationCode
      ? checkReservationCode(reservationCode)
      : Promise.resolve(showBookingForm()); 
  }

  async function checkReservationCode(reservationCode) {
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
          const btn = document.querySelector(".booking-form button");
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Enter"; // или что у тебя там по умолчанию
          }
          alert("Your booking has expired. You are no longer authorized!");
          localStorage.removeItem("authCode");
          showBookingForm();
          return;
        }

        localStorage.setItem("authCode", reservationCode);
        isValidCode = true;
        guestData = guest;
        saveTourBooking(guestData);
        bookingForm.classList.add("d-none");
        break;
      }
    }

    if (!isValidCode) {
      alert("Invalid reservation code.");
      localStorage.removeItem("authCode");
    }
  }

  function showBookingForm() {
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

      newEnterButton.disabled = true;
      const oldText = newEnterButton.textContent;
      newEnterButton.textContent = "Checking...";

      try {
        await checkReservationCode(reservationCode);
      } finally {
        newEnterButton.disabled = false;
        newEnterButton.textContent = oldText;
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

      newNotGuestSubmitButton.disabled = true;
      const oldText = newNotGuestSubmitButton.textContent;
      newNotGuestSubmitButton.textContent = "Sending...";

      try {
        localStorage.setItem("guestName", name);
        localStorage.setItem("guestPhone", number);
        localStorage.setItem("guestEmail", email);

        const guestData = {
          name: localStorage.getItem("guestName") || "Guest",
          phone: localStorage.getItem("guestPhone") || "Unknown",
          email: localStorage.getItem("guestEmail") || "Unknown",
        };

        await saveTourBooking(guestData);
        resetBookingForm();
      } finally {
        newNotGuestSubmitButton.disabled = false;
        newNotGuestSubmitButton.textContent = oldText;
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

  async function saveTourBooking(guestData) {
    try {
      console.log("Saving booking for tour:", tourId);
      console.log("Guest Data:", guestData);

      const tourRequestsRef = collection(db, "tour_requests");

      await addDoc(tourRequestsRef, {
        tourId,
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
        tourId,
        guestData,
        type: "Request for a tour",
        timestamp: new Date(),
        unreadBy: adminList,
        undeletedBy: adminList,
      });

      showSuccessMessage();
    } catch (error) {
      console.error("Error saving booking request:", error);
      alert("An error occurred while saving the request.");
    }
  }

  function closeModal() {
    overlay.classList.add("d-none");
    bookingForm.classList.add("d-none");
    successMessage.classList.add("d-none");
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
});
