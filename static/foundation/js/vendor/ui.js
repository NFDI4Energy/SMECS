// ui.js
/*Popup behavior
Tabs and navigation buttons
Toggle switch visibility for form sections
Tooltips
*/
import {
  getSchema,
  getFieldKey,
  fetchRequiredAndRecommendedFields,
} from "./schema-utils.js";
const metadataJson = document.getElementById("metadata-json");
const urlInputs = document.querySelectorAll(".url-input");
const tabs_ext = document.querySelectorAll(".tab-links_ext a");
const contents = document.querySelectorAll(".tab-content_ext .tab");

export function setupUI() {
  const closeBtn = document.getElementById("closePopup");
  if (closeBtn) closeBtn.onclick = closePopup;

  window.onclick = function (event) {
    if (event.target === document.getElementById("popup")) {
      closePopup();
    }
  };
  const copyBtn = document.getElementById("copy-button");
  // copy button for json
  copyBtn.addEventListener("click", function (event) {
    event.preventDefault();
    metadataJson.select();
    document.execCommand("copy");
    actionFeedback("Text copied!");
  });
  // tabs_ext
  tabs_ext.forEach((tab) => {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      tabs_ext.forEach((item) => item.parentElement.classList.remove("active"));
      contents.forEach((content) => content.classList.remove("active"));
      this.parentElement.classList.add("active");
      let contentId = this.getAttribute("href");
      document.querySelector(contentId).classList.add("active");
    });
  });

  // Attach event listeners to all forward buttons
  document.querySelectorAll(".forwardBtn").forEach(function (forwardBtn) {
    forwardBtn.addEventListener("click", function (event) {
      event.preventDefault();
      const tabLinks = Array.from(
        document.querySelectorAll(".tab-links_ext a"),
      );
      const activeTab = tabLinks.find((link) =>
        link.parentElement.classList.contains("active"),
      );
      if (!activeTab) return;
      const currentIndex = tabLinks.indexOf(activeTab);
      if (currentIndex !== -1 && currentIndex < tabLinks.length - 1) {
        tabLinks[currentIndex + 1].click();
      }
    });
  });

  // Attach event listeners to all backward buttons
  document.querySelectorAll(".backwardBtn").forEach(function (backwardBtn) {
    backwardBtn.addEventListener("click", function (event) {
      event.preventDefault();
      const tabLinks = Array.from(
        document.querySelectorAll(".tab-links_ext a"),
      );
      const activeTab = tabLinks.find((link) =>
        link.parentElement.classList.contains("active"),
      );
      if (!activeTab) return;
      const currentIndex = tabLinks.indexOf(activeTab);
      if (currentIndex > 0) {
        tabLinks[currentIndex - 1].click();
      }
    });
  });

  // custom tooltips
  // document
  //   .querySelectorAll(".custom-tooltip-metadata")
  //   .forEach(function (element) {
  //     const tooltip = element.querySelector(".tooltip-text-metadata");
  //     const icon = element.querySelector("i");

  //     // Helper to get scale factor from parent (default 1)
  //     function getScaleFactor(el) {
  //       let scale = 1;
  //       let parent = el;
  //       while (parent) {
  //         const transform = window.getComputedStyle(parent).transform;
  //         if (transform && transform !== "none") {
  //           const match = transform.match(
  //             /matrix\(([^,]+),[^,]+,[^,]+,[^,]+,[^,]+,[^,]+\)/
  //           );
  //           if (match) {
  //             scale *= parseFloat(match[1]);
  //           }
  //         }
  //         parent = parent.parentElement;
  //       }
  //       return scale;
  //     }

  //     element.addEventListener("mouseenter", function () {
  //       tooltip.style.display = "block";
  //       tooltip.style.visibility = "visible";
  //       tooltip.style.opacity = "1";
  //       tooltip.style.position = "absolute";
  //       // tooltip.style.zIndex = "9999";
  //       const rect = icon.getBoundingClientRect();
  //       const margin = 16;

  //       // Find the scale factor (if any) from the closest scaled parent
  //       const scale = getScaleFactor(icon.parentElement);
  //       console.info("Tooltip scale factor:", scale);

  //       // Adjust position for scale
  //       //let left = rect.right * scale;
  //       //let top = (rect.top + margin) * scale;
  //       let width = 1;
  //       let left = 16;
  //       let top = 16;
  //       tooltip.style.left = left + "px";
  //       tooltip.style.top = top + "px";
  //       tooltip.style.width = width + "px";
  //     });
  //     element.addEventListener("mouseleave", function () {
  //       tooltip.style.display = "none";
  //       tooltip.style.visibility = "hidden";
  //       tooltip.style.opacity = "0";
  //     });
  //   });

  // Initialize the state on page load
  window.onload = function () {
    const toggleSwitch = document.getElementById("toggleSwitch");
    if (window.screen.width <= 990) {
      toggleSwitch.checked = false;
    }

    toggleSection();

    toggleSwitch.addEventListener("change", toggleSection);
    window.addEventListener("resize", toggleSection);
  };
  //highlightsURLs
  highlightEditableUrls(urlInputs);
  initAutoCloseCollapses();
}

// pop-up message for Contributor and Author tabs
function showPopup() {
  document.getElementById("popup").style.display = "block";
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}

// Function to check if the popup should be shown for a given tab and repo
function checkAndShowPopup(tab, repo) {
  const key = `popupShown-${repo}-${tab}`;
  if (!localStorage.getItem(key)) {
    showPopup();
    localStorage.setItem(key, "true");
  }
}
// toggle
function toggleSection() {
  var formContainer = document.getElementById("formContainer");
  var metadataFormDisplay = document.getElementById("metadataFormDisplay");
  var toggleSwitch = document.getElementById("toggleSwitch");
  var personInfoElements = document.querySelectorAll(".person-info"); // Select all elements with the class 'person-info'
  if (window.screen.width <= 990 && toggleSwitch.checked == false) {
    formContainer.style.height = "100%";
  } else if (window.screen.width <= 990 && toggleSwitch.checked) {
    formContainer.style.height = "50%";
  } else {
    formContainer.style.height = "99%";
  }
  if (toggleSwitch.checked) {
    metadataFormDisplay.style.display = "block";
    formContainer.classList.remove("col-lg-12");
    formContainer.classList.add("col-lg-9");
    metadataFormDisplay.classList.add("col-lg-3");

    personInfoElements.forEach(function (element) {
      // element.style.width = '57%';
    });
  } else {
    metadataFormDisplay.style.display = "none";
    formContainer.classList.remove("col-lg-9");
    formContainer.classList.add("col-lg-12");
    metadataFormDisplay.classList.remove("col-lg-3");

    personInfoElements.forEach(function (element) {
      element.style.width = "70%";
    });
  }
}

// UI feedback on copy
export function actionFeedback(value) {
  var feedback = document.getElementById("actionFeedback");
  feedback.innerHTML = value;
  feedback.style.display = "inline";
  setTimeout(function () {
    feedback.style.display = "none";
  }, 2000);
}

export function toggleCollapse() {
  const content = document.getElementById("contributor-explanation");
  if (content) {
    content.style.display =
      content.style.display === "none" || content.style.display === ""
        ? "block"
        : "none";
  }
}
window.toggleCollapse = toggleCollapse;

// Applying the yellow border for suggesting the user to change or review the extracted value
export function highlightEditableUrls(urlInputs) {
  urlInputs.forEach((input) => {
    const initialValue = input.value;
    if (initialValue !== "") {
      input.style.border = "2px solid yellow";
      input.style.backgroundColor = "#fef6da";
    }
    input.addEventListener("input", () => {
      if (input.value !== initialValue) {
        input.style.border = "";
        input.style.backgroundColor = "";
      } else if (initialValue !== "") {
        // Reapply the yellow border if the value is reset to the initial value
        input.style.border = "2px solid yellow";
        input.style.backgroundColor = "#fef6da";
      }
    });
  });
}

// Pinkish inputs, when no metadata is extracted
export function validateInput(input) {
  const skipValidationIds = [
    "contributorGivenNameInput",
    "contributorFamilyNameInput",
    "contributorEmailInput",
    "authorGivenNameInput",
    "authorFamilyNameInput",
    "authorEmailInput",
  ];
  if (skipValidationIds.includes(input.id)) {
    return; // Skip validation for the specified inputs
  }

  // Always remove highlight classes before validation
  input.classList.remove("invalid", "invalid-required", "invalid-recommended");

  // Fetch schema and validate only if field is required or recommended
  getSchema()
    .then((schema) => {
      const { required, recommended } =
        fetchRequiredAndRecommendedFields(schema);
      // --- Tagging support ---
      // If input is inside a tags-container, validate the hidden input instead
      const tagsContainer = input.closest(".tags-container");
      if (tagsContainer) {
        const taggingWrapper = tagsContainer.closest(".tagging-wrapper");
        if (taggingWrapper) {
          const hiddenInput = taggingWrapper.querySelector(
            'input[type="hidden"]',
          );
          const label = taggingWrapper.querySelector(".tagging-label");
          const taggingType = label
            ? label.getAttribute("data-tagging-type")
            : null;
          const key = getFieldKey(hiddenInput);

          if (required.includes(key)) {
            if (
              (taggingType === "tagging_object" &&
                isTaggingObjectEmpty(tagsContainer)) ||
              (taggingType !== "tagging_object" &&
                hiddenInput.value.trim() === "")
            ) {
              input.classList.add("invalid-required");
            }
          } else if (recommended.includes(key)) {
            if (
              (taggingType === "tagging_object" &&
                isTaggingObjectEmpty(tagsContainer)) ||
              (taggingType !== "tagging_object" &&
                hiddenInput.value.trim() === "")
            ) {
              input.classList.add("invalid-recommended");
            }
          } else {
            input.classList.remove("invalid");
          }
          return;
        }
      }

      // --- Standard input/select validation ---
      const key = getFieldKey(input);
      if (required.includes(key)) {
        if (input.value.trim() === "") {
          input.classList.add("invalid-required");
        }
      } else if (recommended.includes(key)) {
        if (input.value.trim() === "") {
          input.classList.add("invalid-recommended");
        }
      }
    })
    .catch(() => {
      // On schema load error, fallback to no validation
      input.classList.remove(
        "invalid",
        "invalid-required",
        "invalid-recommended",
      );
    });
}

function isTaggingObjectEmpty(tagsContainer) {
  // Count the number of .tag elements inside the tagsContainer
  const tagCount = tagsContainer.querySelectorAll(".tag").length;
  return tagCount === 0;
}

// loading spinner
function lodder(formId, overlayId, delay = 2000) {
  const form = document.getElementById(formId);
  const overlay = document.getElementById(overlayId);

  if (!form || !overlay) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent default submission
    overlay.classList.add("active"); // Show loading overlay

    setTimeout(function () {
      form.submit(); // Submit after delay
    }, delay);
  });
}

// loadder Only runs ehen you sumbit the index html form
export function loadpage() {
  const form = document.getElementById("form1");
  const overlay = document.getElementById("overlay");
  if (form && overlay) {
    lodder("form1", "overlay");
  }
}
function initAutoCloseCollapses(collapseSelector = ".collapsible-content") {
  document.querySelectorAll('[data-bs-toggle="collapse"]').forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = this.getAttribute("data-bs-target");
      const targetCollapse = document.querySelector(targetId);

      document
        .querySelectorAll(`${collapseSelector}.show`)
        .forEach((openCollapse) => {
          if (openCollapse !== targetCollapse) {
            new bootstrap.Collapse(openCollapse, { toggle: false }).hide();
          }
        });
    });
  });
  //  Add click listener to close collapses when clicking outside
  document.addEventListener("click", function (e) {
    const isInsideToggle = e.target.closest('[data-bs-toggle="collapse"]');
    const isInsideCollapse = e.target.closest(collapseSelector);

    if (!isInsideToggle && !isInsideCollapse) {
      document
        .querySelectorAll(`${collapseSelector}.show`)
        .forEach((openCollapse) => {
          new bootstrap.Collapse(openCollapse, { toggle: false }).hide();
        });
    }
  });
}

export function showToast(message, type = "info") {
  // Toast container create if not exist
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  // Toast element
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.padding = "10px 20px";
  toast.style.marginTop = "10px";
  toast.style.borderRadius = "6px";
  toast.style.color = "#fff";
  toast.style.fontSize = "14px";
  toast.style.fontFamily = "sans-serif";
  toast.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.5s";

  // Type based color
  if (type === "error") {
    toast.style.background = "#e74c3c"; // red
  } else if (type === "success") {
    toast.style.background = "#2ecc71"; // green
  } else {
    toast.style.background = "#fef6da"; // yellow
    toast.style.color = "#202020ff";
    toast.style.fontWeight = "bold";
  }

  container.appendChild(toast);

  // Fade in
  setTimeout(() => (toast.style.opacity = "1"), 100);

  // Auto remove after 3 sec
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}
export function initCaptcha() {
  // Auto-hide captcha error after 1 second
  const captchaError = document.getElementById("captcha-error");
  console.log(captchaError);
  if (captchaError) {
    // Show it

    // Fade out after 2 seconds
    setTimeout(function () {
      captchaError.style.transition = "opacity 0.5s ease";
      captchaError.style.opacity = "0";
      setTimeout(function () {
        captchaError.style.display = "none";
      }, 500);
    }, 2000);
  }

  // Refresh captcha button
  const refreshBtn = document.getElementById("captcha-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      // Get CSRF token from cookie
      const csrfToken = getCookie("csrftoken");

      fetch("/captcha/refresh/", {
        method: "POST", // ← must be POST
        headers: {
          "X-CSRFToken": csrfToken, // ← CSRF token required
          "X-Requested-With": "XMLHttpRequest", // ← marks it as AJAX
        },
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Full response data:", data); // ← add this
          console.log("Keys:", Object.keys(data));

          // Use querySelector since Django renders the img without a custom id
          const captchaImg = document.querySelector("img.captcha");
          const captchaKey = document.getElementById("id_captcha_0");
          const captchaInput = document.getElementById("id_captcha_1");

          if (captchaImg) captchaImg.src = data.image_url;
          if (captchaKey) captchaKey.value = data.key;
          if (captchaInput) captchaInput.value = "";
        })
        .catch((err) => console.error("Captcha refresh failed:", err));
    });
  }
}

// Helper to read CSRF token from browser cookie
function getCookie(name) {
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name + "=")) {
      return decodeURIComponent(cookie.substring(name.length + 1));
    }
  }
  return null;
}
