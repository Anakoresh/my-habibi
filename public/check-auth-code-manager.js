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

  if (!storedCode) {
    window.location.href = "profile.html";
    return;
  }

  async function checkCode(code) {
    const adminData = await fetchAdmin(code);
    if (adminData) {
      localStorage.setItem("authCode", code);
      localStorage.setItem("userRole", adminData.role); 
      return;
    }

    localStorage.removeItem("authCode");
    window.location.href = "profile.html";
    return
  }

  async function fetchAdmin(code) {
    const adminRef = collection(db, "admins");
    const q = query(adminRef, where("adminCode", "==", code));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const admin = querySnapshot.docs[0].data();
      if (admin.role === "manager") {
        return admin;
      }
    }
    return null;
  }
});
