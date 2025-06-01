import admin from "../firebase.js";

const firestore = admin.firestore();
const auth = admin.auth();

export { firestore, auth };
