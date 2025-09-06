import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const benefitForm = document.getElementById("benefit-form");
const benefitsList = document.getElementById("benefits-list");

benefitForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("benefit-title").value.trim();
    const description = document.getElementById("benefit-description").value.trim();
    const location = document.getElementById("benefit-location").value.trim();
    const submitBtn = benefitForm.querySelector("button[type='submit']");

    if (!title || !description) return;

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Adding...";

    try {
        await addDoc(collection(db, "benefits"), {
            title,
            description,
            location: location || "No specific location"
        });

        benefitForm.reset();
        await loadBenefits();
    } catch (error) {
        console.error("Error adding benefit:", error);
        alert("Failed to add benefit. Try again!");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

async function loadBenefits() {
    benefitsList.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "benefits"));

    querySnapshot.forEach((docSnap) => { 
        const benefit = docSnap.data();
        const benefitCard = document.createElement("div");
        benefitCard.classList.add("benefit", "d-flex", "align-items-center", "flex-column");

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn custom-btn";
        deleteBtn.textContent = "DELETE";
        deleteBtn.dataset.id = docSnap.id;

        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Delete this benefit?")) return;

            deleteBtn.disabled = true;
            const originalText = deleteBtn.textContent;
            deleteBtn.textContent = "Deleting...";

            try {
                await deleteDoc(doc(db, "benefits", docSnap.id)); // now correct
                await loadBenefits();
            } catch (error) {
                console.error("Error deleting benefit:", error);
                alert("Failed to delete. Try again!");
                deleteBtn.disabled = false;
                deleteBtn.textContent = originalText;
            }
        });

        benefitCard.innerHTML = `
            <h3 class="event-title">${benefit.title}</h3>
            <p class="event-description">${benefit.description}</p>
            <p class="event-location">Location: <mark>${benefit.location}</mark></p>
        `;
        benefitCard.appendChild(deleteBtn);
        benefitsList.appendChild(benefitCard);
    });
}

loadBenefits();
