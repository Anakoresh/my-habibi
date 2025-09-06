import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Admin panel loaded");

  const reviewsContainer = document.getElementById("reviews-container");

  const querySnapshot = await getDocs(collection(db, "pending_reviews"));
  
  for (const reviewDoc of querySnapshot.docs) {
    const reviewData = reviewDoc.data();
    const locationName = await getLocationName(reviewData.locationId);
    const reviewElement = createReviewElement(reviewDoc.id, reviewData, locationName);
    reviewsContainer.appendChild(reviewElement);
  }
});

async function getLocationName(locationId) {
  try {
    const docRef = doc(db, "recommendations", locationId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().name : "Unknown Location";
  } catch (error) {
    console.error("Error fetching location name:", error);
    return "Unknown Location";
  }
}

async function deleteReview(reviewId, btn) {
  if (!confirm("Delete this review?")) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Deleting...";

  try {
    await deleteDoc(doc(db, "pending_reviews", reviewId));
    alert("Review deleted.");
    location.reload();
  } catch (error) {
    console.error("Error deleting review:", error);
    alert("There was an error deleting the review.");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function approveReview(reviewId, reviewData, btn) {
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Approving...";

  try {
    const docRef = doc(db, "recommendations", reviewData.locationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        reviews: arrayUnion({
          name: reviewData.name,
          text: reviewData.text,
          rating: reviewData.rating,
        }),
      });

      await deleteDoc(doc(db, "pending_reviews", reviewId));
      alert("Review approved.");
      location.reload();
    } else {
      alert("Location not found.");
      btn.disabled = false;
      btn.textContent = originalText;
    }
  } catch (error) {
    console.error("Error approving review:", error);
    alert("There was an error approving the review.");
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function createReviewElement(reviewId, reviewData, locationName) {
  const div = document.createElement("div");
  div.classList.add("review-item");

  const title = document.createElement("h4");
  title.textContent = reviewData.name;

  const text = document.createElement("p");
  text.textContent = reviewData.text;

  const rating = document.createElement("p");
  rating.textContent = `RATING: ${reviewData.rating}`;

  const location = document.createElement("p");
  location.textContent = `LOCATION: ${locationName}`;

  const approveBtn = document.createElement("button");
  approveBtn.textContent = "APPROVE";
  approveBtn.classList.add("approve-btn", "custom-btn");
  approveBtn.addEventListener("click", () =>
    approveReview(reviewId, reviewData, approveBtn)
  );

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "DELETE";
  deleteBtn.classList.add("delete-btn", "custom-btn");
  deleteBtn.addEventListener("click", () =>
    deleteReview(reviewId, deleteBtn)
  );

  div.appendChild(title);
  div.appendChild(location);
  div.appendChild(text);
  div.appendChild(rating);
  div.appendChild(approveBtn);
  div.appendChild(deleteBtn);

  return div;
}