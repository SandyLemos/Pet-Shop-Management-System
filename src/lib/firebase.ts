import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDOTSk5LUCZpZOW-BeD1vSsfZkQLz1-eJg",
  authDomain: "pet-shop-manegement.firebaseapp.com",
  projectId: "pet-shop-manegement",
  storageBucket: "pet-shop-manegement.firebasestorage.app",
  messagingSenderId: "591972985976",
  appId: "1:591972985976:web:299a73cc6eaf472430918d",
  measurementId: "G-2238SKNW93"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
