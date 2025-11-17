// Sistema de confirmación para acciones críticas
(function() {
    let requireConfirmation = false;
    let configLoaded = false;

    // Cargar configuración
    async function loadConfig() {
        if (configLoaded || typeof apiClient === 'undefined') return;
        
        try {
            const config = await apiClient.get('/configuracion/');
            const configData = Array.isArray(config) ? config[0] : config;
            
            if (configData && typeof configData.requerirConfirmacion !== 'undefined') {
                requireConfirmation = configData.requerirConfirmacion;
                configLoaded = true;
                console.log(`Confirmación para acciones críticas: ${requireConfirmation ? 'Activada' : 'Desactivada'}`);
            }
        } catch (error) {
            console.error('Error cargando configuración de confirmación:', error);
            requireConfirmation = false;
        }
    }

    // Función global de confirmación
    window.confirmCriticalAction = async function(message, fallbackConfirm = true) {
        // Cargar config si no se ha cargado
        if (!configLoaded) {
            await loadConfig();
        }

        // Si no se requiere confirmación, ejecutar directamente
        if (!requireConfirmation) {
            return fallbackConfirm ? window.confirm(message) : true;
        }

        // Mostrar modal de confirmación
        return new Promise((resolve) => {
            const modal = document.getElementById('modalConfirm');
            const messageElement = document.getElementById('confirmMessage');
            const btnAccept = document.getElementById('btnConfirmAccept');
            const btnCancel = document.getElementById('btnConfirmCancel');

            if (!modal || !messageElement || !btnAccept || !btnCancel) {
                // Fallback a confirm nativo si no hay modal
                resolve(window.confirm(message));
                return;
            }

            messageElement.textContent = message;

            // Clonar botones para eliminar listeners previos
            const newBtnAccept = btnAccept.cloneNode(true);
            const newBtnCancel = btnCancel.cloneNode(true);
            btnAccept.parentNode.replaceChild(newBtnAccept, btnAccept);
            btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

            // Helpers de cierre
            const doClose = (result) => {
                modal.classList.remove('show');
                document.body.classList.remove('modal-open');
                try { modal.style.display = 'none'; } catch(e) {}
                modal.removeEventListener('click', onModalClick);
                resolve(result);
            };

            const onModalClick = (ev) => {
                if (ev && ev.target && ev.target.getAttribute && ev.target.getAttribute('data-close') === 'true') {
                    doClose(false);
                }
            };
            modal.addEventListener('click', onModalClick, { passive: true });

            // Añadir listeners
            newBtnAccept.addEventListener('click', () => {
                doClose(true);
            });

            newBtnCancel.addEventListener('click', () => {
                doClose(false);
            });

            // Mostrar modal
            document.body.classList.add('modal-open');
            try { modal.style.removeProperty('display'); } catch(e) {}
            modal.classList.add('show');

            // Cerrar con ESC
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    doClose(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    };

    // Cargar config al iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadConfig);
    } else {
        loadConfig();
    }
})();

