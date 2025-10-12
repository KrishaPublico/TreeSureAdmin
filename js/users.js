import { db, checkLogin, logout } from "./script.js";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ Login check
checkLogin();

// ✅ Logout
document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

const tbody = document.getElementById("usersTableBody");
const usersRef = collection(db, "users");

// ✅ Load Users
export async function loadUsers() {
  console.log("🔄 Loading users...");
  tbody.innerHTML = "";

  try {
    const querySnapshot = await getDocs(usersRef);
    console.log(`📄 Found ${querySnapshot.size} users`);

    if (querySnapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="9">No users found.</td></tr>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
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
          <button data-id="${docSnap.id}" class="edit-btn">✏️ Edit</button>
          <button data-id="${docSnap.id}" class="delete-btn">🗑️ Delete</button>
        </td>
      `;

      tbody.prepend(row);
    });

    attachRowEvents();
  } catch (error) {
    console.error("❌ Error loading users:", error);
    tbody.innerHTML = `<tr><td colspan="9" style="color:red;">Error loading users: ${error.message}</td></tr>`;
  }
}

// ✅ Add / Update User Form
document.getElementById("addUserForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("userId").value;
  const userData = {
    name: document.getElementById("name").value,
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
    contact: document.getElementById("contact").value,
    address: document.getElementById("address").value,
    role: document.getElementById("role").value,
    active: document.getElementById("status").value === "true",
  };

  try {
    if (userId) {
      await updateDoc(doc(db, "users", userId), userData);
      alert("✅ User updated!");
    } else {
      const querySnapshot = await getDocs(usersRef);
      let existingIds = [];
      querySnapshot.forEach((docSnap) =>
        existingIds.push(parseInt(docSnap.id, 10))
      );

      let newIdNumber = 1;
      while (existingIds.includes(newIdNumber)) newIdNumber++;
      const customId = String(newIdNumber).padStart(3, "0");

      await setDoc(doc(db, "users", customId), { id: customId, ...userData });
      alert(`✅ User added successfully with ID: ${customId}`);
    }

    e.target.reset();
    document.getElementById("userId").value = "";
    document.querySelector(".btn-submit").innerHTML =
      `<i class="fa fa-user-plus"></i> Add User`;
    loadUsers();
  } catch (error) {
    console.error("❌ Error adding/updating user:", error);
    alert("Error saving user: " + error.message);
  }
});

// ✅ Delete User
async function deleteUser(id) {
  if (!confirm("Are you sure you want to delete this user?")) return;
  await deleteDoc(doc(db, "users", id));
  alert("User deleted!");
  loadUsers();
}

// ✅ Attach Events for Edit/Delete buttons
function attachRowEvents() {
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteUser(btn.dataset.id));
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const docSnap = await getDoc(doc(db, "users", btn.dataset.id));
      if (!docSnap.exists()) return alert("User not found");
      const user = docSnap.data();

      document.getElementById("userId").value = btn.dataset.id;
      document.getElementById("name").value = user.name || "";
      document.getElementById("username").value = user.username || "";
      document.getElementById("password").value = user.password || "";
      document.getElementById("contact").value = user.contact || "";
      document.getElementById("address").value = user.address || "";
      document.getElementById("role").value = user.role || "Applicant";
      document.getElementById("status").value = user.active ? "true" : "false";

      document.querySelector(".btn-submit").innerHTML =
        `<i class="fa fa-save"></i> Update User`;
    });
  });
}

// ✅ Search / Filter Users
document.getElementById("searchInput").addEventListener("input", () => {
  const filter = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#usersTableBody tr");

  rows.forEach((row) => {
    const match = Array.from(row.cells).some((cell) =>
      cell.textContent.toLowerCase().includes(filter)
    );
    row.style.display = match ? "" : "none";
  });
});

// ✅ Initialize
loadUsers();
