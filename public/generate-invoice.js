import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.0/jspdf.umd.min.js"; 
import "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js"; 

const { jsPDF } = window.jspdf;
import { guestData, currentGuestCode } from "./guests-orders.js";

async function generateInvoice(isGroup) {
    // Определяем кнопку
    const btn = isGroup 
        ? document.querySelector('#group-orders-container .invoice-btn') 
        : document.querySelector('.invoice-btn:not(#group-orders-container .invoice-btn)');

    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        if (!guestData) throw new Error("Guest data is missing!");

        let guestEmails = [];
        if (isGroup) {
            const groupEmailsStr = document.getElementById('group-email').value.trim();
            if (!groupEmailsStr) throw new Error("Please enter group email(s)!");
            guestEmails = groupEmailsStr.split(',').map(e => e.trim()).filter(e => e);
        } else {
            const guestEmail = document.getElementById('guest-email').value.trim();
            if (!guestEmail) throw new Error("Please enter guest email!");
            guestEmails = [guestEmail];
        }

        let orders = [];
        let total = 0;
        let serviceCharge = 0;

        if (isGroup && guestData.groupCode) {
            const ordersQuery = query(collection(db, "guests-orders"), where("groupCode", "==", guestData.groupCode));
            const ordersSnapshot = await getDocs(ordersQuery);
            ordersSnapshot.forEach(doc => orders.push(doc.data()));
        } else {
            const ordersQuery = query(collection(db, "guests-orders"), where("guestCode", "==", currentGuestCode));
            const ordersSnapshot = await getDocs(ordersQuery);
            ordersSnapshot.forEach(doc => orders.push(doc.data()));
        }

        if (orders.length === 0) throw new Error("No orders found!");

        const doc = new jsPDF();
        const logo = new Image();
        logo.src = "./img/logo-1.png";

        logo.onload = async function () {
            const aspectRatio = logo.width / logo.height;
            const desiredHeight = 30;
            const desiredWidth = desiredHeight * aspectRatio;
            doc.addImage(logo, "PNG", 20, 10, desiredWidth, desiredHeight);

            const rightStart = 20 + desiredWidth + 10;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Habibi Hostel and Restaurant", rightStart, 18);
            doc.setFontSize(12);
            doc.text("Guest Invoice", rightStart, 26);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("267R+2P6, DANWALLA, UNAWATUNA", rightStart, 34);
            doc.text("80600 - GALLE, Sri Lanka", rightStart, 40);
            doc.setDrawColor(200);
            doc.line(20, 50, 190, 50);

            doc.setFontSize(11);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 60);
            doc.text(`Guest: ${isGroup ? "Group Order" : guestEmails[0]}`, 20, 68);
            if (guestData.roomNumber && !isGroup) {
                doc.text(`Room Number: ${guestData.roomNumber}`, 20, 76);
            }

            let foodTotal = 0;
            let servicesTotal = 0;
            let applyServiceCharge = false;

            const body = orders.map(order => {
                const itemTotal = parseFloat(order.price) * order.quantity;
                if (order.type === "food-drinks") {
                    if (order.name.trim().toLowerCase() !== "water") applyServiceCharge = true;
                    foodTotal += itemTotal;
                } else if (order.type === "services") {
                    servicesTotal += itemTotal;
                }
                return [order.name, order.quantity, `${order.price} ${order.currency}`, `${itemTotal.toFixed(2)} ${order.currency}`];
            });

            if (applyServiceCharge) {
                serviceCharge = foodTotal * 0.10;
                foodTotal += serviceCharge;
            }

            total = foodTotal + servicesTotal;

            doc.autoTable({
                startY: 85,
                head: [["Item", "Qty", "Price", "Total"]],
                body: body,
                styles: { halign: "left", fontSize: 10, cellPadding: 2, textColor: [0, 0, 0] },
                headStyles: { fillColor: [233, 233, 233], textColor: [0, 0, 0], fontStyle: "bold" },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 20, right: 20 },
            });

            let finalY = doc.autoTable.previous.finalY + 10;
            doc.setFontSize(11);
            doc.text(`Food & Drinks Total: ${foodTotal.toFixed(2)} LKR`, 20, finalY);
            if (serviceCharge > 0) {
                doc.text(`(Including 10% Service Charge: ${serviceCharge.toFixed(2)} LKR)`, 20, finalY + 8);
                finalY += 8;
            }
            doc.text(`Services Total: ${servicesTotal.toFixed(2)} LKR`, 20, finalY + 8);
            doc.setFont("helvetica", "bold");
            doc.text(`Grand Total: ${total.toFixed(2)} LKR`, 20, finalY + 18);
            doc.setFont("helvetica", "normal");

            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text("Thank you for staying with us!", 20, 280);
            doc.text("Habibi Hostel, Unawatuna", 20, 286);

            const pdfBase64 = doc.output("datauristring");
            window.open(pdfBase64);

            await sendInvoiceByEmail(guestEmails, pdfBase64);
        };
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "GENERATE INVOICE";
    }
}

window.generateInvoice = generateInvoice;

async function sendInvoiceByEmail(emails, pdfBase64) {
    const scriptURL = "http://localhost:3000/send-email";

    for (const email of emails) {
        const response = await fetch(scriptURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipient: email, pdfBase64: pdfBase64.split(",")[1] })
        });

        const result = await response.json();
        if (result.success) {
            alert(`Invoice sent successfully to ${email}!`);
        } else {
            alert(`Error sending invoice to ${email}: ${result.error}`);
        }
    }
}
