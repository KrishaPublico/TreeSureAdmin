/**
 * Sidebar Loader - Professional Design (ROBUST VERSION)
 * Handles dynamic sidebar loading, navigation, and dropdown menus
 */

console.log("✅ [SIDEBAR] Script loaded");

const APPLICATIONS_OPEN_KEY = "sidebarApplicationsOpen";
const CUTTING_PERMITS_OPEN_KEY = "sidebarCuttingPermitsOpen";

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
      const onApplicationsPage = window.location.pathname.includes("/applications/applications.html");
      if (!onApplicationsPage) {
        setSidebarOpenState(false, false);
      }

      initDropdowns();
      initSubmenus();
      initMenuItems();
      initAppButtons();
      restoreApplicationsMenuState();
      syncDropdownIcons();
      initLogout();
      setActiveMenuItems();

      // Notify pages (like Applications) that sidebar DOM is ready.
      document.dispatchEvent(new CustomEvent("sidebarLoaded"));

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
 * Sync caret icons with current open/closed states.
 */
function syncDropdownIcons() {
  document.querySelectorAll(".dropdown").forEach(dropdown => {
    const icon = dropdown.querySelector(".dropdown-icon");
    if (!icon) return;

    const isOpen = dropdown.classList.contains("open");
    icon.classList.remove("fa-caret-down", "fa-caret-up");
    icon.classList.add(isOpen ? "fa-caret-down" : "fa-caret-up");
  });

  document.querySelectorAll(".dropdown-sub").forEach(sub => {
    const icon = sub.querySelector(".sub-icon");
    if (!icon) return;

    const isOpen = sub.classList.contains("open");
    icon.classList.remove("fa-caret-down", "fa-caret-up");
    icon.classList.add(isOpen ? "fa-caret-down" : "fa-caret-up");
  });
}

function setSidebarOpenState(applicationsOpen, cuttingPermitsOpen) {
  sessionStorage.setItem(APPLICATIONS_OPEN_KEY, applicationsOpen ? "true" : "false");
  sessionStorage.setItem(CUTTING_PERMITS_OPEN_KEY, cuttingPermitsOpen ? "true" : "false");
}

function getSidebarOpenState() {
  return {
    applicationsOpen: sessionStorage.getItem(APPLICATIONS_OPEN_KEY) === "true",
    cuttingPermitsOpen: sessionStorage.getItem(CUTTING_PERMITS_OPEN_KEY) === "true",
  };
}

/**
 * Initialize dropdown menus
 */
function initDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");
  console.log("📍 [SIDEBAR] Found dropdowns:", dropdowns.length);

  const closeAllSubmenus = () => {
    document.querySelectorAll(".dropdown-sub.open").forEach(sub => {
      sub.classList.remove("open", "locked-open");
    });
  };

  const closeAllDropdowns = () => {
    document.querySelectorAll(".dropdown.open").forEach(d => {
      d.classList.remove("open", "locked-open");
    });
    closeAllSubmenus();
    syncDropdownIcons();
  };

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector(".dropdown-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = dropdown.classList.contains("open");
      const isApplicationsDropdown = dropdown.id === "applicationsDropdown";

      if (isApplicationsDropdown) {
        // Toggle Applications: first click opens, second click closes.
        if (isOpen) {
          dropdown.classList.remove("open", "locked-open");
          dropdown.querySelectorAll(".dropdown-sub.open").forEach(sub => {
            sub.classList.remove("open", "locked-open");
          });
          setSidebarOpenState(false, false);
          syncDropdownIcons();
          console.log("📕 [SIDEBAR] Applications dropdown closed");
        } else {
          closeAllDropdowns();
          dropdown.classList.add("open");

          const onApplicationsPage = window.location.pathname.includes("/applications/applications.html");
          const shouldRestoreCuttingPermits = onApplicationsPage && getSidebarOpenState().cuttingPermitsOpen;
          const cuttingPermitsSubmenu = dropdown.querySelector(".dropdown-sub");
          if (cuttingPermitsSubmenu) {
            cuttingPermitsSubmenu.classList.remove("open");
            if (shouldRestoreCuttingPermits) {
              cuttingPermitsSubmenu.classList.add("open");
            }
          }

          setSidebarOpenState(true, shouldRestoreCuttingPermits);
          syncDropdownIcons();
          console.log("📖 [SIDEBAR] Applications dropdown opened");
        }
        return;
      }

      // Close all dropdowns
      closeAllDropdowns();

      // Open this dropdown if it was closed
      if (!isOpen) {
        dropdown.classList.add("open");
        syncDropdownIcons();
        console.log("📖 [SIDEBAR] Dropdown opened");
      }
    });
  });

  // Close dropdown when clicking outside (but NOT inside the dropdown)
  document.addEventListener("click", (e) => {
    const clickedInDropdown = e.target.closest(".dropdown") || e.target.closest(".dropdown-menu") || e.target.closest(".sub-menu");
    if (!clickedInDropdown) {
      const applicationsOpen = document.getElementById("applicationsDropdown")?.classList.contains("open");
      if (applicationsOpen) {
        return;
      }
      closeAllDropdowns();
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
      if (isOpen) {
        parent.classList.remove("open");
        setSidebarOpenState(true, false);
        console.log("📕 [SIDEBAR] Cutting Permits submenu closed");
      } else {
        parent.classList.add("open");
        setSidebarOpenState(true, true);
        console.log("📚 [SIDEBAR] Cutting Permits submenu opened");
      }

      // Keep Applications expanded while interacting with its submenu.
      const applicationsDropdown = parent.closest("#applicationsDropdown");
      if (applicationsDropdown) {
        applicationsDropdown.classList.add("open");
      }
      syncDropdownIcons();
    });
  });

  // Keep submenu open when clicking items inside
  const submenuItems = document.querySelectorAll(".sub-menu .app-type-btn");
  submenuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const dropdown = item.closest("#applicationsDropdown");
      if (dropdown) {
        dropdown.classList.add("open");
      }
      const parentSubmenu = item.closest(".dropdown-sub");
      if (parentSubmenu) {
        parentSubmenu.classList.add("open");
      }
      setSidebarOpenState(true, true);
      syncDropdownIcons();

      // Don't close the submenu - let navigation happen
      console.log("📚 [SIDEBAR] Submenu item clicked, keeping submenu open");
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
      // Only close dropdowns if this item is NOT inside a dropdown
      const isInsideDropdown = item.closest(".dropdown-menu") || item.closest(".sub-menu");
      if (!isInsideDropdown) {
        setSidebarOpenState(false, false);

        // Close dropdowns when navigating away
        document.querySelectorAll(".dropdown.open").forEach(d => {
          d.classList.remove("open", "locked-open");
        });
        document.querySelectorAll(".dropdown-sub.open").forEach(sub => {
          sub.classList.remove("open", "locked-open");
        });
        syncDropdownIcons();
      }
      console.log("🔗 [SIDEBAR] Menu item clicked");
    });
  });
}


/**
 * Initialize application type buttons
 */
function initAppButtons() {
  // Only run this on the applications page
  const onApplicationsPage = window.location.pathname.includes("/applications/applications.html");
  console.log("📍 [SIDEBAR] initAppButtons called, onApplicationsPage:", onApplicationsPage);

  if (!onApplicationsPage) {
    console.log("📍 [SIDEBAR] Not on applications page, skipping button initialization");
    return;
  }

  const buttons = [
    { id: "ctpoBtn", type: "ctpo", title: "CTPO Applications" },
    { id: "pltpBtn", type: "pltp", title: "PLTP Applications" },
    { id: "spltpBtn", type: "splt", title: "SPLTP Applications" },
    { id: "covBtn", type: "cov", title: "Certificate of Verification Applications" },
    { id: "cttBtn", type: "ctt", title: "Certificate to Transport Applications" },
    { id: "chainsawBtn", type: "chainsaw", title: "Chainsaw Registration Applications" },
  ];

  // Create button map for quick lookup
  const buttonMap = {};
  buttons.forEach(btn => {
    buttonMap[btn.id] = btn;
  });

  // Wait for loadApplicants to be available before attaching handlers
  const attachButtonHandlers = (retries = 0) => {
    if (typeof window.loadApplicants === "function") {
      console.log("✅ [SIDEBAR] window.loadApplicants available, attaching button handlers via event delegation");

      // Use event delegation on the sidebar itself
      const sidebar = document.querySelector(".sidebar");
      if (sidebar) {
        sidebar.addEventListener("click", (e) => {
          // Check if clicked element is an app-type-btn with an ID we recognize
          const clickedBtn = e.target.closest(".app-type-btn");
          if (!clickedBtn || !clickedBtn.id) return;

          const btnConfig = buttonMap[clickedBtn.id];
          if (!btnConfig) return;

          e.preventDefault();
          e.stopPropagation();

          console.log(`📋 [SIDEBAR] App button clicked: ${btnConfig.type} (${clickedBtn.id})`);

          // Highlight the clicked button
          document.querySelectorAll(".app-type-btn").forEach(b => {
            b.classList.remove("active");
          });
          clickedBtn.classList.add("active");
          localStorage.setItem("selectedAppTypeBtn", clickedBtn.id);
          console.log(`✅ [SIDEBAR] Button highlighted: ${clickedBtn.id}`);

          // Update title and trigger load
          const appTypeTitle = document.getElementById("applicationTypeTitle");
          const appTypeHeader = document.getElementById("applicationTypeHeader");
          const applicantsContainer = document.getElementById("applicantsContainer");
          const scheduleContainer = document.getElementById("scheduleContainer");
          const filesSection = document.getElementById("filesSection");

          if (appTypeHeader) appTypeHeader.style.display = "block";
          if (appTypeTitle) {
            appTypeTitle.textContent = btnConfig.title;
            console.log(`📝 [SIDEBAR] Title updated to: ${btnConfig.title}`);
          }
          if (applicantsContainer) {
            applicantsContainer.style.display = "flex";
            applicantsContainer.style.flexWrap = "wrap";
            applicantsContainer.style.justifyContent = "flex-start";
            applicantsContainer.innerHTML = `<div style="width:100%; text-align:center;"><span class="spinner"></span> Loading ${btnConfig.title}...</div>`;
          }
          if (filesSection) filesSection.style.display = "none";
          if (scheduleContainer) scheduleContainer.style.display = "none";

          // Call loadApplicants (now guaranteed to exist)
          console.log(`📥 [SIDEBAR] Calling loadApplicants for type: ${btnConfig.type}`);
          window.loadApplicants(btnConfig.type);

          localStorage.setItem("selectedApplicationType", btnConfig.type);
          localStorage.setItem("selectedApplicationTitle", btnConfig.title);
        }, true); // Use capture phase for more reliable event handling

        console.log("✅ [SIDEBAR] App button event delegation attached to sidebar");
      } else {
        console.error("❌ [SIDEBAR] Could not find sidebar element for event delegation");
      }
      return;
    }

    if (retries >= 100) {
      console.error("❌ [SIDEBAR] Timeout waiting for window.loadApplicants, button handlers NOT attached");
      return;
    }

    console.log(`⏳ [SIDEBAR] Waiting for window.loadApplicants (retry ${retries + 1}/100)`);
    setTimeout(() => attachButtonHandlers(retries + 1), 50);
  };

  attachButtonHandlers();
}

/**
 * Restore Applications dropdown/submenu state after sidebar load.
 */
function restoreApplicationsMenuState() {
  const onApplicationsPage = window.location.pathname.includes("/applications/applications.html");
  const applicationsDropdown = document.getElementById("applicationsDropdown");
  const cuttingPermitsSubmenu = document.querySelector("#applicationsDropdown .dropdown-sub");

  const currentState = onApplicationsPage ? getSidebarOpenState() : { applicationsOpen: false, cuttingPermitsOpen: false };

  if (applicationsDropdown) {
    applicationsDropdown.classList.remove("open");
    if (currentState.applicationsOpen) {
      applicationsDropdown.classList.add("open");
    }
  }

  if (cuttingPermitsSubmenu) {
    cuttingPermitsSubmenu.classList.remove("open");
    if (currentState.applicationsOpen && currentState.cuttingPermitsOpen) {
      cuttingPermitsSubmenu.classList.add("open");
    }
  }

  syncDropdownIcons();
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

// Expose initSidebar globally so HTML can call it when ready
window.initSidebar = initSidebar;
console.log("✅ [SIDEBAR] initSidebar exposed globally");

// Fallback auto-init after a delay if HTML script doesn't call it
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("📍 [SIDEBAR] DOMContentLoaded event fired");
    // Check if HTML script called initSidebar already
    setTimeout(() => {
      const sidebarContainer = document.getElementById("sidebar-container");
      if (sidebarContainer && !sidebarContainer.innerHTML) {
        console.log("📍 [SIDEBAR] Auto-initializing sidebar (HTML script hasn't done it yet)");
        initSidebar();
      }
    }, 1000);
  });
} else {
  console.log("📍 [SIDEBAR] Document already loaded, exposed initSidebar");
  // Document is already loaded, just expose the function
}

