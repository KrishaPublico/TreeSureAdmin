import { db } from "./script.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM Elements
const proceedBtn = document.getElementById("proceedBtn");
const inventoryModal = document.getElementById("inventoryModal");
const closeInventoryModal = document.getElementById("closeInventoryModal");
const assignForesterBtn = document.getElementById("assignForesterBtn");

const foresterSelect = document.getElementById("foresterName"); // <select> for foresters
const applicantNameInput = document.getElementById("applicantNameInput");
const applicantAddressInput = document.getElementById("applicantAddressInput");
const applicantContactInput = document.getElementById("applicantContactInput");

let currentApplicantId = null;
let forestersLoaded = false; // ensure foresters are loaded once

// ------------------ Set Current Applicant ------------------
export function setCurrentApplicant(userId) {
  currentApplicantId = userId;
}

// ------------------ Load Foresters ------------------
async function loadForesters() {
  foresterSelect.innerHTML = "<option value=''>Select Forester</option>"; // default option

  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "Forester"),   // match exactly your Firestore role
      where("active", "==", true)        // optional, only active foresters
    );

    const forestersSnapshot = await getDocs(q);

    if (forestersSnapshot.empty) {
      foresterSelect.innerHTML += "<option value=''>No Foresters Available</option>";
      return;
    }

    forestersSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const option = document.createElement("option");
      option.value = docSnap.id; // store forester's userId
      option.textContent = data.name || "Unnamed Forester";
      foresterSelect.appendChild(option);
    });

    forestersLoaded = true;
  } catch (err) {
    console.error("Error loading foresters:", err);
    alert("Failed to load foresters.");
  }
}


// ------------------ Open Inventory Modal ------------------
proceedBtn.addEventListener("click", async () => {
  if (!currentApplicantId) return alert("Select an applicant first.");

  try {
    const userDoc = await getDoc(doc(db, "users", currentApplicantId));
    const userData = userDoc.data() || {};

    applicantNameInput.value = userData.name || "";
    applicantAddressInput.value = userData.address || "";
    applicantContactInput.value = userData.contact || "";

    await loadForesters(); // populate forester dropdown (only first time)

    inventoryModal.style.display = "block";
  } catch (err) {
    console.error("Error fetching applicant info:", err);
    alert("Failed to load applicant data.");
  }
});

// ------------------ Close Modal ------------------
closeInventoryModal.addEventListener("click", () => (inventoryModal.style.display = "none"));
window.addEventListener("click", (event) => {
  if (event.target === inventoryModal) inventoryModal.style.display = "none";
});

// ------------------ Assign Forester ------------------
assignForesterBtn.addEventListener("click", async () => {
  const selectedForesterId = foresterSelect.value;
  const visitDate = document.getElementById("visitDate").value;

  if (!selectedForesterId) return alert("Please select a forester.");
  if (!visitDate) return alert("Please select the date of visit.");

  try {
    const foresterDoc = await getDoc(doc(db, "users", selectedForesterId));
    const foresterName = foresterDoc.data()?.name || "Unnamed Forester";

    await updateDoc(doc(db, "users", currentApplicantId), {
      treeInventoryAssignment: {
        foresterId: selectedForesterId,
        foresterName: foresterName,
        applicantName: applicantNameInput.value,
        address: applicantAddressInput.value,
        contact: applicantContactInput.value,
        visitDate: visitDate, // <-- store date here
        assignedAt: new Date()
      }
    });

    alert(`✅ Forester ${foresterName} assigned successfully for ${visitDate}!`);
    inventoryModal.style.display = "none";
    foresterSelect.value = "";
    document.getElementById("visitDate").value = "";
  } catch (err) {
    console.error("Error assigning forester:", err);
    alert("Failed to assign forester.");
  }
});
