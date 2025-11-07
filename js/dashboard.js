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
  // 🔹 DUMMY DATA MODE - Comment out to use real Firebase data
  const USE_DUMMY_DATA = true;
  
  if (USE_DUMMY_DATA) {
    // Generate dummy applications
    const now = new Date();
    const statuses = ['Pending', 'Approved', 'Denied', 'Under Review'];
    const appTypes = ['CTPO', 'PLTP', 'SPLT', 'Permit to Cut', 'Chainsaw Registration'];
    
    allApplications = [];
    let ctpoCount = 0, pltpCount = 0, spltCount = 0, ptcCount = 0, chainsawCount = 0;
    
    // Generate 50 dummy applications
    for (let i = 0; i < 50; i++) {
      const type = appTypes[Math.floor(Math.random() * appTypes.length)];
      const daysAgo = Math.floor(Math.random() * 60);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      allApplications.push({
        id: `app_${i + 1}`,
        type: type,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: createdAt,
        applicantName: `Applicant ${i + 1}`
      });
      
      // Count by type
      if (type === 'CTPO') ctpoCount++;
      else if (type === 'PLTP') pltpCount++;
      else if (type === 'SPLT') spltCount++;
      else if (type === 'Permit to Cut') ptcCount++;
      else if (type === 'Chainsaw Registration') chainsawCount++;
    }
    
    // Update application type counts
    ctpoCountEl.textContent = ctpoCount.toString();
    pltpCountEl.textContent = pltpCount.toString();
    spltCountEl.textContent = spltCount.toString();
    ptcCountEl.textContent = ptcCount.toString();
    chainsawCountEl.textContent = chainsawCount.toString();
    
    // Update total applications
    totalApplicationsEl.textContent = allApplications.length.toString();
    
    // Update pending/approved counts
    const pendingCount = allApplications.filter(app => app.status === 'Pending').length;
    const approvedCount = allApplications.filter(app => app.status === 'Approved').length;
    pendingApplicationsEl.textContent = pendingCount.toString();
    approvedApplicationsEl.textContent = approvedCount.toString();
    
    return;
  }
  
  // REAL FIREBASE DATA (original code)
  allApplications = [];
  
  // Application types to fetch
  const appTypes = ['CTPO', 'PLTP', 'SPLT', 'Permit to Cut', 'Chainsaw Registration'];
  let ctpoCount = 0, pltpCount = 0, spltCount = 0, ptcCount = 0, chainsawCount = 0;
  
  for (const type of appTypes) {
    const typeRef = collection(db, 'applications', type, 'applicants');
    const snapshot = await getDocs(typeRef);
    
    snapshot.docs.forEach(doc => {
      const appData = { 
        id: doc.id, 
        type: type, 
        ...doc.data() 
      };
      allApplications.push(appData);
      
      // Count by type
      if (type === 'CTPO') ctpoCount++;
      else if (type === 'PLTP') pltpCount++;
      else if (type === 'SPLT') spltCount++;
      else if (type === 'Permit to Cut') ptcCount++;
      else if (type === 'Chainsaw Registration') chainsawCount++;
    });
  }
  
  // Update application type counts
  ctpoCountEl.textContent = ctpoCount.toString();
  pltpCountEl.textContent = pltpCount.toString();
  spltCountEl.textContent = spltCount.toString();
  ptcCountEl.textContent = ptcCount.toString();
  chainsawCountEl.textContent = chainsawCount.toString();
  
  // Update total applications
  totalApplicationsEl.textContent = allApplications.length.toString();
}

// ---------- Load Appointments Data ----------
async function loadAppointmentsData() {
  // 🔹 DUMMY DATA MODE - Comment out to use real Firebase data
  const USE_DUMMY_DATA = true;
  
  if (USE_DUMMY_DATA) {
    // Generate dummy appointments
    const appointmentTypes = ['Tree Inspection', 'Site Visit', 'Consultation', 'Permit Review', 'Field Assessment'];
    const statuses = ['active', 'scheduled', 'completed', 'done'];
    
    allAppointments = [];
    
    // Generate 30 dummy appointments
    for (let i = 0; i < 30; i++) {
      const isActive = Math.random() > 0.5;
      allAppointments.push({
        id: `apt_${i + 1}`,
        appointmentType: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
        status: isActive ? statuses[Math.floor(Math.random() * 2)] : statuses[2 + Math.floor(Math.random() * 2)],
        location: Object.keys(municipalityCoords)[Math.floor(Math.random() * Object.keys(municipalityCoords).length)],
        date: new Date()
      });
    }
    
    return;
  }
  
  // REAL FIREBASE DATA (original code)
  allAppointments = [];
  
  const snapshot = await getDocs(appointmentsRef);
  allAppointments = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
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
  // 🔹 DUMMY DATA MODE - Set to true for visualization
  const USE_DUMMY_DATA = true;
  
  if (USE_DUMMY_DATA) {
    // Generate dummy user counts
    const totalForestersCount = 15;
    const totalApplicantsCount = 45;
    
    // Generate dummy tree data
    const species = ['Narra', 'Mahogany', 'Acacia', 'Pine', 'Mango', 'Teak', 'Bamboo', 'Eucalyptus'];
    const foresters = ['Juan Dela Cruz', 'Maria Santos', 'Pedro Reyes', 'Ana Garcia', 'Jose Mendoza', 'Rosa Aquino'];
    const municipalities = Object.keys(municipalityCoords);
    
    allTrees = [];
    for (let i = 0; i < 120; i++) {
      const mun = municipalities[Math.floor(Math.random() * municipalities.length)];
      const coords = municipalityCoords[mun];
      const randomOffset = () => (Math.random() - 0.5) * 0.1;
      
      const daysAgo = Math.floor(Math.random() * 90);
      const taggedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      allTrees.push({
        id: `tree_${i + 1}`,
        tree_no: `TRS-2025-${String(i + 1).padStart(4, '0')}`,
        specie: species[Math.floor(Math.random() * species.length)],
        foresterName: foresters[Math.floor(Math.random() * foresters.length)],
        municipality: mun,
        barangay: `Barangay ${Math.floor(Math.random() * 20) + 1}`,
        latitude: coords[0] + randomOffset(),
        longitude: coords[1] + randomOffset(),
        date_tagged: taggedDate,
        height: (5 + Math.random() * 20).toFixed(1),
        diameter: (10 + Math.random() * 40).toFixed(1)
      });
    }
    
    // Update total counts
    totalForester.textContent = totalForestersCount.toString();
    totalApplicants.textContent = totalApplicantsCount.toString();
    totalTaggedEl.textContent = allTrees.length.toString();
    
    // Load applications and appointments with dummy data
    await loadApplicationsData();
    await loadAppointmentsData();
    
    // Calculate monthly metrics
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const appsThisMonth = allApplications.filter(app => {
      const createdAt = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
      return createdAt >= thisMonth;
    });
    
    const appsLastMonth = allApplications.filter(app => {
      const createdAt = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
      return createdAt >= lastMonth && createdAt < thisMonth;
    });
    
    applicationsThisMonthEl.textContent = appsThisMonth.length.toString();
    if (applicationsLastMonthEl) {
      applicationsLastMonthEl.textContent = appsLastMonth.length.toString();
    }
    
    const growthPercent = appsLastMonth.length > 0
      ? (((appsThisMonth.length - appsLastMonth.length) / appsLastMonth.length) * 100).toFixed(1)
      : "0";
    if (applicationGrowthEl) {
      applicationGrowthEl.textContent = `${growthPercent}%`;
    }
    
    // Filter appointments
    const activeAppts = allAppointments.filter(apt => 
      apt.status?.toLowerCase() === 'active' || apt.status?.toLowerCase() === 'scheduled'
    );
    const completedAppts = allAppointments.filter(apt => 
      apt.status?.toLowerCase() === 'completed' || apt.status?.toLowerCase() === 'done'
    );
    
    if (activeAppointmentsEl) activeAppointmentsEl.textContent = activeAppts.length.toString();
    if (completedAppointmentsEl) completedAppointmentsEl.textContent = completedAppts.length.toString();
    
    // Calculate trees tagged this month
    const treesThisMonth = allTrees.filter(tree => {
      const taggedDate = tree.date_tagged instanceof Date ? tree.date_tagged : new Date(tree.date_tagged);
      return taggedDate >= thisMonth;
    });
    if (treesTaggedThisMonthEl) treesTaggedThisMonthEl.textContent = treesThisMonth.length.toString();
    
    // Calculate monthly tree stats
    const treesLastMonth = allTrees.filter(tree => {
      const taggedDate = tree.date_tagged instanceof Date ? tree.date_tagged : new Date(tree.date_tagged);
      return taggedDate >= lastMonth && taggedDate < thisMonth;
    });
    
    const thisMonthEl = document.getElementById('thisMonthTrees');
    const lastMonthEl = document.getElementById('lastMonthTrees');
    const growthEl = document.getElementById('growthPercentage');
    
    if (thisMonthEl) thisMonthEl.textContent = treesThisMonth.length.toString();
    if (lastMonthEl) lastMonthEl.textContent = treesLastMonth.length.toString();
    
    const treeGrowth = treesLastMonth.length > 0
      ? (((treesThisMonth.length - treesLastMonth.length) / treesLastMonth.length) * 100).toFixed(1)
      : "0";
    if (growthEl) growthEl.textContent = `${treeGrowth}%`;
    
    // Average trees per forester
    const avgTreesPerForester = totalForestersCount > 0 
      ? (allTrees.length / totalForestersCount).toFixed(1) 
      : "0";
    if (avgTreesPerForesterEl) avgTreesPerForesterEl.textContent = avgTreesPerForester;
    
    // Compute stats
    const speciesMap = {};
    const foresterMap = {};
    const locationMap = {};
    const trendMap = {};
    
    allTrees.forEach((t) => {
      const species = t.specie || t.species || "Unknown";
      speciesMap[species] = (speciesMap[species] || 0) + 1;
      
      const f = t.foresterName || "Unknown Forester";
      foresterMap[f] = (foresterMap[f] || 0) + 1;
      
      const loc = t.municipality || t.barangay || "Unspecified";
      locationMap[loc] = (locationMap[loc] || 0) + 1;
      
      const taggedAt = t.date_tagged instanceof Date ? t.date_tagged : new Date(t.date_tagged);
      const key = taggedAt.toISOString().split("T")[0];
      trendMap[key] = (trendMap[key] || 0) + 1;
    });
    
    // Display core numbers
    speciesCountEl.textContent = Object.keys(speciesMap).length.toString();
    const avg = totalForestersCount > 0 ? (allTrees.length / totalForestersCount).toFixed(1) : "0";
    if (avgTreesEl) avgTreesEl.textContent = avg;
    
    // Update top performers
    updateTopPerformers(foresterMap, speciesMap, locationMap);
    
    // Draw charts
    drawSpeciesChart(Object.keys(speciesMap), Object.values(speciesMap));
    drawForesterChart(Object.keys(foresterMap), Object.values(foresterMap));
    drawStatusChart();
    drawAppointmentTypeChart();
    
    console.log('Charts drawn successfully');
    console.log('Species data:', Object.keys(speciesMap).length, 'species');
    console.log('Forester data:', Object.keys(foresterMap).length, 'foresters');
    console.log('Total applications:', allApplications.length);
    console.log('Total appointments:', allAppointments.length);
    
    // Sort trend data chronologically
    const sortedTrendKeys = Object.keys(trendMap).sort();
    const sortedTrendValues = sortedTrendKeys.map(key => trendMap[key]);
    drawTrendChart(sortedTrendKeys, sortedTrendValues);
    
    console.log('Trend chart drawn with', sortedTrendKeys.length, 'data points');
    
    // Populate filters and map
    populateFilterDropdowns(Object.keys(speciesMap), Object.keys(foresterMap));
    plotTreeLocations(allTrees);
    renderLocationStats(locationMap);
    
    // Update recent activities
    updateRecentActivities();
    
    console.log('Dashboard initialization complete!');
    
    return;
  }
  
  // REAL FIREBASE DATA (original code)
  let totalForestersCount = 0;
  let totalApplicantsCount = 0;
  allTrees = [];

  const userSnapshot = await getDocs(usersRef);

  for (const userDoc of userSnapshot.docs) {
    const data = userDoc.data();
    const role = data.role?.toLowerCase();

    // Count totals
    if (role === "forester") totalForestersCount++;
    else if (role === "applicant") totalApplicantsCount++;

    // Load trees from foresters only
    if (role === "forester") {
      const trees = await fetchUserTrees(userDoc.id);
      if (trees.length > 0) {
        const userTrees = trees.map((t) => ({
          ...t,
          foresterName: data.name || userDoc.id,
        }));
        allTrees.push(...userTrees);
      }
    }
  }

  // ✅ Update total counts
  totalForester.textContent = totalForestersCount.toString();
  totalApplicants.textContent = totalApplicantsCount.toString();
  totalTaggedEl.textContent = allTrees.length.toString();

  // ---------- Load Applications & Appointments ----------
  await loadApplicationsData();
  await loadAppointmentsData();

  // ---------- Calculate Monthly Metrics ----------
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Filter applications by month
  const appsThisMonth = allApplications.filter(app => {
    const createdAt = app.createdAt ? new Date(app.createdAt.toDate ? app.createdAt.toDate() : app.createdAt) : null;
    return createdAt && createdAt >= thisMonth;
  });

  const appsLastMonth = allApplications.filter(app => {
    const createdAt = app.createdAt ? new Date(app.createdAt.toDate ? app.createdAt.toDate() : app.createdAt) : null;
    return createdAt && createdAt >= lastMonth && createdAt < thisMonth;
  });

  applicationsThisMonthEl.textContent = appsThisMonth.length.toString();
  applicationsLastMonthEl.textContent = appsLastMonth.length.toString();

  // Calculate growth percentage
  const growthPercent = appsLastMonth.length > 0
    ? (((appsThisMonth.length - appsLastMonth.length) / appsLastMonth.length) * 100).toFixed(1)
    : "0";
  applicationGrowthEl.textContent = `${growthPercent}%`;

  // Filter appointments by month
  const activeAppts = allAppointments.filter(apt => apt.status?.toLowerCase() === 'active' || apt.status?.toLowerCase() === 'scheduled');
  const completedAppts = allAppointments.filter(apt => apt.status?.toLowerCase() === 'completed' || apt.status?.toLowerCase() === 'done');

  activeAppointmentsEl.textContent = activeAppts.length.toString();
  completedAppointmentsEl.textContent = completedAppts.length.toString();

  // Average trees per forester
  const avgTreesPerForester = totalForestersCount > 0 
    ? (allTrees.length / totalForestersCount).toFixed(1) 
    : "0";
  avgTreesPerForesterEl.textContent = avgTreesPerForester;

  // ---------- Compute Stats ----------
  const speciesMap = {};
  const foresterMap = {};
  const locationMap = {};
  const trendMap = {};

  allTrees.forEach((t) => {
    const species = t.specie || t.species || "Unknown";
    speciesMap[species] = (speciesMap[species] || 0) + 1;

    const f = t.foresterName || "Unknown Forester";
    foresterMap[f] = (foresterMap[f] || 0) + 1;

    const loc = t.municipality || t.barangay || "Unspecified";
    locationMap[loc] = (locationMap[loc] || 0) + 1;

    const taggedAt = t.date_tagged
      ? new Date(t.date_tagged.toDate ? t.date_tagged.toDate() : t.date_tagged)
      : null;
    if (taggedAt) {
      const key = taggedAt.toISOString().split("T")[0];
      trendMap[key] = (trendMap[key] || 0) + 1;
    }
  });

  // ---------- Display Core Numbers ----------
  speciesCountEl.textContent = Object.keys(speciesMap).length.toString();
  const avg =
    totalForestersCount > 0 ? (allTrees.length / totalForestersCount).toFixed(1) : "0";
  avgTreesEl.textContent = avg;

  // ---------- Update Top Performers ----------
  updateTopPerformers(foresterMap, speciesMap, locationMap);

  // ---------- Charts & Visuals ----------
  drawSpeciesChart(Object.keys(speciesMap), Object.values(speciesMap));
  drawForesterChart(Object.keys(foresterMap), Object.values(foresterMap));
  drawStatusChart();
  drawAppointmentTypeChart();

  // ---------- Filters & Map ----------
  populateFilterDropdowns(Object.keys(speciesMap), Object.keys(foresterMap));
  plotTreeLocations(allTrees);
  renderLocationStats(locationMap);
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
