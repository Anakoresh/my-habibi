import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const managerName = document.querySelector(".manager-name");
  const adminCode = localStorage.getItem("authCode");

  if (!adminCode) {
    console.error("Admin code is missing in localStorage.");
    localStorage.removeItem("authCode");
    window.location.href = "profile.html";
    return;
  }

  try {
    const adminRef = collection(db, "admins");
    const q = query(adminRef, where("adminCode", "==", adminCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const admin = querySnapshot.docs[0].data();
      managerName.textContent = `MANAGER: ${admin.name}`;
    } else {
      console.error("Admin not found.");
      adminName.textContent = "UNKNOWN MANAGER";
    }
  } catch (error) {
    console.error("Error fetching admin:", error);
    adminName.textContent = "Error loading admin";
  }
});

if (localStorage.getItem("authcode")) {
  import("/firebase.js").then(({ requestPermission }) => {
    requestPermission();
  });
}
