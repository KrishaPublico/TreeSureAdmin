import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db, checkLogin, logout } from "./script.js";

checkLogin();

// 🔹 Logout Button
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await logout();
  });
}

// 🔹 Containers
const container = document.getElementById("treesContainer");
const loadingMessage = document.getElementById("loadingMessage");

// 🔹 Cache to store fetched inventories
const inventoryCache = {};

// =========================================================
// FETCH TREE INVENTORY OF EACH USER
// =========================================================
async function fetchUserTrees(userId) {
  if (inventoryCache[userId]) return inventoryCache[userId];

  const inventoryRef = collection(db, `users/${userId}/tree_inventory`);
  const treesSnapshot = await getDocs(inventoryRef);

  const trees = treesSnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  inventoryCache[userId] = trees;
  return trees;
}

// =========================================================
// LOAD ALL TREES (Render as Table)
// =========================================================
async function loadTrees() {
  container.innerHTML = "";
  loadingMessage.style.display = "block";

  // Small delay to show spinner
  await new Promise((resolve) => setTimeout(resolve, 50));

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));

    if (usersSnapshot.empty) {
      loadingMessage.style.display = "none";
      container.innerHTML = "<p>No applicants found.</p>";
      return;
    }

    // 🔹 Fetch all applicants’ inventories
    const applicantPromises = usersSnapshot.docs.map(async (userDoc) => {
      const trees = await fetchUserTrees(userDoc.id);

      if (trees.length > 0) {
        const applicantName =
          trees[0].applicantName ||
          trees[0].owner_name ||
          userDoc.data().name ||
          "Unknown Applicant";

        return { userDoc, trees, applicantName };
      }
      return null;
    });

    const applicantData = (await Promise.all(applicantPromises)).filter((a) => a !== null);

    loadingMessage.style.display = "none";

    if (applicantData.length === 0) {
      container.innerHTML = "<p>No applicants with tree inventory found.</p>";
      return;
    }

    // =========================================================
    // RENDER EACH APPLICANT SECTION AS A TABLE
    // =========================================================
    applicantData.forEach(({ trees, applicantName }) => {
      const folderDiv = document.createElement("div");
      folderDiv.classList.add("applicant-folder");

      // Folder header
      const header = document.createElement("div");
      header.textContent = `📁 ${applicantName}`;
      header.classList.add("applicant-header");

      const content = document.createElement("div");
      content.classList.add("tree-table-container");
      content.style.display = "none";

      // Toggle open/close
      header.addEventListener("click", () => {
        const isOpen = content.style.display === "block";
        content.style.display = isOpen ? "none" : "block";
        header.textContent = isOpen ? `📁 ${applicantName}` : `📂 ${applicantName}`;
      });

      // Create Table
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Tree ID</th>
            <th>Species</th>
            <th>Diameter (cm)</th>
            <th>Height (m)</th>
            <th>Volume (m³)</th>
            <th>Location (Lat, Long)</th>
            <th>Photo</th>
            <th>Inventoried By</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody");

      // Populate table rows dynamically
      trees.forEach((tree) => {
        const row = document.createElement("tr");

        const photoCell = tree.photo_url
          ? `<img src="${tree.photo_url}" alt="Tree Photo" class="tree-photo" onclick="window.open('${tree.photo_url}', '_blank')" />`
          : "—";

        row.innerHTML = `
          <td>${tree.tree_no || tree.id}</td>
          <td>${tree.specie || "N/A"}</td>
          <td>${tree.diameter || "N/A"}</td>
          <td>${tree.height || "N/A"}</td>
          <td>${tree.volume || "N/A"}</td>
          <td>${tree.latitude || "N/A"}, ${tree.longitude || "N/A"}</td>
          <td>${photoCell}</td>
          <td>${tree.forester_name || "Unknown Forester"}</td>
        `;
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      content.appendChild(table);
      folderDiv.appendChild(header);
      folderDiv.appendChild(content);
      container.appendChild(folderDiv);
    });
  } catch (err) {
    console.error("❌ Firebase error:", err.code, err.message);
    loadingMessage.style.display = "none";
    container.innerHTML = `<p style="color:red;">Error loading tree records: ${err.message}</p>`;
  }
}

// =========================================================
// INIT
// =========================================================
document.addEventListener("DOMContentLoaded", loadTrees);
