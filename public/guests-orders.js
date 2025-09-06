import { db } from "./firebase.js";
import { collection, getDocs, addDoc, query, where, updateDoc, doc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

export let currentGuestCode = null;
export function setCurrentGuestCode(code) {
    currentGuestCode = code;
}

let allItems = []; 

export let guestData = null; 
export function setGuestData(data) {
    guestData = data;
}

window.openOrdersModal = async (guestCode) => {
    currentGuestCode = guestCode;
    document.getElementById("orders-modal").style.display = "block";
    
    await loadGuestData(); 
    await loadItemsList();

    await loadOrders("food-drinks", false); 
    await fillEmailsFields(guestData, currentGuestCode);
    document.getElementById("add-custom-group-btn").classList.add("d-none");
    if (guestData?.groupCode) {
        document.getElementById("add-custom-group-btn").classList.remove("d-none");
        await loadOrders("food-drinks", true); 
    }
};

window.closeOrdersModal = () => {
    document.getElementById("orders-modal").style.display = "none";
};

async function loadGuestData() {
    const guestRef = query(collection(db, "guests"), where("bookingCode", "==", currentGuestCode));
    const guestSnapshot = await getDocs(guestRef);

    guestData = guestSnapshot.docs[0]?.data();
    
    if (guestData?.groupCode) {
        document.getElementById("group-orders-container").style.display = "block";
        document.getElementById("add-to-group-btn").style.display = "inline-block";
    } else {
        document.getElementById("group-orders-container").style.display = "none";
        document.getElementById("add-to-group-btn").style.display = "none";
    }
}

async function loadOrders(category, isGroup) {
    const orderList = isGroup ? document.getElementById("group-order-list") : document.getElementById("order-list");

    orderList.innerHTML = "<li>Loading...</li>";

    let total = 0;
    let serviceCharge = 0;

    let querySnapshot;
    if (isGroup && guestData?.groupCode) {
        const q = query(
            collection(db, "guests-orders"), 
            where("groupCode", "==", guestData.groupCode),
            where("type", "==", category)
        );
        querySnapshot = await getDocs(q);
    } else if (!isGroup) {
        const q = query(
            collection(db, "guests-orders"), 
            where("guestCode", "==", currentGuestCode),
            where("type", "==", category)
        );
        querySnapshot = await getDocs(q);
    } else {
        console.log("No groupCode found, skipping group orders.");
        orderList.innerHTML = "<li>No group orders</li>";
        return;
    }

    orderList.innerHTML = "";

    let hasNonWaterItems = false;

    querySnapshot.forEach((doc) => {
        const order = doc.data();
        const quantity = order.quantity || 1;
        const itemTotal = parseFloat(order.price) * quantity;
        total += itemTotal;

        if (category === "food-drinks") {
            if (order.name.trim().toLowerCase() !== "water") {
                hasNonWaterItems = true; 
            }
        }
        console.log(order.name);
        console.log(hasNonWaterItems);

        const li = document.createElement("li");
        li.textContent = `${order.name} - ${order.price} ${order.currency} x${quantity}`;

        if (!isGroup && guestData?.groupCode) {
            const moveButton = document.createElement("button");
            moveButton.textContent = "Add to Group";
            moveButton.onclick = async () => {
                setButtonProcessing(moveButton, true);
                await moveOrder(doc.id, order, isGroup);
                setButtonProcessing(moveButton, false);
            };
            li.appendChild(moveButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "❌";
        deleteButton.onclick = () => deleteOrder(doc.id, isGroup);
        li.appendChild(deleteButton);

        orderList.appendChild(li);
    });

    if (category === "food-drinks" && hasNonWaterItems) {
        serviceCharge = total * 0.10;
        total += serviceCharge;
    }

    const totalElement = isGroup ? document.getElementById("group-total-price") : document.getElementById("total-price");
    totalElement.textContent = category === "food-drinks" ? `TOTAL: ${total} LKR (including Service Charge: ${serviceCharge} LKR)` : "";
}

async function fetchOrders(category, isGroup) {
    const orderList = isGroup ? document.getElementById("group-order-list") : document.getElementById("order-list");
    orderList.innerHTML = "";

    let total = 0;
    let serviceCharge = 0;
    let allOrders = [];

    const categoriesToFetch = category === "all" ? ["food-drinks", "services"] : [category];

    for (let cat of categoriesToFetch) {
        const q = query(
            collection(db, "guests-orders"), 
            where(isGroup ? "groupCode" : "guestCode", "==", isGroup ? guestData.groupCode : currentGuestCode),
            where("type", "==", cat)
        );

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            allOrders.push({ ...order, id: docSnap.id }); 
        });
    }

    let hasNonWaterItems = false;

    allOrders.forEach((order) => {
        const quantity = order.quantity || 1;
        const itemTotal = parseFloat(order.price) * quantity;
        total += itemTotal;

        if (order.type === "food-drinks" && order.name.trim().toLowerCase() !== "water") {
            hasNonWaterItems = true;
        }

        const li = document.createElement("li");
        li.textContent = `${order.name} - ${order.price} ${order.currency} x${quantity}`;

        if (guestData?.groupCode) {
            const moveButton = document.createElement("button");
            moveButton.textContent = isGroup ? "Add to Guest" : "Add to Group";
            moveButton.onclick = async () => {
                setButtonProcessing(moveButton, true);
                await moveOrder(order.id, order, isGroup);
                setButtonProcessing(moveButton, false);
            };
            if (!isGroup && !guestData.groupCode) moveButton.style.display = "none";
            li.appendChild(moveButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "❌";
        deleteButton.onclick = () => deleteOrder(order.id, isGroup);
        li.appendChild(deleteButton);

        orderList.appendChild(li);
    });

    if ((category === "food-drinks" || category === "all") && hasNonWaterItems) {
        const foodTotal = allOrders
            .filter(order => order.type === "food-drinks")
            .reduce((sum, order) => sum + (order.price * (order.quantity || 1)), 0);
        const charge = foodTotal * 0.10;
        serviceCharge = charge;
        total += charge;
    }

    const totalElement = isGroup ? document.getElementById("group-total-price") : document.getElementById("total-price");

    totalElement.textContent =
        category === "food-drinks" || category === "all"
            ? `TOTAL: ${total.toFixed(2)} LKR (including Service Charge: ${serviceCharge.toFixed(2)} LKR)`
            : `TOTAL: ${total.toFixed(2)} LKR`;
}


window.filterOrders = (category, isGroup) => {
    if (category === "all") {
        fetchOrders("all", isGroup);
    } else {
        fetchOrders(category, isGroup);
    }
};


window.searchOrders = (query, isGroup) => {
    const items = document.querySelectorAll(isGroup ? "#group-order-list li" : "#order-list li");
    items.forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query.toLowerCase()) ? "block" : "none";
    });
};

async function moveOrder(orderId, order, isGroup) {
    let quantityToMove = order.quantity || 1;

    if (quantityToMove > 1) {
        const input = prompt(`This item has ${quantityToMove} pcs. How many do you want to move?`, "1");
        const num = parseInt(input, 10);
        if (!num || num <= 0 || num > quantityToMove) {
            alert("Invalid quantity.");
            return;
        }
        quantityToMove = num;
    }

    const newField = isGroup ? "guestCode" : "groupCode";
    const newValue = isGroup ? currentGuestCode : guestData.groupCode;

    const existingOrderQuery = query(
        collection(db, "guests-orders"),
        where(newField, "==", newValue),
        where("name", "==", order.name),
        where("type", "==", order.type)
    );
    const existingOrderSnapshot = await getDocs(existingOrderQuery);

    if (!existingOrderSnapshot.empty) {
        const existingOrder = existingOrderSnapshot.docs[0];
        const orderDocRef = doc(db, "guests-orders", existingOrder.id);
        await updateDoc(orderDocRef, {
            quantity: (existingOrder.data().quantity || 0) + quantityToMove
        });
    } else {
        await addDoc(collection(db, "guests-orders"), {
            [newField]: newValue,
            name: order.name,
            price: order.price,
            type: order.type,
            quantity: quantityToMove,
            currency: order.currency
        });
    }

    if (quantityToMove < (order.quantity || 1)) {
        const orderDocRef = doc(db, "guests-orders", orderId);
        await updateDoc(orderDocRef, {
            quantity: (order.quantity || 1) - quantityToMove
        });
    } else {
        await deleteDoc(doc(db, "guests-orders", orderId));
    }

    await loadOrders(order.type, isGroup);
    await loadOrders(order.type, !isGroup);
}

async function deleteOrder(orderId, isGroup) {
    await deleteDoc(doc(db, "guests-orders", orderId));
    
    await loadOrders("food-drinks", isGroup);
    await loadOrders("services", isGroup);
}

window.addOrder = async (isGroup) => {
    if (!currentGuestCode) return;

    const button = isGroup 
        ? document.getElementById("add-to-group-btn") 
        : document.querySelector(".custom-btn[onclick='addOrder(false)']");

    setButtonProcessing(button, true); 

    try {
        const selectedItem = JSON.parse(document.getElementById("order-item").value);
        const quantityInput = document.getElementById("order-quantity");
        const quantity = parseInt(quantityInput.value, 10) || 1;

        const orderField = isGroup ? "groupCode" : "guestCode";
        const orderValue = isGroup ? guestData.groupCode : currentGuestCode;

        const orderRef = query(
            collection(db, "guests-orders"),
            where(orderField, "==", orderValue),
            where("name", "==", selectedItem.name),
            where("type", "==", selectedItem.type)
        );
        const existingOrderSnapshot = await getDocs(orderRef);

        if (!existingOrderSnapshot.empty) {
            const existingOrder = existingOrderSnapshot.docs[0];
            const orderDocRef = doc(db, "guests-orders", existingOrder.id);
            await updateDoc(orderDocRef, {
                quantity: (existingOrder.data().quantity || 0) + quantity
            });
        } else {
            await addDoc(collection(db, "guests-orders"), {
                [orderField]: orderValue,
                name: selectedItem.name,
                price: selectedItem.price,
                type: selectedItem.type,
                quantity: quantity,
                currency: selectedItem.currency
            });
        }

        quantityInput.value = "1";

        await loadOrders(selectedItem.type, isGroup);

    } catch (e) {
        console.error("addOrder error:", e);
        alert("Error adding order. See console.");
    }

    setButtonProcessing(button, false); 
};

async function loadItemsList() {
    allItems = [];
    const querySnapshot = await getDocs(collection(db, "orders"));
    querySnapshot.forEach((doc) => {
        allItems.push(doc.data());
    });

    allItems.sort((a, b) => a.name.localeCompare(b.name));

    renderItems(allItems);
}

function renderItems(items) {
    const select = document.getElementById("order-item");
    select.innerHTML = "";
    items.forEach((item) => {
        const option = document.createElement("option");
        option.value = JSON.stringify(item);
        option.textContent = `${item.name} - ${item.price} ${item.currency}`;
        select.appendChild(option);
    });
}

async function fillEmailsFields(guestData, currentGuestCode) {
  const guestEmailInput = document.getElementById('guest-email');
  guestEmailInput.value = guestData.guestEmail || '';

  const groupEmailTextarea = document.getElementById('group-email');
  if (guestData.groupCode) {
    const guestsQuery = query(collection(db, "guests"), where("groupCode", "==", guestData.groupCode));
    const guestsSnapshot = await getDocs(guestsQuery);
    const emails = [];
    guestsSnapshot.forEach(doc => {
      const guest = doc.data();
      if (guest.guestEmail) emails.push(guest.guestEmail);
    });
    groupEmailTextarea.value = emails.join(", ");
  } else {
    groupEmailTextarea.value = '';
  }
}

window.filterItems = (query) => {
    const filteredItems = allItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );
    renderItems(filteredItems);
};

document.getElementById("search-item").addEventListener("input", (event) => {
    filterItems(event.target.value);
});

window.markAsPaid = async function(isGroup) {
  const markButton = isGroup 
      ? document.getElementById("mark-group-paid-btn") 
      : document.querySelector(".mark-as-paid-btn[onclick='markAsPaid(false)']");

  setButtonProcessing(markButton, true);

  try {
    if (!currentGuestCode) {
      alert("No guest selected!");
      setButtonProcessing(markButton, false);
      return;
    }

    const field = isGroup ? "groupCode" : "guestCode";
    const value = isGroup ? (guestData?.groupCode || null) : currentGuestCode;

    if (isGroup && !value) {
      alert("This guest is not in a group.");
      setButtonProcessing(markButton, false);
      return;
    }

    const q = query(collection(db, "guests-orders"), where(field, "==", value));
    const snap = await getDocs(q);

    if (snap.empty) {
      alert("No orders to pay.");
      setButtonProcessing(markButton, false);
      return;
    }

    let serviceTotal = 0;
    let foodTotal = 0;
    let serviceCharge = 0;
    let total = 0;
    let hasNonWater = false;
    const items = [];

    snap.forEach(d => {
      const o = d.data();
      const qty = o.quantity || 1;
      const priceNum = parseFloat(o.price) || 0;
      const itemTotal = priceNum * qty;

      if (o.type === "services") serviceTotal += itemTotal;
      else if (o.type === "food-drinks") {
        foodTotal += itemTotal;
        if ((o.name || "").trim().toLowerCase() !== "water") hasNonWater = true;
      }

      items.push({ name: o.name, quantity: qty, price: priceNum, type: o.type, currency: o.currency || "LKR" });
    });

    if (hasNonWater && foodTotal > 0) serviceCharge = Math.round(foodTotal * 0.10);
    total = Math.round(serviceTotal + foodTotal + serviceCharge);

    const currency = items[0]?.currency || "LKR";
    const payload = { date: new Date().toISOString(), isGroup: !!isGroup, [field]: value, currency, serviceTotal, foodTotal, serviceCharge, total, items };

    const batch = writeBatch(db);
    const paidRef = doc(collection(db, "paid-orders"));
    batch.set(paidRef, payload);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    alert("Orders marked as paid!");
    await loadOrders("food-drinks", isGroup);
    await loadOrders("services", isGroup);

  } catch (e) {
    console.error("markAsPaid error:", e);
    alert("Error while marking as paid. See console.");
  }

  setButtonProcessing(markButton, false); 
};

document.getElementById("orders-modal").addEventListener("click", (e) => {
  const modalContent = e.target.closest(".modal-content");
  if (!modalContent) {
    window.closeOrdersModal();
  }
});

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

window.addCustomOrder = async function(isGroup) {
    if (!currentGuestCode) {
        alert("No guest selected!");
        return;
    }

    const button = isGroup 
        ? document.getElementById("add-custom-group-btn") 
        : document.getElementById("add-custom-guest-btn");

    setButtonProcessing(button, true); 

    const name = document.getElementById("custom-order-name").value.trim();
    const category = document.getElementById("custom-order-category").value;
    const price = parseFloat(document.getElementById("custom-order-price").value);

    if (!name || isNaN(price) || price < 0) {
        alert("Please enter valid name and price.");
        setButtonProcessing(button, false);
        return;
    }

    const orderField = isGroup ? "groupCode" : "guestCode";
    const orderValue = isGroup ? guestData.groupCode : currentGuestCode;

    try {
        await addDoc(collection(db, "guests-orders"), {
            [orderField]: orderValue,
            name: name,
            price: price,
            type: category,
            quantity: 1,
            currency: "LKR"
        });

        document.getElementById("custom-order-name").value = "";
        document.getElementById("custom-order-price").value = "";
        document.getElementById("custom-order-category").value = "food-drinks";

        await loadOrders(category, isGroup);

        alert("Custom order added!");
    } catch (e) {
        console.error("addCustomOrder error:", e);
        alert("Error adding custom order. See console.");
    }

    setButtonProcessing(button, false); 
};



