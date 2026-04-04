/**
 * Sidebar Loader - Professional Design
 * Handles dynamic sidebar loading, navigation, and dropdown menus
 */

console.log("✅ Sidebar loader script initialized");

const sidebarContainer = document.getElementById("sidebar-container");

if (!sidebarContainer) {
  console.error("❌ ERROR: No sidebar-container div found!");
}

function initSidebar() {
  if (!sidebarContainer) return;

  let fetchPath = "./sidebar.html";
  const pathname = window.location.pathname;
  const pathParts = pathname.split("/");

  // Determine correct fetch path based on current page location
  const currentFolder = pathParts[pathParts.length - 2];
  if (["dashboard", "users", "applications", "reports", "settings", "trees"].includes(currentFolder)) {
    fetchPath = "../shared/sidebar.html";
  }

  console.log("📍 Loading sidebar from:", fetchPath);

  fetch(fetchPath)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(html => {
      sidebarContainer.innerHTML = html;
      console.log("✅ Sidebar loaded successfully");

      // Initialize all sidebar features
      initDropdowns();
      initSubmenus();
      initMenuItems();
      initAppButtons();
      initLogout();
      setActiveMenuItems();

      console.log("✅ Sidebar fully initialized");
    })
    .catch(error => {
      console.error("❌ Failed to load sidebar:", error);
      sidebarContainer.innerHTML = `
        <div style="position: fixed; left: 0; top: 0; width: 260px; height: 100vh; background: #fee2e2; border-right: 1px solid #fca5a5; padding: 20px; color: #dc2626; z-index: 1000; overflow: auto; font-family: system-ui;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">Sidebar Error</h3>
          <p style="margin: 0; font-size: 12px;">${error.message}</p>
        </div>
      `;
    });
}

/**
 * Initialize dropdown menus
 */
function initDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector(".dropdown-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = dropdown.classList.contains("open");
      closeAllDropdowns();

      if (!isOpen) {
        dropdown.classList.add("open");
        console.log("📖 Dropdown opened");
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
      closeAllDropdowns();
    }
  });
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown.open").forEach(dropdown => {
    dropdown.classList.remove("open");
  });
  closeAllSubmenus();
}

/**
 * Initialize submenus (nested dropdowns)
 */
function initSubmenus() {
  const subToggles = document.querySelectorAll(".sub-toggle");

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
        console.log("📚 Submenu opened");
      } else {
        parent.classList.remove("open");
      }
    });
  });
}

function closeAllSubmenus() {
  document.querySelectorAll(".dropdown-sub.open").forEach(sub => {
    sub.classList.remove("open");
  });
}

/**
 * Initialize menu item navigation
 */
function initMenuItems() {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach(item => {
    if (item.classList.contains("dropdown-toggle")) return; // Skip dropdown toggles

    item.addEventListener("click", () => {
      closeAllDropdowns();
      console.log("🔗 Menu item clicked");
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

        console.log("📋 App type selected:", btn.type);

        localStorage.setItem("selectedApplicationType", btn.type);
        localStorage.setItem("selectedApplicationTitle", btn.title);

        window.location.href = "../applications/applications.html";
      });
    }
  });
}

/**
 * Initialize logout button
 */
function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("👋 Logging out");
      localStorage.clear();
      window.location.href = "../../auth/login/index.html";
    });
  }
}

/**
 * Set active menu items based on current page
 */
function setActiveMenuItems() {
  const currentPage = window.location.pathname.split("/").pop();
  console.log("🔍 Current page:", currentPage);

  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(item => {
    const href = item.getAttribute("href");
    if (href && (href.endsWith(currentPage) || href === currentPage)) {
      item.classList.add("active");
      console.log("✅ Activated menu item:", href);
    }
  });
}

// Initialize sidebar when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebar);
} else {
  initSidebar();
}
