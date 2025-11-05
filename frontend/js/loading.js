// frontend/js/loading.js
// Robust loading overlay manager that integrates with CSS transition (.fade-out).
// - Uses ref counting so nested show()/hide() pairs work correctly.
// - Waits for CSS transitionend to fully hide, with a JS timeout fallback.
// - Exposes Loading.show/hide/wrapAsync and global compatibility functions.

(function (global) {
  const LOADING_ID = 'loadingScreen';
  const FADE_CLASS = 'fade-out';
  let refCount = 0;           // number of active show() requests
  let hideTimer = null;
  let awaitingTransition = false;

  function createLoadingNode() {
    let node = document.getElementById(LOADING_ID);
    if (node) return node;

    node = document.createElement('div');
    node.id = LOADING_ID;
    node.className = 'loading-screen';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = '<div class="loading-spinner" aria-hidden="true"></div><p class="loading-message" aria-hidden="true"></p>';
    document.body.appendChild(node);
    return node;
  }

  function getTransitionDurationMs(elem) {
    try {
      const cs = window.getComputedStyle(elem);
      // transitionDuration can be comma-separated, take the max
      let t = cs.transitionDuration || '0s';
      let parts = t.split(',').map(s => s.trim());
      let max = 0;
      for (const p of parts) {
        if (p.endsWith('ms')) {
          max = Math.max(max, parseFloat(p));
        } else if (p.endsWith('s')) {
          max = Math.max(max, parseFloat(p) * 1000);
        }
      }
      return Math.ceil(max);
    } catch (e) {
      return 400; // default
    }
  }

  function clearPendingHide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    awaitingTransition = false;
  }

  const Loading = {
    show(message) {
      try {
        refCount = Math.max(0, refCount) + 1;
        const node = createLoadingNode();

        // if currently fading out, cancel it and show immediately
        if (node.classList.contains(FADE_CLASS)) {
          node.classList.remove(FADE_CLASS);
        }
        clearPendingHide();

        // set message if provided
        const msgElem = node.querySelector('.loading-message');
        if (message && msgElem) {
          msgElem.textContent = message;
          msgElem.setAttribute('aria-hidden', 'false');
        } else if (msgElem) {
          msgElem.textContent = '';
          msgElem.setAttribute('aria-hidden', 'true');
        }

        // ensure visible
        node.style.display = 'flex';
        node.style.opacity = '1';
        node.style.visibility = 'visible';
        node.setAttribute('aria-hidden', 'false');
      } catch (e) {
        // fail silently but log
        console.error('Loading.show error:', e);
      }
    },

    hide(force = false) {
      try {
        // if force=true, bypass refCount and hide immediately
        if (!force) {
          refCount = Math.max(0, refCount - 1);
          if (refCount > 0) {
            // other callers still need the overlay
            return;
          }
        } else {
          refCount = 0;
        }

        const node = document.getElementById(LOADING_ID);
        if (!node) return;

        // If already hidden or already waiting, ignore
        if (node.style.display === 'none' || awaitingTransition) return;

        // Start fade out by adding the FADE_CLASS which relies on CSS transition
        node.classList.add(FADE_CLASS);
        awaitingTransition = true;

        // Use transitionend event to finally hide; also set a timeout fallback
        const onTransitionEnd = (ev) => {
          // ensure event from the overlay itself or its opacity property
          if (ev && ev.target !== node) return;
          cleanupAndHide();
        };

        const cleanupAndHide = () => {
          clearPendingHide();
          node.removeEventListener('transitionend', onTransitionEnd);
          // fully hide after transition
          node.style.display = 'none';
          node.style.opacity = '0';
          node.style.visibility = 'hidden';
          node.classList.remove(FADE_CLASS);
          node.setAttribute('aria-hidden', 'true');
          const msgElem = node.querySelector('.loading-message');
          if (msgElem) {
            msgElem.textContent = '';
            msgElem.setAttribute('aria-hidden', 'true');
          }
        };

        // Add event listener
        node.addEventListener('transitionend', onTransitionEnd, { once: true });

        // Fallback: timeout slightly longer than CSS duration
        const dur = getTransitionDurationMs(node) || 400;
        hideTimer = setTimeout(() => {
          cleanupAndHide();
        }, Math.max(250, dur + 50)); // ensure at least small delay
      } catch (e) {
        console.error('Loading.hide error:', e);
      }
    },

    // Force hide immediately (ignore refCount and skip transition)
    hideImmediate() {
      try {
        refCount = 0;
        const node = document.getElementById(LOADING_ID);
        if (!node) return;
        clearPendingHide();
        node.style.display = 'none';
        node.style.opacity = '0';
        node.style.visibility = 'hidden';
        node.classList.remove(FADE_CLASS);
        node.setAttribute('aria-hidden', 'true');
        const msgElem = node.querySelector('.loading-message');
        if (msgElem) {
          msgElem.textContent = '';
          msgElem.setAttribute('aria-hidden', 'true');
        }
      } catch (e) {
        console.error('Loading.hideImmediate error:', e);
      }
    },

    // Wrap an async function so Loading.show is called before and Loading.hide in finally.
    // Usage: someFunc = Loading.wrapAsync(async function(...) { ... }, 'Cargando...');
    wrapAsync(fn, showMsg) {
      return async function (...args) {
        Loading.show(showMsg || '');
        try {
          return await fn.apply(this, args);
        } finally {
          Loading.hide();
        }
      };
    },

    // Expose for debugging / inspection
    _debug: {
      get refCount() { return refCount; },
      get awaitingTransition() { return awaitingTransition; }
    }
  };

  // Expose to global scope
  global.Loading = Loading;

  // Backwards compatibility: some older code might call showLoading/hideLoading on the global scope
  if (typeof global.showLoading === 'undefined') {
    global.showLoading = function (msg) { Loading.show(msg); };
  }
  if (typeof global.hideLoading === 'undefined') {
    global.hideLoading = function () { Loading.hide(); };
  }

})(window);
