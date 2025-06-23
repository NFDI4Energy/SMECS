// ui.js
/*Popup behavior
Tabs and navigation buttons
Toggle switch visibility for form sections
Tooltips
*/
const metadataJson = document.getElementById("metadata-json");
const urlInputs = document.querySelectorAll('.url-input');

// pop-up message for Contributor and Author tabs
function showPopup() {
  document.getElementById('popup').style.display = 'block';
}

function closePopup() {
  document.getElementById('popup').style.display = 'none';
}

export function setupUI() {
  const closeBtn = document.getElementById('closePopup');
  if (closeBtn) closeBtn.onclick = closePopup;

  window.onclick = function (event) {
      if (event.target === document.getElementById('popup')) {
          closePopup();
      }
  };
  const copyBtn = document.getElementById('copy-button');
 // copy button for json
 copyBtn.addEventListener('click', function (event) {
    event.preventDefault();
    metadataJson.select();
    document.execCommand('copy');
    actionFeedback("Text copied!");
});
  // tabs_ext
  const tabs_ext = document.querySelectorAll('.tab-links_ext a');
  const contents = document.querySelectorAll('.tab-content_ext .tab');

  tabs_ext.forEach(tab => {
      tab.addEventListener('click', function (event) {
          event.preventDefault();
          tabs_ext.forEach(item => item.parentElement.classList.remove('active'));
          contents.forEach(content => content.classList.remove('active'));
          this.parentElement.classList.add('active');
          let contentId = this.getAttribute('href');
          document.querySelector(contentId).classList.add('active');
      });
  });

  // Attach event listeners to all forward buttons
  document.querySelectorAll('.forwardBtn').forEach(function (forwardBtn) {
      forwardBtn.addEventListener('click', function (event) {
          event.preventDefault();
          const tabLinks = Array.from(document.querySelectorAll('.tab-links_ext a'));
          const activeTab = tabLinks.find(link => link.parentElement.classList.contains('active'));
          if (!activeTab) return;
          const currentIndex = tabLinks.indexOf(activeTab);
          if (currentIndex !== -1 && currentIndex < tabLinks.length - 1) {
              tabLinks[currentIndex + 1].click();
          }
      });
  });

  // Attach event listeners to all backward buttons
  document.querySelectorAll('.backwardBtn').forEach(function (backwardBtn) {
      backwardBtn.addEventListener('click', function (event) {
          event.preventDefault();
          const tabLinks = Array.from(document.querySelectorAll('.tab-links_ext a'));
          const activeTab = tabLinks.find(link => link.parentElement.classList.contains('active'));
          if (!activeTab) return;
          const currentIndex = tabLinks.indexOf(activeTab);
          if (currentIndex > 0) {
              tabLinks[currentIndex - 1].click();
          }
      });
  });

  // custom tooltips
  document.querySelectorAll('.custom-tooltip-metadata').forEach(function (element) {
      const tooltip = element.querySelector('.tooltip-text-metadata');
      const icon = element.querySelector('i');
      element.addEventListener('mouseenter', function () {
          tooltip.style.display = 'block';
          tooltip.style.visibility = 'visible';
          tooltip.style.opacity = '1';
          tooltip.style.position = 'fixed';
          tooltip.style.zIndex = '9999';
          const rect = icon.getBoundingClientRect();
          const margin = 16;
          let left = rect.right;
          let top = rect.top + margin;
          tooltip.style.left = left + 'px';
          tooltip.style.top = top + 'px';
      });
      element.addEventListener('mouseleave', function () {
          tooltip.style.display = 'none';
          tooltip.style.visibility = 'hidden';
          tooltip.style.opacity = '0';
      });
  });

  // toggle
  const toggleSwitch = document.getElementById('toggleSwitch');
  if (toggleSwitch) {
      toggleSwitch.addEventListener('change', toggleSection);
      window.addEventListener('load', toggleSection);
  }
  //highlightsURLs
  highlightEditableUrls(urlInputs);
}

// toggle
function toggleSection() {
  var formContainer = document.getElementById('formContainer');
  var metadataFormDisplay = document.getElementById('metadataFormDisplay');
  var toggleSwitch = document.getElementById('toggleSwitch');
  var personInfoElements = document.querySelectorAll('.person-info'); // Select all elements with the class 'person-info'

  if (toggleSwitch.checked) {
      metadataFormDisplay.style.display = 'block';
      formContainer.classList.remove('full-width');
      formContainer.classList.add('half-width');
      personInfoElements.forEach(function (element) {
          // element.style.width = '57%';
      });
  } else {
      metadataFormDisplay.style.display = 'none';
      formContainer.classList.remove('half-width');
      formContainer.classList.add('full-width');
      personInfoElements.forEach(function (element) {
          element.style.width = '70%';
      });
  }
}

// UI feedback on copy
export function actionFeedback(value) {
  var feedback = document.getElementById('actionFeedback');
  feedback.innerHTML = value;
  feedback.style.display = 'inline';
  setTimeout(function () {
      feedback.style.display = 'none';
  }, 2000);
}

export function toggleCollapse() {
  const content = document.getElementById('contributor-explanation');
  if (content) {
      content.style.display = (content.style.display === 'none' || content.style.display === '') ? 'block' : 'none';
  }
}
  window.toggleCollapse = toggleCollapse;

// Applying the yellow border for suggesting the user to change or review the extracted value
  export function highlightEditableUrls(urlInputs) {
    urlInputs.forEach(input => {
        const initialValue = input.value;
        if (initialValue !== "") {
            input.style.border = '2px solid yellow';
            input.style.backgroundColor = '#fef6da';
        }
        input.addEventListener('input', () => {
            if (input.value !== initialValue) {
                input.style.border = '';
                input.style.backgroundColor = '';
            } else if (initialValue !== "") {
                // Reapply the yellow border if the value is reset to the initial value
                input.style.border = '2px solid yellow';
                input.style.backgroundColor = '#fef6da';
            }
        });
    });
}
