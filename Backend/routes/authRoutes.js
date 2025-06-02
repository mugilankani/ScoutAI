import express from "express";
import jwt from "jsonwebtoken";
import { google, oauth2Client, SCOPES } from "../services/googleapis.js";
import { firestore } from "../config/firebaseAdmin.js";

const router = express.Router();

// Helper function to save user to Firestore
async function saveUserToFirestore(userData) {
  const {
    id: googleId,
    email,
    given_name: firstName,
    family_name: lastName,
    name: displayName,
    picture: avatarUrl,
  } = userData;

  const userRef = firestore.collection("users").doc(googleId);

  const userDoc = await userRef.get();

  const userPayload = {
    id: googleId,
    email,
    name: displayName,
    avatarUrl,
    firstName,
    lastName,
    updatedAt: new Date().toISOString(),
  };

  if (!userDoc.exists) {
    userPayload.createdAt = new Date().toISOString();
  }

  await userRef.set(userPayload, { merge: true });

  return userPayload;
}

// GET /auth/google - Initiate Google OAuth
router.get("/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    redirect_uri: process.env.GOOGLE_REDIRECT_URL,
  });
  console.log("Redirecting to:", url);
  res.redirect(url);
});

// GET /auth/google/callback - Handle Google OAuth callback
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const user = await saveUserToFirestore(userInfo.data);

    // Create JWT token instead of using sessions
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );
    // Set HTTP-only cookie
    res.cookie("authToken", accessToken, {
      httpOnly: true,
      secure: true, // Always true for HTTPS production
      sameSite: "none", // Required for cross-origin cookies
      domain: process.env.COOKIE_DOMAIN,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.redirect(`${process.env.CLIENT_URL}/search`);
  } catch (error) {
    console.error("Error during authentication:", error);
    res.redirect(`${process.env.CLIENT_URL}?error=auth_failed`);
  }
});

// GET /auth/status - Check authentication status
router.get("/status", async (req, res) => {
  try {
    const token = req.cookies.authToken;

    if (!token) {
      return res.json({ user: null });
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Get user from Firestore
    const userRef = firestore.collection("users").doc(decoded.userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      res.clearCookie("authToken", {
        domain: process.env.COOKIE_DOMAIN,
        secure: true,
        sameSite: "none",
      });
      return res.json({ user: null });
    }

    const user = userDoc.data();
    return res.json({ user });
  } catch (error) {
    console.error("Error checking auth status:", error);
    res.clearCookie("authToken", {
      domain: process.env.COOKIE_DOMAIN,
      secure: true,
      sameSite: "none",
    });
    return res.json({ user: null });
  }
});

// POST /auth/logout - Logout user
router.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    domain: process.env.COOKIE_DOMAIN,
    secure: true,
    sameSite: "none",
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
