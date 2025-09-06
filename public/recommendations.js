import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const categoryTabs = document.querySelectorAll(".category-tab");
  const contentContainer = document.querySelector(".recommendation-content");

  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      categoryTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const category = tab.dataset.category;
      contentContainer.innerHTML = "";

      try {
        const recommendationsQuery = query(
          collection(db, "recommendations"),
          where("type", "==", category)
        );

        const querySnapshot = await getDocs(recommendationsQuery);

        if (querySnapshot.empty) {
          contentContainer.innerHTML = `<p class="no-recommendations">No recommendations available for this category.</p>`;
          return;
        }

        querySnapshot.forEach((doc) => {
          const item = doc.data();

          const itemDiv = document.createElement("div");
          itemDiv.classList.add("recommendation-item");

          itemDiv.innerHTML = `
            <h3 class="recommendation-title">${item.name}</h3>
            <div class="recommendation-container">
                <div class="recommendation-shadow"></div>
                <div class="recommendation-image" style="background-image: url('${
                  item.image
                }')"></div>
                <a href="${
                  item.link
                }" class="recommendation-link" target="_blank">VIEW ROUTE</a>
            </div>
            <p class="recommendation-description">${item.description}</p>
            <div class="recommendation-tip-container">
                <div class="recommendation-tip-shadow"></div>
                <div class="recommendation-tip">
                    <h3>HABIBI TIP</h3>
                    <p>${item.tip || "No tips available"}</p>
                </div>
            </div>
            <div class="recommendation-rating">
                <div class="recommendation-rating-top">
                    <h2>RATING: ${item.rating?.average || "no rates yet"} (${
            item.rating?.totalRatings || 0
          } rates)</h2>
                    <button class="rate-btn">RATE</button>
                </div>
                <div class="reviews-container"></div>
            </div>
          `;

          const reviewsContainer = itemDiv.querySelector(".reviews-container");
          if (item.reviews && item.reviews.length > 0) {
            const reviewsWrapper = document.createElement("div");
            reviewsWrapper.classList.add("reviews-wrapper");
            reviewsContainer.appendChild(reviewsWrapper);

            const maxVisibleReviews = 2;

            item.reviews.forEach((review, index) => {
              if (review.text) {
                const reviewElement = document.createElement("p");
                reviewElement.classList.add("review");

                if (index >= maxVisibleReviews) {
                  reviewElement.classList.add("hidden");
                }

                reviewElement.innerHTML = `<mark>${review.name}:</mark> ${review.text}`;
                reviewsWrapper.appendChild(reviewElement);
              }
            });

            if (item.reviews.length > maxVisibleReviews) {
              reviewsContainer.appendChild(reviewsWrapper);

              const showAllButton = document.createElement("button");
              showAllButton.classList.add("show-all-reviews");
              showAllButton.textContent = "SEE ALL REVIEWS";

              const hideButton = document.createElement("button");
              hideButton.classList.add("hide-reviews");
              hideButton.textContent = "HIDE REVIEWS";
              hideButton.style.display = "none"; 

              showAllButton.addEventListener("click", () => {
                reviewsWrapper
                  .querySelectorAll(".hidden")
                  .forEach((hiddenReview) => {
                    hiddenReview.classList.remove("hidden");
                  });

                showAllButton.style.display = "none";
                hideButton.style.display = "block";
              });

              hideButton.addEventListener("click", () => {
                reviewsWrapper
                  .querySelectorAll(".review")
                  .forEach((review, index) => {
                    if (index >= maxVisibleReviews) {
                      review.classList.add("hidden");
                    }
                  });

                hideButton.style.display = "none"; 
                showAllButton.style.display = "block"; 
              });

              reviewsContainer.appendChild(showAllButton);
              reviewsContainer.appendChild(hideButton);
            }
          } else {
            reviewsContainer.innerHTML = "<p>No reviews available</p>";
          }

          contentContainer.appendChild(itemDiv);
        });
      } catch (error) {
        console.error("Error fetching recommendations: ", error);
        contentContainer.innerHTML = `<p class="error-message">Failed to load recommendations.</p>`;
      }
    });
  });

  categoryTabs[0].click();

  const overlay = document.querySelector(".overlay");
  const modal = document.querySelector(".custom-modal");
  const successModal = document.querySelector(".sent-rate-success");
  const closeModalBtns = document.querySelectorAll(".close-modal");
  const rateBtn = document.querySelector(".custom-btn");
  let currentLocation = null; 

  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("rate-btn")) {
      const recommendationItem = event.target.closest(".recommendation-item");
      const locationTitle = recommendationItem.querySelector(
        ".recommendation-title"
      ).textContent;

      getDocs(collection(db, "recommendations")).then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          if (doc.data().name === locationTitle) {
            currentLocation = doc.id; 
            modal.classList.remove("d-none");
            overlay.classList.remove("d-none");
          }
        });

        if (!currentLocation) {
          alert("Error: Location not found.");
        }
      });
    }
  });

  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.classList.add("d-none");
      overlay.classList.add("d-none");
      successModal.classList.add("d-none");
    });
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      modal.classList.add("d-none");
      overlay.classList.add("d-none");
      successModal.classList.add("d-none");
    }
  });

    rateBtn.addEventListener("click", async () => {
      const ratingValue = parseInt(document.getElementById("rate-number").value);
      const reviewText = document.getElementById("rate-text").value.trim();
      const userName = document.getElementById("rate-name").value.trim();

      if (!userName) {
        alert("You must enter a name.");
        return;
      }

      try {
        if (!currentLocation) {
          alert("Error: No location selected.");
          return;
        }

        rateBtn.disabled = true;
        rateBtn.textContent = "SENDING...";

        const docRef = doc(db, "recommendations", currentLocation);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const locationData = docSnap.data();
          const newTotalRatings = (locationData.rating?.totalRatings || 0) + 1;
          const newAverage =
            ((locationData.rating?.average || 0) *
              (locationData.rating?.totalRatings || 0) +
              ratingValue) /
            newTotalRatings;

          await updateDoc(docRef, {
            rating: {
              average: parseFloat(newAverage.toFixed(1)),
              totalRatings: newTotalRatings,
            },
          });

          if (reviewText) {
            await addDoc(collection(db, "pending_reviews"), {
              name: userName,
              rating: ratingValue,
              text: reviewText,
              locationId: currentLocation,
              approved: false,
              createdAt: new Date(),
            });
          }

          await createNotification();

          modal.classList.add("d-none");
          successModal.classList.remove("d-none");
        } else {
          alert("Error: Location document not found.");
        }
      } catch (error) {
        console.error("Error submitting review:", error);
        alert("Something went wrong.");
      } finally {
        rateBtn.disabled = false;
        rateBtn.textContent = "SENT";
      }
    });
  async function createNotification() {
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
        type: "New review for the recommendation",
        timestamp: new Date(),
        unreadBy: adminList,
        undeletedBy: adminList,
      });

      console.log("Notification added successfully!");
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }
});
