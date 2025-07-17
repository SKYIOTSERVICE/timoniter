// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBhjWfYgCiEHJhrYz6HlrrSLpq5oKUfOHo",
  authDomain: "skyiot-597d5.firebaseapp.com",
  databaseURL: "https://skyiot-597d5-default-rtdb.firebaseio.com",
  projectId: "skyiot-597d5",
  storageBucket: "skyiot-597d5.firebasestorage.app",
  messagingSenderId: "260049534060",
  appId: "1:260049534060:web:b36da75c0ab36770706c49"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
