import { db } from "./firebase.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const loadReportBtn = document.getElementById("load-report-btn");
loadReportBtn.addEventListener("click", loadReport);

async function loadReport() {
    const fromDate = document.getElementById("from-date").value;
    const toDate = document.getElementById("to-date").value;
    const reportBody = document.getElementById("report-body");

    if (!fromDate || !toDate) {
        alert("Please select both From and To dates.");
        return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    reportBody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

    const q = query(collection(db, "paid-orders"), orderBy("date", "asc"));
    const snap = await getDocs(q);

    const rows = [];
    let sumFood = 0, sumServices = 0, sumCharge = 0, sumTotal = 0;

    snap.forEach(docSnap => {
        const order = docSnap.data();
        const orderDate = new Date(order.date);

        if (orderDate >= from && orderDate <= to) {
            const guestOrGroup = order.isGroup ? `Group: ${order.groupCode}` : `Guest: ${order.guestCode}`;
            rows.push(`
                <tr>
                    <td>${orderDate.toLocaleDateString()}</td>
                    <td>${guestOrGroup}</td>
                    <td>${order.foodTotal.toFixed(2)}</td>
                    <td>${order.serviceTotal.toFixed(2)}</td>
                    <td>${order.serviceCharge.toFixed(2)}</td>
                    <td>${order.total.toFixed(2)}</td>
                </tr>
            `);

            sumFood += order.foodTotal;
            sumServices += order.serviceTotal;
            sumCharge += order.serviceCharge;
            sumTotal += order.total;
        }
    });

    reportBody.innerHTML = rows.join("") || "<tr><td colspan='6'>No orders found for this period.</td></tr>";

    document.getElementById("sum-food").textContent = sumFood.toFixed(2);
    document.getElementById("sum-services").textContent = sumServices.toFixed(2);
    document.getElementById("sum-charge").textContent = sumCharge.toFixed(2);
    document.getElementById("sum-total").textContent = sumTotal.toFixed(2);

    const dates = [];
    const foodTotals = [];
    const serviceTotals = [];
    const serviceCharges = [];
    const totalAmounts = [];

    snap.forEach(docSnap => {
        const order = docSnap.data();
        const orderDate = new Date(order.date);

        if (orderDate >= from && orderDate <= to) {
            const dateStr = orderDate.toLocaleDateString();
            dates.push(dateStr);
            foodTotals.push(order.foodTotal);
            serviceTotals.push(order.serviceTotal);
            serviceCharges.push(order.serviceCharge);
            totalAmounts.push(order.total);
        }
    });

    const ctx = document.getElementById('orders-chart').getContext('2d');
    if (window.ordersChart) {
        window.ordersChart.destroy();
    }
    window.ordersChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Food Total',
                    data: foodTotals,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                },
                {
                    label: 'Service Total',
                    data: serviceTotals,
                    borderColor: 'rgba(255, 159, 64, 1)',
                    fill: false,
                },
                {
                    label: 'Service Charge',
                    data: serviceCharges,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    fill: false,
                },
                {
                    label: 'Total',
                    data: totalAmounts,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false,
                    borderWidth: 2,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Amount (LKR)'
                    },
                    beginAtZero: true
                }
            }
        }
    });

}
