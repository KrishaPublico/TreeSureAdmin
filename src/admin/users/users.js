import { db, checkLogin, logout } from "../../shared/script.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Cache keys
const CACHE_KEYS = {
  USERS: 'treesure_users_cache',
  TIMESTAMP: 'treesure_users_timestamp'
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

function getCachedUsers() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEYS.USERS);
    const timestamp = sessionStorage.getItem(CACHE_KEYS.TIMESTAMP);

    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_DURATION) {
        console.log('📦 Loading users from cache');
        return JSON.parse(cached);
      }
    }
  } catch (err) {
    console.warn('Failed to load cache:', err);
  }
  return null;
}

function setCachedUsers(users) {
  try {
    sessionStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(users));
    sessionStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
    console.log('✅ Users cached successfully');
  } catch (err) {
    console.warn('Failed to cache users:', err);
  }
}

function clearUsersCache() {
  sessionStorage.removeItem(CACHE_KEYS.USERS);
  sessionStorage.removeItem(CACHE_KEYS.TIMESTAMP);
}

// Simple toast notification
function showToast(message, isSuccess = true) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.backgroundColor = isSuccess ? "#ecfdf5" : "#fef2f2";
  toast.style.borderColor = isSuccess ? "#d1fae5" : "#fee2e2";
  toast.style.color = isSuccess ? "#065f46" : "#7f1d1d";

  toast.innerHTML = `
    <div class="flex items-center gap-2" style="flex: 1;">
      <i class="fas fa-${isSuccess ? 'check-circle' : 'times-circle'}" style="color: ${isSuccess ? '#059669' : '#dc2626'};"></i>
      <span>${message}</span>
    </div>
    <button style="background: none; border: none; cursor: pointer; font-size: 18px; color: inherit;">×</button>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);

  toast.querySelector("button").addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

document.addEventListener("DOMContentLoaded", () => {
  checkLogin();

  const tbody = document.getElementById("usersTableBody");
  const addUserForm = document.getElementById("addUserForm");
  const searchInput = document.getElementById("searchInput");
  const usersRef = collection(db, "users");
  const editModal = document.getElementById("editUserModal");
  const editForm = document.getElementById("editUserForm");
  const editUserIdInput = document.getElementById("editUserId");
  const editNameInput = document.getElementById("editName");
  const editUsernameInput = document.getElementById("editUsername");
  const editPasswordInput = document.getElementById("editPassword");
  const editContactInput = document.getElementById("editContact");
  const editAddressInput = document.getElementById("editAddress");
  const editRoleSelect = document.getElementById("editRole");
  const editStatusSelect = document.getElementById("editStatus");

  // ========== LOAD USERS ==========
  async function loadUsers(forceRefresh = false) {
    if (!tbody) return;
    tbody.innerHTML = "";

    try {
      let usersData = null;

      if (!forceRefresh) {
        usersData = getCachedUsers();
      }

      if (!usersData) {
        console.log('🔄 Fetching users from Firestore...');
        const snapshot = await getDocs(usersRef);

        if (snapshot.empty) {
          tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-500">No users found.</td></tr>`;
          return;
        }

        usersData = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        setCachedUsers(usersData);
      }

      // Show newest users first (highest ID to lowest ID).
      usersData.sort((a, b) => {
        const aNum = parseInt(String(a.id).replace(/\D/g, ""), 10);
        const bNum = parseInt(String(b.id).replace(/\D/g, ""), 10);

        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          return bNum - aNum;
        }

        return String(b.id).localeCompare(String(a.id));
      });

      // Render users
      usersData.forEach((user) => {
        const row = document.createElement("tr");
        row.className = "hover:bg-slate-50 transition-colors";

        row.innerHTML = `
          <td class="px-6 py-4 text-sm font-medium text-slate-900">${user.id}</td>
          <td class="px-6 py-4 text-sm text-slate-700">${user.name || "N/A"}</td>
          <td class="px-6 py-4 text-sm text-slate-700">${user.username || "N/A"}</td>
          <td class="px-6 py-4 text-sm text-slate-700">${user.contact || "N/A"}</td>
          <td class="px-6 py-4 text-sm text-slate-700">${user.role || "N/A"}</td>
          <td class="px-6 py-4 text-sm">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }">
              <i class="fas fa-${user.active ? 'check-circle' : 'times-circle'}"></i>
              ${user.active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="px-6 py-4 text-sm">
            <button type="button" data-user-id="${user.id}" class="edit-user-btn inline-flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition" style="background-color: #166d22; border: none; cursor: pointer;">
              <i class="fas fa-edit"></i> Edit
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });

      // Attach edit button listeners
      document.querySelectorAll(".edit-user-btn").forEach(btn => {
        btn.addEventListener("click", openEditFormFor);
      });

    } catch (err) {
      console.error("Error loading users:", err);
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-500">Error loading users</td></tr>`;
    }
  }

  // ========== EDIT USER ==========
  async function openEditFormFor(e) {
    e.preventDefault();
    const userId = this.dataset.userId;
    console.log("🔓 Opening edit form for user:", userId);

    try {
      const docSnap = await getDoc(doc(db, "users", userId));
      if (!docSnap.exists()) {
        showToast("User not found", false);
        return;
      }

      const user = docSnap.data();
      console.log("📋 User data:", user);

      // Populate form
      editUserIdInput.value = userId;
      editNameInput.value = user.name || "";
      editUsernameInput.value = user.username || "";
      editPasswordInput.value = "";
      editContactInput.value = user.contact || "";
      editAddressInput.value = user.address || "";
      editRoleSelect.value = user.role || "Applicant";
      editStatusSelect.value = user.active ? "true" : "false";

      // Show modal
      editModal.classList.remove("hidden");
      editModal.classList.add("show");
      console.log("✅ Modal opened");

    } catch (err) {
      console.error("Error opening edit form:", err);
      showToast("Failed to load user details", false);
    }
  }

  function closeEditForm() {
    editModal.classList.add("hidden");
    editModal.classList.remove("show");
    editForm.reset();
  }

  // ========== ADD USER ==========
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
      const snapshot = await getDocs(usersRef);
      const existingIds = snapshot.docs.map((docSnap) => parseInt(docSnap.id, 10) || 0);

      let newIdNumber = 1;
      while (existingIds.includes(newIdNumber)) newIdNumber++;
      const customId = String(newIdNumber).padStart(3, "0");

      await setDoc(doc(db, "users", customId), { id: customId, ...userData });
      showToast(`✅ User added successfully with ID: ${customId}`);

      addUserForm.reset();

      // Close add modal if it exists
      const addModal = document.getElementById("addUserModal");
      if (addModal) {
        addModal.classList.add("hidden");
        addModal.classList.remove("show");
      }

      clearUsersCache();
      loadUsers(true);
    } catch (err) {
      console.error("Error adding user:", err);
      showToast("Failed to add user", false);
    }
  });

  // ========== UPDATE USER ==========
  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📝 Update form submitted");

    const userId = editUserIdInput.value;
    if (!userId) {
      showToast("Error: No user ID", false);
      return;
    }

    const updatedData = {
      name: editNameInput.value.trim(),
      username: editUsernameInput.value.trim(),
      contact: editContactInput.value.trim(),
      address: editAddressInput.value.trim(),
      role: editRoleSelect.value,
      active: editStatusSelect.value === "true",
    };

    // Only update password if provided
    if (editPasswordInput.value) {
      updatedData.password = editPasswordInput.value;
    }

    try {
      await updateDoc(doc(db, "users", userId), updatedData);
      showToast("✅ User updated successfully!");
      closeEditForm();
      clearUsersCache();
      loadUsers(true);
    } catch (err) {
      console.error("Error updating user:", err);
      showToast("Failed to update user", false);
    }
  });

  // ========== CLOSE MODAL BUTTONS ==========
  document.getElementById("closeEditModal")?.addEventListener("click", closeEditForm);
  document.getElementById("cancelEditBtn")?.addEventListener("click", closeEditForm);

  editModal?.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditForm();
  });

  // ========== SEARCH ==========
  searchInput.addEventListener("input", () => {
    const filter = searchInput.value.toLowerCase();
    tbody.querySelectorAll("tr").forEach((row) => {
      const match = Array.from(row.cells).some((cell) =>
        cell.textContent.toLowerCase().includes(filter)
      );
      row.style.display = match ? "" : "none";
    });
  });

  // ========== INITIAL LOAD ==========
  loadUsers();
});
