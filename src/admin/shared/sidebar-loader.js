/**
 * Sidebar Loader - Enhanced Robust Version
 */

console.log("✅ sidebar-loader.js script loaded");

const sidebarContainer = document.getElementById("sidebar-container");
if (!sidebarContainer) {
  console.error("❌ ERROR: No sidebar-container div found in page!");
} else {
  console.log("✅ Found sidebar-container div");
}

// Wait for DOM if necessary, then initialize
function waitForDOM() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebar);
  } else {
    initSidebar();
  }
}

function initSidebar() {
  if (!sidebarContainer) return;

  let fetchPath = "./sidebar.html";
  const pathParts = window.location.pathname.split("/");

  // Determine correct fetch path
  if (pathParts[pathParts.length - 2] === "dashboard" ||
      pathParts[pathParts.length - 2] === "users" ||
      pathParts[pathParts.length - 2] === "applications" ||
      pathParts[pathParts.length - 2] === "reports" ||
      pathParts[pathParts.length - 2] === "settings" ||
      pathParts[pathParts.length - 2] === "trees") {
    fetchPath = "../shared/sidebar.html";
  }

  console.log("📍 Current path:", window.location.pathname);
  console.log("📍 Fetching sidebar from:", fetchPath);

  fetch(fetchPath)
    .then(response => {
      console.log("📡 Fetch response status:", response.status);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(html => {
      console.log("✅ Sidebar HTML received");
      sidebarContainer.innerHTML = html;
      console.log("✅ Sidebar HTML injected");

      // Initialize all sidebar functionality
      setupAppButtons();
      highlightActivePage();
      setupLogoutButton();
      setupDropdown();

      console.log("✅ Sidebar initialization complete");
    })
    .catch(error => {
      console.error("❌ Failed to load sidebar:", error);
      sidebarContainer.innerHTML = `
        <div style="position: fixed; left: 0; top: 0; width: 224px; height: 100%; background: #fee2e2; border-right: 1px solid #fca5a5; padding: 20px; color: #dc2626; z-index: 1000; overflow: auto; font-family: system-ui;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">Sidebar Error</h3>
          <p style="margin: 0; font-size: 12px;">${error.message}</p>
          <p style="margin: 10px 0 0 0; font-size: 11px; opacity: 0.7;">Path: ${fetchPath}</p>
        </div>
      `;
    });
}

function setupAppButtons() {
  const buttons = [
    { id: "ctpoBtn", type: "ctpo", title: "CTPO Applications" },
    { id: "pltpBtn", type: "pltp", title: "PLTP Applications" },
    { id: "spltpBtn", type: "spltp", title: "SPLTP Applications" },
    { id: "covBtn", type: "cov", title: "COV Applications" },
    { id: "chainsawBtn", type: "chainsaw", title: "Chainsaw Registration" },
    { id: "cttBtn", type: "ctt", title: "Transport Permit (CTT)" },
  ];

  buttons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      element.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log("🔘 App button clicked:", btn.type);

        // Store selection
        localStorage.setItem("selectedApplicationType", btn.type);
        localStorage.setItem("selectedApplicationTitle", btn.title);

        // Navigate
        window.location.href = "../applications/applications.html";
      });
    }
  });

  console.log("✅ App buttons setup complete");
}

function highlightActivePage() {
  const currentPage = window.location.pathname.split("/").pop();
  console.log("🔍 Current page:", currentPage);

  const sidebarItems = document.querySelectorAll(".sidebar-item");
  console.log("📊 Found sidebar items:", sidebarItems.length);

  sidebarItems.forEach(link => {
    const href = link.getAttribute("href");
    if (href && (href === currentPage || href.endsWith("/" + currentPage))) {
      link.classList.add("active");
      console.log("✅ Activated link:", href);
    }
  });
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = "../../auth/login/index.html";
    });
    console.log("✅ Logout button setup complete");
  }
}

function setupDropdown() {
  // Get dropdown elements
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const dropdownIcon = document.querySelector(".dropdown-icon");

  if (!dropdownToggle || !dropdownMenu || !dropdownIcon) {
    console.warn("⚠️ Dropdown elements not found");
    return;
  }

  console.log("✅ Dropdown elements found");

  // Toggle dropdown on button click
  dropdownToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = parseFloat(dropdownMenu.style.opacity || "0") === 1;

    if (isOpen) {
      // Close dropdown
      dropdownMenu.style.maxHeight = "0px";
      dropdownMenu.style.opacity = "0";
      dropdownIcon.style.transform = "rotate(0deg)";
      console.log("📉 Dropdown closed");
    } else {
      // Open dropdown
      const scrollHeight = dropdownMenu.scrollHeight;
      dropdownMenu.style.maxHeight = scrollHeight + "px";
      dropdownMenu.style.opacity = "1";
      dropdownIcon.style.transform = "rotate(180deg)";
      console.log("📈 Dropdown opened, height:", scrollHeight);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const isClickingDropdown = dropdownToggle.contains(e.target);
    const isClickingMenu = dropdownMenu.contains(e.target);

    // Keep dropdown open if clicking inside it
    if (isClickingDropdown || isClickingMenu) {
      return;
    }

    // Close dropdown
    const isOpen = parseFloat(dropdownMenu.style.opacity || "0") === 1;
    if (isOpen) {
      dropdownMenu.style.maxHeight = "0px";
      dropdownMenu.style.opacity = "0";
      dropdownIcon.style.transform = "rotate(0deg)";
      console.log("📉 Dropdown auto-closed");
    }
  });

  console.log("✅ Dropdown setup complete");
}

// Initialize sidebar
waitForDOM();
