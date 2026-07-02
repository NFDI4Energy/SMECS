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
  // Make JSON viewer read-only
  if (metadataJson) {
    metadataJson.readOnly = true;

   const alertDiv = document.createElement('span');
   alertDiv.className = 'highlight-tag json-readonly-alert';
   alertDiv.innerHTML = 'The JSON viewer is read-only. Please use the form on the left to curate the metadata. <span class="acknowledge-tag">Got it!</span>';
   metadataJson.parentNode.insertBefore(alertDiv, metadataJson);

  // Got it! click handler
   alertDiv.querySelector('.acknowledge-tag').addEventListener('click', function() {
   alertDiv.classList.add('hidden-alert');
   });
  }
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

  
  (function () {
    const tip = document.createElement("div");
    tip.id = "contributor-th-fixed-tooltip";
    document.body.appendChild(tip);

    document
      .querySelectorAll(
        "#contributorTable thead th .custom-tooltip-metadata"
      )
      .forEach(function (trigger) {
        const span = trigger.querySelector(".tooltip-text-metadata");
        if (!span) return;
        const text = span.textContent.trim();
        if (!text) return;

        trigger.addEventListener("mouseenter", function () {
          tip.textContent = text;

          const icon = trigger.querySelector("i") || trigger;
          const r = icon.getBoundingClientRect();

          // Start to the right of the icon, vertically centred
          tip.style.left = r.right + 8 + "px";
          tip.style.top = r.top + r.height / 2 + "px";
          tip.style.transform = "translateY(-50%)";
          tip.classList.add("active");

          // After render: flip left if the tooltip clips the right viewport edge
          requestAnimationFrame(function () {
            const tr = tip.getBoundingClientRect();
            if (tr.right > window.innerWidth - 8) {
              tip.style.left = r.left - tr.width - 8 + "px";
            }
          });
        });

        trigger.addEventListener("mouseleave", function () {
          tip.classList.remove("active");
        });
      });
  })();

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

  // Custom confirmation alert before leaving the Extraction page
  const isExtractionPage = document.querySelector('.tab-links_ext');
  if (isExtractionPage) {
    const leavePopup = document.getElementById('leavePagePopup');
    const confirmBtn = document.getElementById('leavePageConfirm');
    const cancelBtn = document.getElementById('leavePageCancel');
    let pendingDestination = null;

    const navLinks = document.querySelectorAll('#main-nav .nav-link, #new-url-extraction-page');
    navLinks.forEach((link) => {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        pendingDestination = this.getAttribute('href') || '/';
        leavePopup.style.display = 'block';
      });
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if (pendingDestination) {
          window.location.href = pendingDestination;
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        leavePopup.style.display = 'none';
        pendingDestination = null;
      });
    }
  }
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

  const tokenInput = document.getElementById("token_input");
  const tokenError = document.getElementById("token-error");
  const captchaInput = document.getElementById("id_captcha_1");

  if (captchaInput && tokenInput && tokenError) {
    captchaInput.addEventListener("focus", function () {
      if (tokenInput.value.trim() === "") {
        tokenError.style.display = "inline-block";
        tokenError.style.opacity = "1";
        setTimeout(function () {
          tokenError.style.transition = "opacity 0.5s ease";
          tokenError.style.opacity = "0";
          setTimeout(function () {
            tokenError.style.display = "none";
          }, 500);
        }, 2000);
      }
    });

    tokenInput.addEventListener("input", function () {
      if (tokenInput.value.trim() !== "") {
        tokenError.style.display = "none";
      }
    });
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

// Language toggle for legals/impressum page
function toggleLang() {
    const btn = document.getElementById('lang-toggle');
    const isEN = btn.getAttribute('data-lang') === 'en';
    document.getElementById('content-en').classList.toggle('legals-hidden', isEN);
    document.getElementById('content-de').classList.toggle('legals-hidden', !isEN);
    btn.setAttribute('data-lang', isEN ? 'de' : 'en');
    btn.innerHTML = isEN ? '<i class="fa fa-globe" title="Switch to English"></i> English' : '<i class="fa fa-globe" title="Switch to German"></i> Deutsch';
}
window.toggleLang = toggleLang;