// signup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------ FIREBASE CONFIG ------------------
const firebaseConfig = {
  apiKey: "AIzaSyBca-tYDQIXxSzOAz2jph3Mse6rJ3Ag9is",
  authDomain: "treesure-6496c.firebaseapp.com",
  databaseURL: "https://treesure-6496c-default-rtdb.firebaseio.com",
  projectId: "treesure-6496c",
  storageBucket: "treesure-6496c.firebasestorage.app",
  messagingSenderId: "324875915553",
  appId: "1:324875915553:web:9c8b1136a2d04594bcae60",
  measurementId: "G-G9V6QMHX1E"
};

// ------------------ INITIALIZE ------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ------------------ SIGN UP ------------------
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fullname = document.getElementById("fullname").value.trim();
      const email = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      const errorBox = document.getElementById("errorBox");

      // Validation
      if (!fullname) {
        showError("Please enter your full name.");
        return;
      }

      if (password !== confirmPassword) {
        showError("Passwords do not match. Please try again.");
        return;
      }

      if (password.length < 6) {
        showError("Password must be at least 6 characters long.");
        return;
      }

      try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log("✅ Account created successfully:", user.email);

        // Show success message
        showError("Account created successfully! Redirecting to login...", true);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);
      } catch (error) {
        console.error("❌ Sign up failed:", error);
        showError("Sign up failed: " + error.message);
      }
    });

    // Password toggle for password field
    setupPasswordToggle("toggleSignupPassword", "signup-password", "eyeSlashSignup", "eyeOpenSignup");

    // Password toggle for confirm password field
    setupPasswordToggle("toggleConfirmPassword", "confirm-password", "eyeSlashConfirm", "eyeOpenConfirm");
  }
});

// Helper function to setup password toggle
function setupPasswordToggle(toggleId, inputId, eyeSlashId, eyeOpenId) {
  const toggleElement = document.getElementById(toggleId);
  const passwordInput = document.getElementById(inputId);
  const eyeSlash = document.getElementById(eyeSlashId);
  const eyeOpen = document.getElementById(eyeOpenId);

  if (toggleElement) {
    toggleElement.addEventListener("click", () => {
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

// Helper function to show error/success messages
function showError(message, isSuccess = false) {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = message;
  errorBox.classList.add("show");

  if (!isSuccess) {
    errorBox.style.background = "#fdecea";
    errorBox.style.border = "1px solid #f5c2c7";
    errorBox.style.color = "#b71c1c";
  } else {
    errorBox.style.background = "#e8f5e9";
    errorBox.style.border = "1px solid #c8e6c9";
    errorBox.style.color = "#1b5e20";
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorBox.classList.remove("show");
  }, 5000);
}
