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
let currentApplicantData = null;
let currentApplicationType = null;
let currentSubmissionId = null;
let currentAppointmentMode = 'new'; // 'new', 'revisit', or 'modify'
let existingAppointmentId = null;
let existingAppointmentData = null;
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
export function setCurrentApplicant(userId, userData = {}) {
  currentApplicantId = userId;
  currentApplicantData = userData;
  console.log("✅ Tree Inventory - Current applicant set:", userId, userData);
}

export function setCurrentApplication(appType, submissionId) {
  currentApplicationType = appType;
  currentSubmissionId = submissionId;
  console.log("✅ Tree Inventory - Current application set:", { appType, submissionId });
}

export function setAppointmentMode(mode, appointmentId = null, appointmentData = null) {
  currentAppointmentMode = mode; // 'new', 'revisit', or 'modify'
  existingAppointmentId = appointmentId;
  existingAppointmentData = appointmentData;
  console.log("✅ Tree Inventory - Appointment mode set:", { mode, appointmentId });
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
      if (!currentSubmissionId) return alert("⚠️ Select a submission first.");

      const userRef = doc(db, "users", currentApplicantId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return alert("Applicant not found.");
      const applicantData = userSnap.data();

      applicantNameInput.value = applicantData.name || "";
      await loadForesters();

      // Configure modal based on mode
      const modalTitle = inventoryModal.querySelector('h2');
      
      if (currentAppointmentMode === 'new') {
        // New tree tagging appointment
        modalTitle.textContent = '🌲 Tree Tagging Appointment';
        appointmentType.value = 'Tree Tagging';
        appointmentType.disabled = true;
        appointmentLocation.value = '';
        appointmentRemarks.value = '';
        foresterMultiSelect.selectedIndex = -1;
        
        // Hide appointment type field, show location and remarks
        appointmentType.parentElement.style.display = 'none';
        appointmentLocation.parentElement.style.display = 'block';
        appointmentRemarks.parentElement.style.display = 'block';
        appointmentLocation.disabled = false;
        appointmentRemarks.disabled = false;
        
      } else if (currentAppointmentMode === 'revisit') {
        // Revisit appointment
        modalTitle.textContent = '🔄 Schedule Revisit Appointment';
        appointmentType.value = 'Revisit';
        appointmentType.disabled = true;
        appointmentLocation.value = '';
        appointmentRemarks.value = '';
        foresterMultiSelect.selectedIndex = -1;
        
        // Hide appointment type field, show location and remarks
        appointmentType.parentElement.style.display = 'none';
        appointmentLocation.parentElement.style.display = 'block';
        appointmentRemarks.parentElement.style.display = 'block';
        appointmentLocation.disabled = false;
        appointmentRemarks.disabled = false;
        
      } else if (currentAppointmentMode === 'modify') {
        // Modify existing appointment - only change foresters
        modalTitle.textContent = '✏️ Modify Forester Assignment';
        
        if (existingAppointmentData) {
          appointmentType.value = existingAppointmentData.appointmentType || 'Tree Tagging';
          appointmentLocation.value = existingAppointmentData.location || '';
          appointmentRemarks.value = existingAppointmentData.remarks || '';
          
          // Pre-select existing foresters
          const existingForesterIds = existingAppointmentData.foresterIds || [];
          Array.from(foresterMultiSelect.options).forEach(opt => {
            opt.selected = existingForesterIds.includes(opt.value);
          });
        }
        
        // Hide all fields except forester selection
        appointmentType.disabled = true;
        appointmentLocation.disabled = true;
        appointmentRemarks.disabled = true;
        appointmentType.parentElement.style.display = 'none';
        appointmentLocation.parentElement.style.display = 'none';
        appointmentRemarks.parentElement.style.display = 'none';
      }

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
      
      // For modify mode, only validate foresters
      // For new/revisit mode, validate location (type is already set)
      if (currentAppointmentMode !== 'modify') {
        if (!appointmentLocation.value.trim()) {
          alert("⚠️ Please enter a location.");
          return;
        }
      }

      // Populate review details
      reviewApplicant.textContent = applicantNameInput.value;
      reviewType.textContent = appointmentType.value;
      reviewDate.textContent = currentAppointmentMode === 'modify' 
        ? "⏱ Existing appointment - no date change" 
        : "⏱ Automatically set when created";
      reviewLocation.textContent = appointmentLocation.value || existingAppointmentData?.location || "N/A";
      reviewRemarks.textContent = appointmentRemarks.value || existingAppointmentData?.remarks || "None";
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
        if (currentAppointmentMode === 'modify') {
          // Update existing appointment's forester list only
          if (!existingAppointmentId) {
            return alert("⚠️ No appointment ID found for modification.");
          }
          
          await setDoc(doc(db, "appointments", existingAppointmentId), {
            foresterIds: selectedForesters,
            lastModifiedAt: serverTimestamp(),
            lastModifiedBy: adminId
          }, { merge: true });
          
          alert(`✅ Forester assignment updated for appointment "${existingAppointmentId}"`);
          
        } else {
          // Create new appointment (tree tagging or revisit)
          // 🔹 Determine document ID prefix based on appointment type
          const appointmentTypeValue = appointmentType.value;
          const isRevisit = appointmentTypeValue === 'Revisit';
          const docPrefix = isRevisit ? "revisit_appointment_" : "tree_tagging_appointment_";
          
          // 🔹 Fetch all existing appointments of this type
          const snapshot = await getDocs(collection(db, "appointments"));
          const existingDocs = snapshot.docs
            .filter((docSnap) => docSnap.id.startsWith(docPrefix))
            .map((docSnap) => docSnap.id);

          // 🔹 Determine the next available index
          let maxIndex = 0;
          existingDocs.forEach((id) => {
            const num = parseInt(id.replace(docPrefix, ""));
            if (!isNaN(num) && num > maxIndex) {
              maxIndex = num;
            }
          });

          const nextIndex = String(maxIndex + 1).padStart(2, "0");
          const newDocId = `${docPrefix}${nextIndex}`;

          // 🔹 Create the new appointment document
          await setDoc(doc(db, "appointments", newDocId), {
            adminId,
            applicantId: currentApplicantId,
            applicantName: applicantNameInput.value,
            appointmentType: appointmentType.value, // 'Tree Tagging' or 'Revisit'
            applicationType: currentApplicationType,
            applicationID: currentSubmissionId, // ✅ The submission ID
            location: appointmentLocation.value.trim(),
            status: "Pending",
            treeIds: [],
            remarks: appointmentRemarks.value || "",
            createdAt: serverTimestamp(),
            completedAt: null,
            foresterIds: selectedForesters, // ✅ multiple foresters in one doc
          });

          alert(
            `✅ ${appointmentType.value} appointment "${newDocId}" assigned to ${selectedForesters.length} forester(s).`
          );
        }
        
        inventoryModal.style.display = "none";

        // Reset form
        appointmentType.value = "";
        appointmentType.disabled = false;
        appointmentLocation.value = "";
        appointmentLocation.disabled = false;
        appointmentRemarks.value = "";
        appointmentRemarks.disabled = false;
        foresterMultiSelect.selectedIndex = -1;
        
        // Reset mode
        currentAppointmentMode = 'new';
        existingAppointmentId = null;
        existingAppointmentData = null;
        
        // Show location and remarks fields, keep type hidden
        appointmentType.parentElement.style.display = 'none';
        appointmentLocation.parentElement.style.display = 'block';
        appointmentRemarks.parentElement.style.display = 'block';
        
        // Reload the page to refresh appointment display
        if (window.location.reload) {
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (err) {
        console.error("❌ Error creating/updating appointment:", err);
        alert("Failed to process appointment: " + err.message);
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