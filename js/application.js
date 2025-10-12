import { db, checkLogin, logout } from "./script.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setCurrentApplicant } from "./treeInventory.js";

checkLogin();
document.getElementById("logoutBtn").addEventListener("click", logout);

const applicantsContainer = document.getElementById("applicantsContainer");
const filesSection = document.getElementById("filesSection");
const filesBody = document.getElementById("filesBody");
const applicantTitle = document.getElementById("applicantTitle");

const scheduleContainer = document.getElementById("scheduleContainer");
const scheduleBtn = document.getElementById("scheduleBtn");
const scheduleModal = document.getElementById("scheduleModal");
const closeModal = document.getElementById("closeModal");
const saveAppointmentBtn = document.getElementById("saveAppointmentBtn");
const appointmentDate = document.getElementById("appointmentDate");
const appointmentTime = document.getElementById("appointmentTime");

let currentOpenUserId = null; // track which user's files are shown

// ------------------ Load Applicants ------------------
async function loadApplicants() {
  applicantsContainer.innerHTML = "<p>Loading applicants...</p>";

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = usersSnapshot.docs;

    // Fetch each user's ctpo_uploads in parallel
    const userPromises = users.map(async (userDoc) => {
      const uploadsSnap = await getDocs(collection(db, `users/${userDoc.id}/ctpo_uploads`));
      return { userDoc, uploadsSnap };
    });

    const results = await Promise.all(userPromises);
    applicantsContainer.innerHTML = "";

    let hasApplicants = false;

    results.forEach(({ userDoc, uploadsSnap }) => {
      if (!uploadsSnap.empty) {
        hasApplicants = true;
        const userData = userDoc.data();

        // Create folder for applicant
        const folderDiv = document.createElement("div");
        folderDiv.className = "applicant-folder";
        folderDiv.innerHTML = `
          <div class="folder-icon">📁</div>
          <div class="applicant-name">${escapeHtml(userData.name || "Unnamed Applicant")}</div>
        `;

        folderDiv.addEventListener("click", () => {
          if (currentOpenUserId === userDoc.id) hideFiles();
          else showApplicantFiles(userDoc.id, userData.name, userData);
        });

        applicantsContainer.appendChild(folderDiv);
      }
    });

    if (!hasApplicants) {
      applicantsContainer.innerHTML = "<p>No applicants have submitted files yet.</p>";
    }

  } catch (err) {
    console.error("Error loading applicants:", err);
    applicantsContainer.innerHTML = "<p style='color:red'>Error loading applicants.</p>";
  }
}

// ------------------ Show / Hide Files ------------------
function hideFiles() {
  filesSection.style.display = "none";
  filesBody.innerHTML = "";
  applicantTitle.textContent = "";
  currentOpenUserId = null;
  scheduleContainer.style.display = "none";
}

async function showApplicantFiles(userId, userName, userData = {}) {
  if (currentOpenUserId && currentOpenUserId !== userId) hideFiles();

  filesBody.innerHTML = "<tr><td colspan='5'>Loading files...</td></tr>";
  filesSection.style.display = "block";
  scheduleContainer.style.display = "flex"; // show schedule button
  applicantTitle.textContent = `📂 Files of ${userName || "Applicant"}`;
  currentOpenUserId = userId;

  // Set current applicant info for Tree Inventory
  setCurrentApplicant(userId, userData);

  try {
    const uploadsSnapshot = await getDocs(collection(db, `users/${userId}/ctpo_uploads`));
    filesBody.innerHTML = "";

    if (uploadsSnapshot.empty) {
      filesBody.innerHTML = "<tr><td colspan='5' style='text-align:center'>No files found.</td></tr>";
      return;
    }

    uploadsSnapshot.forEach((fileDoc) => {
      const data = fileDoc.data() || {};
      const label = data.Label ?? data.label ?? "-";
      const fileName = data.FileName ?? data.fileName ?? "Unknown";
      let uploadedAt = "-";
      if (data.uploadedAt && typeof data.uploadedAt.toDate === "function") {
        uploadedAt = data.uploadedAt.toDate().toLocaleString();
      } else if (data.uploadedAt) {
        uploadedAt = String(data.uploadedAt);
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(label)}</td>
        <td>${escapeHtml(fileName)}</td>
        <td>${escapeHtml(uploadedAt)}</td>
        <td>
          <button class="action-btn view-btn" data-url="${escapeHtml(data.url ?? "#")}">View</button>
        </td>
      `;

      const viewBtn = tr.querySelector(".view-btn");
      viewBtn.addEventListener("click", () => {
        const url = viewBtn.dataset.url;
        if (url && url !== "#") window.open(url, "_blank");
        else alert("No file URL available.");
      });

      filesBody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error loading user files:", err);
    filesBody.innerHTML = "<tr><td colspan='5' style='color:red;text-align:center'>Error loading files.</td></tr>";
  }
}

// ------------------ Escape HTML ------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ------------------ Schedule Walk-in Modal ------------------
scheduleBtn.addEventListener("click", () => {
  if (!currentOpenUserId) return alert("Select an applicant first.");
  scheduleModal.style.display = "block";
});

// Close modal
closeModal.addEventListener("click", () => {
  scheduleModal.style.display = "none";
});
window.addEventListener("click", (event) => {
  if (event.target === scheduleModal) scheduleModal.style.display = "none";
});

// Save appointment
saveAppointmentBtn.addEventListener("click", async () => {
  if (!currentOpenUserId) return alert("No applicant selected.");
  const date = appointmentDate.value;
  const time = appointmentTime.value;

  if (!date || !time) return alert("Please select both date and time.");

  try {
    await updateDoc(doc(db, "users", currentOpenUserId), {
      walkInAppointment: {
        date: date,
        time: time,
        scheduledBy: "Admin",
      },
    });
    alert(`✅ Walk-in appointment scheduled on ${date} at ${time}`);
    scheduleModal.style.display = "none";
  } catch (err) {
    console.error("Error scheduling appointment:", err);
    alert("Failed to schedule appointment.");
  }
});

// ------------------ Load applicants on page load ------------------
loadApplicants();
