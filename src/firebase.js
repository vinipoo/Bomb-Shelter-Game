import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCa5Rrke_RlMGgv6vXQz4AiYrjqIi3XZcY",
  authDomain: "shelter-bet.firebaseapp.com",
  databaseURL: "https://shelter-bet-default-rtdb.firebaseio.com",
  projectId: "shelter-bet",
  storageBucket: "shelter-bet.firebasestorage.app",
  messagingSenderId: "316754155581",
  appId: "1:316754155581:web:f04ea8e8fd8d4b2121f254"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
