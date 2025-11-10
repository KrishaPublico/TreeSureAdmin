import { db, checkLogin, logout } from "./script.js";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  checkLogin();

  const tbody = document.getElementById("usersTableBody");
  const addUserForm = document.getElementById("addUserForm");
  const btnSubmit = document.querySelector(".btn-submit");
  const searchInput = document.getElementById("searchInput");
  const usersRef = collection(db, "users");

  // ---------------- LOGOUT ----------------
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  // ---------------- CONFIRMATION TOAST ----------------
// Confirmation toast (no icon, smaller font)
function showConfirmationToast(message) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById("toast-container");
    if (!container) return reject("Toast container missing");

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <div class="message small-message">
        <span>${message}</span>
      </div>
      <div class="close-btn">&times;</div>
      <button class="ok-btn">OK</button>
    `;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);

    toast.querySelector(".close-btn").addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
      reject("Cancelled by user");
    });

    toast.querySelector(".ok-btn").addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
      resolve(true);
    });
  });
}

// Success toast (with check icon on the left)
function showSuccessToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="message">
      <span class="icon">&#10003;</span>
      <span>${message}</span>
    </div>
    <button class="ok-btn">OK</button>
  `;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  toast.querySelector(".ok-btn").addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  });
}



  // ---------------- LOAD USERS ----------------
  async function loadUsers() {
    if (!tbody) return;
    tbody.innerHTML = "";

    try {
      const snapshot = await getDocs(usersRef);

      if (snapshot.empty) {
        tbody.innerHTML = `<tr><td colspan="9">No users found.</td></tr>`;
        return;
      }

      snapshot.forEach((docSnap) => {
        const user = docSnap.data();
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${user.id || docSnap.id}</td>
          <td>${user.name || "N/A"}</td>
          <td>${user.username || "N/A"}</td>
          <td>••••••</td>
          <td>${user.contact || "N/A"}</td>
          <td>${user.address || "N/A"}</td>
          <td>${user.role || "N/A"}</td>
          <td>${user.active ? "Active" : "Inactive"}</td>
          <td>
            <button data-id="${docSnap.id}" class="edit-btn">
              <i class="fas fa-edit"></i> Edit
            </button>
          </td>
        `;
        tbody.prepend(row);
      });

      attachRowEvents();
    } catch (err) {
      console.error("Error loading users:", err);
      tbody.innerHTML = `<tr><td colspan="9" style="color:red;">Error loading users</td></tr>`;
      showConfirmationToast("❌ Failed to load users");
    }
  }

  // ---------------- EDIT BUTTON EVENTS ----------------
  function attachRowEvents() {
    tbody.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const docSnap = await getDoc(doc(db, "users", btn.dataset.id));
        if (!docSnap.exists()) return showConfirmationToast("User not found");

        const user = docSnap.data();

        document.getElementById("userId").value = btn.dataset.id;
        document.getElementById("name").value = user.name || "";
        document.getElementById("username").value = user.username || "";
        document.getElementById("password").value = user.password || "";
        document.getElementById("contact").value = user.contact || "";
        document.getElementById("address").value = user.address || "";
        document.getElementById("role").value = user.role || "Applicant";
        document.getElementById("status").value = user.active ? "true" : "false";

        btnSubmit.innerHTML = `<i class="fa fa-save"></i> Update User`;
      });
    });
  }

  // ---------------- ADD / UPDATE USER ----------------
addUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("userId").value;
  const userData = {
    name: document.getElementById("name").value.trim(),
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    contact: document.getElementById("contact").value.trim(),
    address: document.getElementById("address").value.trim(),
    role: document.getElementById("role").value,
    active: document.getElementById("status").value === "true",
  };

  try {
    // Confirmation prompt (no icon)
    await showConfirmationToast(
      userId ? "Are you sure you want to update this user?" : "Are you sure you want to add this user?"
    );

    if (userId) {
      await updateDoc(doc(db, "users", userId), userData);
      // Success toast with check icon
      showSuccessToast("User updated successfully!");
    } else {
      const snapshot = await getDocs(usersRef);
      const existingIds = snapshot.docs.map(docSnap => parseInt(docSnap.id, 10) || 0);

      let newIdNumber = 1;
      while (existingIds.includes(newIdNumber)) newIdNumber++;
      const customId = String(newIdNumber).padStart(3, "0");

      await setDoc(doc(db, "users", customId), { id: customId, ...userData });
      showSuccessToast(`User added successfully with ID: ${customId}`);
    }

    // Reset form
    addUserForm.reset();
    document.getElementById("userId").value = "";
    btnSubmit.innerHTML = `<i class="fa fa-user-plus"></i> Add User`;

    // Reload table
    loadUsers();
  } catch (err) {
    console.log("Action cancelled or error:", err);
  }
});


  // ---------------- SEARCH / FILTER ----------------
  searchInput.addEventListener("input", () => {
    const filter = searchInput.value.toLowerCase();
    tbody.querySelectorAll("tr").forEach((row) => {
      const match = Array.from(row.cells).some((cell) =>
        cell.textContent.toLowerCase().includes(filter)
      );
      row.style.display = match ? "" : "none";
    });
  });

  // ---------------- INITIAL LOAD ----------------
  loadUsers();
});
