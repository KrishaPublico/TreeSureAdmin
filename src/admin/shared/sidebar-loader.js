/**
 * Sidebar Loader - Professional Design (ROBUST VERSION)
 * Handles dynamic sidebar loading, navigation, and dropdown menus
 */

console.log("✅ [SIDEBAR] Script loaded");

// Get sidebar container
const sidebarContainer = document.getElementById("sidebar-container");
console.log("✅ [SIDEBAR] Container found:", !!sidebarContainer);

if (!sidebarContainer) {
  console.error("❌ [SIDEBAR] No sidebar-container div found!");
}

/**
 * Initialize sidebar - main entry point
 */
function initSidebar() {
  if (!sidebarContainer) {
    console.error("❌ [SIDEBAR] Container not found, cannot initialize");
    return;
  }

  // Determine correct fetch path
  let fetchPath = "../shared/sidebar.html";
  const pathname = window.location.pathname;

  console.log("📍 [SIDEBAR] Current pathname:", pathname);
  console.log("📍 [SIDEBAR] Fetching from:", fetchPath);

  fetch(fetchPath)
    .then(response => {
      console.log("📡 [SIDEBAR] Response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      console.log("✅ [SIDEBAR] HTML received, length:", html.length);

      // Inject sidebar HTML
      sidebarContainer.innerHTML = html;
      console.log("✅ [SIDEBAR] HTML injected into DOM");

      // Initialize all sidebar functionality
      initDropdowns();
      initSubmenus();
      initMenuItems();
      initAppButtons();
      initLogout();
      setActiveMenuItems();

      console.log("✅ [SIDEBAR] Fully initialized");
    })
    .catch(error => {
      console.error("❌ [SIDEBAR] Failed to load:", error);
      sidebarContainer.innerHTML = `
        <div style="position: fixed; left: 0; top: 0; width: 260px; height: 100vh; background: #fee2e2; border-right: 1px solid #fca5a5; padding: 20px; color: #dc2626; z-index: 1000; overflow: auto; font-family: system-ui;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">❌ Sidebar Error</h3>
          <p style="margin: 0; font-size: 12px;">${error.message}</p>
          <p style="margin: 10px 0 0 0; font-size: 11px; opacity: 0.7;">Path: ${fetchPath}</p>
        </div>
      `;
    });
}

/**
 * Initialize dropdown menus
 */
function initDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");
  console.log("📍 [SIDEBAR] Found dropdowns:", dropdowns.length);

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector(".dropdown-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = dropdown.classList.contains("open");

      // Close all dropdowns
      document.querySelectorAll(".dropdown.open").forEach(d => {
        d.classList.remove("open");
      });

      // Open this dropdown if it was closed
      if (!isOpen) {
        dropdown.classList.add("open");
        console.log("📖 [SIDEBAR] Dropdown opened");
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown.open").forEach(d => {
        d.classList.remove("open");
      });
    }
  });
}

/**
 * Initialize submenus (nested dropdowns)
 */
function initSubmenus() {
  const subToggles = document.querySelectorAll(".sub-toggle");
  console.log("📍 [SIDEBAR] Found submenus:", subToggles.length);

  subToggles.forEach(toggle => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const parent = toggle.closest(".dropdown-sub");
      if (!parent) return;

      const isOpen = parent.classList.contains("open");

      // Close other submenus at same level
      parent.parentElement.querySelectorAll(".dropdown-sub.open").forEach(sub => {
        if (sub !== parent) sub.classList.remove("open");
      });

      if (!isOpen) {
        parent.classList.add("open");
        console.log("📚 [SIDEBAR] Submenu opened");
      } else {
        parent.classList.remove("open");
      }
    });
  });
}

/**
 * Initialize menu item navigation
 */
function initMenuItems() {
  const menuItems = document.querySelectorAll(".menu-item");
  console.log("📍 [SIDEBAR] Found menu items:", menuItems.length);

  menuItems.forEach(item => {
    if (item.classList.contains("dropdown-toggle")) return;

    item.addEventListener("click", () => {
      // Close dropdowns when navigating
      document.querySelectorAll(".dropdown.open").forEach(d => {
        d.classList.remove("open");
      });
      console.log("🔗 [SIDEBAR] Menu item clicked");
    });
  });
}

/**
 * Initialize application type buttons
 */
function initAppButtons() {
  const buttons = [
    { id: "ctpoBtn", type: "ctpo", title: "CTPO Applications" },
    { id: "pltpBtn", type: "pltp", title: "PLTP Applications" },
    { id: "spltpBtn", type: "spltp", title: "SPLTP Applications" },
    { id: "covBtn", type: "cov", title: "COV Applications" },
    { id: "cttBtn", type: "ctt", title: "Transport Permit (CTT)" },
    { id: "chainsawBtn", type: "chainsaw", title: "Chainsaw Registration" },
  ];

  buttons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      element.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log("📋 [SIDEBAR] App type clicked:", btn.type);

        localStorage.setItem("selectedApplicationType", btn.type);
        localStorage.setItem("selectedApplicationTitle", btn.title);

        window.location.href = "../applications/applications.html";
      });
    }
  });

  console.log("✅ [SIDEBAR] App buttons initialized");
}

/**
 * Initialize logout button
 */
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("👋 [SIDEBAR] Logout clicked");
      localStorage.clear();
      window.location.href = "../../auth/login/index.html";
    });
    console.log("✅ [SIDEBAR] Logout button initialized");
  }
}

/**
 * Set active menu items based on current page
 */
function setActiveMenuItems() {
  const currentPage = window.location.pathname.split("/").pop() || "dashboard.html";
  console.log("🔍 [SIDEBAR] Current page:", currentPage);

  const menuItems = document.querySelectorAll(".menu-item");
  let activeCount = 0;

  menuItems.forEach(item => {
    const href = item.getAttribute("href");
    if (href && (href.endsWith(currentPage) || href === currentPage)) {
      item.classList.add("active");
      activeCount++;
      console.log("✅ [SIDEBAR] Activated:", href);
    }
  });

  console.log("📊 [SIDEBAR] Total active menu items:", activeCount);
}

// Initialize sidebar when document is ready
console.log("📍 [SIDEBAR] Document ready state:", document.readyState);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("📍 [SIDEBAR] DOMContentLoaded event fired");
    initSidebar();
  });
} else {
  console.log("📍 [SIDEBAR] Document already loaded, initializing sidebar now");
  initSidebar();
}

