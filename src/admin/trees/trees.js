import { db, checkLogin, logout } from "../../shared/script.js";

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

  const tbody = document.getElementById("treesTableBody");
  const searchInput = document.getElementById("searchInput");

  // ========== LOAD TREES ==========
  async function loadTrees() {
    if (!tbody) return;
    tbody.innerHTML = "";

    try {
      // Display placeholder message
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-500">No trees data available. Trees management system is loading...</td></tr>`;
    } catch (err) {
      console.error("Error loading trees:", err);
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-500">Error loading trees</td></tr>`;
    }
  }

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
  loadTrees();
});
