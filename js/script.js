// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------ FIREBASE CONFIG ------------------
const firebaseConfig = {
  apiKey: "AIzaSyAhCnePK0JxgzmMg2Dx2gUgGEyPpfUC5l4",
  authDomain: "treesure-6496c.firebaseapp.com",
  projectId: "treesure-6496c",
  storageBucket: "treesure-6496c.firebasestorage.app",
  messagingSenderId: "324875915553",
  appId: "1:324875915553:web:9c8b1136a2d04594bcae60",
  measurementId: "G-G9V6QMHX1E"
};

// ------------------ INITIALIZE ------------------
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);




// ------------------ LOGIN ------------------
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "dashboard.html"; // ✅ Redirect after login
      } catch (error) {
        console.error("❌ Login failed:", error);
        alert("Login failed: " + error.message);
      }
    });
  
    // ------------------ PASSWORD TOGGLE ------------------
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const eyeOpen = document.getElementById("eyeOpen");
    const eyeSlash = document.getElementById("eyeSlash");

    if (togglePassword) {
      togglePassword.addEventListener("click", () => {
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          eyeOpen.style.display = "inline";
          eyeSlash.style.display = "none";
        } else {
          passwordInput.type = "password";
          eyeOpen.style.display = "none";
          eyeSlash.style.display = "inline";
        }
      });
    }
  }

  // ✅ Attach logout listener (only if button exists)
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logout();
    });
  }
});
// ------------------ CHECK LOGIN ------------------
export function checkLogin() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const adminName = document.getElementById("adminName");
      if (adminName) {
        adminName.textContent = user.email;
      }
    } else {
      // ✅ Redirect to login page
      if (!window.location.pathname.endsWith("index.html")) {
        window.location.href = "index.html";
      }
    }
  });
}

// ------------------ LOGOUT ------------------
export async function logout() {
  try {
    await signOut(auth);
    window.location.href = "index.html"; // ✅ Redirect to login after logout
  } catch (error) {
    console.error("❌ Logout error:", error);
    alert("Error logging out: " + error.message);
  }
}


