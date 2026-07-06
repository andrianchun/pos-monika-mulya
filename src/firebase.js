import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyABQjWUXAOuEBxh34bdm4BWbBmPm_FKNio",
  authDomain: "hxpos2.firebaseapp.com",
  projectId: "hxpos2",
  storageBucket: "hxpos2.firebasestorage.app",
  messagingSenderId: "1065659713657",
  appId: "1:1065659713657:web:1f8aa9609d8ddab4276ca8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore Database dengan Cache modern (mendukung multi-tab)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Initialize Firebase Auth
export const auth = getAuth(app);

// Domain email sintetis: staf login pakai username, di belakang layar
// diubah menjadi email untuk Firebase Auth.
export const AUTH_EMAIL_DOMAIN = 'monikamulya.com';
export const usernameToEmail = (username) => `${String(username || '').trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

// App sekunder: dipakai admin untuk MEMBUAT akun staf baru tanpa
// menendang sesi login admin (createUserWithEmailAndPassword otomatis
// sign-in sebagai user baru — makanya dijalankan di instance terpisah).
let secondaryAuthInstance = null;
export const getSecondaryAuth = () => {
  if (!secondaryAuthInstance) {
    const secondaryApp = initializeApp(firebaseConfig, 'secondary');
    secondaryAuthInstance = getAuth(secondaryApp);
  }
  return secondaryAuthInstance;
};
