import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function () {
  const storedCode = localStorage.getItem("authCode");

  if (storedCode) {
    await checkCode(storedCode);
    return;
  }

  document.querySelector(".authorisation-container").classList.remove("hidden");

  document
  .querySelector(".authorisation-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const button = document.getElementById("reservation-code");
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "Checking...";

    const code = document.querySelector("input").value.trim();
    if (code) {
      await checkCode(code);
    }
    button.disabled = false;
    button.textContent = oldText;
  });

  async function checkCode(code) {
    const guestData = await fetchGuest(code);
    if (guestData) {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      if (guestData.checkOutDate >= today) {
        localStorage.setItem("authCode", code);
        window.location.href = "profile-guest.html";
        return;
      } else {
        alert("Your stay has ended!");
        localStorage.removeItem("authCode", code);
        window.location.href = "profile.html";
        return;
      }
    }

    const adminData = await fetchAdmin(code);
    if (adminData) {
      localStorage.setItem("authCode", code);
      localStorage.setItem("userRole", adminData.role); 

      if (adminData.role === "admin") {
        window.location.href = "admin.html";
      } else if (adminData.role === "manager") {
        window.location.href = "manager.html";
      } else {
        alert("Access denied: Unknown role.");
        localStorage.removeItem("authCode");
      }
      return;
    }

    alert("Invalid code. Please try again.");
    localStorage.removeItem("authCode");
  }

  async function fetchGuest(code) {
    const guestRef = collection(db, "guests");
    const q = query(guestRef, where("bookingCode", "==", code));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }
    return null;
  }

  async function fetchAdmin(code) {
    const adminRef = collection(db, "admins");
    const q = query(adminRef, where("adminCode", "==", code));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const admin = querySnapshot.docs[0].data();
      if (admin.role === "admin" || admin.role === "manager") {
        return admin;
      }
    }
    return null;
  }
});
