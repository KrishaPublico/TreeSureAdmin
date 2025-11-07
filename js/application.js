import { db, checkLogin, logout } from "./script.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setCurrentApplicant } from "./treeInventory.js";

// ------------------ INITIALIZATION ------------------
checkLogin();
document.getElementById("logoutBtn").addEventListener("click", logout);

const applicantsContainer = document.getElementById("applicantsContainer");
const filesSection = document.getElementById("filesSection");
const filesBody = document.getElementById("filesBody");
const applicantTitle = document.getElementById("applicantTitle");
const applicationTypeTitle = document.getElementById("applicationTypeTitle");

const scheduleContainer = document.getElementById("scheduleContainer");
const scheduleBtn = document.getElementById("scheduleBtn");
const scheduleModal = document.getElementById("scheduleModal");
const closeModal = document.getElementById("closeModal");
const saveAppointmentBtn = document.getElementById("saveAppointmentBtn");
const appointmentDate = document.getElementById("appointmentDate");
const appointmentTime = document.getElementById("appointmentTime");

// Cutting Forester Assignment Elements
const assignCuttingForesterBtn = document.getElementById(
  "assignCuttingForesterBtn"
);
const proceedBtn = document.getElementById("proceedBtn");
const cuttingForesterModal = document.getElementById("cuttingForesterModal");
const closeCuttingForesterModal = document.getElementById(
  "closeCuttingForesterModal"
);
const cuttingFormStep = document.getElementById("cuttingFormStep");
const cuttingReviewStep = document.getElementById("cuttingReviewStep");
const cuttingApplicantName = document.getElementById("cuttingApplicantName");
const cuttingPermitType = document.getElementById("cuttingPermitType");
const cuttingLocation = document.getElementById("cuttingLocation");
const cuttingRemarks = document.getElementById("cuttingRemarks");
const cuttingForesterMultiSelect = document.getElementById(
  "cuttingForesterMultiSelect"
);
const reviewCuttingBtn = document.getElementById("reviewCuttingBtn");
const cuttingBackToEditBtn = document.getElementById("cuttingBackToEditBtn");
const confirmCuttingBtn = document.getElementById("confirmCuttingBtn");
const cuttingReviewApplicant = document.getElementById(
  "cuttingReviewApplicant"
);
const cuttingReviewPermitType = document.getElementById(
  "cuttingReviewPermitType"
);
const cuttingReviewLocation = document.getElementById("cuttingReviewLocation");
const cuttingReviewRemarks = document.getElementById("cuttingReviewRemarks");
const cuttingReviewForesters = document.getElementById(
  "cuttingReviewForesters"
);

let currentOpenUserId = null;
let currentApplicationType = null;
let currentApplicantData = null;

// ------------------ HELPER ------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Load foresters for assignment
async function loadForesters(selectElement) {
  selectElement.innerHTML = "";
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
    selectElement.appendChild(opt);
  });
}

// ------------------ FILE URL RESOLVER ------------------
// Tries to get the storage URL of a specific upload for an applicant.
// Priority:
// 1) uploads map inside applications/{type}/applicants/{id} (current structure)
// 2) uploads subcollection applications/{type}/applicants/{id}/uploads/{docLabel} (fallback if you migrate later)
async function getUploadUrl(appType, applicantId, docLabel, searchMode = "auto") {
  try {
    const tryMap = async () => {
      const applicantRef = doc(db, "applications", appType, "applicants", applicantId);
      const snap = await getDoc(applicantRef);
      if (!snap.exists()) return null;
      const data = snap.data() || {};
      const uploads = data.uploads || {};
      const entry = uploads[docLabel];
      const url = entry?.url || entry?.URL || entry?.Url; // be lenient with casing
      return url || null;
    };

    const trySubcollection = async () => {
      const uploadDocRef = doc(db, "applications", appType, "applicants", applicantId, "uploads", docLabel);
      const upSnap = await getDoc(uploadDocRef);
      if (!upSnap.exists()) return null;
      const u = upSnap.data() || {};
      return u.url || u.URL || u.Url || null;
    };

    let url = null;
    if (searchMode === "auto" || searchMode === "map") {
      url = await tryMap();
      if (url) {
        console.log("✅ URL resolved from applicant uploads map:", url);
        return url;
      }
      if (searchMode === "map") return null;
    }

    if (searchMode === "auto" || searchMode === "subcollection") {
      url = await trySubcollection();
      if (url) {
        console.log("✅ URL resolved from uploads subcollection:", url);
        return url;
      }
    }

    console.warn("⚠️ No URL found for", { appType, applicantId, docLabel });
    return null;
  } catch (e) {
    console.error("❌ Error resolving upload URL:", e);
    return null;
  }
}

// ------------------ UNIFIED UPLOADS LOADER ------------------
// Reads uploads from the applicant doc's uploads map first.
// If empty, falls back to the uploads subcollection and returns a normalized object.
async function loadUnifiedUploads(appType, applicantId) {
  try {
    const applicantRef = doc(db, "applications", appType, "applicants", applicantId);
    const applicantSnap = await getDoc(applicantRef);
    let fromMap = {};
    if (applicantSnap.exists()) {
      const data = applicantSnap.data() || {};
      fromMap = data.uploads || {};
    }

    const mapKeys = Object.keys(fromMap);
    if (mapKeys.length > 0) {
      console.log("📥 Using uploads from map (count):", mapKeys.length);
      return { uploads: fromMap, source: "map" };
    }

    // Fallback: check subcollection
    const uploadsColRef = collection(db, "applications", appType, "applicants", applicantId, "uploads");
    const subSnap = await getDocs(uploadsColRef);

    if (subSnap.empty) {
      console.warn("⚠️ No uploads found in map or subcollection for:", { appType, applicantId });
      return { uploads: {}, source: "none" };
    }

    const normalized = {};
    subSnap.forEach((d) => {
      const u = d.data() || {};
      const key = d.id; // subcollection doc id
      normalized[key] = {
        title: u.title || key,
        fileName: u.fileName || u.name || "Unknown",
        uploadedAt: u.uploadedAt || u.createdAt || u.timestamp || null,
        url: u.url || u.URL || u.Url || null,
        ...u,
      };
    });
    console.log("📥 Using uploads from subcollection (count):", Object.keys(normalized).length);
    return { uploads: normalized, source: "subcollection" };
  } catch (e) {
    console.error("❌ Error loading unified uploads:", e);
    return { uploads: {}, source: "error" };
  }
}

// ------------------ LOAD APPLICATION STATS ------------------
async function loadApplicationStats() {
  const appsRef = collection(db, "applications");
  const snapshot = await getDocs(appsRef);

  const stats = {};
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    stats[docSnap.id] = {
      uploadedCount: data.uploadedCount || 0,
      lastUpdated: data.lastUpdated?.toDate
        ? data.lastUpdated.toDate().toLocaleString()
        : "N/A",
    };
  });

  console.log("📊 Application Stats:", stats);
  renderDashboardStats(stats);
}

// ------------------ RENDER DASHBOARD STATS ------------------
function renderDashboardStats(stats) {
  const dashboard = document.getElementById("dashboardStats");
  if (!dashboard) return;

  dashboard.innerHTML = `
    <h2>📈 Application Overview</h2>
    <table class="stats-table">
      <thead>
        <tr>
          <th>Application Type</th>
          <th>Uploaded Count</th>
          <th>Last Updated</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(stats)
          .map(
            ([type, data]) => `
          <tr>
            <td>${type.toUpperCase()}</td>
            <td>${data.uploadedCount}</td>
            <td>${data.lastUpdated}</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// ------------------ LOAD APPLICANTS ------------------
async function loadApplicants(type = "ctpo") {
  applicationTypeTitle.style.display = "block";
  applicantsContainer.style.display = "flex";
  applicantsContainer.style.flexWrap = "wrap";
  applicantsContainer.style.justifyContent = "flex-start";
  filesSection.style.display = "none";
  scheduleContainer.style.display = "none";

  currentApplicationType = type;
  localStorage.setItem("lastApplicationType", type);
  applicationTypeTitle.textContent = `${type.toUpperCase()} Applications`;

  applicantsContainer.innerHTML = `<div style="width:100%; text-align:center;"><span class="spinner"></span> Loading ${type.toUpperCase()} applicants...</div>`;

  try {
    const appDoc = doc(db, "applications", type);
    const applicantsSnap = await getDocs(collection(appDoc, "applicants"));

    applicantsContainer.innerHTML = "";

    if (applicantsSnap.empty) {
      applicantsContainer.innerHTML = `<p style="width:100%; text-align:center;">No ${type.toUpperCase()} applicants yet.</p>`;
      return;
    }

    applicantsSnap.forEach((applicantDoc) => {
      const applicantData = applicantDoc.data();

      const folderDiv = document.createElement("div");
      folderDiv.className = "applicant-folder";
      folderDiv.innerHTML = `
        <div class="folder-icon">📁</div>
        <div class="applicant-name">${escapeHtml(
          applicantData.applicantName || "Unnamed Applicant"
        )}</div>
      `;

      folderDiv.addEventListener("click", () => {
        if (currentOpenUserId === applicantDoc.id) hideFiles();
        else
          showApplicantFiles(
            applicantDoc.id,
            applicantData.applicantName,
            applicantData,
            type
          );
      });

      applicantsContainer.appendChild(folderDiv);
    });
  } catch (err) {
    console.error("Error loading applicants:", err);
    applicantsContainer.innerHTML = `<p style='color:red; width:100%; text-align:center;'>Error loading applicants.</p>`;
  }
}

// ------------------ SHOW / HIDE FILES ------------------
function hideFiles() {
  filesSection.style.display = "none";
  filesBody.innerHTML = "";
  applicantTitle.textContent = "";
  scheduleContainer.style.display = "none";
  currentOpenUserId = null;
  appointmentDate.value = "";
  appointmentTime.value = "";
}

async function showApplicantFiles(
  userId,
  userName,
  userData = {},
  type = "ctpo"
) {
  if (currentOpenUserId && currentOpenUserId !== userId) hideFiles();

  filesBody.innerHTML = `<tr><td colspan="5" style="text-align:center;"><span class="spinner"></span> Loading files...</td></tr>`;
  filesSection.style.display = "block";
  scheduleContainer.style.display = "flex";
  applicantTitle.textContent = `📂 Files of ${userName || "Applicant"}`;
  currentOpenUserId = userId;
  currentApplicationType = type;
  currentApplicantData = userData;

  // Show appropriate buttons based on application type
  if (type === "ctpo") {
    // CTPO: Show tree tagging/inventory button
    proceedBtn.style.display = "block";
    assignCuttingForesterBtn.style.display = "none";
  } else if (type === "pltp" || type === "splt" || type === "ptc" || type === "permitCut") {
    // Cutting permits: Show cutting forester assignment button
    proceedBtn.style.display = "none";
    assignCuttingForesterBtn.style.display = "block";
  } else {
    // Other types: hide both
    proceedBtn.style.display = "none";
    assignCuttingForesterBtn.style.display = "none";
  }

  setCurrentApplicant(userId, userData);

  try {
    console.log("🔍 Fetching applicant from:", `applications/${type}/applicants/${userId}`);
    // Read uploads from map first, then fallback to uploads subcollection
    const { uploads, source } = await loadUnifiedUploads(type, userId);
    filesBody.innerHTML = "";

    console.log("� Uploads source:", source);
    console.log("📁 Uploads object:", uploads);
    console.log("📁 Number of files:", Object.keys(uploads).length);

    if (Object.keys(uploads).length === 0) {
      console.warn("⚠️ No files in uploads object");
      filesBody.innerHTML =
        "<tr><td colspan='5' style='text-align:center'>No files found.</td></tr>";
      return;
    }

    // Display each upload as a table row
    Object.entries(uploads).forEach(([docId, docData]) => {
      const title = docData.title || docId;
      const fileName = docData.fileName || "Unknown";
      let uploadedAt = docData.uploadedAt?.toDate
        ? docData.uploadedAt.toDate().toLocaleString()
        : docData.uploadedAt ?? "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(title)}</td>
        <td>${escapeHtml(fileName)}</td>
        <td>${escapeHtml(uploadedAt)}</td>
        <td><button class="action-btn view-btn" data-url="${escapeHtml(
          docData.url ?? "#"
        )}" data-docid="${escapeHtml(docId)}" data-title="${escapeHtml(title)}">View</button></td>
      `;

      tr.querySelector(".view-btn").addEventListener("click", async () => {
        const btn = tr.querySelector(".view-btn");
        let url = btn.dataset.url;
        const docIdAttr = btn.dataset.docid; // key id
        const docTitleAttr = btn.dataset.title; // human title

        if (!url || url === "#") {
          console.log("ℹ️ No URL on row, resolving via Firestore for:", { docId: docIdAttr, title: docTitleAttr });
          // Try with doc id first
          url = await getUploadUrl(currentApplicationType, currentOpenUserId, docIdAttr, "auto");
          // If not found and title differs, try with title as key
          if (!url && docTitleAttr && docTitleAttr !== docIdAttr) {
            url = await getUploadUrl(currentApplicationType, currentOpenUserId, docTitleAttr, "auto");
          }
          if (!url) {
            alert("No file URL available for this document.");
            return;
          }
          // cache it on the button for subsequent clicks
          btn.dataset.url = url;
        }

        const modal = document.getElementById("filePreviewModal");
        const iframe = document.getElementById("filePreviewFrame");
        const link = document.getElementById("downloadLink");

        const encodedUrl = encodeURIComponent(url);
        const viewerUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;

        iframe.src = viewerUrl;
        link.href = url;
        modal.style.display = "flex";
      });

      const filePreviewModal = document.getElementById("filePreviewModal");
      const closeFilePreview = document.getElementById("closeFilePreview");

      closeFilePreview.addEventListener("click", () => {
        filePreviewModal.style.display = "none";
        document.getElementById("filePreviewFrame").src = "";
      });

      window.addEventListener("click", (e) => {
        if (e.target === filePreviewModal) {
          filePreviewModal.style.display = "none";
          document.getElementById("filePreviewFrame").src = "";
        }
      });

      filesBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error loading applicant files:", err);
    filesBody.innerHTML =
      "<tr><td colspan='5' style='color:red;text-align:center'>Error loading files.</td></tr>";
  }
}

// ------------------ SCHEDULE MODAL ------------------
scheduleBtn?.addEventListener("click", () => {
  if (!currentOpenUserId) return alert("Select an applicant first.");
  scheduleModal.style.display = "block";
});
closeModal?.addEventListener(
  "click",
  () => (scheduleModal.style.display = "none")
);
window.addEventListener("click", (event) => {
  if (event.target === scheduleModal) scheduleModal.style.display = "none";
});

// ------------------ APPLICATION TYPE BUTTONS ------------------
const ctpoBtn = document.getElementById("ctpoBtn");
const pltpBtn = document.getElementById("pltpBtn");
// HTML uses id="spltpBtn" (SPLTP) so select that element
const spltpBtn = document.getElementById("spltpBtn");
const permitCutBtn = document.getElementById("permitCutBtn");
const chainsawBtn = document.getElementById("chainsawBtn");

function handleAppButtonClick(type, title) {
  applicationTypeTitle.textContent = title;
  loadApplicants(type);
}

ctpoBtn?.addEventListener("click", () =>
  handleAppButtonClick("ctpo", "CTPO Applications")
);
pltpBtn?.addEventListener("click", () =>
  handleAppButtonClick("pltp", "PLTP Applications")
);
spltpBtn?.addEventListener("click", () =>
  handleAppButtonClick("splt", "SPLT Applications")
);
permitCutBtn?.addEventListener("click", () =>
  handleAppButtonClick("ptc", "Permit to Cut Applications")
);
chainsawBtn?.addEventListener("click", () =>
  handleAppButtonClick("chainsaw", "Chainsaw Permit Applications")
);

// ------------------ INITIAL PAGE LOAD ------------------
window.addEventListener("DOMContentLoaded", async () => {
  await loadApplicationStats(); // load summary stats first
});

// ------------------ WALK-IN APPOINTMENT HANDLER ------------------
saveAppointmentBtn?.addEventListener("click", async () => {
  try {
    if (!currentOpenUserId) {
      alert("⚠️ Please select an applicant first.");
      return;
    }

    // get applicant info that was set by setCurrentApplicant
    const applicantData = JSON.parse(
      localStorage.getItem("currentApplicantData") || "{}"
    );
    const applicantName =
      applicantData.applicantName || applicantData.name || "Unnamed Applicant";

    const walkInPurpose =
      document.getElementById("walkInPurpose")?.value.trim() || "";
    const walkInRemarks =
      document.getElementById("walkInAppointmentRemarks")?.value.trim() || "";

    if (!walkInPurpose) {
      alert("⚠️ Please fill in the purpose of the visit.");
      return;
    }

    const adminId = "admin001"; // TODO: replace with actual logged-in admin id/email

    // Create appointment in Firestore
    await addDoc(collection(db, "appointments"), {
      adminId,
      applicantId: currentOpenUserId,
      applicantName,
      appointmentType: "Walk-in Submission",
      purpose: walkInPurpose,
      location: "Municipal DENR Office",
      remarks: walkInRemarks,
      status: "Pending",
      foresterId: null,
      treeIds: [],
      createdAt: serverTimestamp(),
      completedAt: null,
    });

    alert(`✅ Walk-in appointment for ${applicantName} recorded successfully!`);
    scheduleModal.style.display = "none";

    // Clear modal inputs
    document.getElementById("walkInPurpose").value = "";
    document.getElementById("walkInAppointmentRemarks").value = "";
  } catch (err) {
    console.error("❌ Error saving walk-in appointment:", err);
    alert("Failed to record appointment: " + err.message);
  }
});

// ------------------ COMMENT MODAL ------------------
const commentBtn = document.getElementById("commentBtn");
const commentModal = document.getElementById("commentModal");
const closeCommentModal = document.getElementById("closeCommentModal");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const commentDocumentSelect = document.getElementById("commentDocumentSelect");

commentBtn.addEventListener("click", async () => {
  if (!currentOpenUserId) {
    alert("Please select an applicant first before commenting.");
    return;
  }
  
  // Populate the document dropdown with uploaded files
  await populateCommentDocuments();
  commentModal.style.display = "flex";
});

// Populate document dropdown in comment modal
async function populateCommentDocuments() {
  commentDocumentSelect.innerHTML = "";
  
  try {
    // Read uploads using unified loader (map first then subcollection)
    console.log("🔍 Fetching documents for comments from:", `applications/${currentApplicationType}/applicants/${currentOpenUserId}`);
    const { uploads, source } = await loadUnifiedUploads(currentApplicationType, currentOpenUserId);
    console.log("📄 Uploads for comments (source=", source, "):", uploads);

    if (Object.keys(uploads).length === 0) {
      console.warn("⚠️ No documents found");
      const opt = document.createElement("option");
      opt.textContent = "No documents uploaded";
      opt.disabled = true;
      commentDocumentSelect.appendChild(opt);
      return;
    }

    // Populate dropdown with uploaded documents
    Object.entries(uploads).forEach(([docId, docData]) => {
      const fileName = docData.fileName || "Unknown";
      const title = docData.title || docId;
      
      const opt = document.createElement("option");
      opt.value = docId; // Use the document ID as value (e.g., "Letter of Application")
      opt.textContent = `${title} - ${fileName}`;
      commentDocumentSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading documents for comment:", err);
    const opt = document.createElement("option");
    opt.textContent = "Error loading documents";
    opt.disabled = true;
    commentDocumentSelect.appendChild(opt);
  }
}

closeCommentModal.addEventListener("click", () => {
  commentModal.style.display = "none";
});

sendCommentBtn.addEventListener("click", async () => {
  const message = document.getElementById("commentMessage").value.trim();
  const selectedDocs = Array.from(commentDocumentSelect.selectedOptions).map(
    (opt) => opt.value
  );

  if (!message) {
    alert("Please enter your comment before sending.");
    return;
  }

  if (selectedDocs.length === 0) {
    alert("⚠️ Please select at least one document to comment on.");
    return;
  }

  if (!currentOpenUserId || !currentApplicationType) {
    alert("⚠️ No applicant or application type selected.");
    return;
  }

  try {
    // Get admin identity for attribution
    const auth = getAuth();
    const adminEmail = auth.currentUser?.email || "Admin";
    
    console.log(`💬 Saving comments for ${currentApplicationType.toUpperCase()} application`);

    // For each selected document, create/update a comment and enable reupload flag
    // ALWAYS write to the applicant document's uploads map (this is what Flutter reads)
    for (const docId of selectedDocs) {
      const applicantRef = doc(
        db,
        "applications",
        currentApplicationType,
        "applicants",
        currentOpenUserId
      );

      // Structure matches Flutter app expectations:
      // applications/{type}/applicants/{id} with uploads map containing comments
      await setDoc(
        applicantRef,
        {
          uploads: {
            [docId]: {
              reuploadAllowed: true,
              lastCommentAt: serverTimestamp(),
              comments: {
                [docId]: {
                  message,
                  from: adminEmail,
                  createdAt: serverTimestamp(),
                }
              }
            }
          }
        },
        { merge: true }
      );
      console.log(`✅ Comment saved to ${currentApplicationType}/applicants/${currentOpenUserId}/uploads/${docId}`);
    }

    const docCount = selectedDocs.length;
    alert(
      `✅ Comment sent to ${docCount} document${docCount > 1 ? "s" : ""} in ${currentApplicationType.toUpperCase()}!\n\nThe applicant can now re-upload the selected document${docCount > 1 ? "s" : ""}.`
    );
    
    document.getElementById("commentMessage").value = "";
    commentDocumentSelect.selectedIndex = -1;
    commentModal.style.display = "none";
    
    // Refresh the files table to show updated state
    await showApplicantFiles(
      currentOpenUserId,
      currentApplicantData.applicantName,
      currentApplicantData,
      currentApplicationType
    );
  } catch (err) {
    console.error("❌ Error sending comment:", err);
    alert("Failed to send comment: " + err.message);
  }
});

// ==================== CUTTING FORESTER ASSIGNMENT ====================

// Close modal
if (closeCuttingForesterModal) {
  closeCuttingForesterModal.addEventListener("click", () => {
    cuttingForesterModal.style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  if (e.target === cuttingForesterModal)
    cuttingForesterModal.style.display = "none";
});

// Open cutting forester assignment modal
if (assignCuttingForesterBtn) {
  assignCuttingForesterBtn.addEventListener("click", async () => {
    if (!currentOpenUserId) return alert("⚠️ Select an applicant first.");

    const userRef = doc(db, "users", currentOpenUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return alert("Applicant not found.");
    const applicantData = userSnap.data();

    cuttingApplicantName.value = applicantData.name || "";

    // Set permit type based on application type
    const permitTypeMap = {
      pltp: "PLTP (Private Land Timber Permit)",
      splt: "SPLTP (Special Land Timber Permit)",
      permitCut: "Permit to Cut",
    };
    cuttingPermitType.textContent =
      permitTypeMap[currentApplicationType] ||
      currentApplicationType.toUpperCase();

    await loadForesters(cuttingForesterMultiSelect);

    cuttingForesterModal.style.display = "block";
    cuttingFormStep.style.display = "block";
    cuttingReviewStep.style.display = "none";

    // Reset form
    cuttingLocation.value = "";
    cuttingRemarks.value = "";
    cuttingForesterMultiSelect.selectedIndex = -1;
  });
}

// Review cutting assignment
if (reviewCuttingBtn) {
  reviewCuttingBtn.addEventListener("click", () => {
    const selectedForesters = Array.from(
      cuttingForesterMultiSelect.selectedOptions
    );

    if (selectedForesters.length === 0)
      return alert("⚠️ Please select at least one forester.");
    if (!cuttingLocation.value.trim()) {
      alert("⚠️ Please fill in the location.");
      return;
    }

    // Populate review details
    cuttingReviewApplicant.textContent = cuttingApplicantName.value;
    cuttingReviewPermitType.textContent = cuttingPermitType.textContent;
    cuttingReviewLocation.textContent = cuttingLocation.value;
    cuttingReviewRemarks.textContent = cuttingRemarks.value || "None";
    cuttingReviewForesters.innerHTML = selectedForesters
      .map((f) => f.textContent)
      .join(", ");

    // Switch view
    cuttingFormStep.style.display = "none";
    cuttingReviewStep.style.display = "block";
  });
}

// Back to edit
if (cuttingBackToEditBtn) {
  cuttingBackToEditBtn.addEventListener("click", () => {
    cuttingFormStep.style.display = "block";
    cuttingReviewStep.style.display = "none";
  });
}

// Confirm and save cutting assignment
if (confirmCuttingBtn) {
  confirmCuttingBtn.addEventListener("click", async () => {
    const selectedForesters = Array.from(
      cuttingForesterMultiSelect.selectedOptions
    ).map((opt) => opt.value);

    if (selectedForesters.length === 0)
      return alert("⚠️ Please select at least one forester.");

    try {
      // Get admin info from script.js
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const adminId = currentUser?.email || "admin";

      // Fetch all existing cutting appointments
      const snapshot = await getDocs(collection(db, "appointments"));
      const existingDocs = snapshot.docs
        .filter((docSnap) => docSnap.id.startsWith("cutting_appointment_"))
        .map((docSnap) => docSnap.id);

      // Determine the next available index
      let maxIndex = 0;
      existingDocs.forEach((id) => {
        const num = parseInt(id.replace("cutting_appointment_", ""));
        if (!isNaN(num) && num > maxIndex) {
          maxIndex = num;
        }
      });

      const nextIndex = String(maxIndex + 1).padStart(2, "0");
      const newDocId = `cutting_appointment_${nextIndex}`;

      // Create the new cutting appointment document
      await setDoc(doc(db, "appointments", newDocId), {
        adminId,
        applicantId: currentOpenUserId,
        applicantName: cuttingApplicantName.value,
        appointmentType: "Cutting Assignment",
        permitType: cuttingPermitType.textContent,
        location: cuttingLocation.value.trim(),
        status: "Pending",
        treeIds: [],
        remarks: cuttingRemarks.value || "",
        createdAt: serverTimestamp(),
        completedAt: null,
        foresterIds: selectedForesters, // multiple foresters
      });

      alert(
        `✅ Cutting assignment "${newDocId}" assigned to ${selectedForesters.length} forester(s).`
      );
      cuttingForesterModal.style.display = "none";

      // Reset form
      cuttingLocation.value = "";
      cuttingRemarks.value = "";
      cuttingForesterMultiSelect.selectedIndex = -1;
    } catch (err) {
      console.error("❌ Error creating cutting assignment:", err);
      alert("Failed to create assignment: " + err.message);
    }
  });
}
