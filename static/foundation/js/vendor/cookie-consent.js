// static/foundation/js/vendor/cookie-consent.js
// Handles cookie consent banner — accept, decline, and withdraw logic

export function initCookieConsent() {

    const banner = document.getElementById('cookie-banner');
    const SIX_MONTHS = 180 * 24 * 60 * 60;
    const TEN_MINUTES = 10 * 60;

    // Banner doesn't exist if user already consented — exit early
    if (!banner) return;

    const acceptBtn = document.getElementById('cookie-accept');
    const declineBtn = document.getElementById('cookie-decline');

    // Accept button — saves consent and hides banner
    acceptBtn.addEventListener('click', function () {
        document.cookie = "cookie_consent=true; path=/; max-age=" + SIX_MONTHS + "; SameSite=Lax";
        banner.style.display = 'none';
    });

    // Decline button — saves decline and hides banner
    declineBtn.addEventListener('click', function () {
        document.cookie = "cookie_consent=false; path=/; max-age=" + TEN_MINUTES + "; SameSite=Lax";
        banner.style.display = 'none';
    });
}


// Withdraw consent — called from the legals page withdraw button
// Exported so it can be used in legals.html inline onclick or imported
export function withdrawConsent() {
    const TEN_MINUTES = 10 * 60;
    document.cookie = "cookie_consent=false; path=/; max-age=" + TEN_MINUTES + "; SameSite=Lax";

    // Show confirmation message
    const confirmMsg = document.getElementById('withdraw-confirm');
    if (confirmMsg) {
        confirmMsg.style.display = 'block';
    }

    // Update button state
    const withdrawBtn = document.getElementById('withdraw-btn');
    if (withdrawBtn) {
        withdrawBtn.disabled = true;
        withdrawBtn.textContent = 'Consent withdrawn';
        withdrawBtn.style.opacity = '0.6';
        withdrawBtn.style.cursor = 'default';
    }
}