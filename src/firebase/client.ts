// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_CLIENT_ACCOUNT_KEY,
  authDomain: "vote-rutherford.firebaseapp.com",
  projectId: "vote-rutherford",
  storageBucket: "vote-rutherford.firebasestorage.app",
  messagingSenderId: "879561651752",
  appId: "1:879561651752:web:c0cc2b0a6ab6a40e41a71d",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
