import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayRemove,
  getDoc,
  deleteDoc,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const adminCode = localStorage.getItem("authCode");
  const notificationBtn = document.getElementById("notifications-btn");
  const notificationsContainer = document.querySelector(".notifications-list");

  await updateNotificationCount();

  notificationBtn.addEventListener("click", async function () {
    if (notificationsContainer.classList.contains("d-none")) {
      await loadNotifications();
      notificationsContainer.classList.remove("d-none");
      notificationsContainer.classList.add("d-flex");
    } else {
      notificationsContainer.classList.add("d-none");
      notificationsContainer.classList.remove("d-flex");
    }
  });

  async function updateNotificationCount() {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("unreadBy", "array-contains", adminCode)
    );

    const querySnapshot = await getDocs(q);
    const unreadCount = querySnapshot.size;

    const countElement = document.querySelector(".notifications-btn span");
    if (unreadCount > 0) {
      countElement.textContent = unreadCount;
      countElement.classList.remove("d-none");
    } else {
      countElement.classList.add("d-none");
    }
  }

  async function loadNotifications() {
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    const notifications = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    renderNotifications(notifications);
  }

  function renderNotifications(notifications) {
    notificationsContainer.innerHTML = ""; 

    if (notifications.length === 0) {
      notificationsContainer.innerHTML = "<p>No notifications available</p>";
    } else {
      notifications.forEach((notification) => {
        if (!notification.undeletedBy.includes(adminCode)) {
          return; 
        }
        const isUnread = notification.unreadBy.includes(adminCode);

        const item = document.createElement("div");
        item.classList.add("notification-item");

        let content = `<p>Type: ${notification.type}</p>`;

        if (notification.type === "Request for a tour" && notification.tourId) {
          content += `<p>Tour: №${notification.tourId}</p>`;
        }

        if (notification.type === "New booking for an event" && notification.eventName && notification.eventDate) {
          content += `<p>Event: ${notification.eventName} (${notification.eventDate})</p>`;
        }

        if (notification.guestData) {
          if (notification.guestData.bookingCode) {
            content += `
              <p>Guest name: ${notification.guestData.guestName}</p>
              <p>Booking Code: ${notification.guestData.bookingCode}</p>
              <p>Check-in: ${new Date(
                notification.guestData.checkInDate
              ).toLocaleString()}</p>
              <p>Check-out: ${new Date(
                notification.guestData.checkOutDate
              ).toLocaleString()}</p>
              <p>Room Number: ${notification.guestData.roomNumber}</p>
            `;
          } else {
            content += `
              <p>Name: ${notification.guestData.name}</p>
              <p>Email: ${notification.guestData.email}</p>
              <p>Phone: ${notification.guestData.phone}</p>
            `;
          }
        }

        let timestamp;
        if (notification.timestamp?.toDate) {
            timestamp = notification.timestamp.toDate();
          } else if (notification.timestamp instanceof Date) {
            timestamp = notification.timestamp;
          } else {
            timestamp = new Date(notification.timestamp); 
        }

        content += `<p>Time: ${timestamp.toLocaleString()}</p>`;

        content += `
          ${
            isUnread
              ? `<button class="custom-btn" onclick="markAsRead('${notification.id}')">MARK AS READ</button>`
              : ""
          }
          <button class="custom-btn" onclick="deleteNotification('${
            notification.id
          }')">DELETE</button>
        `;

        item.innerHTML = content;
        notificationsContainer.appendChild(item);
      });
    }
  }

  window.markAsRead = async function (notificationId) {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      unreadBy: arrayRemove(adminCode),
    });

    await updateNotificationCount();
    await loadNotifications();
  };

  window.deleteNotification = async function (notificationId) {
    try {
        console.log(`Попытка удаления уведомления: ${notificationId}`);

        const notificationRef = doc(db, "notifications", notificationId);
        const docSnap = await getDoc(notificationRef);

        if (!docSnap.exists()) {
            console.log(`❌ Документ ${notificationId} отсутствует в Firestore.`);
            return;
        }

        console.log("✅ Документ найден:", docSnap.data());
        const notificationData = docSnap.data();

        if (notificationData.unreadBy.includes(adminCode)) {
            await updateDoc(notificationRef, {
                unreadBy: arrayRemove(adminCode),
            });
        }

        await updateDoc(notificationRef, {
            undeletedBy: arrayRemove(adminCode),
        });

        console.log("✔ Админ удалён из undeletedBy.");

        const updatedSnap = await getDoc(notificationRef);
        const updatedData = updatedSnap.data();

        if (!updatedData.undeletedBy || updatedData.undeletedBy.length === 0) {
            console.log(
                `🗑 Удаляем уведомление ${notificationId}, так как все админы его удалили.`
            );

            await deleteDoc(notificationRef);

            if (notificationData.type === "Request for a tour" && notificationData.tourId) {
                let tourRequestsQuery;
                
                if (notificationData.guestData?.bookingCode) {
                    tourRequestsQuery = query(
                        collection(db, "tour_requests"),
                        where("tourId", "==", notificationData.tourId),
                        where("guestData.bookingCode", "==", notificationData.guestData.bookingCode)
                    );
                } else {
                    tourRequestsQuery = query(
                        collection(db, "tour_requests"),
                        where("tourId", "==", notificationData.tourId),
                        where("guestData.phone", "==", notificationData.guestData.phone)
                    );
                }

                const tourRequestsSnapshot = await getDocs(tourRequestsQuery);
                tourRequestsSnapshot.forEach(async (tourRequestDoc) => {
                    await deleteDoc(doc(db, "tour_requests", tourRequestDoc.id));
                    console.log(`🗑 Заявка на тур ${notificationData.tourId} удалена.`);
                });
            }

            if (notificationData.type === "Request for a day trip" && notificationData.tripId) {
                let tripRequestsQuery;
                
                if (notificationData.guestData?.bookingCode) {
                    tripRequestsQuery = query(
                        collection(db, "trip_requests"),
                        where("tripId", "==", notificationData.tripId),
                        where("guestData.bookingCode", "==", notificationData.guestData.bookingCode)
                    );
                } else {
                    tripRequestsQuery = query(
                        collection(db, "trip_requests"),
                        where("tripId", "==", notificationData.tourId),
                        where("guestData.phone", "==", notificationData.guestData.phone)
                    );
                }

                const tripRequestsSnapshot = await getDocs(tripRequestsQuery);
                tripRequestsSnapshot.forEach(async (tripRequestDoc) => {
                    await deleteDoc(doc(db, "trip_requests", tripRequestDoc.id));
                    console.log(`🗑 Заявка на дневную поездку ${notificationData.tripId} удалена.`);
                });
            }
        }

        await loadNotifications(); 
        await updateNotificationCount(); 

    } catch (error) {
        console.error("❌ Ошибка при удалении уведомления:", error);
    }
};
});
