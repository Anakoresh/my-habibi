import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

// Cloudinary 
const cloudName = "dsxbp9jja";
const uploadPreset = "my_habibi";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  let imageUrl = "";

  document.getElementById("upload-btn").addEventListener("click", async () => {
    const fileInput = document.getElementById("file-input");
    const uploadBtn = document.getElementById("upload-btn");

    const imageFile = fileInput.files[0];

    if (!imageFile) {
      alert("Please select an image to upload!");
      return;
    }

    try {
      uploadBtn.disabled = true;
      fileInput.disabled = true;
      uploadBtn.textContent = "Uploading...";

      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.secure_url) {
        alert("Error uploading image");
        return;
      }

      imageUrl = data.secure_url;
      document.getElementById("uploaded-image").src = imageUrl;

      console.log("Uploaded image URL:", imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("There was an error uploading the image");
    } finally {
      uploadBtn.disabled = false;
      fileInput.disabled = false;
      uploadBtn.textContent = "Upload Image";
    }
  });

  // ADD TRIP
  document.getElementById("add-trip-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type='submit']");
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding...";

    const title = document.getElementById("trip-title").value;
    const description = document.getElementById("trip-description").value;
    const price = parseInt(document.getElementById("trip-price").value);

    if (!title || !description || !price || !imageUrl) {
      alert("Please fill in all fields and upload an image.");
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    try {
      await addDoc(collection(db, "trips"), {
        title, description, price, image: imageUrl, upcoming: false, dates: []
      });
      alert("Trip added!");
      loadTrips();
    } catch (error) {
      console.error("Error adding trip:", error);
      alert("Error adding trip");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });


  // SET UPCOMING
  document.getElementById("set-upcoming-trip").addEventListener("click", async (event) => {
    event.preventDefault();
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Setting...";

    try {
      const tripId = document.getElementById("upcoming-trip-select").value;
      const date = document.getElementById("upcoming-trip-date").value;
      const availability = parseInt(document.getElementById("upcoming-trip-availability").value);

      if (!tripId || !date || isNaN(availability)) {
        alert("Please select a trip, date, and availability.");
        return;
      }

      const tripRef = doc(db, "trips", tripId);
      const tripSnap = await getDoc(tripRef);

      if (!tripSnap.exists()) {
        alert("Trip not found!");
        return;
      }

      const tripData = tripSnap.data();
      const updatedDates = tripData.dates ? [...tripData.dates, { date, availability }] : [{ date, availability }];

      await updateDoc(tripRef, { upcoming: true, dates: updatedDates });
      alert("Upcoming trip updated!");
      loadTrips();
    } catch (error) {
      console.error("Error setting trip:", error);
      alert("Error setting trip");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });


  // DELETE TRIP
  async function deleteTrip(tripId) {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Deleting...";

    try {
      await deleteDoc(doc(db, "trips", tripId));
      const bookingsSnap = await getDocs(collection(db, "day-trips-bookings"));
      const deletePromises = [];
      bookingsSnap.forEach((docSnap) => {
        if (docSnap.id.startsWith(`${tripId}`)) {
          deletePromises.push(deleteDoc(docSnap.ref));
        }
      });
      await Promise.all(deletePromises);
      alert("Trip and related bookings deleted!");
      loadTrips();
    } catch (error) {
      console.error("Error deleting trip:", error);
      alert("Error deleting trip");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }


  // REMOVE DATE
  async function removeTripDate(tripId, dateToRemove) {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Removing...";

    try {
      const tripRef = doc(db, "trips", tripId);
      const tripSnap = await getDoc(tripRef);
      if (!tripSnap.exists()) return;

      const tripData = tripSnap.data();
      const updatedDates = tripData.dates.filter(d => d.date !== dateToRemove);
      await updateDoc(tripRef, { dates: updatedDates });

      const bookingRef = doc(db, "day-trips-bookings", tripId);
      const bookingSnap = await getDoc(bookingRef);

      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data();
        const updatedBookingDates = { ...bookingData.dates };
        delete updatedBookingDates[dateToRemove];

        if (Object.keys(updatedBookingDates).length === 0) {
          await deleteDoc(bookingRef);
        } else {
          await updateDoc(bookingRef, { dates: updatedBookingDates });
        }
      }

      alert(`Date ${dateToRemove} removed!`);
      loadTrips();
    } catch (error) {
      console.error("Error removing date:", error);
      alert("Error removing date");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }


  // REMOVE UPCOMING
  async function removeUpcoming(tripId) {
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
      await updateDoc(doc(db, "trips", tripId), { upcoming: false, dates: [] });

      const bookingsSnap = await getDocs(collection(db, "day-trips-bookings"));
      const deletePromises = [];
      bookingsSnap.forEach((docSnap) => {
        if (docSnap.id.startsWith(`${tripId}`)) {
          deletePromises.push(deleteDoc(docSnap.ref));
        }
      });
      await Promise.all(deletePromises);

      alert("Upcoming removed and related bookings deleted!");
      loadTrips();
    } catch (error) {
      console.error("Error removing upcoming:", error);
      alert("Error removing upcoming");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  async function loadTrips() {
    const tripsRef = collection(db, "trips");
    const tripsSnapshot = await getDocs(tripsRef);
    const trips = tripsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const bookingsRef = collection(db, "day-trips-bookings");
    const bookingsSnapshot = await getDocs(bookingsRef);
    const bookings = bookingsSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data().dates;
      return acc;
    }, {});

    const select = document.getElementById("upcoming-trip-select");
    select.innerHTML = '<option value="">Select a trip</option>';

    trips.forEach((trip) => {
      select.innerHTML += `<option value="${trip.id}">${trip.title}</option>`;
    });

    const tripsList = document.getElementById("trips-list");
    tripsList.innerHTML = trips
      .map((trip) => {
        const tripBookings = bookings[trip.id] || {};
        return `
          <div class="trip-item trip">
            <h3>${trip.title}</h3>
            <p>${trip.description}</p>
            <p>price: ${trip.price} LKR</p>
            <img src="${trip.image}" width="100">
            <p>${trip.upcoming ? `UPCOMING:` : "NOT UPCOMING"}</p>
            <ul>
              ${
                trip.dates && trip.dates.length > 0
                  ? trip.dates
                      .map((d, index) => {
                        const dateBookings = tripBookings[d.date]?.bookers || [];
                        return `
                          <li class="trip-date-info">
                            ${d.date} 
                            (availability: <input type="number" id="availability-${trip.id}-${index}" value="${d.availability}" style="width:60px;">)
                            <button class="custom-btn" onclick="updateAvailability('${trip.id}', ${index}, this)">UPDATE</button>
                            ${
                              dateBookings.length > 0
                                ? `<br><strong>bookers:</strong> 
                                  <ul class="trip-bookers">${dateBookings.map(b => formatBooker(b)).join("")}</ul>`
                                : "<p>no bookings yet</p>"
                            }
                            <button class="custom-btn" onclick="removeTripDate('${trip.id}', '${d.date}')">REMOVE DATE</button>
                          </li>`;
                      })
                      .join("")
                  : "<li>NO DATES</li>"
              }
            </ul>
            <button class="custom-btn" onclick="deleteTrip('${trip.id}')">DELETE TRIP</button>
            ${trip.upcoming ? `<button class="custom-btn" onclick="removeUpcoming('${trip.id}')">REMOVE UPCOMING</button>` : ""}
          </div>
        `;
      })
      .join("");

  }

  function formatBooker(booker) {
    if (booker.name && booker.email && booker.phone) {
      return `<li>${booker.name} (${booker.phone}, ${booker.email})</li>`;
    } else {
      return `<li>${booker.guestName} (room ${booker.roomNumber})</li>`;
    }
  }

  loadTrips();
  window.deleteTrip = deleteTrip;
  window.removeUpcoming = removeUpcoming;
  window.removeTripDate = removeTripDate;

  window.updateAvailability = async function(tripId, dateIndex, btn) {
    if (!btn && window.event) btn = window.event.target;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Updating...";

    const input = document.getElementById(`availability-${tripId}-${dateIndex}`);
    const newAvailability = parseInt(input.value);

    if (isNaN(newAvailability)) {
      alert("Please enter a valid number");
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    try {
      const tripRef = doc(db, "trips", tripId);
      const tripSnap = await getDoc(tripRef);

      if (!tripSnap.exists()) {
        alert("Trip not found");
        return;
      }

      const tripData = tripSnap.data();
      tripData.dates[dateIndex].availability = newAvailability;

      await updateDoc(tripRef, { dates: tripData.dates });
      alert("Availability updated!");
      loadTrips();
    } catch (error) {
      console.error("Error updating availability:", error);
      alert("Error updating availability");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  };

});

