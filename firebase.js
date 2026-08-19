import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// This config is safe to keep in client-side code — it is not a secret.
// Access control is enforced by Firestore Security Rules (see firestore.rules),
// not by hiding these values.
const firebaseConfig = {
  apiKey: "AIzaSyCii5tI4zq58z_Nc1oRuK3JTcwNggMpAG4",
  authDomain: "legal-planner-23cad.firebaseapp.com",
  projectId: "legal-planner-23cad",
  storageBucket: "legal-planner-23cad.firebasestorage.app",
  messagingSenderId: "575560909678",
  appId: "1:575560909678:web:210e1c1c4d653441b3f77f",
  measurementId: "G-7RRW07T0H5",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
