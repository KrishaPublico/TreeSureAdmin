import { db, checkLogin, logout } from "./script.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const totalTaggedEl = document.getElementById("totalTaggedTrees");
const speciesCountEl = document.getElementById("speciesCount");
const avgTreesEl = document.getElementById("avgTreesPerForester");
const totalForester = document.getElementById("totalForester");
const totalApplicants = document.getElementById("totalApplicants");
const totalApplicationsEl = document.getElementById("totalApplications");
const pendingApplicationsEl = document.getElementById("pendingApplications");
const approvedApplicationsEl = document.getElementById("approvedApplications");
const applicationsThisMonthEl = document.getElementById("applicationsThisMonth");
const treesTaggedThisMonthEl = document.getElementById("treesTaggedThisMonth");
const activeAppointmentsEl = document.getElementById("activeAppointments");
const completedAppointmentsEl = document.getElementById("completedAppointments");
const avgTreesPerForesterEl = document.getElementById("avgTreesPerForester");

// Application type counts
const ctpoCountEl = document.getElementById("ctpoCount");
const pltpCountEl = document.getElementById("pltpCount");
const spltCountEl = document.getElementById("spltCount");
const ptcCountEl = document.getElementById("ptcCount");
const chainsawCountEl = document.getElementById("chainsawCount");

// Monthly comparison
const applicationsLastMonthEl = document.getElementById("applicationsLastMonth");
const applicationGrowthEl = document.getElementById("applicationGrowth");

// Top performers
const topForesterEl = document.getElementById("topForester");
const topForesterCountEl = document.getElementById("topForesterCount");
const topSpeciesEl = document.getElementById("topSpecies");
const topSpeciesCountEl = document.getElementById("topSpeciesCount");
const topLocationEl = document.getElementById("topLocation");
const topLocationCountEl = document.getElementById("topLocationCount");

const speciesFilter = document.getElementById("speciesFilter");
const foresterFilter = document.getElementById("foresterFilter");
const locationFilter = document.getElementById("locationFilter");

checkLogin();
document.getElementById("logoutBtn")?.addEventListener("click", logout);

const usersRef = collection(db, "users");
const applicationsRef = collection(db, "applications");
const appointmentsRef = collection(db, "appointments");
const inventoryCache = {};
let allTrees = [];
let allApplications = [];
let allAppointments = [];
let map, markersLayer;
let statusChartInstance, appointmentTypeChartInstance;
let speciesChartInstance, foresterChartInstance, trendChartInstance;

// 🔹 Approximate coordinates for municipalities in Cagayan
const municipalityCoords = {
  aparri: [18.36, 121.64],
  camalanuigan: [18.27, 121.67],
  buguey: [18.29, 121.83],
  "sta teresita": [18.25, 121.88],
  gonzaga: [18.27, 122.01],
  "sta ana": [18.46, 122.13],
  lallo: [18.2, 121.67],
  gattaran: [18.1, 121.63],
  lasam: [18.06, 121.6],
  allacapan: [18.23, 121.54],
};

const APPLICATION_LABELS = {
  ctpo: "CTPO",
  pltp: "PLTP",
  splt: "SPLT",
  spltp: "SPLT",
  ptc: "Permit to Cut",
  permitcut: "Permit to Cut",
  "permit-to-cut": "Permit to Cut",
  permitcutting: "Permit to Cut",
  permitcutpermit: "Permit to Cut",
  chainsaw: "Chainsaw",
  chainsawregistration: "Chainsaw",
  "chainsaw registration": "Chainsaw",
  chainsawpermit: "Chainsaw",
  "chainsaw permit": "Chainsaw",
  chainsawpermits: "Chainsaw",
  ctt: "CTT",
};

const DASHBOARD_COUNTER_KEYS = [
  "CTPO",
  "PLTP",
  "SPLT",
  "Permit to Cut",
  "Chainsaw",
];

let userDirectory = new Map();

function normalizeApplicationType(rawType) {
  if (!rawType) return "OTHER";
  const key = rawType.toString().trim().toLowerCase();
  return APPLICATION_LABELS[key] || rawType.toString().toUpperCase();
}

function toTitleCase(value) {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseTimestamp(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate();
    } catch (err) {
      console.warn("⚠️ Failed to parse Firestore timestamp", err);
    }
  }
  if (typeof value === "number") {
    return new Date(value);
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.seconds === "number"
  ) {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
  }
  return null;
}

function formatStatus(value) {
  if (!value) return "Pending";
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return "Pending";
  if (normalized.includes("approve")) return "Approved";
  if (normalized.includes("deny") || normalized.includes("reject")) return "Denied";
  if (normalized.includes("review")) return "Under Review";
  if (normalized.includes("complete")) return "Completed";
  if (normalized.includes("active")) return "Active";
  if (normalized.includes("schedule")) return "Scheduled";
  if (normalized.includes("pending")) return "Pending";
  return toTitleCase(value);
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferMunicipality(treeData = {}, ownerData = {}) {
  const direct = treeData.municipality || treeData.cityMunicipality || treeData.municipalityName;
  if (direct) return toTitleCase(direct);

  const searchSpace = [
    treeData.location,
    treeData.address,
    treeData.barangay,
    ownerData.address,
    ownerData.municipality,
    ownerData.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (searchSpace) {
    for (const key of Object.keys(municipalityCoords)) {
      if (searchSpace.includes(key)) {
        return toTitleCase(key);
      }
    }
  }
  return "Unspecified";
}

function normalizeTreeRecord(treeData, ownerData = {}, ownerId) {
  if (!treeData) return null;
  const municipality = inferMunicipality(treeData, ownerData);
  const latitude = toNumber(treeData.latitude ?? treeData.lat ?? treeData.location?.lat);
  const longitude = toNumber(treeData.longitude ?? treeData.lng ?? treeData.location?.lng);
  const dateTagged =
    parseTimestamp(treeData.date_tagged) ||
    parseTimestamp(treeData.dateTagged) ||
    parseTimestamp(treeData.taggedAt) ||
    parseTimestamp(treeData.timestamp) ||
    parseTimestamp(treeData.createdAt);

  const species = treeData.specie || treeData.species || treeData.treeSpecies || "Unknown";
  const foresterName =
    treeData.forester_name ||
    treeData.foresterName ||
    treeData.inventoriedBy ||
    ownerData.name ||
    "Unknown Forester";

  return {
    id: treeData.id,
    tree_no: treeData.tree_no || treeData.treeId || treeData.tree_id || treeData.id,
    specie: species,
    species,
    municipality,
    barangay:
      treeData.barangay ||
      treeData.barangayName ||
      treeData.locationBarangay ||
      ownerData.barangay ||
      "",
    latitude,
    longitude,
    diameter: treeData.diameter || treeData.dbh || null,
    height: treeData.height || treeData.treeHeight || null,
    volume: treeData.volume || null,
    foresterName,
    ownerId,
    ownerName: ownerData.name || treeData.applicantName || "Unknown Owner",
    date_tagged: dateTagged,
    raw: treeData,
  };
}

function normalizeTreeFromAppointment(treeData, treeId, appointmentId, appointmentData = {}) {
  if (!treeData) return null;
  const foresterId =
    treeData.forester_id ||
    treeData.foresterId ||
    (Array.isArray(appointmentData.foresterIds)
      ? appointmentData.foresterIds[0]
      : null);
  const foresterInfo = foresterId ? userDirectory.get(foresterId) : null;
  const applicantInfo = appointmentData.applicantId
    ? userDirectory.get(appointmentData.applicantId)
    : null;

  const municipality = inferMunicipality(treeData, applicantInfo || {});
  const latitude = toNumber(treeData.latitude ?? treeData.lat ?? treeData.location?.lat);
  const longitude = toNumber(treeData.longitude ?? treeData.lng ?? treeData.location?.lng);
  const dateTagged =
    parseTimestamp(treeData.timestamp) ||
    parseTimestamp(treeData.date_tagged) ||
    parseTimestamp(treeData.dateTagged) ||
    parseTimestamp(treeData.createdAt) ||
    parseTimestamp(appointmentData.createdAt);

  const species = treeData.specie || treeData.species || treeData.treeSpecies || "Unknown";
  const foresterName =
    treeData.forester_name ||
    treeData.foresterName ||
    foresterInfo?.name ||
    "Unknown Forester";

  return {
    id: treeId,
    appointmentId,
    tree_no: treeData.tree_no || treeData.tree_id || treeId,
    specie: species,
    species,
    municipality,
    barangay: treeData.barangay || appointmentData.barangay || "",
    latitude,
    longitude,
    diameter: treeData.diameter || treeData.dbh || null,
    height: treeData.height || null,
    volume: treeData.volume || null,
    foresterName,
    ownerId: appointmentData.applicantId || null,
    ownerName: applicantInfo?.name || treeData.applicantName || "Unknown Owner",
    date_tagged: dateTagged,
    raw: treeData,
  };
}

// ---------- Initialize Map ----------
function initMap() {
  map = L.map("treeMap").setView([18.3, 121.7], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  markersLayer = L.featureGroup().addTo(map);
}

// ---------- Fetch User Trees ----------
async function fetchUserTrees(userId) {
  if (inventoryCache[userId]) return inventoryCache[userId];
  const inventoryRef = collection(db, `users/${userId}/tree_inventory`);
  const snapshot = await getDocs(inventoryRef);
  const trees = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  inventoryCache[userId] = trees;
  return trees;
}

// ---------- Load Applications Data ----------
async function loadApplicationsData() {
  allApplications = [];

  const counts = {
    CTPO: 0,
    PLTP: 0,
    SPLT: 0,
    "Permit to Cut": 0,
    Chainsaw: 0,
  };

  const appDocsSnap = await getDocs(applicationsRef);

  for (const appDoc of appDocsSnap.docs) {
    const rawType = appDoc.id;
    const normalizedType = normalizeApplicationType(rawType);

    const applicantsRef = collection(
      db,
      `applications/${rawType}/applicants`
    );
    const applicantsSnap = await getDocs(applicantsRef);

    for (const applicantDoc of applicantsSnap.docs) {
      const data = applicantDoc.data();
      const createdAt =
        parseTimestamp(data.createdAt) ||
        parseTimestamp(data.submittedAt) ||
        parseTimestamp(data.submitted_at) ||
        parseTimestamp(data.uploadedAt) ||
        parseTimestamp(data.timestamp) ||
        parseTimestamp(data.dateSubmitted) ||
        parseTimestamp(data.appliedAt) ||
        parseTimestamp(data.created_date) ||
        null;

      const applicantName =
        data.applicantName ||
        data.name ||
        data.fullName ||
        data.ownerName ||
        "Unknown Applicant";

      const status = formatStatus(
        data.status ||
          data.applicationStatus ||
          data.reviewStatus ||
          data.progressStatus ||
          data.currentStatus ||
          data.state
      );

      allApplications.push({
        id: applicantDoc.id,
        type: normalizedType,
        rawType,
        status,
        createdAt: createdAt || new Date(),
        applicantName,
        data,
      });

      if (counts[normalizedType] !== undefined) {
        counts[normalizedType] += 1;
      }
    }
  }

  if (ctpoCountEl) ctpoCountEl.textContent = counts.CTPO.toString();
  if (pltpCountEl) pltpCountEl.textContent = counts.PLTP.toString();
  if (spltCountEl) spltCountEl.textContent = counts.SPLT.toString();
  if (ptcCountEl) ptcCountEl.textContent = counts["Permit to Cut"].toString();
  if (chainsawCountEl)
    chainsawCountEl.textContent = counts.Chainsaw.toString();
  if (totalApplicationsEl)
    totalApplicationsEl.textContent = allApplications.length.toString();

  const pendingCount = allApplications.filter((app) =>
    app.status.toLowerCase().includes("pending")
  ).length;
  const approvedCount = allApplications.filter((app) =>
    app.status.toLowerCase().includes("approved")
  ).length;

  if (pendingApplicationsEl)
    pendingApplicationsEl.textContent = pendingCount.toString();
  if (approvedApplicationsEl)
    approvedApplicationsEl.textContent = approvedCount.toString();
}

// ---------- Load Appointments Data ----------
async function loadAppointmentsData() {
  const snapshot = await getDocs(appointmentsRef);
  const appointmentDocs = snapshot.docs;

  allAppointments = appointmentDocs.map((doc) => {
    const data = doc.data();
    const createdAt =
      parseTimestamp(data.createdAt) ||
      parseTimestamp(data.timestamp) ||
      parseTimestamp(data.date) ||
      null;
    const scheduledAt =
      parseTimestamp(data.scheduledAt) ||
      parseTimestamp(data.schedule) ||
      parseTimestamp(data.appointmentDate) ||
      null;

    return {
      id: doc.id,
      appointmentType: data.appointmentType || data.type || "General",
      status: formatStatus(data.status || "Pending"),
      location: data.location || data.municipality || "Unspecified",
      createdAt,
      scheduledAt,
      applicantId: data.applicantId || null,
      foresterIds: data.foresterIds || data.foresterId || null,
      raw: data,
    };
  });

  const treePromises = appointmentDocs.map(async (doc) => {
    const appointmentData = doc.data();
    const treeRef = collection(db, `appointments/${doc.id}/tree_inventory`);
    const treeSnap = await getDocs(treeRef);

    return treeSnap.docs
      .map((treeDoc) =>
        normalizeTreeFromAppointment(
          treeDoc.data(),
          treeDoc.id,
          doc.id,
          appointmentData
        )
      )
      .filter(Boolean);
  });

  const appointmentTrees = await Promise.all(treePromises);
  return appointmentTrees.flat();
}

// ---------- Update Top Performers ----------
function updateTopPerformers(foresterMap, speciesMap, locationMap) {
  // Find top forester
  let topForesterName = 'N/A';
  let maxForesterCount = 0;
  for (const [name, count] of Object.entries(foresterMap)) {
    if (count > maxForesterCount) {
      maxForesterCount = count;
      topForesterName = name;
    }
  }
  topForesterEl.textContent = topForesterName;
  topForesterCountEl.textContent = `${maxForesterCount} trees tagged`;
  
  // Find top species
  let topSpeciesName = 'N/A';
  let maxSpeciesCount = 0;
  for (const [species, count] of Object.entries(speciesMap)) {
    if (count > maxSpeciesCount) {
      maxSpeciesCount = count;
      topSpeciesName = species;
    }
  }
  topSpeciesEl.textContent = topSpeciesName;
  topSpeciesCountEl.textContent = `${maxSpeciesCount} trees`;
  
  // Find top location
  let topLocationName = 'N/A';
  let maxLocationCount = 0;
  for (const [location, count] of Object.entries(locationMap)) {
    if (count > maxLocationCount) {
      maxLocationCount = count;
      topLocationName = location;
    }
  }
  topLocationEl.textContent = topLocationName;
  topLocationCountEl.textContent = `${maxLocationCount} trees`;
}

// ---------- Draw Status Chart ----------
function drawStatusChart() {
  // Destroy existing chart instance
  if (statusChartInstance) {
    statusChartInstance.destroy();
  }
  
  const statusMap = {};
  
  allApplications.forEach(app => {
    const status = app.status || 'Pending';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });
  
  const labels = Object.keys(statusMap);
  const data = Object.values(statusMap);
  
  const ctx = document.getElementById('statusChart');
  if (!ctx) {
    console.error('Status chart canvas not found');
    return;
  }
  
  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          'rgba(46, 204, 113, 0.8)',
          'rgba(52, 152, 219, 0.8)',
          'rgba(231, 76, 60, 0.8)',
          'rgba(241, 196, 15, 0.8)'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: false }
      }
    }
  });
}

// ---------- Draw Appointment Type Chart ----------
function drawAppointmentTypeChart() {
  // Destroy existing chart instance
  if (appointmentTypeChartInstance) {
    appointmentTypeChartInstance.destroy();
  }
  
  const typeMap = {};
  
  allAppointments.forEach(apt => {
    const type = apt.appointmentType || apt.type || 'General';
    typeMap[type] = (typeMap[type] || 0) + 1;
  });
  
  const labels = Object.keys(typeMap);
  const data = Object.values(typeMap);
  
  const ctx = document.getElementById('appointmentTypeChart');
  if (!ctx) {
    console.error('Appointment type chart canvas not found');
    return;
  }
  
  appointmentTypeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Appointments',
        data: data,
        backgroundColor: 'rgba(46, 204, 113, 0.7)',
        borderColor: 'rgba(46, 204, 113, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false },
        title: { display: false }
      }
    }
  });
}

// ---------- Load Stats ----------

async function loadTreeStats() {
  userDirectory = new Map();
  allTrees = [];

  let totalForestersCount = 0;
  let totalApplicantsCount = 0;

  const userSnapshot = await getDocs(usersRef);
  const treePromises = [];

  for (const userDoc of userSnapshot.docs) {
    const data = userDoc.data();
    userDirectory.set(userDoc.id, data);

    const role = data.role ? data.role.toString().trim().toLowerCase() : "";
    if (role === "forester") {
      totalForestersCount += 1;
      treePromises.push(
        fetchUserTrees(userDoc.id)
          .then((trees) =>
            trees
              .map((tree) =>
                normalizeTreeRecord(
                  { id: tree.id, ...tree },
                  data,
                  userDoc.id
                )
              )
              .filter(Boolean)
          )
          .catch((err) => {
            console.warn(`⚠️ Failed to load trees for ${userDoc.id}`, err);
            return [];
          })
      );
    } else if (role === "applicant") {
      totalApplicantsCount += 1;
    }
  }

  const foresterTrees = (await Promise.all(treePromises)).flat();
  allTrees.push(...foresterTrees);

  const appointmentTrees = await loadAppointmentsData();
  if (Array.isArray(appointmentTrees) && appointmentTrees.length) {
    allTrees.push(...appointmentTrees);
  }

  await loadApplicationsData();

  if (totalForester) totalForester.textContent = totalForestersCount.toString();
  if (totalApplicants)
    totalApplicants.textContent = totalApplicantsCount.toString();
  if (totalTaggedEl) totalTaggedEl.textContent = allTrees.length.toString();

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const treesThisMonth = allTrees.filter((tree) => {
    const taggedAt = parseTimestamp(
      tree.date_tagged || tree.taggedAt || tree.timestamp
    );
    return taggedAt && taggedAt >= thisMonth;
  });

  const treesLastMonth = allTrees.filter((tree) => {
    const taggedAt = parseTimestamp(
      tree.date_tagged || tree.taggedAt || tree.timestamp
    );
    return taggedAt && taggedAt >= lastMonth && taggedAt < thisMonth;
  });

  if (treesTaggedThisMonthEl)
    treesTaggedThisMonthEl.textContent = treesThisMonth.length.toString();

  const thisMonthTreesEl = document.getElementById("thisMonthTrees");
  const lastMonthTreesEl = document.getElementById("lastMonthTrees");
  const treeGrowthEl = document.getElementById("growthPercentage");

  if (thisMonthTreesEl)
    thisMonthTreesEl.textContent = treesThisMonth.length.toString();
  if (lastMonthTreesEl)
    lastMonthTreesEl.textContent = treesLastMonth.length.toString();
  if (treeGrowthEl) {
    const treeGrowth =
      treesLastMonth.length > 0
        ? (
            ((treesThisMonth.length - treesLastMonth.length) /
              treesLastMonth.length) *
            100
          ).toFixed(1)
        : "0";
    treeGrowthEl.textContent = `${treeGrowth}%`;
  }

  const appsThisMonth = allApplications.filter((app) => {
    const createdAt = parseTimestamp(app.createdAt);
    return createdAt && createdAt >= thisMonth;
  });

  const appsLastMonth = allApplications.filter((app) => {
    const createdAt = parseTimestamp(app.createdAt);
    return createdAt && createdAt >= lastMonth && createdAt < thisMonth;
  });

  if (applicationsThisMonthEl)
    applicationsThisMonthEl.textContent = appsThisMonth.length.toString();
  if (applicationsLastMonthEl)
    applicationsLastMonthEl.textContent = appsLastMonth.length.toString();
  if (applicationGrowthEl) {
    const growthPercent =
      appsLastMonth.length > 0
        ? (
            ((appsThisMonth.length - appsLastMonth.length) /
              appsLastMonth.length) *
            100
          ).toFixed(1)
        : "0";
    applicationGrowthEl.textContent = `${growthPercent}%`;
  }

  const activeAppts = allAppointments.filter((apt) => {
    const status = apt.status ? apt.status.toLowerCase() : "";
    return status === "active" || status === "scheduled";
  });
  const completedAppts = allAppointments.filter((apt) => {
    const status = apt.status ? apt.status.toLowerCase() : "";
    return status === "completed" || status === "done";
  });

  if (activeAppointmentsEl)
    activeAppointmentsEl.textContent = activeAppts.length.toString();
  if (completedAppointmentsEl)
    completedAppointmentsEl.textContent = completedAppts.length.toString();

  const avgTreesPerForester =
    totalForestersCount > 0
      ? (allTrees.length / totalForestersCount).toFixed(1)
      : "0";
  if (avgTreesPerForesterEl)
    avgTreesPerForesterEl.textContent = avgTreesPerForester;
  if (avgTreesEl) avgTreesEl.textContent = avgTreesPerForester;

  const speciesMap = {};
  const foresterMap = {};
  const locationMap = {};
  const trendMap = {};

  allTrees.forEach((tree) => {
    const species = tree.specie || tree.species || "Unknown";
    speciesMap[species] = (speciesMap[species] || 0) + 1;

    const foresterName = tree.foresterName || "Unknown Forester";
    foresterMap[foresterName] = (foresterMap[foresterName] || 0) + 1;

    const location = tree.municipality || tree.barangay || "Unspecified";
    locationMap[location] = (locationMap[location] || 0) + 1;

    const taggedAt = parseTimestamp(
      tree.date_tagged || tree.taggedAt || tree.timestamp
    );
    if (taggedAt) {
      const key = taggedAt.toISOString().split("T")[0];
      trendMap[key] = (trendMap[key] || 0) + 1;
    }
  });

  if (speciesCountEl)
    speciesCountEl.textContent = Object.keys(speciesMap).length.toString();

  updateTopPerformers(foresterMap, speciesMap, locationMap);
  drawSpeciesChart(Object.keys(speciesMap), Object.values(speciesMap));
  drawForesterChart(Object.keys(foresterMap), Object.values(foresterMap));
  drawStatusChart();
  drawAppointmentTypeChart();

  const sortedTrendKeys = Object.keys(trendMap).sort();
  const sortedTrendValues = sortedTrendKeys.map((key) => trendMap[key]);
  drawTrendChart(sortedTrendKeys, sortedTrendValues);

  populateFilterDropdowns(Object.keys(speciesMap), Object.keys(foresterMap));
  plotTreeLocations(allTrees);
  renderLocationStats(locationMap);
  updateRecentActivities();
}

// ---------- Populate Filters ----------
function populateFilterDropdowns(speciesList, foresterList) {
  speciesList.sort().forEach((sp) => {
    const opt = document.createElement("option");
    opt.value = sp;
    opt.textContent = sp;
    speciesFilter.appendChild(opt);
  });

  foresterList.sort().forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    foresterFilter.appendChild(opt);
  });

  Object.keys(municipalityCoords).forEach((mun) => {
    const opt = document.createElement("option");
    opt.value = mun;
    opt.textContent = mun.toUpperCase();
    locationFilter.appendChild(opt);
  });

  speciesFilter.addEventListener("change", applyMapFilters);
  foresterFilter.addEventListener("change", applyMapFilters);
  locationFilter.addEventListener("change", applyMapFilters);
}

// ---------- Apply Map Filters ----------
function applyMapFilters() {
  const selectedSpecies = speciesFilter.value;
  const selectedForester = foresterFilter.value;
  const selectedMunicipality = locationFilter.value.toLowerCase();

  let filtered = allTrees.filter((tree) => {
    const speciesMatch =
      selectedSpecies === "all" ||
      (tree.specie || tree.species) === selectedSpecies;
    const foresterMatch =
      selectedForester === "all" || tree.foresterName === selectedForester;
    return speciesMatch && foresterMatch;
  });

  if (
    selectedMunicipality !== "all" &&
    municipalityCoords[selectedMunicipality]
  ) {
    const [centerLat, centerLng] = municipalityCoords[selectedMunicipality];
    const radiusKm = 10;

    filtered = filtered.filter((tree) => {
      const lat = parseFloat(tree.latitude);
      const lng = parseFloat(tree.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;
      const distance = getDistanceFromLatLonInKm(
        centerLat,
        centerLng,
        lat,
        lng
      );
      return distance <= radiusKm;
    });

    plotTreeLocations(filtered);
    map.setView([centerLat, centerLng], 12);
  } else {
    plotTreeLocations(filtered);
    map.setView([18.3, 121.7], 9);
  }
}

// ---------- Helper: Calculate distance ----------
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// ---------- Plot Trees ----------
function plotTreeLocations(trees) {
  if (!map) {
    console.error('Map not initialized');
    initMap();
  }
  
  markersLayer.clearLayers();
  
  console.log(`Plotting ${trees.length} trees on the map`);

  let markersAdded = 0;
  trees.forEach((tree) => {
    const lat = parseFloat(tree.latitude);
    const lng = parseFloat(tree.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      const species = tree.specie || tree.species || "Unknown";
      const popup = `
        <b>${species}</b><br>
        🌳 Tree ID: ${tree.tree_no || tree.id}<br>
        👷 Forester: ${tree.foresterName || "Unknown"}<br>
        📍 Location: ${tree.barangay || tree.municipality || "N/A"}<br>
        📏 Diameter: ${tree.diameter || "N/A"} cm<br>
        📏 Height: ${tree.height || "N/A"} m
      `;
      L.marker([lat, lng]).bindPopup(popup).addTo(markersLayer);
      markersAdded++;
    }
  });
  
  console.log(`Successfully added ${markersAdded} markers to the map`);

  if (markersLayer.getLayers().length > 0) {
    map.fitBounds(markersLayer.getBounds(), { padding: [40, 40] });
  } else {
    console.warn('No markers were added to the map');
  }
}

// ---------- Charts ----------
function drawSpeciesChart(labels, values) {
  // Destroy existing chart instance
  if (speciesChartInstance) {
    speciesChartInstance.destroy();
  }
  
  const ctx = document.getElementById("speciesChart");
  if (!ctx) {
    console.error('Species chart canvas not found');
    return;
  }
  
  speciesChartInstance = new Chart(ctx, {
    type: "pie",
    data: { 
      labels, 
      datasets: [{ 
        data: values, 
        backgroundColor: [
          '#4caf50', '#81c784', '#66bb6a', '#43a047', '#2e7d32',
          '#1b5e20', '#a5d6a7', '#c8e6c9'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }] 
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'right' }
      }
    },
  });
}

function drawForesterChart(labels, values) {
  // Destroy existing chart instance
  if (foresterChartInstance) {
    foresterChartInstance.destroy();
  }
  
  const ctx = document.getElementById("applicantChart");
  if (!ctx) {
    console.error('Forester chart canvas not found');
    return;
  }
  
  foresterChartInstance = new Chart(ctx, {
    type: "bar",
    data: { 
      labels, 
      datasets: [{ 
        label: 'Trees Tagged',
        data: values, 
        backgroundColor: "#81c784",
        borderColor: '#4caf50',
        borderWidth: 1
      }] 
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      indexAxis: "y",
      scales: {
        x: { 
          beginAtZero: true,
          ticks: { stepSize: 5 }
        }
      }
    },
  });
}

function drawTrendChart(labels, values) {
  // Destroy existing chart instance
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }
  
  const ctx = document.getElementById("trendsChart");
  if (!ctx) {
    console.error('Trend chart canvas not found');
    return;
  }
  
  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Trees Tagged Over Time",
          data: values,
          borderColor: "#4caf50",
          backgroundColor: "rgba(76,175,80,0.2)",
          tension: 0.3,
          fill: true,
          pointBackgroundColor: "#4caf50",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
      ],
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 2 }
        }
      }
    },
  });
}

// ---------- Update Recent Activities ----------
function updateRecentActivities() {
  const activitiesList = document.getElementById('recentActivities');
  if (!activitiesList) return;
  
  activitiesList.innerHTML = '';
  
  // Combine all activities
  const activities = [];
  
  // Add recent applications
  allApplications.slice(0, 5).forEach(app => {
    const date = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
    activities.push({
      text: `New ${app.type} application from ${app.applicantName || 'Unknown'}`,
      date: date,
      type: 'application'
    });
  });
  
  // Add recent tree taggings
  const recentTrees = [...allTrees]
    .sort((a, b) => {
      const dateA = a.date_tagged instanceof Date ? a.date_tagged : new Date(a.date_tagged);
      const dateB = b.date_tagged instanceof Date ? b.date_tagged : new Date(b.date_tagged);
      return dateB - dateA;
    })
    .slice(0, 5);
    
  recentTrees.forEach(tree => {
    const date = tree.date_tagged instanceof Date ? tree.date_tagged : new Date(tree.date_tagged);
    activities.push({
      text: `${tree.specie} tree tagged by ${tree.foresterName} in ${tree.municipality}`,
      date: date,
      type: 'tree'
    });
  });
  
  // Sort by date and take top 10
  activities.sort((a, b) => b.date - a.date);
  const topActivities = activities.slice(0, 10);
  
  // Display activities
  if (topActivities.length === 0) {
    activitiesList.innerHTML = '<li>No recent activities</li>';
  } else {
    topActivities.forEach(activity => {
      const li = document.createElement('li');
      const timeAgo = getTimeAgo(activity.date);
      li.textContent = `${activity.text} - ${timeAgo}`;
      activitiesList.appendChild(li);
    });
  }
}

// ---------- Render Location Stats ----------
function renderLocationStats(locationMap) {
  // This function can be used to display location statistics
  // For now, the data is used in the top performers section
  console.log('Location Statistics:', locationMap);
}

// ---------- Helper: Time Ago ----------
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}


// ---------- Initialize ----------
document.addEventListener("DOMContentLoaded", async () => {
  initMap();
  await loadTreeStats();
});
