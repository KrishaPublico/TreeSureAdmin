import { db, checkLogin, logout } from "./script.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setCurrentApplicant } from "./treeInventory.js";

// ------------------ INITIALIZATION ------------------
checkLogin();

// ------------------ DOM ELEMENTS (Lazy-loaded) ------------------
let applicantsContainer, filesSection, filesBody, applicantTitle, applicationTypeTitle, applicationTypeHeader;
let scheduleContainer, scheduleBtn, scheduleModal, closeModal, saveAppointmentBtn;
let assignCuttingForesterBtn, proceedBtn;
let cuttingForesterModal, closeCuttingForesterModal, cuttingFormStep, cuttingReviewStep;
let cuttingApplicantName, cuttingPermitType, cuttingLocation, cuttingRemarks;
let cuttingForesterMultiSelect, reviewCuttingBtn, cuttingBackToEditBtn, confirmCuttingBtn;
let cuttingReviewApplicant, cuttingReviewPermitType, cuttingReviewLocation, cuttingReviewRemarks, cuttingReviewForesters;
let commentBtn, commentModal, closeCommentModal, sendCommentBtn, commentDocumentSelect;
let claimCertificateBtn, claimCertificateModal, closeClaimCertificateModal, sendClaimNotificationBtn;
let claimApplicantName, claimCertificateType, claimMessage, claimRemarks;
let manageTemplatesBtn, templateModal, closeTemplateModal, uploadTemplateFileBtn, templateFileInput;
let templateDocumentType, templateTitle, templateDescription, existingTemplatesList;

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

let pdfJsLoadingPromise = null;
async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (!pdfJsLoadingPromise) {
    pdfJsLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        try {
          const workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
          resolve(window.pdfjsLib);
        } catch (err) {
          pdfJsLoadingPromise = null;
          reject(err);
        }
      };
      script.onerror = (err) => {
        pdfJsLoadingPromise = null;
        reject(err);
      };
      document.head.appendChild(script);
    });
  }
  return pdfJsLoadingPromise;
}

// Display application-level templates at the top of the files table
async function displayApplicationTemplates(appType) {
  try {
    console.log("🔍 Fetching templates for application type:", appType);
    
    const templatesRef = collection(db, "applications", appType, "templates");
    const templatesSnap = await getDocs(templatesRef);
    
    if (templatesSnap.empty) {
      console.log("No templates found for", appType);
      return;
    }

    console.log(`📋 Found ${templatesSnap.size} template(s) for ${appType}`);

    // Add a header row for templates
    const headerRow = document.createElement("tr");
    headerRow.style.backgroundColor = "#f0f8e8";
    headerRow.innerHTML = `
      <td colspan="4" style="font-weight:bold; color:#2d5016; padding:10px; text-align:center;">
        📋 Available Templates (Download before uploading)
      </td>
    `;
    filesBody.appendChild(headerRow);

    // Display each template
    for (const templateDoc of templatesSnap.docs) {
      const templateData = templateDoc.data();
      const templateId = templateDoc.id;
      
      const documentType = templateData.documentType || templateId;
      const title = templateData.title || "Template";
      const description = templateData.description || "";
      const fileName = templateData.fileName || "Unknown";
      const url = templateData.url || "";
      
      if (!url || url.trim() === "") {
        console.log(`⏭️ Skipping template "${templateId}" - no URL`);
        continue;
      }

      const tr = document.createElement("tr");
      tr.style.backgroundColor = "#fafff5";
      tr.innerHTML = `
        <td>
          <strong>📄 ${escapeHtml(documentType)}</strong><br/>
          <small style="color:#666;">${escapeHtml(title)}</small>
          ${description ? `<br/><small style="color:#888; font-style:italic;">${escapeHtml(description)}</small>` : ''}
        </td>
        <td><span style="color:#2d5016;">📥 ${escapeHtml(fileName)}</span></td>
        <td><span style="color:#666;">Template</span></td>
        <td>
          <button class="action-btn-secondary template-download-btn" data-url="${escapeHtml(url)}" style="background:#2d5016; color:white;">
            📥 Download Template
          </button>
        </td>
      `;

      // Add download handler
      tr.querySelector(".template-download-btn").addEventListener("click", () => {
        const templateUrl = url;
        if (templateUrl && templateUrl.trim() !== "") {
          window.open(templateUrl, "_blank");
        } else {
          alert("Template URL not available.");
        }
      });

      filesBody.appendChild(tr);
    }

    // Add a separator row
    const separatorRow = document.createElement("tr");
    separatorRow.innerHTML = `
      <td colspan="4" style="border-top:2px solid #2d5016; padding:10px; text-align:center; font-weight:bold; color:#2d5016;">
        📤 Uploaded Documents
      </td>
    `;
    filesBody.appendChild(separatorRow);

  } catch (err) {
    console.error("❌ Error loading application templates:", err);
  }
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
async function getUploadUrl(
  appType,
  applicantId,
  docLabel,
  searchMode = "auto"
) {
  try {
    const tryMap = async () => {
      const applicantRef = doc(
        db,
        "applications",
        appType,
        "applicants",
        applicantId
      );
      const snap = await getDoc(applicantRef);
      if (!snap.exists()) return null;
      const data = snap.data() || {};
      const uploads = data.uploads || {};
      const entry = uploads[docLabel];
      const url = entry?.url || entry?.URL || entry?.Url; // be lenient with casing
      return url || null;
    };

    const trySubcollection = async () => {
      const uploadDocRef = doc(
        db,
        "applications",
        appType,
        "applicants",
        applicantId,
        "uploads",
        docLabel
      );
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
    const applicantRef = doc(
      db,
      "applications",
      appType,
      "applicants",
      applicantId
    );
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
    const uploadsColRef = collection(
      db,
      "applications",
      appType,
      "applicants",
      applicantId,
      "uploads"
    );
    const subSnap = await getDocs(uploadsColRef);

    if (subSnap.empty) {
      console.warn("⚠️ No uploads found in map or subcollection for:", {
        appType,
        applicantId,
      });
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
    console.log(
      "📥 Using uploads from subcollection (count):",
      Object.keys(normalized).length
    );
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
  applicationTypeHeader.style.display = "block";
  applicationTypeTitle.style.display = "inline-block";
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
  } else if (
    type === "pltp" ||
    type === "splt" ||
    type === "ptc" ||
    type === "permitCut"
  ) {
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
    console.log(
      "🔍 Fetching applicant from:",
      `applications/${type}/applicants/${userId}`
    );
    
    filesBody.innerHTML = "";

    // First, display available templates for this application type
    await displayApplicationTemplates(type);
    
    // Then fetch and display uploaded files from the subcollection
    const uploadsRef = collection(db, `applications/${type}/applicants/${userId}/uploads`);
    const uploadsSnap = await getDocs(uploadsRef);
    
    if (uploadsSnap.empty) {
      console.warn("⚠️ No uploads found in subcollection");
      const noFilesRow = document.createElement("tr");
      noFilesRow.innerHTML = "<td colspan='4' style='text-align:center; color:#888;'>No files have been uploaded yet.</td>";
      filesBody.appendChild(noFilesRow);
      return;
    }

    console.log(`📤 Found ${uploadsSnap.size} upload document(s) in subcollection`);

    // Display each uploaded file as a table row
    for (const uploadDoc of uploadsSnap.docs) {
      const docData = uploadDoc.data();
      const docId = uploadDoc.id;
      
      console.log(`📄 Upload document "${docId}":`, docData);
      
      const title = docData.title || docId;
      const fileName = docData.fileName || "Unknown";
      const url = docData.url || docData.URL || "";
      
      // Skip if no URL (placeholder)
      if (!url || url.trim() === "") {
        console.log(`⏭️ Skipping "${docId}" - no URL`);
        continue;
      }
      
      // Handle both Firestore Timestamp and string dates
      let uploadedAt = "-";
      if (docData.uploadedAt?.toDate) {
        uploadedAt = docData.uploadedAt.toDate().toLocaleString();
      } else if (typeof docData.uploadedAt === "string" && docData.uploadedAt.trim()) {
        uploadedAt = docData.uploadedAt;
      }

      const reuploadAllowed = docData.reuploadAllowed || false;
      
      // Check if there are comments in subcollection
      const hasComment = false; // We'll update this if needed

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(title)} ${hasComment ? '💬' : ''} ${reuploadAllowed ? '🔄' : ''}</td>
        <td>${escapeHtml(fileName)}</td>
        <td>${escapeHtml(uploadedAt)}</td>
        <td>
          <button class="action-btn view-btn" data-url="${escapeHtml(url)}" data-docid="${escapeHtml(docId)}" data-title="${escapeHtml(title)}">View</button>
        </td>
      `;

      // View button handler
      tr.querySelector(".view-btn").addEventListener("click", async () => {
        const btn = tr.querySelector(".view-btn");
        const fileUrl = btn.dataset.url;
        const docTitle = btn.dataset.title || "Document";

        if (!fileUrl || fileUrl === "#" || fileUrl.trim() === "") {
          alert("No file URL available for this document.");
          return;
        }

        const modal = document.getElementById("filePreviewModal");
        const iframe = document.getElementById("previewFrame");
        const titleEl = document.getElementById("previewTitle");
        const downloadBtn = document.getElementById("downloadFileBtn");

        if (!modal || !iframe || !titleEl) {
          window.open(fileUrl, "_blank");
          return;
        }

        titleEl.textContent = `File Preview - ${docTitle}`;
        
        // Hide download button to prevent downloads
        if (downloadBtn) {
          downloadBtn.style.display = "none";
        }

        const fileExt = fileUrl.split("?")[0].split(".").pop()?.toLowerCase();
        const isImage = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(fileExt);
        const isPdf = fileExt === "pdf";
        let viewerUrl = fileUrl;

        if (isImage) {
          // Images can be displayed directly
          viewerUrl = fileUrl;
        } else if (isPdf) {
          // Use Google Docs Viewer for PDFs to avoid download
          const encodedUrl = encodeURIComponent(fileUrl);
          viewerUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
        } else {
          // Use Google Docs Viewer for all other document types
          const encodedUrl = encodeURIComponent(fileUrl);
          viewerUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
        }

        iframe.src = viewerUrl;
        modal.style.display = "flex";
      });

      filesBody.appendChild(tr);
    }

    // Check if we actually added any rows
    if (filesBody.children.length === 0) {
      filesBody.innerHTML =
        "<tr><td colspan='5' style='text-align:center'>No files have been uploaded yet.</td></tr>";
    }

    // Set up file preview modal close handlers (only once)
    const filePreviewModal = document.getElementById("filePreviewModal");
    const closeFilePreview = document.getElementById("closeFilePreview");

    if (closeFilePreview && !closeFilePreview.dataset.listenerAttached) {
      const closePreviewModal = () => {
        filePreviewModal.style.display = "none";
        const iframe = document.getElementById("previewFrame");
        if (iframe) iframe.src = "";
        const downloadBtn = document.getElementById("downloadFileBtn");
        if (downloadBtn) {
          downloadBtn.href = "#";
          downloadBtn.style.display = "none";
        }
      };

      closeFilePreview.addEventListener("click", closePreviewModal);
      closeFilePreview.dataset.listenerAttached = "true";

      window.addEventListener("click", (e) => {
        if (e.target === filePreviewModal) {
          filePreviewModal.style.display = "none";
          const iframe = document.getElementById("previewFrame");
          if (iframe) iframe.src = "";
          const downloadBtn = document.getElementById("downloadFileBtn");
          if (downloadBtn) {
            downloadBtn.href = "#";
            downloadBtn.style.display = "none";
          }
        }
      });
    }

  } catch (err) {
    console.error("❌ Error loading applicant files:", err);
    filesBody.innerHTML =
      "<tr><td colspan='5' style='color:red;text-align:center'>Error loading files: " + err.message + "</td></tr>";
  }
}

// ------------------ APPLICATION TYPE BUTTONS (wait for sidebar) ------------------

// Function to attach listeners once sidebar is loaded
function attachSidebarListeners() {
  const ctpoBtn = document.getElementById("ctpoBtn");
  const pltpBtn = document.getElementById("pltpBtn");
  const spltpBtn = document.getElementById("spltpBtn");
  const permitCutBtn = document.getElementById("permitCutBtn");
  const cttBtn = document.getElementById("cttBtn");
  const chainsawBtn = document.getElementById("chainsawBtn");

  function handleAppButtonClick(type, title) {
    applicationTypeTitle.textContent = title;
    loadApplicants(type);
  }

  ctpoBtn?.addEventListener("click", () => {
    console.log("CTPO button clicked");
    handleAppButtonClick("ctpo", "CTPO Applications");
  });
  pltpBtn?.addEventListener("click", () => {
    console.log("PLTP button clicked");
    handleAppButtonClick("pltp", "PLTP Applications");
  });
  spltpBtn?.addEventListener("click", () => {
    console.log("SPLTP button clicked");
    handleAppButtonClick("splt", "SPLT Applications");
  });
  permitCutBtn?.addEventListener("click", () => {
    console.log("Permit to Cut button clicked");
    handleAppButtonClick("ptc", "Permit to Cut Applications");
  });
  cttBtn?.addEventListener("click", () => {
    console.log("CTT button clicked");
    handleAppButtonClick("ctt", "Certificate to Travel Applications");
  });
  chainsawBtn?.addEventListener("click", () => {
    console.log("Chainsaw button clicked");
    handleAppButtonClick("chainsaw", "Chainsaw Permit Applications");
  });

  console.log("✅ Sidebar event listeners attached successfully!");
  console.log("Found buttons:", { ctpoBtn, pltpBtn, spltpBtn, permitCutBtn, cttBtn, chainsawBtn });
}

// Wait for sidebar to be loaded dynamically in applications.html
document.addEventListener("sidebarLoaded", attachSidebarListeners);

// Expose for direct calls from pages that load the sidebar dynamically
window.attachSidebarListeners = attachSidebarListeners;
// Expose loadApplicants so it can be called from navigation
window.loadApplicants = loadApplicants;

// ------------------ INITIAL PAGE LOAD ------------------
window.addEventListener("DOMContentLoaded", async () => {
  await loadApplicationStats(); // load summary stats first
});

// ------------------ COMMENT MODAL ------------------
function initCommentModal() {
  commentBtn = document.getElementById("commentBtn");
  commentModal = document.getElementById("commentModal");
  closeCommentModal = document.getElementById("closeCommentModal");
  sendCommentBtn = document.getElementById("sendCommentBtn");
  commentDocumentSelect = document.getElementById("commentDocumentSelect");

  if (!commentBtn || !commentModal) return; // Elements not ready yet

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
    // Fetch uploads from subcollection (matching reports.js approach)
    console.log(
      "🔍 Fetching documents for comments from:",
      `applications/${currentApplicationType}/applicants/${currentOpenUserId}/uploads`
    );
    
    const uploadsRef = collection(db, `applications/${currentApplicationType}/applicants/${currentOpenUserId}/uploads`);
    const uploadsSnap = await getDocs(uploadsRef);
    
    if (uploadsSnap.empty) {
      console.warn("⚠️ No uploads found in subcollection");
      const opt = document.createElement("option");
      opt.textContent = "No documents uploaded";
      opt.disabled = true;
      commentDocumentSelect.appendChild(opt);
      return;
    }

    console.log(`📄 Found ${uploadsSnap.size} upload(s) for comments`);

    // Filter out uploads without URLs (placeholders)
    let hasValidUploads = false;
    
    uploadsSnap.forEach((uploadDoc) => {
      const docData = uploadDoc.data();
      const docId = uploadDoc.id;
      const url = docData.url || docData.URL || "";
      
      // Skip placeholders without URLs
      if (!url || url.trim() === "") {
        console.log(`⏭️ Skipping "${docId}" for comments - no URL`);
        return;
      }
      
      hasValidUploads = true;
      const fileName = docData.fileName || "Unknown";
      const title = docData.title || docId;

      const opt = document.createElement("option");
      opt.value = docId; // Use the document ID as value
      opt.textContent = `${title} - ${fileName}`;
      commentDocumentSelect.appendChild(opt);
    });

    if (!hasValidUploads) {
      console.warn("⚠️ No valid uploaded documents found");
      commentDocumentSelect.innerHTML = "";
      const opt = document.createElement("option");
      opt.textContent = "No documents uploaded";
      opt.disabled = true;
      commentDocumentSelect.appendChild(opt);
    }
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

    console.log(
      `💬 Saving comments for ${currentApplicationType.toUpperCase()} application`
    );

    // For each selected document, save comment to the comments subcollection
    for (const docId of selectedDocs) {
      // Update the upload document to set reuploadAllowed flag
      const uploadDocRef = doc(
        db,
        "applications",
        currentApplicationType,
        "applicants",
        currentOpenUserId,
        "uploads",
        docId
      );

      await setDoc(
        uploadDocRef,
        {
          reuploadAllowed: true,
          lastCommentAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Add comment to comments subcollection
      const commentsRef = collection(
        db,
        "applications",
        currentApplicationType,
        "applicants",
        currentOpenUserId,
        "uploads",
        docId,
        "comments"
      );

      await addDoc(commentsRef, {
        message,
        from: adminEmail,
        createdAt: serverTimestamp(),
      });

      console.log(
        `✅ Comment saved to ${currentApplicationType}/applicants/${currentOpenUserId}/uploads/${docId}/comments`
      );
    }

    const docCount = selectedDocs.length;
    alert(
      `✅ Comment sent to ${docCount} document${
        docCount > 1 ? "s" : ""
      } in ${currentApplicationType.toUpperCase()}!\n\nThe applicant can now re-upload the selected document${
        docCount > 1 ? "s" : ""
      }.`
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

closeCommentModal.addEventListener("click", () => {
  commentModal.style.display = "none";
});
}

// ==================== CUTTING FORESTER ASSIGNMENT ====================
function initCuttingForesterModal() {
  assignCuttingForesterBtn = document.getElementById("assignCuttingForesterBtn");
  proceedBtn = document.getElementById("proceedBtn");
  cuttingForesterModal = document.getElementById("cuttingForesterModal");
  closeCuttingForesterModal = document.getElementById("closeCuttingForesterModal");
  cuttingFormStep = document.getElementById("cuttingFormStep");
  cuttingReviewStep = document.getElementById("cuttingReviewStep");
  cuttingApplicantName = document.getElementById("cuttingApplicantName");
  cuttingPermitType = document.getElementById("cuttingPermitType");
  cuttingLocation = document.getElementById("cuttingLocation");
  cuttingRemarks = document.getElementById("cuttingRemarks");
  cuttingForesterMultiSelect = document.getElementById("cuttingForesterMultiSelect");
  reviewCuttingBtn = document.getElementById("reviewCuttingBtn");
  cuttingBackToEditBtn = document.getElementById("cuttingBackToEditBtn");
  confirmCuttingBtn = document.getElementById("confirmCuttingBtn");
  cuttingReviewApplicant = document.getElementById("cuttingReviewApplicant");
  cuttingReviewPermitType = document.getElementById("cuttingReviewPermitType");
  cuttingReviewLocation = document.getElementById("cuttingReviewLocation");
  cuttingReviewRemarks = document.getElementById("cuttingReviewRemarks");
  cuttingReviewForesters = document.getElementById("cuttingReviewForesters");

  if (!cuttingForesterModal) return; // Elements not ready yet

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

window.addEventListener("click", (e) => {
  if (e.target === cuttingForesterModal)
    cuttingForesterModal.style.display = "none";
});
}

// ==================== CLAIM CERTIFICATE MODAL ====================
function initClaimCertificateModal() {
  claimCertificateBtn = document.getElementById("claimCertificateBtn");
  claimCertificateModal = document.getElementById("claimCertificateModal");
  closeClaimCertificateModal = document.getElementById("closeClaimCertificateModal");
  sendClaimNotificationBtn = document.getElementById("sendClaimNotificationBtn");
  claimApplicantName = document.getElementById("claimApplicantName");
  claimCertificateType = document.getElementById("claimCertificateType");
  claimMessage = document.getElementById("claimMessage");
  claimRemarks = document.getElementById("claimRemarks");

  if (!claimCertificateModal) return; // Elements not ready yet

  // Close modal
  if (closeClaimCertificateModal) {
    closeClaimCertificateModal.addEventListener("click", () => {
      claimCertificateModal.style.display = "none";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === claimCertificateModal)
      claimCertificateModal.style.display = "none";
  });

  // Open claim certificate modal
  if (claimCertificateBtn) {
    claimCertificateBtn.addEventListener("click", async () => {
      if (!currentOpenUserId) return alert("⚠️ Select an applicant first.");
      if (!currentApplicationType) return alert("⚠️ No application type selected.");

      // Get applicant info
      claimApplicantName.value = currentApplicantData?.applicantName || 
                                  currentApplicantData?.name || 
                                  "Unnamed Applicant";

      // Set certificate type based on application type
      const certificateTypeMap = {
        ctpo: "Certificate of Tree Plantation Ownership (CTPO)",
        pltp: "Private Land Timber Permit (PLTP)",
        splt: "Special Land Timber Permit (SPLTP)",
        ptc: "Permit to Cut",
        ctt: "Certificate to Travel (CTT)",
        chainsaw: "Chainsaw Registration Certificate",
      };
      
      claimCertificateType.textContent =
        certificateTypeMap[currentApplicationType] ||
        currentApplicationType.toUpperCase() + " Certificate";

      // Reset form
      claimMessage.value = "Your certificate is now ready for pickup at the DENR Municipal Office in Aparri. Please bring a valid ID and your application reference number.";
      claimRemarks.value = "";

      claimCertificateModal.style.display = "block";
    });
  }

  // Send claim notification
  if (sendClaimNotificationBtn) {
    sendClaimNotificationBtn.addEventListener("click", async () => {
      const message = claimMessage.value.trim();
      const remarks = claimRemarks.value.trim();

      if (!message) {
        alert("⚠️ Please enter a message for the applicant.");
        return;
      }

      if (!currentOpenUserId || !currentApplicationType) {
        alert("⚠️ No applicant or application type selected.");
        return;
      }

      try {
        // Get admin identity
        const auth = getAuth();
        const adminEmail = auth.currentUser?.email || "Admin";

        console.log(
          `📜 Sending claim notification for ${currentApplicationType.toUpperCase()} certificate`
        );

        // Create notification with certificateType as document ID
        const notificationId = `${currentApplicationType}_${currentOpenUserId}`;
        
        await setDoc(doc(db, "notifications", notificationId), {
          recipientId: currentOpenUserId,
          recipientName: claimApplicantName.value,
          applicationType: currentApplicationType,
          certificateType: claimCertificateType.textContent,
          notificationType: "certificate_ready",
          title: "Certificate Ready for Claim",
          message: message,
          remarks: remarks || "",
          sentBy: adminEmail,
          status: "unread",
          createdAt: serverTimestamp(),
        });

        // Update the applicant's document to mark certificate as ready
        const applicantRef = doc(
          db,
          "applications",
          currentApplicationType,
          "applicants",
          currentOpenUserId
        );

        await setDoc(
          applicantRef,
          {
            certificateStatus: "ready_for_claim",
            certificateReadyAt: serverTimestamp(),
            notifiedBy: adminEmail,
          },
          { merge: true }
        );

        console.log(
          `✅ Claim notification sent to applicant ${currentOpenUserId}`
        );

        alert(
          `✅ Certificate claim notification sent successfully!\n\nApplicant: ${claimApplicantName.value}\nCertificate: ${claimCertificateType.textContent}`
        );

        claimCertificateModal.style.display = "none";

        // Reset form
        claimMessage.value = "Your certificate is now ready for pickup at the DENR Municipal Office in Aparri. Please bring a valid ID and your application reference number.";
        claimRemarks.value = "";
      } catch (err) {
        console.error("❌ Error sending claim notification:", err);
        alert("Failed to send notification: " + err.message);
      }
    });
  }
}

// ==================== TEMPLATE UPLOAD MODAL ====================
function initTemplateModal() {
  manageTemplatesBtn = document.getElementById("manageTemplatesBtn");
  templateModal = document.getElementById("templateModal");
  closeTemplateModal = document.getElementById("closeTemplateModal");
  uploadTemplateFileBtn = document.getElementById("uploadTemplateFileBtn");
  templateFileInput = document.getElementById("templateFileInput");
  templateDocumentType = document.getElementById("templateDocumentType");
  templateTitle = document.getElementById("templateTitle");
  templateDescription = document.getElementById("templateDescription");
  existingTemplatesList = document.getElementById("existingTemplatesList");

  if (!templateModal) return; // Elements not ready yet

  // Close modal
  if (closeTemplateModal) {
    closeTemplateModal.addEventListener("click", () => {
      templateModal.style.display = "none";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === templateModal)
      templateModal.style.display = "none";
  });

  // Open manage templates modal
  if (manageTemplatesBtn) {
    manageTemplatesBtn.addEventListener("click", async () => {
      if (!currentApplicationType) return alert("⚠️ No application type selected.");

      // Load existing templates
      await loadExistingTemplates(currentApplicationType);

      // Reset upload form
      templateDocumentType.value = "";
      templateTitle.value = "";
      templateDescription.value = "";
      templateFileInput.value = "";

      templateModal.style.display = "block";
    });
  }

  // Upload template file
  if (uploadTemplateFileBtn) {
    uploadTemplateFileBtn.addEventListener("click", async () => {
      const documentType = templateDocumentType.value.trim();
      const title = templateTitle.value.trim();
      const description = templateDescription.value.trim();
      const file = templateFileInput.files[0];

      if (!documentType) {
        alert("⚠️ Please enter a document type/label.");
        return;
      }

      if (!file) {
        alert("⚠️ Please select a template file to upload.");
        return;
      }

      if (!title) {
        alert("⚠️ Please enter a title for the template.");
        return;
      }

      try {
        // Import Firebase Storage functions
        const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = await import(
          "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"
        );

        const storage = getStorage();
        
        // Create a reference for the template file
        const templatePath = `applications/${currentApplicationType}/templates/${documentType}/${file.name}`;
        const fileRef = storageRef(storage, templatePath);

        console.log(`📤 Uploading template to: ${templatePath}`);

        // Upload the file
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        console.log(`✅ Template uploaded successfully: ${downloadURL}`);

        // Save template metadata to Firestore
        // Use documentType as the document ID for easy management
        const templateDocRef = doc(
          db,
          "applications",
          currentApplicationType,
          "templates",
          documentType
        );

        await setDoc(templateDocRef, {
          documentType: documentType,
          title: title,
          description: description,
          fileName: file.name,
          url: downloadURL,
          uploadedAt: serverTimestamp(),
          uploadedBy: getAuth().currentUser?.email || "Admin",
        });

        console.log(`✅ Template metadata saved to Firestore`);

        alert(
          `✅ Template uploaded successfully!\n\nDocument Type: ${documentType}\nFile: ${file.name}\n\nAll applicants can now download this template.`
        );

        // Reload existing templates
        await loadExistingTemplates(currentApplicationType);

        // Reset form
        templateDocumentType.value = "";
        templateTitle.value = "";
        templateDescription.value = "";
        templateFileInput.value = "";
      } catch (err) {
        console.error("❌ Error uploading template:", err);
        alert("Failed to upload template: " + err.message);
      }
    });
  }
}

// Load and display existing templates for the current application type
async function loadExistingTemplates(appType) {
  existingTemplatesList.innerHTML = "<p style='text-align:center; color:#888;'>Loading templates...</p>";

  try {
    const templatesRef = collection(db, "applications", appType, "templates");
    const templatesSnap = await getDocs(templatesRef);

    if (templatesSnap.empty) {
      existingTemplatesList.innerHTML = `
        <p style='text-align:center; color:#888; padding:20px;'>
          No templates uploaded yet for ${appType.toUpperCase()} applications.
        </p>
      `;
      return;
    }

    existingTemplatesList.innerHTML = "";

    for (const templateDoc of templatesSnap.docs) {
      const templateData = templateDoc.data();
      const templateId = templateDoc.id;

      const documentType = templateData.documentType || templateId;
      const title = templateData.title || "Template";
      const description = templateData.description || "";
      const fileName = templateData.fileName || "Unknown";
      const url = templateData.url || "";
      const uploadedBy = templateData.uploadedBy || "Unknown";
      
      let uploadedAt = "Unknown";
      if (templateData.uploadedAt?.toDate) {
        uploadedAt = templateData.uploadedAt.toDate().toLocaleString();
      }

      const templateCard = document.createElement("div");
      templateCard.style.cssText = "border:1px solid #ddd; padding:15px; margin:10px 0; border-radius:5px; background:#f9f9f9;";
      templateCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div style="flex:1;">
            <h4 style="margin:0 0 5px 0; color:#2d5016;">📄 ${escapeHtml(documentType)}</h4>
            <p style="margin:5px 0; font-weight:bold;">${escapeHtml(title)}</p>
            ${description ? `<p style="margin:5px 0; color:#666; font-size:0.9em;">${escapeHtml(description)}</p>` : ''}
            <p style="margin:5px 0; font-size:0.85em; color:#888;">
              File: ${escapeHtml(fileName)}<br/>
              Uploaded: ${escapeHtml(uploadedAt)}<br/>
              By: ${escapeHtml(uploadedBy)}
            </p>
          </div>
          <div style="display:flex; gap:10px; flex-direction:column;">
            <button class="action-btn-secondary view-template-btn" data-url="${escapeHtml(url)}" style="white-space:nowrap;">
              👁️ View
            </button>
            <button class="action-btn-secondary delete-template-btn" data-id="${escapeHtml(templateId)}" style="white-space:nowrap; background:#d32f2f; color:white;">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;

      // View template button
      templateCard.querySelector(".view-template-btn").addEventListener("click", () => {
        if (url && url.trim() !== "") {
          window.open(url, "_blank");
        } else {
          alert("Template URL not available.");
        }
      });

      // Delete template button
      templateCard.querySelector(".delete-template-btn").addEventListener("click", async () => {
        if (!confirm(`Are you sure you want to delete the template for "${documentType}"?\n\nThis action cannot be undone.`)) {
          return;
        }

        try {
          // Delete from Firestore
          const templateDocRef = doc(db, "applications", appType, "templates", templateId);
          await deleteDoc(templateDocRef);

          // Note: We're not deleting from Storage to avoid breaking links
          // Storage files can be cleaned up manually if needed

          alert(`✅ Template "${documentType}" deleted successfully.`);

          // Reload templates list
          await loadExistingTemplates(appType);
        } catch (err) {
          console.error("❌ Error deleting template:", err);
          alert("Failed to delete template: " + err.message);
        }
      });

      existingTemplatesList.appendChild(templateCard);
    }
  } catch (err) {
    console.error("❌ Error loading existing templates:", err);
    existingTemplatesList.innerHTML = `
      <p style='text-align:center; color:#d32f2f; padding:20px;'>
        Error loading templates: ${err.message}
      </p>
    `;
  }
}

// ------------------ INITIALIZE SCHEDULE MODAL ------------------
function initScheduleModal() {
  scheduleContainer = document.getElementById("scheduleContainer");
  scheduleBtn = document.getElementById("scheduleBtn");
  scheduleModal = document.getElementById("scheduleModal");
  closeModal = document.getElementById("closeModal");
  saveAppointmentBtn = document.getElementById("saveAppointmentBtn");

  if (!scheduleModal) return; // Elements not ready yet

  scheduleBtn?.addEventListener("click", () => {
    if (!currentOpenUserId) return alert("Select an applicant first.");
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    
    const walkInDateInput = document.getElementById("walkInDate");
    const walkInTimeInput = document.getElementById("walkInTime");
    
    if (walkInDateInput) {
      walkInDateInput.value = tomorrowStr;
      walkInDateInput.min = today; // Prevent selecting past dates
    }
    if (walkInTimeInput) walkInTimeInput.value = "09:00"; // Default to 9:00 AM
    
    scheduleModal.style.display = "block";
  });
  closeModal?.addEventListener(
    "click",
    () => (scheduleModal.style.display = "none")
  );
  window.addEventListener("click", (event) => {
    if (event.target === scheduleModal) scheduleModal.style.display = "none";
  });

  saveAppointmentBtn?.addEventListener("click", async () => {
    try {
      if (!currentOpenUserId) {
        alert("Select an applicant first.");
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
      const walkInDate =
        document.getElementById("walkInDate")?.value || "";
      const walkInTime =
        document.getElementById("walkInTime")?.value || "";
      const walkInRemarks =
        document.getElementById("walkInAppointmentRemarks")?.value.trim() || "";

      if (!walkInPurpose) {
        alert("Please enter a purpose for the appointment.");
        return;
      }

      if (!walkInDate) {
        alert("Please select an appointment date.");
        return;
      }

      if (!walkInTime) {
        alert("Please select an appointment time.");
        return;
      }

      // Combine date and time into a single timestamp
      const appointmentDateTime = new Date(`${walkInDate}T${walkInTime}`);
      
      // Validate that the appointment is not in the past
      const now = new Date();
      if (appointmentDateTime < now) {
        alert("⚠️ Appointment date and time cannot be in the past.");
        return;
      }

      const adminId = "admin001"; // TODO: replace with actual logged-in admin id/email

      // Fetch all existing walk-in appointments to determine the next index
      const snapshot = await getDocs(collection(db, "appointments"));
      const existingDocs = snapshot.docs
        .filter((docSnap) => docSnap.id.startsWith("walk_in_appointment_"))
        .map((docSnap) => docSnap.id);

      // Determine the next available index
      let maxIndex = 0;
      existingDocs.forEach((id) => {
        const num = parseInt(id.replace("walk_in_appointment_", ""));
        if (!isNaN(num) && num > maxIndex) {
          maxIndex = num;
        }
      });

      const nextIndex = String(maxIndex + 1).padStart(2, "0");
      const newDocId = `walk_in_appointment_${nextIndex}`;

      // Create appointment in Firestore with custom document ID
      await setDoc(doc(db, "appointments", newDocId), {
        adminId,
        applicantId: currentOpenUserId,
        applicantName,
        appointmentType: "Walk-in Appointment",
        purpose: walkInPurpose,
        scheduledDate: appointmentDateTime.toISOString().split('T')[0], // Store date separately
        scheduledTime: walkInTime, // Store time separately
        scheduledAt: appointmentDateTime, // Store complete timestamp
        location: "Aparri Municipal DENR Office",
        remarks: walkInRemarks,
        status: "Scheduled",
        treeIds: [],
        createdAt: serverTimestamp(),
      });

      alert(
        `✅ Walk-in appointment "${newDocId}" scheduled successfully!\n\n` +
        `Applicant: ${applicantName}\n` +
        `Date: ${appointmentDateTime.toLocaleDateString()}\n` +
        `Time: ${appointmentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
        `Purpose: ${walkInPurpose}`
      );
      scheduleModal.style.display = "none";

      // Clear modal inputs
      document.getElementById("walkInPurpose").value = "";
      document.getElementById("walkInDate").value = "";
      document.getElementById("walkInTime").value = "";
      document.getElementById("walkInAppointmentRemarks").value = "";
    } catch (err) {
      console.error("❌ Error saving walk-in appointment:", err);
      alert("Failed to record appointment: " + err.message);
    }
  });
}

// ------------------ MAIN INITIALIZATION ------------------
function initElements() {
  // Get main container elements
  applicantsContainer = document.getElementById("applicantsContainer");
  filesSection = document.getElementById("filesSection");
  filesBody = document.getElementById("filesBody");
  applicantTitle = document.getElementById("applicantTitle");
  applicationTypeTitle = document.getElementById("applicationTypeTitle");
  applicationTypeHeader = document.getElementById("applicationTypeHeader");

  // Initialize modal systems
  initScheduleModal();
  initCommentModal();
  initCuttingForesterModal();
  initClaimCertificateModal();
  initTemplateModal();

  // logoutBtn lives inside the dynamically-inserted sidebar
  const _logoutBtn = document.getElementById("logoutBtn");
  if (_logoutBtn) _logoutBtn.addEventListener("click", logout);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initElements);
} else {
  // DOM already loaded
  initElements();
}
