import { db } from "./script.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  setDoc,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------ ELEMENTS (Lazy-loaded) ------------------
let proceedBtn, inventoryModal, closeInventoryModal;
let foresterMultiSelect, applicantNameInput, appointmentType, appointmentLocation, appointmentRemarks;
let reviewAppointmentBtn, inventoryFormStep, inventoryReviewStep, backToEditBtn, confirmAppointmentBtn;
let reviewApplicant, reviewType, reviewDate, reviewLocation, reviewRemarks, reviewForesters;

function initElements() {
  proceedBtn = document.getElementById("proceedBtn");
  inventoryModal = document.getElementById("inventoryModal");
  closeInventoryModal = document.getElementById("closeInventoryModal");
  
  foresterMultiSelect = document.getElementById("foresterMultiSelect");
  applicantNameInput = document.getElementById("applicantNameInput");
  appointmentType = document.getElementById("appointmentType");
  appointmentLocation = document.getElementById("appointmentLocation");
  appointmentRemarks = document.getElementById("appointmentRemarks");
  
  reviewAppointmentBtn = document.getElementById("reviewAppointmentBtn");
  inventoryFormStep = document.getElementById("inventoryFormStep");
  inventoryReviewStep = document.getElementById("inventoryReviewStep");
  backToEditBtn = document.getElementById("backToEditBtn");
  confirmAppointmentBtn = document.getElementById("confirmAppointmentBtn");
  
  reviewApplicant = document.getElementById("reviewApplicant");
  reviewType = document.getElementById("reviewType");
  reviewDate = document.getElementById("reviewDate");
  reviewLocation = document.getElementById("reviewLocation");
  reviewRemarks = document.getElementById("reviewRemarks");
  reviewForesters = document.getElementById("reviewForesters");
  
  attachEventListeners();
}

// ------------------ VARIABLES ------------------
let currentApplicantId = null;
let adminId = null; // ✅ Will store logged-in admin's Gmail

// ------------------ AUTH ------------------
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (user) {
    adminId = user.email; // ✅ Gmail of logged-in admin
    console.log("✅ Logged in as:", adminId);
  } else {
    console.warn("⚠️ No admin logged in");
  }
});

// ------------------ FUNCTIONS ------------------
export function setCurrentApplicant(userId) {
  currentApplicantId = userId;
}

// Load all active foresters into the multi-select
async function loadForesters() {
  foresterMultiSelect.innerHTML = "";
  const q = query(
    collection(db, "users"),
    where("role", "==", "Forester"),
    where("active", "==", true)
  );
  const snapshot = await getDocs(q);

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.textContent = data.name || "Unnamed Forester";
    foresterMultiSelect.appendChild(opt);
  });
}

// ------------------ EVENT LISTENER ATTACHMENT ------------------
function attachEventListeners() {
  // ------------------ OPEN MODAL ------------------
  if (proceedBtn) {
    proceedBtn.addEventListener("click", async () => {
      if (!currentApplicantId) return alert("⚠️ Select an applicant first.");

      const userRef = doc(db, "users", currentApplicantId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return alert("Applicant not found.");
      const applicantData = userSnap.data();

      applicantNameInput.value = applicantData.name || "";
      await loadForesters();

      inventoryModal.style.display = "block";
      inventoryFormStep.style.display = "block";
      inventoryReviewStep.style.display = "none";
    });
  }

  if (closeInventoryModal) {
    closeInventoryModal.addEventListener("click", () => {
      inventoryModal.style.display = "none";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === inventoryModal) inventoryModal.style.display = "none";
  });

  // ------------------ REVIEW STEP ------------------
  if (reviewAppointmentBtn) {
    reviewAppointmentBtn.addEventListener("click", () => {
      const selectedForesters = Array.from(foresterMultiSelect.selectedOptions);

      if (selectedForesters.length === 0)
        return alert("⚠️ Please select at least one forester.");
      if (!appointmentType.value || !appointmentLocation.value.trim()) {
        alert("⚠️ Fill out all required fields.");
        return;
      }

      // Populate review details
      reviewApplicant.textContent = applicantNameInput.value;
      reviewType.textContent = appointmentType.value;
      reviewDate.textContent = "⏱ Automatically set when created";
      reviewLocation.textContent = appointmentLocation.value;
      reviewRemarks.textContent = appointmentRemarks.value || "None";
      reviewForesters.innerHTML = selectedForesters
        .map((f) => f.textContent)
        .join(", ");

      // Switch view
      inventoryFormStep.style.display = "none";
      inventoryReviewStep.style.display = "block";
    });
  }

  // ------------------ BACK TO EDIT ------------------
  if (backToEditBtn) {
    backToEditBtn.addEventListener("click", () => {
      inventoryFormStep.style.display = "block";
      inventoryReviewStep.style.display = "none";
    });
  }

  // ------------------ CONFIRM APPOINTMENT ------------------
  if (confirmAppointmentBtn) {
    confirmAppointmentBtn.addEventListener("click", async () => {
      const selectedForesters = Array.from(
        foresterMultiSelect.selectedOptions
      ).map((opt) => opt.value);

      if (selectedForesters.length === 0)
        return alert("⚠️ Please select at least one forester.");

      try {
        // 🔹 Fetch all existing tree tagging appointments
        const snapshot = await getDocs(collection(db, "appointments"));
        const existingDocs = snapshot.docs
          .filter((docSnap) => docSnap.id.startsWith("tree_tagging_appointment_"))
          .map((docSnap) => docSnap.id);

        // 🔹 Determine the next available index
        let maxIndex = 0;
        existingDocs.forEach((id) => {
          const num = parseInt(id.replace("tree_tagging_appointment_", ""));
          if (!isNaN(num) && num > maxIndex) {
            maxIndex = num;
          }
        });

        const nextIndex = String(maxIndex + 1).padStart(2, "0");
        const newDocId = `tree_tagging_appointment_${nextIndex}`;

        // 🔹 Create the new appointment document
        await setDoc(doc(db, "appointments", newDocId), {
          adminId,
          applicantId: currentApplicantId,
          appointmentType: appointmentType.value,
          location: appointmentLocation.value.trim(),
          status: "Pending",
          treeIds: [],
          remarks: appointmentRemarks.value || "",
          createdAt: serverTimestamp(),
          completedAt: null,
          foresterIds: selectedForesters, // ✅ multiple foresters in one doc
        });

        alert(
          `✅ Appointment "${newDocId}" assigned to ${selectedForesters.length} forester(s).`
        );
        inventoryModal.style.display = "none";

        // Reset form
        appointmentType.value = "";
      appointmentLocation.value = "";
      appointmentRemarks.value = "";
      foresterMultiSelect.selectedIndex = -1;
    } catch (err) {
      console.error("❌ Error creating appointment:", err);
      alert("Failed to create appointment: " + err.message);
    }
  });
  }
}

// ------------------ INITIALIZE ON DOM LOAD ------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initElements);
} else {
  // DOM already loaded
  initElements();
}