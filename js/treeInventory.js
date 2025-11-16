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
let ctpoReferenceId = null; // ✅ For PLTP/SPLTP - reference to CTPO appointment
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

export function setAppointmentMode(mode, appointmentId = null, appointmentData = null, ctpoReference = null) {
  currentAppointmentMode = mode; // 'new', 'revisit', or 'modify'
  existingAppointmentId = appointmentId;
  existingAppointmentData = appointmentData;
  ctpoReferenceId = ctpoReference; // Store CTPO reference for PLTP/SPLTP
  console.log("✅ Tree Inventory - Appointment mode set:", { mode, appointmentId, ctpoReference });
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
          // 🔹 Determine appointment type and document ID prefix based on mode
          const isRevisit = currentAppointmentMode === 'revisit';
          const appointmentTypeValue = isRevisit ? 'Revisit' : 'Tree Tagging';
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

          // 🔹 For revisit appointments, find the completed tree tagging appointment
          let originalAppointmentId = null;
          if (isRevisit) {
            // Find completed tree tagging appointment for this submission
            const appointmentsQuery = query(
              collection(db, "appointments"),
              where("applicationID", "==", currentSubmissionId),
              where("appointmentType", "==", "Tree Tagging"),
              where("status", "==", "Completed")
            );
            const completedAppointmentsSnap = await getDocs(appointmentsQuery);
            
            if (!completedAppointmentsSnap.empty) {
              originalAppointmentId = completedAppointmentsSnap.docs[0].id;
              console.log("✅ Found completed tree tagging appointment:", originalAppointmentId);
            } else {
              console.warn("⚠️ No completed tree tagging appointment found for this submission");
            }
          }

          // 🔹 Create the new appointment document
          await setDoc(doc(db, "appointments", newDocId), {
            adminId,
            applicantId: currentApplicantId,
            applicantName: applicantNameInput.value,
            appointmentType: appointmentTypeValue, // 'Tree Tagging' or 'Revisit'
            applicationType: currentApplicationType,
            applicationID: currentSubmissionId, // ✅ The submission ID
            location: appointmentLocation.value.trim(),
            status: "Pending",
            treeIds: [],
            remarks: appointmentRemarks.value || "",
            createdAt: serverTimestamp(),
            completedAt: null,
            foresterIds: selectedForesters, // ✅ multiple foresters in one doc
            ...(isRevisit && originalAppointmentId && { originalAppointmentRef: originalAppointmentId })
          });

          // 🔹 For revisit appointments, copy tree inventory data
          if (isRevisit && originalAppointmentId) {
            try {
              console.log("📋 Copying tree inventory data for revisit...");
              
              // Get all trees from the original tree inventory
              const treeInventoryRef = collection(db, "appointments", originalAppointmentId, "tree_inventory");
              const treeInventorySnap = await getDocs(treeInventoryRef);
              
              if (!treeInventorySnap.empty) {
                console.log(`📊 Found ${treeInventorySnap.size} tree(s) to copy`);
                
                // Create tree_revisit subcollection in the new revisit appointment
                const treeRevisitRef = collection(db, "appointments", newDocId, "tree_revisit");
                
                // Copy each tree with old data and empty new data
                for (const treeDoc of treeInventorySnap.docs) {
                  const treeId = treeDoc.id;
                  const treeData = treeDoc.data();
                  
                  // Create reference to original tree document
                  const originalTreeRef = doc(db, "appointments", originalAppointmentId, "tree_inventory", treeId);
                  
                  // Prepare old data (copy all relevant fields from original tree)
                  const oldData = {
                    height: treeData.height || null,
                    diameter: treeData.diameter || null,
                    specie: treeData.specie || null,
                    latitude: treeData.latitude || null,
                    longitude: treeData.longitude || null,
                    photo_url: treeData.photo_url || null,
                    tree_status: treeData.tree_status || null,
                    volume: treeData.volume || null,
                    qr_url: treeData.qr_url || null,
                    tree_no: treeData.tree_no || null,
                    timestamp: treeData.timestamp || null,
                    forester_name: treeData.forester_name || null,
                    forester_id: treeData.forester_id || null
                  };
                  
                  // Create tree_revisit document with reference and old data
                  await setDoc(doc(treeRevisitRef, treeId), {
                    tree_tagging_ref: originalTreeRef, // Reference to original tree document
                    old: oldData, // Old tree data
                    new: {
                      // Empty fields to be filled by foresters during revisit
                      height: null,
                      diameter: null,
                      specie: null,
                      tree_status: null,
                      volume: null,
                      photo_url: null,
                      qr_url: null,
                      updatedAt: null,
                      forester_name: null,
                      forester_id: null
                    },
                    treeId: treeId,
                    createdAt: serverTimestamp()
                  });
                  
                  console.log(`✅ Copied tree ${treeId} to revisit appointment`);
                }
                
                console.log(`✅ Successfully copied ${treeInventorySnap.size} tree(s) for revisit`);
              } else {
                console.warn("⚠️ No trees found in original appointment to copy");
              }
            } catch (copyError) {
              console.error("❌ Error copying tree inventory for revisit:", copyError);
              // Don't fail the entire appointment creation, just log the error
            }
          }
          
          // 🔹 For PLTP/SPLTP tree tagging, copy tree inventory from CTPO reference
          if (!isRevisit && ctpoReferenceId && (currentApplicationType === 'pltp' || currentApplicationType === 'splt')) {
            try {
              console.log("📋 Copying tree inventory data from CTPO reference:", ctpoReferenceId);
              
              // 🔹 PRIORITY 1: Check if there's a completed CTPO revisit appointment
              const ctpoRevisitQuery = query(
                collection(db, "appointments"),
                where("applicationID", "==", ctpoReferenceId),
                where("appointmentType", "==", "Revisit"),
                where("status", "==", "Completed")
              );
              const ctpoRevisitSnap = await getDocs(ctpoRevisitQuery);
              
              let sourceAppointmentId = null;
              let sourceCollection = null;
              let useRevisitData = false;
              
              if (!ctpoRevisitSnap.empty) {
                // Found completed revisit - use tree_revisit data
                sourceAppointmentId = ctpoRevisitSnap.docs[0].id;
                sourceCollection = "tree_revisit";
                useRevisitData = true;
                console.log("✅ Found completed CTPO revisit appointment:", sourceAppointmentId);
                console.log("📋 Will use tree_revisit data (most recent)");
              } else {
                // 🔹 PRIORITY 2: No completed revisit, use original tree tagging
                console.log("⚠️ No completed CTPO revisit found, checking tree tagging...");
                const ctpoAppointmentsQuery = query(
                  collection(db, "appointments"),
                  where("applicationID", "==", ctpoReferenceId),
                  where("appointmentType", "==", "Tree Tagging"),
                  where("status", "==", "Completed")
                );
                const ctpoAppointmentsSnap = await getDocs(ctpoAppointmentsQuery);
                
                if (!ctpoAppointmentsSnap.empty) {
                  sourceAppointmentId = ctpoAppointmentsSnap.docs[0].id;
                  sourceCollection = "tree_inventory";
                  useRevisitData = false;
                  console.log("✅ Found completed CTPO tree tagging appointment:", sourceAppointmentId);
                  console.log("📋 Will use tree_inventory data");
                }
              }
              
              if (sourceAppointmentId && sourceCollection) {
                // Get all trees from the source collection
                const sourceTreeRef = collection(db, "appointments", sourceAppointmentId, sourceCollection);
                const sourceTreeSnap = await getDocs(sourceTreeRef);
                
                if (!sourceTreeSnap.empty) {
                  console.log(`📊 Found ${sourceTreeSnap.size} tree(s) from CTPO ${sourceCollection} to copy`);
                  
                  // Create tree_inventory subcollection in the new PLTP/SPLTP appointment
                  const newTreeInventoryRef = collection(db, "appointments", newDocId, "tree_inventory");
                  
                  // Copy each tree's data as reference
                  for (const treeDoc of sourceTreeSnap.docs) {
                    const treeId = treeDoc.id;
                    const treeData = treeDoc.data();
                    
                    let ctpoData;
                    let ctpoTreeRef;
                    
                    if (useRevisitData) {
                      // Using revisit data - extract the "new" data (updated measurements)
                      ctpoData = {
                        height: treeData.new?.height || treeData.old?.height || null,
                        diameter: treeData.new?.diameter || treeData.old?.diameter || null,
                        specie: treeData.new?.specie || treeData.old?.specie || null,
                        latitude: treeData.old?.latitude || null, // Location doesn't change
                        longitude: treeData.old?.longitude || null,
                        photo_url: treeData.new?.photo_url || treeData.old?.photo_url || null,
                        qr_url: treeData.old?.qr_url || null, // QR doesn't change
                        tree_status: treeData.new?.tree_status || treeData.old?.tree_status || null,
                        volume: treeData.new?.volume || treeData.old?.volume || null,
                        tree_no: treeData.old?.tree_no || null, // Tree number doesn't change
                        forester_name: treeData.new?.forester_name || treeData.old?.forester_name || null,
                        forester_id: treeData.new?.forester_id || treeData.old?.forester_id || null
                      };
                      // Reference points to the revisit document
                      ctpoTreeRef = doc(db, "appointments", sourceAppointmentId, "tree_revisit", treeId);
                      console.log(`  📋 Using revisit data for tree ${treeId}`);
                    } else {
                      // Using original tree inventory data
                      ctpoData = {
                        height: treeData.height || null,
                        diameter: treeData.diameter || null,
                        specie: treeData.specie || null,
                        latitude: treeData.latitude || null,
                        longitude: treeData.longitude || null,
                        photo_url: treeData.photo_url || null,
                        qr_url: treeData.qr_url || null,
                        tree_status: treeData.tree_status || null,
                        volume: treeData.volume || null,
                        tree_no: treeData.tree_no || null,
                        forester_name: treeData.forester_name || null,
                        forester_id: treeData.forester_id || null
                      };
                      // Reference points to the original tree inventory document
                      ctpoTreeRef = doc(db, "appointments", sourceAppointmentId, "tree_inventory", treeId);
                      console.log(`  📋 Using tree inventory data for tree ${treeId}`);
                    }
                    
                    // Copy tree data as reference (foresters will verify/update)
                    await setDoc(doc(newTreeInventoryRef, treeId), {
                      ctpo_tree_ref: ctpoTreeRef, // Reference to CTPO tree document (inventory or revisit)
                      ctpo_data: ctpoData, // Store CTPO tree data for reference (most recent available)
                      source_type: useRevisitData ? 'revisit' : 'tree_tagging', // Track data source
                      // Empty fields for foresters to fill during PLTP/SPLTP verification
                      height: null,
                      diameter: null,
                      specie: null,
                      latitude: null,
                      longitude: null,
                      photo_url: null,
                      qr_url: null,
                      tree_status: null,
                      volume: null,
                      tree_no: null,
                      tree_id: treeId,
                      forester_name: null,
                      forester_id: null,
                      timestamp: serverTimestamp(),
                      appointment_id: newDocId
                    });
                    
                    console.log(`✅ Copied tree ${treeId} from CTPO ${sourceCollection} to ${currentApplicationType.toUpperCase()} appointment`);
                  }
                  
                  console.log(`✅ Successfully copied ${sourceTreeSnap.size} tree(s) from CTPO ${sourceCollection}`);
                } else {
                  console.warn(`⚠️ No trees found in CTPO ${sourceCollection} to copy`);
                }
              } else {
                console.warn("⚠️ No completed CTPO appointment found for reference:", ctpoReferenceId);
              }
            } catch (copyError) {
              console.error("❌ Error copying tree inventory from CTPO reference:", copyError);
              // Don't fail the entire appointment creation, just log the error
            }
          }

          alert(
            `✅ ${appointmentType.value} appointment "${newDocId}" assigned to ${selectedForesters.length} forester(s).${isRevisit ? '\n\n📋 Tree inventory data has been copied for revisit.' : ''}`
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