console.log("✅ settings.js loaded");

document.addEventListener("DOMContentLoaded", () => {

  // ---------- MODAL CLOSE HANDLER ----------
  // Handle all close buttons and modal background clicks
  document.addEventListener("click", function(e) {
    const closeBtn = e.target.closest("[data-close]");
    if (closeBtn) {
      e.preventDefault();
      const modalId = closeBtn.getAttribute("data-close");
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove("active");
      }
    }

    // Close modal when clicking outside of modal-content
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("active");
    }
  });

  // ---------- GLOBAL MESSAGE MODAL ----------
  function showMessage(message, type = "success") {
    const messageModal = document.getElementById("messageModal");
    if (!messageModal) return;

    const messageText = document.getElementById("messageText");
    const messageIcon = document.getElementById("messageIcon");

    if (messageText) messageText.textContent = message;
    messageModal.classList.remove("message-success", "message-error");

    if (type === "success") {
      messageModal.classList.add("message-success");
      if (messageIcon) messageIcon.innerHTML = '<i class="fa fa-check-circle"></i>';
    } else {
      messageModal.classList.add("message-error");
      if (messageIcon) messageIcon.innerHTML = '<i class="fa fa-times-circle"></i>';
    }

    messageModal.style.display = "block";

    setTimeout(() => {
      messageModal.style.display = "none";
    }, 2000);
  }

  // ---------- MODAL LOGIC ----------
  const modals = {
    changePassword: document.getElementById("changePasswordModal"),
    manageAdmins: document.getElementById("manageAdminsModal"),
    profile: document.getElementById("profilePreferencesModal"),
    notifications: document.getElementById("notificationsModal"),
    appearance: document.getElementById("appearanceModal"),
    dataTools: document.getElementById("dataToolsModal")
  };

  const buttons = {
    changePassword: document.getElementById("changePasswordBtn"),
    manageAdmins: document.getElementById("manageAdminsBtn"),
    profile: document.getElementById("profilePreferencesBtn"),
    notifications: document.getElementById("notificationsBtn"),
    appearance: document.getElementById("appearanceBtn"),
    dataTools: document.getElementById("dataToolsBtn")
  };

  // ---------- FIREBASE AUTH ----------
  let currentUser = null;

  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUser = user; // store user globally

    // ---------- OPEN MODALS ----------
    buttons.changePassword?.addEventListener("click", () => {
      modals.changePassword.classList.add("active");
    });

    buttons.manageAdmins?.addEventListener("click", () => {
      modals.manageAdmins.classList.add("active");
    });

    buttons.profile?.addEventListener("click", () => {
      console.log("Current User:", currentUser);
      modals.profile.classList.add("active");
      document.getElementById("adminEmail").value = currentUser?.email || "";
    });

    buttons.notifications?.addEventListener("click", () => {
      loadNotificationPrefs();
      modals.notifications.classList.add("active");
    });

    buttons.appearance?.addEventListener("click", () => {
      loadAppearancePrefs();
      modals.appearance.classList.add("active");
    });

    buttons.dataTools?.addEventListener("click", () => {
      modals.dataTools.classList.add("active");
    });

    // ---------- CHANGE PASSWORD ----------
  // ---------- CHANGE PASSWORD ----------
const savePasswordBtn = document.getElementById("savePasswordBtn");
savePasswordBtn?.addEventListener("click", async () => {
  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (!currentPassword || !newPassword || !confirmPassword)
    return showMessage("Please fill all fields", "error");

  if (newPassword !== confirmPassword)
    return showMessage("Passwords do not match", "error");

  if (newPassword.length < 6)
    return showMessage("Password must be at least 6 characters", "error");

  try {
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
    await currentUser.reauthenticateWithCredential(credential);
    await currentUser.updatePassword(newPassword);

    showMessage("Password updated successfully!", "success");

    // Remove this line so modal stays open
    // modals.changePassword.style.display = "none";

    // Optionally, clear only the input fields
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  } catch (err) {
    showMessage(err.message, "error");
  }
});


    // ---------- MANAGE ADMINS ----------
    const addAdminBtn = document.getElementById("addAdminBtn");
    addAdminBtn?.addEventListener("click", async () => {
      const email = document.getElementById("newAdminEmail").value.trim();
      const password = document.getElementById("newAdminPassword").value.trim();

      if (!email || !password)
        return showMessage("Please enter email and password", "error");

      if (password.length < 6)
        return showMessage("Password must be at least 6 characters", "error");

      try {
        const secondaryApp = firebase.initializeApp(firebase.app().options, "Secondary");
        await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        showMessage("Admin added successfully!", "success");

        document.getElementById("newAdminEmail").value = "";
        document.getElementById("newAdminPassword").value = "";

        await secondaryApp.delete();
      } catch (err) {
        showMessage(err.message, "error");
      }
    });
  });

  // ---------- LOCAL PREFERENCES ----------
  const notifyEmail = document.getElementById("notifyEmail");
  const notifySystem = document.getElementById("notifySystem");
  const notifyAppointments = document.getElementById("notifyAppointments");
  const saveNotificationsBtn = document.getElementById("saveNotificationsBtn");

  const themeSelect = document.getElementById("themeSelect");
  const densitySelect = document.getElementById("densitySelect");
  const dateFormatSelect = document.getElementById("dateFormatSelect");
  const saveAppearanceBtn = document.getElementById("saveAppearanceBtn");

  const exportSettingsBtn = document.getElementById("exportSettingsBtn");
  const clearLocalSettingsBtn = document.getElementById("clearLocalSettingsBtn");

  function loadNotificationPrefs() {
    const prefs = JSON.parse(localStorage.getItem("settings.notifications") || "{}");
    if (notifyEmail) notifyEmail.checked = !!prefs.email;
    if (notifySystem) notifySystem.checked = !!prefs.system;
    if (notifyAppointments) notifyAppointments.checked = !!prefs.appointments;
  }

  function loadAppearancePrefs() {
    const prefs = JSON.parse(localStorage.getItem("settings.appearance") || "{}");
    if (themeSelect) themeSelect.value = prefs.theme || "light";
    if (densitySelect) densitySelect.value = prefs.density || "comfortable";
    if (dateFormatSelect) dateFormatSelect.value = prefs.dateFormat || "mdy";
  }

  saveNotificationsBtn?.addEventListener("click", () => {
    const prefs = {
      email: !!notifyEmail?.checked,
      system: !!notifySystem?.checked,
      appointments: !!notifyAppointments?.checked
    };
    localStorage.setItem("settings.notifications", JSON.stringify(prefs));
    showMessage("Notification preferences saved", "success");
  });

  saveAppearanceBtn?.addEventListener("click", () => {
    const prefs = {
      theme: themeSelect?.value || "light",
      density: densitySelect?.value || "comfortable",
      dateFormat: dateFormatSelect?.value || "mdy"
    };
    localStorage.setItem("settings.appearance", JSON.stringify(prefs));
    showMessage("Appearance preferences saved", "success");
  });

  exportSettingsBtn?.addEventListener("click", () => {
    const data = {
      notifications: JSON.parse(localStorage.getItem("settings.notifications") || "{}"),
      appearance: JSON.parse(localStorage.getItem("settings.appearance") || "{}")
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "treesure-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    showMessage("Settings exported", "success");
  });

  clearLocalSettingsBtn?.addEventListener("click", () => {
    localStorage.removeItem("settings.notifications");
    localStorage.removeItem("settings.appearance");
    showMessage("Local settings cleared", "success");
  });

});
