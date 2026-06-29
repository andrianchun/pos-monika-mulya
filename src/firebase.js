import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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
