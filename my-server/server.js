// ---------------------- Импорты ----------------------
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cors from "cors";
import admin from "firebase-admin";
import { readFileSync } from "fs";

// ---------------------- Init ----------------------
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ---------------------- Nodemailer ----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

app.post("/send-email", async (req, res) => {
  const { recipient, pdfBase64 } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipient,
    subject: "Your Invoice from Habibi Hostel",
    text: "Please find attached your invoice.",
    attachments: [
      {
        filename: "invoice.pdf",
        content: pdfBase64,
        encoding: "base64",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ---------------------- Firebase Admin ----------------------
const serviceAccount = JSON.parse(
  readFileSync("./my-habibi-firebase-adminsdk-fbsvc-805b43ea66.json")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://my-habibi-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();
const firestore = admin.firestore();

// ---------------------- Server Start Time ----------------------
const serverStartTime = Date.now();
console.log("Server started at:", serverStartTime);

// ---------------------- GENERAL CHAT ----------------------
const generalChatRef = db.ref("messages");

generalChatRef
  .orderByChild("timestamp")
  .startAt(serverStartTime)
  .on("child_added", async (snapshot) => {
    const newMessage = snapshot.val();
    console.log("New message detected (general chat):", newMessage);

    try {
      const tokensSnapshot = await db.ref("tokens").once("value");
      if (!tokensSnapshot.exists()) return;

      const tokensArray = Object.entries(tokensSnapshot.val())
        .filter(([authCode]) => authCode !== newMessage.userCode)
        .map(([_, obj]) => obj.fcmToken)
        .filter((token) => typeof token === "string");

      if (tokensArray.length === 0) return;

      const payload = {
        notification: {
          title: `New message from ${newMessage.user || "Guest"}`,
          body: newMessage.text || "",
        },
        data: {
          role: newMessage.role || "guest",
          timestamp: String(newMessage.timestamp || ""),
        },
      };

      await Promise.all(
        tokensArray.map((token) => admin.messaging().send({ ...payload, token }))
      );
      console.log("General chat notifications sent!");
    } catch (err) {
      console.error("Error sending general chat notifications:", err);
    }
  });

// ---------------------- ADMIN CHAT ----------------------
const adminChatsRef = db.ref("admin_chats");

adminChatsRef.on("child_added", (guestSnapshot) => {
  const guestCode = guestSnapshot.key;
  const messagesRef = db.ref(`admin_chats/${guestCode}/messages`);

  messagesRef.on("child_added", async (msgSnap) => {
    const msg = msgSnap.val();

    let msgTime = 0;
    if (typeof msg.timestamp === "string") {
      msgTime = new Date(msg.timestamp).getTime();
    } else if (typeof msg.timestamp === "number") {
      msgTime = msg.timestamp;
    } else if (msg.timestamp?.seconds) {
      msgTime = msg.timestamp.seconds * 1000;
    }
    if (msgTime < serverStartTime) return;

    console.log(`New message detected (admin chat) for guest ${guestCode}:`, msg);

    try {
      const tokensSnapshot = await db.ref("tokens").once("value");
      if (!tokensSnapshot.exists()) return;
      const allTokens = tokensSnapshot.val();
      let tokensArray = [];

      if (msg.role === "guest") {
        if (msg.read_by) {
          tokensArray = Object.keys(msg.read_by)
            .map((adminCode) => allTokens[adminCode]?.fcmToken)
            .filter((token) => typeof token === "string");
        }
      } else {
        const guestTokenObj = allTokens[guestCode];
        if (guestTokenObj?.fcmToken) tokensArray.push(guestTokenObj.fcmToken);
      }

      if (tokensArray.length === 0) return;

      const payload = {
        notification: {
          title: `New message from ${msg.user || msg.role}`,
          body: msg.text || "",
        },
        data: {
          role: msg.role || "",
          timestamp: String(msg.timestamp || ""),
        },
      };

      await Promise.all(
        tokensArray.map((token) => admin.messaging().send({ ...payload, token }))
      );
      console.log(`Admin chat notifications sent for guest ${guestCode}!`);
    } catch (err) {
      console.error("Error sending admin chat notifications:", err);
    }
  });
});

// ---------------------- FIRESTORE NOTIFICATIONS ----------------------
firestore
  .collection("notifications")
  .where("timestamp", ">=", new Date(serverStartTime))
  .onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const notif = change.doc.data();
        console.log("🔥 New Firestore notification:", notif);

        try {
          const tokensSnapshot = await db.ref("tokens").once("value");
          if (!tokensSnapshot.exists()) return;
          const allTokens = tokensSnapshot.val();

          const unreadAdmins = notif.unreadBy || [];
          const tokensArray = unreadAdmins
            .map((adminCode) => allTokens[adminCode]?.fcmToken)
            .filter((token) => typeof token === "string");

          if (tokensArray.length === 0) return;

          const payload = {
            notification: {
              title: `New notification: ${notif.type || "System"}`,
              body: notif.guestData?.guestName || notif.guestData?.name || "",
            },
            data: {
              type: notif.type || "",
              timestamp: notif.timestamp
                ? String(
                    notif.timestamp.seconds
                      ? notif.timestamp.seconds * 1000
                      : notif.timestamp
                  )
                : "",
            },
          };

          await Promise.all(
            tokensArray.map((token) => admin.messaging().send({ ...payload, token }))
          );
          console.log("📩 Firestore notifications sent!");
        } catch (err) {
          console.error("Error sending Firestore notification:", err);
        }
      }
    });
  });

// ---------------------- START SERVER ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
