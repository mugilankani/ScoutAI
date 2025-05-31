// firebase.js
import admin from "firebase-admin";
import fs from "fs";
import dotenv from "dotenv"
dotenv.config()


if (!admin.apps.length) {
  let serviceAccount;
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set."
    );
  }
  // Decode base64 string from environment variable
  const decoded = Buffer.from(base64, "base64").toString("utf8");
  serviceAccount = JSON.parse(decoded);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
