import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";
import { db, checkLogin, logout } from "./script.js";

checkLogin();

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

const storage = getStorage();

async function loadTrees() {
  const table = document.getElementById("treesTable");

  try {
    // 🔹 Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // 🔹 Get their tree_inventory subcollection
      const inventoryRef = collection(db, `users/${userDoc.id}/tree_inventory`);
      const treesSnapshot = await getDocs(inventoryRef);

      treesSnapshot.forEach(async (treeDoc) => {
        const tree = treeDoc.data();
        const row = table.insertRow(-1);

        row.insertCell(0).textContent = tree.tree_no || treeDoc.id;
        row.insertCell(1).textContent = tree.specie || "N/A";
        row.insertCell(2).textContent = tree.diameter || "N/A";
        row.insertCell(3).textContent = tree.height || "N/A";
        row.insertCell(4).textContent = tree.volume || "N/A";
        row.insertCell(5).textContent = `${tree.latitude || "N/A"}, ${tree.longitude || "N/A"}`;
        row.insertCell(6).textContent = tree.forester_name || userData.name || "Unknown";

        // 🔹 Photo display
        const photoCell = row.insertCell(7);
        try {
          let photoURL = tree.photo_url || tree.photo || tree.photoUrl || tree.image;

          console.log("📸 Raw photo value:", photoURL);

          if (!photoURL) {
            photoCell.textContent = "No photo";
            return;
          }

          // If not a full link, get from Firebase Storage
          if (!photoURL.startsWith("http")) {
            const photoRef = ref(storage, photoURL);
            photoURL = await getDownloadURL(photoRef);
          }

          const img = document.createElement("img");
          img.src = photoURL;
          img.alt = "Tree Photo";
          img.classList.add("tree-photo");
          img.style.width = "80px";
          img.style.height = "80px";
          img.style.objectFit = "cover";
          img.style.borderRadius = "8px";
          img.style.cursor = "pointer";
          img.addEventListener("click", () => window.open(photoURL, "_blank"));

          photoCell.appendChild(img);
        } catch (error) {
          console.error("❌ Error loading photo:", error);
          photoCell.textContent = "Error loading photo";
        }
      });
    }
  } catch (err) {
    console.error("❌ Error loading trees:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadTrees);
