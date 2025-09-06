import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

// Cloudinary
const cloudName = "dsxbp9jja";
const uploadPreset = "my_habibi";

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  let imageUrl = "";
  let editingId = null; 

  document.getElementById("upload-btn").addEventListener("click", async () => {
    const fileInput = document.getElementById("file-input");
    const uploadBtn = document.getElementById("upload-btn");
    const imageFile = fileInput.files[0];

    if (!imageFile) {
      alert("Please select an image to upload!");
      return;
    }

    try {
      // 🔹 disable
      uploadBtn.disabled = true;
      fileInput.disabled = true;
      const originalText = uploadBtn.textContent;
      uploadBtn.textContent = "Uploading...";

      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (!data.secure_url) {
        alert("Error uploading image");
        return;
      }

      imageUrl = data.secure_url;
      document.getElementById("uploaded-image").src = imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("There was an error uploading the image");
    } finally {
      // 🔹 enable
      uploadBtn.disabled = false;
      fileInput.disabled = false;
      uploadBtn.textContent = "Upload Image";
    }
  });

  document
    .getElementById("add-recommendation-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = e.target.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = editingId ? "Updating..." : "Adding...";

      try {
        const title = document.getElementById("recommendation-title").value;
        const description = document.getElementById("recommendation-description").value;
        const link = document.getElementById("recommendation-link").value;
        const tip = document.getElementById("recommendation-tip").value;
        const type = document.getElementById("recommendation-type").value;

        if (!title || !description || !link || !type) {
          alert("Please fill in all fields.");
          return;
        }

        if (editingId) {
          // update
          const recommendationRef = doc(db, "recommendations", editingId);
          const updatedData = { name: title, description, link, tip, type };
          if (imageUrl) updatedData.image = imageUrl;
          await updateDoc(recommendationRef, updatedData);
          alert("Recommendation updated!");
        } else {
          // create
          await addDoc(collection(db, "recommendations"), {
            name: title,
            description,
            link,
            tip,
            image: imageUrl || "",
            type,
            rating: { average: 0, totalRatings: 0 },
            reviews: [],
          });
          alert("Recommendation added!");
        }

        e.target.reset();
        document.getElementById("uploaded-image").src = "";
        imageUrl = "";
        editingId = null;
        loadRecommendations();
      } catch (error) {
        console.error("Error saving recommendation:", error);
        alert("There was an error saving the recommendation.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

  document
    .getElementById("category-filter")
    .addEventListener("change", function () {
      const selectedType = this.value;
      loadRecommendations(selectedType);
    });

  async function loadRecommendations(selectedType = "") {
    const recommendationsContainer = document.getElementById(
      "recommendations-container"
    );
    recommendationsContainer.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "recommendations"));
    let recommendations = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!selectedType || data.type === selectedType) {
        recommendations.push({ id: doc.id, ...data });
      }
    });

    recommendations.forEach((recommendation) => {
      const recommendationElement = createRecommendationElement(recommendation);
      recommendationsContainer.appendChild(recommendationElement);
    });
  }

  function createRecommendationElement(recommendation) {
    const div = document.createElement("div");
    div.classList.add("recommendation-item");

    const title = document.createElement("h4");
    title.textContent = recommendation.name;

    const description = document.createElement("p");
    description.textContent = recommendation.description;

    const link = document.createElement("a");
    link.href = recommendation.link;
    link.textContent = "SEE THE ROUTE";

    const tip = document.createElement("p");
    tip.textContent = `TIP: ${recommendation.tip}`;

    const image = document.createElement("img");
    image.src = recommendation.image;
    image.alt = recommendation.name;
    image.style = "max-width: 300px;";

    const editBtn = document.createElement("button");
    editBtn.textContent = "EDIT";
    editBtn.classList.add("custom-btn");
    editBtn.addEventListener("click", () =>
      editRecommendation(recommendation.id)
    );

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "DELETE";
    deleteBtn.classList.add("custom-btn");
    deleteBtn.addEventListener("click", () =>
      deleteRecommendation(recommendation.id)
    );

    div.appendChild(title);
    div.appendChild(description);
    div.appendChild(link);
    div.appendChild(tip);
    div.appendChild(image);
    div.appendChild(editBtn);
    div.appendChild(deleteBtn);

    return div;
  }

  async function deleteRecommendation(recommendationId) {
    const container = document.querySelector(
      `.recommendation-item button.custom-btn[data-id="${recommendationId}"]`
    );
    let deleteBtn;

    if (container) deleteBtn = container;
    else deleteBtn = null;

    if (!confirm("Delete this recommendation?")) return;

    if (deleteBtn) {
      deleteBtn.disabled = true;
      const originalText = deleteBtn.textContent;
      deleteBtn.textContent = "Deleting...";
      try {
        await deleteDoc(doc(db, "recommendations", recommendationId));
        alert("Recommendation deleted.");
        loadRecommendations();
      } catch (error) {
        console.error("Error deleting recommendation:", error);
        alert("There was an error deleting the recommendation.");
        deleteBtn.disabled = false;
        deleteBtn.textContent = originalText;
      }
    } else {
      try {
        await deleteDoc(doc(db, "recommendations", recommendationId));
        alert("Recommendation deleted.");
        loadRecommendations();
      } catch (error) {
        console.error("Error deleting recommendation:", error);
        alert("There was an error deleting the recommendation.");
      }
    }
  }

  async function editRecommendation(recommendationId) {
    try {
      const recommendationRef = doc(db, "recommendations", recommendationId);
      const recommendationSnap = await getDoc(recommendationRef);

      if (recommendationSnap.exists()) {
        const recommendation = recommendationSnap.data();

        document.getElementById("recommendation-title").value =
          recommendation.name;
        document.getElementById("recommendation-description").value =
          recommendation.description;
        document.getElementById("recommendation-link").value =
          recommendation.link;
        document.getElementById("recommendation-tip").value =
          recommendation.tip;
        document.getElementById("recommendation-type").value =
          recommendation.type;
        document.getElementById("uploaded-image").src = recommendation.image;
        imageUrl = recommendation.image; 

        editingId = recommendationId; 
      } else {
        alert("Recommendation not found.");
      }
    } catch (error) {
      console.error("Error fetching recommendation:", error);
      alert("There was an error loading the recommendation.");
    }
  }

  loadRecommendations();
});
