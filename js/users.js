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
  const addUserSubmitBtn = document.querySelector(".user-form .btn-submit");
  const searchInput = document.getElementById("searchInput");
  const usersRef = collection(db, "users");
  const editModal = document.getElementById("editUserModal");
  const editForm = document.getElementById("editUserForm");
  const closeEditModalBtn = document.getElementById("closeEditModal");
  const editUserIdInput = document.getElementById("editUserId");
  const editNameInput = document.getElementById("editName");
  const editUsernameInput = document.getElementById("editUsername");
  const editPasswordInput = document.getElementById("editPassword");
  const editContactInput = document.getElementById("editContact");
  const editAddressInput = document.getElementById("editAddress");
  const editRoleSelect = document.getElementById("editRole");
  const editStatusSelect = document.getElementById("editStatus");

  // ---------------- LOGOUT ----------------
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  // ---------------- CONFIRMATION TOAST ----------------
// Confirmation toast that supports configurable buttons
function showConfirmationToast(message, options = {}) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById("toast-container");
    if (!container) return reject("Toast container missing");

    const {
      confirmText = "OK",
      cancelText = null,
    } = options;

    const toast = document.createElement("div");
    toast.className = "toast";

    const messageWrapper = document.createElement("div");
    messageWrapper.className = "message small-message";
    const messageSpan = document.createElement("span");
    messageSpan.textContent = message;
    messageWrapper.appendChild(messageSpan);
    toast.appendChild(messageWrapper);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
      reject("Cancelled by user");
    });
    toast.appendChild(closeBtn);

    const actions = document.createElement("div");
    actions.className = "toast-actions";

    if (cancelText) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "cancel-btn";
      cancelBtn.textContent = cancelText;
      cancelBtn.addEventListener("click", () => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
        reject("Cancelled by user");
      });
      actions.appendChild(cancelBtn);
    }

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "ok-btn";
    confirmBtn.textContent = confirmText;
    confirmBtn.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
      resolve(true);
    });
    actions.appendChild(confirmBtn);

    toast.appendChild(actions);
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 100);
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
        try {
          const docSnap = await getDoc(doc(db, "users", btn.dataset.id));
          if (!docSnap.exists()) {
            await showConfirmationToast("User not found");
            return;
          }

          const user = docSnap.data();
          openEditModal(btn.dataset.id, user);
        } catch (err) {
          console.error("Failed to open edit modal:", err);
          showConfirmationToast("Unable to load user details");
        }
      });
    });
  }

  function openEditModal(userId, userData) {
    editUserIdInput.value = userId;
    editNameInput.value = userData.name || "";
    editUsernameInput.value = userData.username || "";
    editPasswordInput.value = userData.password || "";
    editContactInput.value = userData.contact || "";
    editAddressInput.value = userData.address || "";
    editRoleSelect.value = userData.role || "Applicant";
    editStatusSelect.value = userData.active ? "true" : "false";

    if (editModal) {
      editModal.classList.add("show");
      editModal.setAttribute("aria-hidden", "false");
    }
  }

  function closeEditModal() {
    if (editModal) {
      editModal.classList.remove("show");
      editModal.setAttribute("aria-hidden", "true");
    }
    editForm?.reset();
    if (editUserIdInput) editUserIdInput.value = "";
  }

  // ---------------- ADD / UPDATE USER ----------------
addUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();

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
    await showConfirmationToast("Are you sure you want to add this user?", {
      confirmText: "Yes",
      cancelText: "Cancel",
    });

    const snapshot = await getDocs(usersRef);
    const existingIds = snapshot.docs.map((docSnap) => parseInt(docSnap.id, 10) || 0);

    let newIdNumber = 1;
    while (existingIds.includes(newIdNumber)) newIdNumber++;
    const customId = String(newIdNumber).padStart(3, "0");

    await setDoc(doc(db, "users", customId), { id: customId, ...userData });
    showSuccessToast(`User added successfully with ID: ${customId}`);

    // Reset form
    addUserForm.reset();
    if (addUserSubmitBtn) {
      addUserSubmitBtn.innerHTML = `<i class="fa fa-user-plus"></i> Add User`;
    }

    // Reload table
    loadUsers();
  } catch (err) {
    console.log("Action cancelled or error:", err);
  }
});

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = editUserIdInput.value;
    if (!userId) {
      console.warn("Missing user id for edit");
      return;
    }

    const updatedData = {
      name: editNameInput.value.trim(),
      username: editUsernameInput.value.trim(),
      password: editPasswordInput.value,
      contact: editContactInput.value.trim(),
      address: editAddressInput.value.trim(),
      role: editRoleSelect.value,
      active: editStatusSelect.value === "true",
    };

    try {
      closeEditModal();
      await showConfirmationToast("Are you sure you want to update this user?", {
        confirmText: "Yes",
        cancelText: "Cancel",
      });
      await updateDoc(doc(db, "users", userId), updatedData);
      showSuccessToast("User updated successfully!");
      closeEditModal();
      loadUsers();
    } catch (err) {
      if (err === "Cancelled by user") {
        openEditModal(userId, updatedData);
      } else {
        console.log("Edit cancelled or error:", err);
      }
    }
  });

  closeEditModalBtn?.addEventListener("click", closeEditModal);
  editModal?.addEventListener("click", (event) => {
    if (event.target === editModal) {
      closeEditModal();
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
