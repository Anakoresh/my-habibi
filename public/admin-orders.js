import { db } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const form = document.getElementById("order-form");
const ordersList = document.getElementById("orders-list");
const filterButtons = document.querySelectorAll(".filter-btn");

let currentFilter = "food-drinks"; 

async function loadOrders() {
    ordersList.innerHTML = "";
    const querySnapshot = await getDocs(collection(db, "orders"));

    let groupedOrders = {};

    querySnapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };
        if (order.type !== currentFilter) return;

        const category = order.category || "Other";
        if (!groupedOrders[category]) {
            groupedOrders[category] = [];
        }
        groupedOrders[category].push(order);
    });

    for (const category in groupedOrders) {
        const categoryDiv = document.createElement("div");
        categoryDiv.classList.add("category-section");
        categoryDiv.innerHTML = `<h2>${category !== "Other" ? category : ""}</h2>`;

        groupedOrders[category].forEach((order) => {
            const orderDiv = document.createElement("div");
            orderDiv.classList.add("order-item-admin");

            orderDiv.innerHTML = `
                <p><strong>${order.name}</strong> - 
                    <input type="text" value="${order.name}" onchange="updateOrder('${order.id}', 'name', this.value)">
                </p>
                <p>Price: 
                    <input type="number" value="${order.price}" onchange="updateOrder('${order.id}', 'price', this.value)">
                    <select onchange="updateOrder('${order.id}', 'currency', this.value)">
                        <option value="LKR" ${order.currency === "LKR" ? "selected" : ""}>LKR</option>
                        <option value="$" ${order.currency === "$" ? "selected" : ""}>$</option>
                    </select>
                </p>
                <button class="custom-btn delete-btn">DELETE</button>
            `;
            
            const deleteBtn = orderDiv.querySelector(".delete-btn");
            deleteBtn.addEventListener("click", async () => {
                deleteBtn.disabled = true;
                deleteBtn.textContent = "Processing...";
                await deleteOrder(order.id);
            });

            categoryDiv.appendChild(orderDiv);
        });

        ordersList.appendChild(categoryDiv);
    }
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const addBtn = form.querySelector("button[type='submit']");
    addBtn.disabled = true;
    addBtn.textContent = "Processing...";

    const type = document.getElementById("order-type").value;
    const category = document.getElementById("order-category").value.trim();
    const name = document.getElementById("order-name").value;
    const price = document.getElementById("order-price").value;
    const currency = document.getElementById("order-currency").value;

    await addDoc(collection(db, "orders"), {
        type,
        category: type === "food-drinks" ? category : null,
        name,
        price,
        currency
    });

    form.reset();
    await loadOrders();

    addBtn.disabled = false;
    addBtn.textContent = "ADD ORDER";
});

window.deleteOrder = async (id) => {
    await deleteDoc(doc(db, "orders", id));
    await loadOrders();
};

window.updateOrder = async (id, field, value) => {
    const inputs = document.querySelectorAll(`input, select`);
    inputs.forEach((el) => el.disabled = true); 
    await updateDoc(doc(db, "orders", id), { [field]: value });
    await loadOrders();
    inputs.forEach((el) => el.disabled = false);
};

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");
        currentFilter = button.getAttribute("data-filter");
        loadOrders();
    });
});

loadOrders();
