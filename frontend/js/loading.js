// Loading manager centralizado y seguro
(function(global){
    const CSS_FADE_CLASS = 'fade-out';
    const LOADING_ID = 'loadingScreen';

    const Loading = {
        show(message) {
            try {
                let loading = document.getElementById(LOADING_ID);
                if (!loading) {
                    // crear uno si no existe (para mayor robustez)
                    loading = document.createElement('div');
                    loading.id = LOADING_ID;
                    loading.className = 'loading-screen';
                    loading.innerHTML = '<div class="loading-spinner" aria-hidden="true"></div><p class="loading-message"></p>';
                    document.body.appendChild(loading);
                }
                const msgElem = loading.querySelector('.loading-message');
                if (message && msgElem) msgElem.textContent = message;
                loading.style.display = 'flex';
                loading.classList.remove(CSS_FADE_CLASS);
                // for accessibility
                loading.setAttribute('aria-hidden','false');
            } catch (e) {
                console.error('Loading.show error:', e);
            }
        },

        hide() {
            try {
                const loading = document.getElementById(LOADING_ID);
                if (!loading) return;
                // animación de salida limpia
                loading.classList.add(CSS_FADE_CLASS);
                // si no quieres esperar, puedes setear 0
                setTimeout(() => {
                    loading.style.display = 'none';
                    loading.classList.remove(CSS_FADE_CLASS);
                    loading.setAttribute('aria-hidden','true');
                }, 350); // duracion de la animación; mantener sincronía con CSS
            } catch (e) {
                console.error('Loading.hide error:', e);
            }
        },

        // util: wrap async function so it asegura hide() en finally
        wrapAsync(fn, showMsg) {
            return async function(...args) {
                Loading.show(showMsg || '');
                try {
                    return await fn.apply(this, args);
                } finally {
                    Loading.hide();
                }
            };
        }
    };

    // Exponer de forma sencilla:
    global.Loading = Loading;
})(window);
