import { db } from "../../shared/firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const treeCountEl = document.getElementById("heroTreeCount");
const userCountEl = document.getElementById("heroUserCount");
const locationCountEl = document.getElementById("heroLocationCount");

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function setFallbackValues() {
  if (treeCountEl) treeCountEl.textContent = "0";
  if (userCountEl) userCountEl.textContent = "0";
  if (locationCountEl) locationCountEl.textContent = "0";
}

async function loadLandingStats() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const appointmentsSnap = await getDocs(collection(db, "appointments"));

    let totalTrees = 0;
    const uniqueLocations = new Set();

    for (const appointmentDoc of appointmentsSnap.docs) {
      const appointmentData = appointmentDoc.data() || {};
      const appointmentLocation = (appointmentData.location || "").toString().trim();
      if (appointmentLocation) {
        uniqueLocations.add(appointmentLocation.toLowerCase());
      }

      const treeInventorySnap = await getDocs(
        collection(db, `appointments/${appointmentDoc.id}/tree_inventory`)
      );

      totalTrees += treeInventorySnap.size;

      treeInventorySnap.forEach((treeDoc) => {
        const treeData = treeDoc.data() || {};
        const location =
          treeData.municipality ||
          treeData.cityMunicipality ||
          treeData.location ||
          treeData.barangay ||
          "";

        const normalized = location.toString().trim().toLowerCase();
        if (normalized) {
          uniqueLocations.add(normalized);
        }
      });
    }

    if (treeCountEl) treeCountEl.textContent = formatNumber(totalTrees);
    if (userCountEl) userCountEl.textContent = formatNumber(usersSnap.size);
    if (locationCountEl) locationCountEl.textContent = formatNumber(uniqueLocations.size);
  } catch (error) {
    console.error("Failed to load landing stats:", error);
    setFallbackValues();
  }
}

loadLandingStats();
