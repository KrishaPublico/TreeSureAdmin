/**
 * Sidebar Loader - Robust with Improved Dropdown and Persistence
 */

console.log("✅ sidebar-loader.js script loaded");

// Find the sidebar container
const sidebarContainer = document.getElementById("sidebar-container");
if (!sidebarContainer) {
  console.error("❌ ERROR: No sidebar-container div found in page!");
} else {
  console.log("✅ Found sidebar-container div");
}

// Store dropdown state to maintain it across navigation
let dropdownState = {
  isOpen: false
};

function initSidebar() {
  if (!sidebarContainer) return;

  // Try relative path first
  let fetchPath = "./sidebar.html";

  // Adjust the path based on current page location
  const pathParts = window.location.pathname.split("/");
  console.log("📍 Current path:", window.location.pathname);

  // If we're in dashboard, users, applications, etc., go up to admin and then to shared
  if (pathParts[pathParts.length - 2] === "dashboard" ||
      pathParts[pathParts.length - 2] === "users" ||
      pathParts[pathParts.length - 2] === "applications" ||
      pathParts[pathParts.length - 2] === "reports" ||
      pathParts[pathParts.length - 2] === "settings" ||
      pathParts[pathParts.length - 2] === "trees") {
    fetchPath = "../shared/sidebar.html";
  }

  console.log("📍 Fetching sidebar from:", fetchPath);

  fetch(fetchPath)
    .then(response => {
      console.log("📡 Fetch response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      console.log("✅ Sidebar HTML received, length:", html.length);

      // Clear and inject fresh sidebar HTML
      sidebarContainer.innerHTML = html;
      console.log("✅ Sidebar HTML injected into DOM");

      // Setup all functionality
      setupAppButtons();
      highlightActivePage();
      setupLogoutButton();
      setupDropdown();

      // Restore dropdown state if needed
      if (dropdownState.isOpen) {
        const dropdownMenu = document.querySelector(".dropdown-menu");
        const dropdownIcon = document.querySelector(".dropdown-icon");
        const dropdownToggle = document.querySelector(".dropdown-toggle");

        if (dropdownMenu && dropdownIcon && dropdownToggle) {
          const contentHeight = dropdownMenu.scrollHeight;
          dropdownMenu.style.maxHeight = contentHeight + "px";
          dropdownMenu.style.opacity = "1";
          dropdownIcon.style.transform = "rotate(180deg)";
        }
      }

      console.log("✅ All sidebar functions initialized");
    })
    .catch(error => {
      console.error("❌ Failed to load sidebar:", error);
      sidebarContainer.innerHTML = `
        <div style="position: fixed; left: 0; top: 0; width: 224px; height: 100%; background: #fee2e2; border-right: 1px solid #fca5a5; padding: 20px; color: #dc2626; z-index: 1000; overflow: auto;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">Error loading sidebar</h3>
          <p style="margin: 0; font-size: 12px;">${error.message}</p>
          <p style="margin: 10px 0 0 0; font-size: 11px; opacity: 0.7;">Fetch path: ${fetchPath}</p>
        </div>
      `;
    });
}

function setupAppButtons() {
  const appButtons = [
    { id: "ctpoBtn", type: "ctpo", title: "CTPO Applications" },
    { id: "pltpBtn", type: "pltp", title: "PLTP Applications" },
    { id: "spltpBtn", type: "spltp", title: "SPLTP Applications" },
    { id: "covBtn", type: "cov", title: "COV Applications" },
    { id: "chainsawBtn", type: "chainsaw", title: "Chainsaw Registration" },
    { id: "cttBtn", type: "ctt", title: "Transport Permit (CTT)" },
  ];

  appButtons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        // Store dropdown state before navigation
        const dropdownMenu = document.querySelector(".dropdown-menu");
        dropdownState.isOpen = dropdownMenu && dropdownMenu.style.maxHeight !== "0px" && dropdownMenu.style.maxHeight !== "";

        localStorage.setItem("selectedApplicationType", btn.type);
        localStorage.setItem("selectedApplicationTitle", btn.title);
        window.location.href = "../applications/applications.html";
      });
    }
  });
}

function highlightActivePage() {
  const current = window.location.pathname.split("/").pop();
  console.log("🔍 Current page:", current);

  document.querySelectorAll(".sidebar-item").forEach(link => {
    const href = link.getAttribute("href");
    if (href && (href === current || href.endsWith("/" + current))) {
      link.classList.add("active");
      console.log("✅ Activated:", href);
    }
  });
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", e => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = "../../auth/login/index.html";
    });
  }
}

function setupDropdown() {
  const dropdownToggle = document.querySelector(".dropdown-toggle");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const dropdownIcon = document.querySelector(".dropdown-icon");

  if (!dropdownToggle || !dropdownMenu || !dropdownIcon) {
    console.warn("⚠️ Dropdown elements not found");
    return;
  }

  // Handle toggle button clicks
  dropdownToggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = dropdownMenu.style.maxHeight !== "0px" && dropdownMenu.style.maxHeight !== "";

    if (isOpen) {
      dropdownMenu.style.maxHeight = "0px";
      dropdownMenu.style.opacity = "0";
      dropdownIcon.style.transform = "rotate(0deg)";
      dropdownState.isOpen = false;
    } else {
      const contentHeight = dropdownMenu.scrollHeight;
      dropdownMenu.style.maxHeight = contentHeight + "px";
      dropdownMenu.style.opacity = "1";
      dropdownIcon.style.transform = "rotate(180deg)";
      dropdownState.isOpen = true;
    }
  });

  // Handle app-type buttons - prevent dropdown from closing
  const appTypeButtons = document.querySelectorAll(".app-type-btn");
  appTypeButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Note: actual navigation is handled by setupAppButtons
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function(e) {
    const isClickingDropdown = dropdownToggle.contains(e.target) || dropdownMenu.contains(e.target);

    if (!isClickingDropdown) {
      dropdownMenu.style.maxHeight = "0px";
      dropdownMenu.style.opacity = "0";
      dropdownIcon.style.transform = "rotate(0deg)";
      dropdownState.isOpen = false;
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebar);
} else {
  initSidebar();
}
