import { db, checkLogin, logout } from "../../shared/script.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ========== TOAST ==========
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
      <i class="fas fa-${isSuccess ? "check-circle" : "times-circle"}" style="color: ${isSuccess ? "#059669" : "#dc2626"};"></i>
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

// ========== HELPERS ==========
function escapeHtml(text) {
  if (text === null || text === undefined) return "N/A";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatCoord(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val ?? "N/A";
  return n.toFixed(5);
}

function parseTimestamp(tsField) {
  if (!tsField) return null;
  if (tsField?.toDate) return tsField.toDate();
  if (tsField instanceof Date) return tsField;
  if (typeof tsField === "string") {
    const p = Date.parse(tsField.replace(/\s+at\s+/i, " ").replace(/\s+UTC.*$/i, ""));
    return isNaN(p) ? null : new Date(p);
  }
  return null;
}

// ========== STATE ==========
let allTrees = [];

// ========== LOAD TREES FROM FIREBASE ==========
async function loadTrees() {
  const tbody = document.getElementById("treesTableBody");
  const countEl = document.getElementById("treeCount");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-slate-500"><i class="fa fa-spinner fa-spin"></i> Loading trees...</td></tr>`;

  try {
    const appointmentsRef = collection(db, "appointments");
    const appointmentsSnap = await getDocs(appointmentsRef);

    allTrees = [];

    for (const appointmentDoc of appointmentsSnap.docs) {
      const appointmentData = appointmentDoc.data();
      const appointmentId = appointmentDoc.id;

      // Resolve applicant name
      let applicantName = "Unknown";
      const applicantId = appointmentData.applicantId;
      if (applicantId) {
        try {
          const userSnap = await getDoc(doc(db, "users", applicantId));
          if (userSnap.exists()) applicantName = userSnap.data().name || "Unknown";
        } catch (_) {}
      }

      const treeInventoryRef = collection(db, `appointments/${appointmentId}/tree_inventory`);
      const treeInventorySnap = await getDocs(treeInventoryRef);

      treeInventorySnap.forEach((treeDoc) => {
        const t = treeDoc.data();
        allTrees.push({
          appointmentId,
          treeDocId: treeDoc.id,
          treeNo: t.tree_no || t.tree_id || treeDoc.id,
          applicationType: appointmentData.applicationType || "N/A",
          applicantId: applicantId || "Unknown",
          applicantName,
          species: t.specie || t.species || "Unknown",
          diameter: t.diameter ?? 0,
          height: t.height ?? 0,
          volume: t.volume ?? 0,
          location: appointmentData.location || "N/A",
          latitude: t.latitude ?? null,
          longitude: t.longitude ?? null,
          forester: t.forester_name || "Unknown",
          foresterId: t.forester_id || null,
          status: appointmentData.status || "pending",
          photoUrl: t.photo_url || null,
          qrUrl: t.qr_url || null,
          date: parseTimestamp(t.timestamp),
          remarks: appointmentData.remarks || "",
        });
      });
    }

    // Populate species filter
    const speciesFilter = document.getElementById("speciesFilter");
    if (speciesFilter) {
      const speciesSet = new Set(allTrees.map((t) => t.species).filter(Boolean));
      speciesFilter.innerHTML = `<option value="all">All Species</option>`;
      [...speciesSet].sort().forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        speciesFilter.appendChild(opt);
      });
    }

    if (countEl) countEl.textContent = allTrees.length;
    renderTable(allTrees);
  } catch (err) {
    console.error("Error loading trees:", err);
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-red-500"><i class="fa fa-exclamation-circle"></i> Error loading trees: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ========== RENDER TABLE ==========
function renderTable(data) {
  const tbody = document.getElementById("treesTableBody");
  const countEl = document.getElementById("treeCount");
  if (!tbody) return;

  if (countEl) countEl.textContent = data.length;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-slate-500">No trees found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((d, i) => {
    const statusColor = {
      completed: "background:#d1fae5;color:#065f46",
      approved: "background:#d1fae5;color:#065f46",
      pending: "background:#fef3c7;color:#92400e",
      rejected: "background:#fee2e2;color:#7f1d1d",
    }[d.status?.toLowerCase()] || "background:#f1f5f9;color:#475569";

    const photoHtml = d.photoUrl
      ? `<a href="${escapeHtml(d.photoUrl)}" target="_blank" style="color:#166d22;text-decoration:underline">View</a>`
      : "—";

    return `
      <tr class="hover:bg-slate-50 transition-colors" data-index="${i}">
        <td class="px-4 py-3 text-sm font-mono">${escapeHtml(d.treeNo)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(d.species)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(d.applicantName)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(d.location)}</td>
        <td class="px-4 py-3 text-sm text-center">${d.height}</td>
        <td class="px-4 py-3 text-sm text-center">${d.diameter}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(d.forester)}</td>
        <td class="px-4 py-3 text-sm">
          <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;${statusColor}">
            ${escapeHtml(d.status)}
          </span>
        </td>
        <td class="px-4 py-3 text-sm">
          <div style="display:flex;gap:6px;">
            <button onclick="viewTree(${i})" style="background:#166d22;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-size:12px;">
              <i class="fa fa-eye"></i> View
            </button>
            ${photoHtml !== "—" ? `<a href="${escapeHtml(d.photoUrl)}" target="_blank" style="background:#0284c7;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;font-size:12px;text-decoration:none;display:inline-block;"><i class="fa fa-image"></i> Photo</a>` : ""}
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ========== VIEW TREE MODAL ==========
window.viewTree = function (index) {
  const d = allTrees[index];
  if (!d) return;

  const modal = document.getElementById("treeDetailModal");
  const content = document.getElementById("treeDetailContent");
  if (!modal || !content) return;

  const dateStr = d.date ? d.date.toLocaleString() : "N/A";
  const lat = d.latitude != null ? formatCoord(d.latitude) : "N/A";
  const lng = d.longitude != null ? formatCoord(d.longitude) : "N/A";

  content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div><strong>Tree No:</strong><br>${escapeHtml(d.treeNo)}</div>
      <div><strong>Species:</strong><br>${escapeHtml(d.species)}</div>
      <div><strong>Applicant:</strong><br>${escapeHtml(d.applicantName)}</div>
      <div><strong>Application Type:</strong><br>${escapeHtml(d.applicationType)}</div>
      <div><strong>Location:</strong><br>${escapeHtml(d.location)}</div>
      <div><strong>Forester:</strong><br>${escapeHtml(d.forester)}</div>
      <div><strong>Height (m):</strong><br>${d.height}</div>
      <div><strong>Diameter/DBH (cm):</strong><br>${d.diameter}</div>
      <div><strong>Volume (m³):</strong><br>${typeof d.volume === "number" ? d.volume.toFixed(4) : d.volume}</div>
      <div><strong>Status:</strong><br>${escapeHtml(d.status)}</div>
      <div><strong>Latitude:</strong><br>${lat}</div>
      <div><strong>Longitude:</strong><br>${lng}</div>
      <div><strong>Date Recorded:</strong><br>${dateStr}</div>
      <div><strong>Remarks:</strong><br>${escapeHtml(d.remarks) || "—"}</div>
    </div>
    ${d.photoUrl ? `<div style="margin-top:16px;"><strong>Photo:</strong><br><img src="${escapeHtml(d.photoUrl)}" alt="Tree photo" style="max-width:100%;max-height:260px;border-radius:8px;margin-top:8px;border:1px solid #e2e8f0;"></div>` : ""}
    ${d.qrUrl ? `<div style="margin-top:16px;"><strong>QR Code:</strong><br><img src="${escapeHtml(d.qrUrl)}" alt="QR Code" style="width:120px;height:120px;margin-top:8px;border:1px solid #e2e8f0;border-radius:4px;"></div>` : ""}
  `;

  modal.classList.add("show");
  modal.classList.remove("hidden");
};

document.addEventListener("DOMContentLoaded", () => {
  checkLogin();

  const searchInput = document.getElementById("searchInput");
  const speciesFilter = document.getElementById("speciesFilter");
  const statusFilter = document.getElementById("statusFilter");

  // ========== SEARCH & FILTER ==========
  function applyFilters() {
    const keyword = (searchInput?.value ?? "").toLowerCase().trim();
    const species = speciesFilter?.value ?? "all";
    const status = statusFilter?.value ?? "all";

    const filtered = allTrees.filter((d) => {
      const matchKeyword =
        !keyword ||
        d.treeNo.toLowerCase().includes(keyword) ||
        d.species.toLowerCase().includes(keyword) ||
        d.location.toLowerCase().includes(keyword) ||
        d.forester.toLowerCase().includes(keyword) ||
        d.applicantName.toLowerCase().includes(keyword);
      const matchSpecies = species === "all" || d.species === species;
      const matchStatus = status === "all" || d.status?.toLowerCase() === status;
      return matchKeyword && matchSpecies && matchStatus;
    });

    renderTable(filtered);
  }

  searchInput?.addEventListener("input", applyFilters);
  speciesFilter?.addEventListener("change", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);

  // Refresh button
  document.getElementById("refreshBtn")?.addEventListener("click", async () => {
    const btn = document.getElementById("refreshBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Refreshing...'; }
    await loadTrees();
    applyFilters();
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-refresh"></i> Refresh'; }
    showToast("Trees data refreshed.");
  });

  // Modal close
  document.getElementById("closeTreeModal")?.addEventListener("click", () => {
    const modal = document.getElementById("treeDetailModal");
    modal?.classList.remove("show");
    modal?.classList.add("hidden");
  });

  window.addEventListener("click", (e) => {
    const modal = document.getElementById("treeDetailModal");
    if (e.target === modal) {
      modal.classList.remove("show");
      modal.classList.add("hidden");
    }
  });

  // ========== INITIAL LOAD ==========
  loadTrees();
});
