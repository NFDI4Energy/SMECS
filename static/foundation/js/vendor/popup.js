// src/popup.js
// Popup display, tooltip handlers, and tab navigation

/** Show the metadata popup dialog. */
export function showPopup() {
    const popup = document.getElementById('popup');
    if (popup) popup.style.display = 'block';
}

// Close button handler
const closeBtn = document.getElementById('closePopup');
if (closeBtn) {
    closeBtn.onclick = () => {
        const popup = document.getElementById('popup');
        if (popup) popup.style.display = 'none';
    };
}

// Click outside popup closes it
window.onclick = event => {
    const popup = document.getElementById('popup');
    if (event.target === popup) {
        popup.style.display = 'none';
    }
};

/** Remember and show popup per-repo and tab */
export function checkAndShowPopup(tab, repo) {
    const key = `popupShown-${repo}-${tab}`;
    if (!localStorage.getItem(key)) {
        showPopup();
        localStorage.setItem(key, 'true');
    }
}

// Tooltip hover for .custom-tooltip-metadata
document.querySelectorAll('.custom-tooltip-metadata').forEach(el => {
    const tooltip = el.querySelector('.tooltip-text-metadata');
    const icon = el.querySelector('i');
    if (!tooltip || !icon) return;
    el.addEventListener('mouseenter', () => {
        Object.assign(tooltip.style, {
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            position: 'fixed',
            zIndex: '9999'
        });
        const rect = icon.getBoundingClientRect();
        tooltip.style.left = `${rect.right}px`;
        tooltip.style.top = `${rect.top + 16}px`;
    });
    el.addEventListener('mouseleave', () => {
        tooltip.style.display = '';
    });
});

/** Toggle collapse sections by class */
export function toggleSection() {
    document.querySelectorAll('.collapsible').forEach(section => {
        section.classList.toggle('collapsed');
    });
}

/** Setup tab navigation */
export function setupTabs(tabs, contents) {
    tabs.forEach(tab => {
        tab.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(tab.getAttribute('href'));
            contents.forEach(c => c.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (target) target.classList.add('active');
        });
    });
}

/** Setup next/prev nav buttons if any */
export function setupNavButtons() {
    const prev = document.getElementById('prev-btn');
    const next = document.getElementById('next-btn');
    if (prev) prev.addEventListener('click', () => window.history.back());
    if (next) next.addEventListener('click', () => window.history.forward());
}
