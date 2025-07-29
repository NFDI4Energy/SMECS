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
        document.querySelectorAll(".tab-links_ext a")
      );
      const activeTab = tabLinks.find((link) =>
        link.parentElement.classList.contains("active")
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
        document.querySelectorAll(".tab-links_ext a")
      );
      const activeTab = tabLinks.find((link) =>
        link.parentElement.classList.contains("active")
      );
      if (!activeTab) return;
      const currentIndex = tabLinks.indexOf(activeTab);
      if (currentIndex > 0) {
        tabLinks[currentIndex - 1].click();
      }
    });
  });

  // custom tooltips
  document
    .querySelectorAll(".custom-tooltip-metadata")
    .forEach(function (element) {
        const tooltip = element.querySelector(".tooltip-text-metadata");
        const icon = element.querySelector("i");

        // Helper to get scale factor from parent (default 1)
        function getScaleFactor(el) {
            let scale = 1;
            let parent = el;
            while (parent) {
                const transform = window.getComputedStyle(parent).transform;
                if (transform && transform !== "none") {
                    const match = transform.match(/matrix\(([^,]+),[^,]+,[^,]+,[^,]+,[^,]+,[^,]+\)/);
                    if (match) {
                        scale *= parseFloat(match[1]);
                    }
                }
                parent = parent.parentElement;
            }
            return scale;
        }


        element.addEventListener("mouseenter", function () {
          tooltip.style.display = "block";
          tooltip.style.visibility = "visible";
          tooltip.style.opacity = "1";
          tooltip.style.position = "absolute";
          tooltip.style.zIndex = "9999";
          const rect = icon.getBoundingClientRect();
          const margin = 16;

          // Find the scale factor (if any) from the closest scaled parent
          const scale = getScaleFactor(icon.parentElement);
          console.info("Tooltip scale factor:", scale);

          // Adjust position for scale
          //let left = rect.right * scale;
          //let top = (rect.top + margin) * scale;
          let left = 16;
          let top = 16;
          tooltip.style.left = left + "px";
          tooltip.style.top = top + "px";
      });
      element.addEventListener("mouseleave", function () {
        tooltip.style.display = "none";
        tooltip.style.visibility = "hidden";
        tooltip.style.opacity = "0";
      });
    });

  // Initialize the state on page load
  window.onload = function () {
    toggleSection();
    document
      .getElementById("toggleSwitch")
      .addEventListener("change", toggleSection);
  };
  //highlightsURLs
  highlightEditableUrls(urlInputs);
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

  if (toggleSwitch.checked) {
    metadataFormDisplay.style.display = "block";
    formContainer.classList.remove("full-width");
    formContainer.classList.add("half-width");
    personInfoElements.forEach(function (element) {
      // element.style.width = '57%';
    });
  } else {
    metadataFormDisplay.style.display = "none";
    formContainer.classList.remove("half-width");
    formContainer.classList.add("full-width");
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
            'input[type="hidden"]'
          );
          const label = taggingWrapper.querySelector(".tagging-label");
          const taggingType = label
            ? label.getAttribute("data-tagging-type")
            : null;
          const key = getFieldKey(hiddenInput);

          if (required.includes(key)) {
            if (
              (taggingType === "tagging_object" && isTaggingObjectEmpty(tagsContainer)) ||
              (taggingType !== "tagging_object" && hiddenInput.value.trim() === "")
               ) {
                 input.classList.add("invalid-required");
            }
          } else if (recommended.includes(key)) {
            if (
              (taggingType === "tagging_object" && isTaggingObjectEmpty(tagsContainer)) ||
              (taggingType !== "tagging_object" && hiddenInput.value.trim() === "")
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
        input.classList.remove("invalid", "invalid-required", "invalid-recommended");
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
