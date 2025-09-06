import { db } from "./firebase.js";
import { collection, getDocs, getDoc, query, where, doc, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

async function loadGuestOrders() {
    const authCode = localStorage.getItem("authCode");
    if (!authCode) return;

    const guestQuery = query(collection(db, "guests"), where("bookingCode", "==", authCode));
    const guestSnapshot = await getDocs(guestQuery);
    if (guestSnapshot.empty) return;

    const guestData = guestSnapshot.docs[0].data();
    const guestCode = guestData.bookingCode;
    const groupCode = guestData.groupCode;

    const ordersQuery = query(collection(db, "guests-orders"), where("guestCode", "==", guestCode));
    const ordersSnapshot = await getDocs(ordersQuery);
    let guestOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let groupOrders = [];
    if (groupCode) {
        const groupQuery = query(collection(db, "guests-orders"), where("groupCode", "==", groupCode));
        const groupSnapshot = await getDocs(groupQuery);
        groupOrders = groupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    renderOrders(guestOrders, groupOrders, guestCode, groupCode);
}

function renderOrders(guestOrders, groupOrders, guestCode, groupCode) {
    const ordersContainer = document.querySelector(".my-orders-list");
    ordersContainer.innerHTML = "";

    let guestFoodTotal = 0;
    let guestServicesTotal = 0;
    let groupFoodTotal = 0;
    let groupServicesTotal = 0;

    const activeFilter = document.querySelector(".filter-btn.active").dataset.filter;

    function hasOnlyWater(orders) {
        return orders.length > 0 && orders.every(order => order.name.trim().toLowerCase() === "water");
    } 

    function setButtonProcessing(button, isProcessing) {
        if (isProcessing) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "Processing...";
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
            }
        }
    }

    function createOrderItem(order, isGroup) {
        if (activeFilter !== "all" && order.type !== activeFilter) return null;

        const item = document.createElement("div");
        item.classList.add("order-item", "d-flex", "justify-content-between", "align-items-center");
        item.dataset.category = order.type;

        const leftBlock = document.createElement("div");
        leftBlock.classList.add("d-flex", "flex-column");

        const title = document.createElement("h2");
        title.classList.add("order-title");
        title.textContent = `${order.name} (${order.quantity})`;

        leftBlock.appendChild(title);

        if (isGroup) {
            const addToMeBtn = document.createElement("button");
            addToMeBtn.textContent = "add to me";
            addToMeBtn.onclick = async () => {
                setButtonProcessing(addToMeBtn, true);
                await transferOrder(order.id, guestCode, null);
                setButtonProcessing(addToMeBtn, false);
            };
            leftBlock.appendChild(addToMeBtn);
        } else if (groupCode) {
            const addToGroupBtn = document.createElement("button");
            addToGroupBtn.textContent = "add to group";
            addToGroupBtn.onclick = async () => {
                setButtonProcessing(addToGroupBtn, true);
                await transferOrder(order.id, null, groupCode);
                setButtonProcessing(addToGroupBtn, false);
            };
            leftBlock.appendChild(addToGroupBtn);
        }

        const priceBlock = document.createElement("span");
        priceBlock.classList.add("order-price");
        priceBlock.textContent = `${order.price * order.quantity} ${order.currency}`;

        item.appendChild(leftBlock);
        item.appendChild(priceBlock);

        return item;
    }

    if (guestOrders.length > 0) {
        const guestBlock = document.createElement("div");
        guestBlock.classList.add("orders-block");
        guestBlock.innerHTML = `<h2 class="block-title">My Orders</h2>`;

        guestOrders.forEach(order => {
            const item = createOrderItem(order, false);
            if (item) {
                guestBlock.appendChild(item);
            }
            if (order.type === "food-drinks") guestFoodTotal += order.price * order.quantity;
            else if (order.type === "services") guestServicesTotal += order.price * order.quantity;
        });

        const guestFoodDrinksOrders = guestOrders.filter(order => order.type === "food-drinks");

        let guestFoodTotalWithService = guestFoodTotal;
        let guestServiceCharge = 0;
        if (guestFoodTotal > 0 && !hasOnlyWater(guestFoodDrinksOrders)) {
            guestServiceCharge = Math.round(guestFoodTotal * 0.1);
            guestFoodTotalWithService += guestServiceCharge;
        }

        const guestTotal = guestFoodTotalWithService + guestServicesTotal;

        if (activeFilter === "all" || activeFilter === "food-drinks") {
            const guestFoodBlock = document.createElement("div");
            guestFoodBlock.classList.add("orders-total");
            guestFoodBlock.innerHTML = `
                <h2 class="total-title">Food & Drinks Total</h2>
                <span class="total-price">${guestFoodTotalWithService} LKR
                    ${guestServiceCharge > 0 ? `(including service charge: ${guestServiceCharge} LKR)` : ""}
                </span>
            `;
            guestBlock.appendChild(guestFoodBlock);
        }
        if (activeFilter === "all" || activeFilter === "services") {
            const guestServicesBlock = document.createElement("div");
            guestServicesBlock.classList.add("orders-total");
            guestServicesBlock.innerHTML = `
                <h2 class="total-title">Services Total</h2>
                <span class="total-price">${guestServicesTotal} LKR</span>
            `;
            guestBlock.appendChild(guestServicesBlock);
        }
        if (activeFilter === "all") {
            const guestGrandTotalBlock = document.createElement("div");
            guestGrandTotalBlock.classList.add("orders-total");
            guestGrandTotalBlock.innerHTML = `
                <h2 class="total-title">Grand Total</h2>
                <span class="total-price">${guestTotal} LKR</span>
            `;
            guestBlock.appendChild(guestGrandTotalBlock);
        }

        ordersContainer.appendChild(guestBlock);
    }

    if (groupOrders.length > 0) {
        const groupBlock = document.createElement("div");
        groupBlock.classList.add("orders-block");
        groupBlock.innerHTML = `<h2 class="block-title">Group Orders</h2>`;

        groupOrders.forEach(order => {
            const item = createOrderItem(order, true);
            if (item) {
                groupBlock.appendChild(item);
            }
            if (order.type === "food-drinks") groupFoodTotal += order.price * order.quantity;
            else if (order.type === "services") groupServicesTotal += order.price * order.quantity;
        });

        const groupFoodDrinksOrders = groupOrders.filter(order => order.type === "food-drinks");

        let groupFoodTotalWithService = groupFoodTotal;
        let groupServiceCharge = 0;
        if (groupFoodTotal > 0 && !hasOnlyWater(groupFoodDrinksOrders)) {
            groupServiceCharge = Math.round(groupFoodTotal * 0.1);
            groupFoodTotalWithService += groupServiceCharge;
        }

        const groupTotal = groupFoodTotalWithService + groupServicesTotal;

        if (activeFilter === "all" || activeFilter === "food-drinks") {
            const groupFoodBlock = document.createElement("div");
            groupFoodBlock.classList.add("orders-total");
            groupFoodBlock.innerHTML = `
                <h2 class="total-title">Food & Drinks Total</h2>
                <span class="total-price">${groupFoodTotalWithService} LKR
                    ${groupServiceCharge > 0 ? `(including service charge: ${groupServiceCharge} LKR)` : ""}
                </span>
            `;
            groupBlock.appendChild(groupFoodBlock);
        }
        if (activeFilter === "all" || activeFilter === "services") {
            const groupServicesBlock = document.createElement("div");
            groupServicesBlock.classList.add("orders-total");
            groupServicesBlock.innerHTML = `
                <h2 class="total-title">Services Total</h2>
                <span class="total-price">${groupServicesTotal} LKR</span>
            `;
            groupBlock.appendChild(groupServicesBlock);
        }
        if (activeFilter === "all") {
            const groupGrandTotalBlock = document.createElement("div");
            groupGrandTotalBlock.classList.add("orders-total");
            groupGrandTotalBlock.innerHTML = `
                <h2 class="total-title">Grand Total</h2>
                <span class="total-price">${groupTotal} LKR</span>
            `;
            groupBlock.appendChild(groupGrandTotalBlock);
        }

        ordersContainer.appendChild(groupBlock);
    }
}


document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadGuestOrders(); 
    });
});

async function transferOrder(orderId, newGuestCode, newGroupCode) {
    const orderRef = doc(db, "guests-orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) return;

    const order = orderSnap.data();
    let quantityToMove = order.quantity || 1;

    if (quantityToMove > 1) {
        const input = prompt(
            `This item has ${quantityToMove} pcs. How many do you want to move?`,
            "1"
        );
        const num = parseInt(input, 10);
        if (!num || num <= 0 || num > quantityToMove) {
            alert("Invalid quantity.");
            return;
        }
        quantityToMove = num;
    }

    const targetField = newGuestCode ? "guestCode" : "groupCode";
    const targetValue = newGuestCode || newGroupCode;

    const existingQuery = query(
        collection(db, "guests-orders"),
        where(targetField, "==", targetValue),
        where("name", "==", order.name),
        where("type", "==", order.type)
    );
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
        const existingRef = doc(db, "guests-orders", existingSnap.docs[0].id);
        await updateDoc(existingRef, {
            quantity: (existingSnap.docs[0].data().quantity || 0) + quantityToMove
        });
    } else {
        await addDoc(collection(db, "guests-orders"), {
            [targetField]: targetValue,
            name: order.name,
            price: order.price,
            type: order.type,
            quantity: quantityToMove,
            currency: order.currency
        });
    }

    if (quantityToMove < (order.quantity || 1)) {
        await updateDoc(orderRef, {
            quantity: (order.quantity || 1) - quantityToMove
        });
    } else {
        await deleteDoc(orderRef);
    }

    await loadGuestOrders();
}


loadGuestOrders();