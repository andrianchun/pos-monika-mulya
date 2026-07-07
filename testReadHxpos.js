import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABQjWUXAOuEBxh34bdm4BWbBmPm_FKNio",
  authDomain: "hxpos2.firebaseapp.com",
  projectId: "hxpos2",
  storageBucket: "hxpos2.firebasestorage.app",
  messagingSenderId: "1065659713657",
  appId: "1:1065659713657:web:1f8aa9609d8ddab4276ca8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRead() {
    try {
        const snap = await getDocs(collection(db, "products"));
        console.log("SUKSES BACA! Jumlah produk:", snap.docs.length);
    } catch (err) {
        console.error("GAGAL BACA:", err.message);
    }
}
testRead();
