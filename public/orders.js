import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const guestOrders = document.getElementById("guest-orders");
const filterButtons = document.querySelectorAll(".filter-btn");

async function loadGuestOrders(filter = "food-drinks") {
    guestOrders.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "orders"));

    let groupedOrders = {};

    querySnapshot.forEach((doc) => {
        const order = doc.data();
        if (order.type !== filter) return;

        const category = order.category || "Other"; 
        if (!groupedOrders[category]) {
            groupedOrders[category] = [];
        }
        groupedOrders[category].push(order);
    });

    if (filter === "food-drinks") {
        const menuLink = document.createElement("p");
        menuLink.classList.add("restaurant-menu-link");
        menuLink.innerHTML = `
            <p>ALL BAR & RESRAURANT MENU ORDERS ARE SUBJECT TO 10% SERVICE CHARGE</p>
            <a href="https://drive.google.com/file/d/1floltlnJkTGQ9Tyqu_I8kKp1D7zfWCBB/view?usp=drivesdk" 
               target="_blank" rel="noopener noreferrer">
               click here to see our full menu with descriptions
            </a>
        `;
        guestOrders.appendChild(menuLink);
    }

    for (const category in groupedOrders) {
        const categoryDiv = document.createElement("div");
        categoryDiv.classList.add("category-section");
        categoryDiv.innerHTML = `<h2>${category !== "Other" ? category : ""}</h2>`;

        groupedOrders[category].forEach((order) => {
            const orderDiv = document.createElement("div");
            orderDiv.classList.add("order-item");
            const currency = order.currency || "LKR"; 

            orderDiv.innerHTML = `
                <p><strong>${order.name}</strong> - ${order.price} ${currency}</p>
            `;
            categoryDiv.appendChild(orderDiv);
        });

        guestOrders.appendChild(categoryDiv);
    }
}

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        loadGuestOrders(button.getAttribute("data-filter"));
    });
});

loadGuestOrders();
