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
  const successMessage = document.querySelector(".book-trip-success");
  const closeModalButtons = document.querySelectorAll(".close-modal");

  document.body.addEventListener("click", function (event) {
    if (event.target && event.target.matches(".book-trip")) {
      const button = event.target;
      setButtonProcessing(button, true); 

      const tripId = button.closest("[data-trip-id]")?.getAttribute("data-trip-id");
      const tripDate = button.closest(".trip")?.querySelector(".trip-date")?.textContent.trim();
      const tripName = button.closest(".trip")?.querySelector(".trip-title")?.textContent.trim();

      if (!tripId || !tripDate) {
        alert("Ошибка: не удалось получить информацию о туре.");
        setButtonProcessing(button, false); 
        return;
      }

      checkAuthorization(tripId, tripDate, tripName)
        .finally(() => setButtonProcessing(button, false)); 
    }
  });

  closeModalButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  function checkAuthorization(tripId, tripDate, tripName) {
    const reservationCode = localStorage.getItem("authCode");

    if (reservationCode) {
      return checkReservationCode(reservationCode, tripId, tripDate, tripName); 
    } else {
      showBookingForm(tripId, tripDate, tripName);
      return Promise.resolve(); 
    }
  }

  async function checkReservationCode(reservationCode, tripId, tripDate, tripName) {
    const guestsCollection = collection(db, "guests");
    const querySnapshot = await getDocs(guestsCollection);

    for (const docSnap of querySnapshot.docs) {
      const guest = docSnap.data();

      if (guest.bookingCode === reservationCode) {
        const checkoutDate = new Date(guest.checkOutDate);
        checkoutDate.setHours(23, 59, 59, 999);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        if (checkoutDate < currentDate) {
          alert("Your booking has expired. You are no longer authorized!");
          localStorage.removeItem("authCode");
          return false; 
        }

        localStorage.setItem("authCode", reservationCode);
        await saveTripBooking(guest, tripId, tripDate, tripName);
        bookingForm.classList.add("d-none");
        return true; 
      }
    }

    alert("Invalid reservation code.");
    localStorage.removeItem("authCode");
    return false;
  }

  function showBookingForm(tripId, tripDate, tripName) {
    resetBookingForm();
    bookingForm.classList.remove("d-none");
    overlay.classList.remove("d-none");

    const enterButton = bookingForm.querySelector(".guest-form button");
    const notGuestSubmitButton = bookingForm.querySelector(".not-guest-form button");

    enterButton.replaceWith(enterButton.cloneNode(true));
    notGuestSubmitButton.replaceWith(notGuestSubmitButton.cloneNode(true));

    const freshEnterButton = bookingForm.querySelector(".guest-form button");
    const freshNotGuestButton = bookingForm.querySelector(".not-guest-form button");

    freshEnterButton.addEventListener("click", async () => {
      const reservationCode = document.getElementById("reservation-code").value.trim();
      if (!reservationCode) {
        alert("Please enter a valid reservation code.");
        return;
      }

      setButtonProcessing(freshEnterButton, true);
      try {
        const isValid = await checkReservationCode(reservationCode, tripId, tripDate, tripName);
        if (!isValid) {
          bookingForm.classList.remove("d-none");
        }
      } finally {
        setButtonProcessing(freshEnterButton, false);
      }
    });

    freshNotGuestButton.addEventListener("click", async () => {
      const name = document.getElementById("not-guest-name").value.trim();
      const number = document.getElementById("not-guest-number").value.trim();
      const email = document.getElementById("not-guest-email").value.trim();

      if (!(name && number && email)) {
        alert("Please fill out all the fields.");
        return;
      }

      setButtonProcessing(freshNotGuestButton, true);
      try {
        const guestData = { name, phone: number, email };
        await saveTripBooking(guestData, tripId, tripDate, tripName);
        resetBookingForm();
      } finally {
        setButtonProcessing(freshNotGuestButton, false);
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

  async function saveTripBooking(
    guestData,
    selectedTripId,
    selectedDate,
    tripName
  ) {
    try {
      console.log("Saving booking for tour:", selectedTripId);
      console.log("Guest Data:", guestData);

      const tripDocRef = doc(db, "day-trips-bookings", selectedTripId);
      const tripSnapshot = await getDoc(tripDocRef);
      let updatedBookers = [];

      if (tripSnapshot.exists()) {
        const tripData = tripSnapshot.data();

        if (tripData.dates && tripData.dates[selectedDate]) {
          updatedBookers = [...tripData.dates[selectedDate].bookers, guestData];
        } else {
          updatedBookers = [guestData];
        }

        await updateDoc(tripDocRef, {
          [`dates.${selectedDate}.bookers`]: updatedBookers,
        });

        console.log("Booking updated successfully!");
      } else {
        await setDoc(tripDocRef, {
          tripId: selectedTripId,
          dates: {
            [selectedDate]: {
              bookers: [guestData],
            },
          },
        });

        console.log("New booking document created!");
      }

      await createNotification(
        guestData,
        selectedTripId,
        selectedDate,
        tripName
      );

      await updateAvailability(selectedTripId, selectedDate);

      showSuccessMessage();
    } catch (error) {
      console.error("Error saving booking request:", error);
      alert("An error occurred while saving the request.");
    }
  }

  async function createNotification(guestData, tripId, tripDate, tripName) {
    try {
      const adminsRef = collection(db, "admins");
      const adminSnapshot = await getDocs(adminsRef);
      const adminList = adminSnapshot.docs
        .filter((doc) => doc.data().role === "admin")
        .map((doc) => doc.data().adminCode);

      if (adminList.length === 0) {
        console.warn("No admins found!");
        return;
      }

      const notificationsRef = collection(db, "notifications");
      await addDoc(notificationsRef, {
        guestData,
        tripId: tripId,
        tripName: tripName,
        tripDate: tripDate,
        type: "Booking a day trip",
        timestamp: new Date(),
        unreadBy: adminList,
        undeletedBy: adminList,
      });

      console.log("Notification added successfully!");
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }

  async function updateAvailability(tripId, selectedDate) {
    try {
      const tripDocRef = doc(db, "trips", tripId);
      const tripSnapshot = await getDoc(tripDocRef);

      if (tripSnapshot.exists()) {
        let tripData = tripSnapshot.data();

        let updatedDates = tripData.dates.map((tripDate) => {
          if (tripDate.date === selectedDate && tripDate.availability > 0) {
            return {
              ...tripDate,
              availability: tripDate.availability - 1, // Уменьшаем на 1
            };
          }
          return tripDate;
        });

        await updateDoc(tripDocRef, { dates: updatedDates });

        console.log("Availability updated successfully!");
      } else {
        console.error("Trip not found!");
      }
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  }

  function showSuccessMessage() {
    successMessage.classList.remove("d-none");
    overlay.classList.remove("d-none");

    const closeModalButton = successMessage.querySelector(".close-modal");

    closeModalButton.addEventListener("click", closeModal);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal();
      }
    });
  }

  function closeModal() {
    overlay.classList.add("d-none");
    bookingForm.classList.add("d-none");
    successMessage.classList.add("d-none");

    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);
    
    location.reload();
  }

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
