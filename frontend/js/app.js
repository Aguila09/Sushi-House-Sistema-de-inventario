// --- app.js ---
// Espera robusta de dependencias antes de inicializar la aplicación
function waitForDependencies({ timeout = 6000, interval = 50 } = {}) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const check = () => {
            const okAuth = (typeof window.AuthSystem === 'function') || (typeof AuthSystem === 'function') || !!window.auth;
            const okAppClass = (typeof window.SushiHouseApp === 'function') || (typeof SushiHouseApp === 'function');

            if (okAuth && okAppClass) {
                resolve();
                return;
            }

            if (Date.now() - start >= timeout) {
                reject(new Error('Timeout esperando dependencias: AuthSystem / SushiHouseApp'));
                return;
            }

            setTimeout(check, interval);
        };

        check();
    });
}

// Inicialización de la aplicación (mantengo tu lógica original dentro)
window.initializeSushiHouseApp = () => {
    console.log('Inicializando aplicación...');
    
    // Asegurar que las dependencias estén cargadas (comprobación por seguridad)
    if (!window.AuthSystem && typeof AuthSystem !== 'function' && !window.auth) {
        console.error('Falta cargar AuthSystem');
        return;
    }
    if (!window.SushiHouseApp && typeof SushiHouseApp !== 'function') {
        console.error('Falta cargar SushiHouseApp');
        return;
    }

    try {
        // Inicializar autenticación
        if (!window.auth) {
            console.log('Inicializando sistema de autenticación...');
            window.auth = new AuthSystem();
        }

        // Inicializar aplicación principal
        if (!window.app) {
            console.log('Inicializando SushiHouseApp...');
            window.app = new SushiHouseApp();
            
            // Verificar que los event listeners estén asignados
            if (typeof window.app.verifyEventListeners === 'function') {
                window.app.verifyEventListeners();
            }
        }

        console.log('Inicialización completada');
        return window.app;
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        throw error;
    }
};

// Inicializar cuando el DOM esté listo, pero esperar dependencias primero
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar en páginas relevantes
    const pathname = window.location.pathname || '';
    const isDashboardPage = pathname.includes('index.html') || 
                          document.getElementById('tablaProductos') || 
                          document.querySelector('.dashboard');
    
    if (isDashboardPage) {
        console.log('Página del dashboard detectada, esperando dependencias...');
        waitForDependencies({ timeout: 6000, interval: 50 })
            .then(() => {
                console.log('Dependencias cargadas — iniciando aplicación');
                // Llamar a la función de inicialización que definiste
                try {
                    window.initializeSushiHouseApp();
                } catch (e) {
                    console.error('Error al ejecutar initializeSushiHouseApp:', e);
                }
            })
            .catch(err => {
                console.error('Falta cargar dependencias necesarias', err);
                // Mostrar aviso visible al usuario
                try {
                    const warn = document.createElement('div');
                    warn.style.cssText = 'position:fixed;top:10px;left:10px;padding:12px;background:#ffd;z-index:9999;border:1px solid #cc9;border-radius:6px;';
                    warn.textContent = 'Error cargando dependencias de la aplicación. Revisa la consola para más detalles.';
                    document.body.appendChild(warn);
                } catch (e) { /* ignore */ }
            });
    }
});

// También, por si algún módulo despacha un evento indicando que auth está listo,
// podemos intentar inicializar de nuevo (safe-checks dentro de initializeSushiHouseApp evitarán duplicados).
window.addEventListener('authReady', () => {
    console.log('Evento authReady recibido — intentando inicializar app si es necesario');
    try {
        // Intentar pero sin forzar (la función chequeará dependencias)
        window.initializeSushiHouseApp();
    } catch (e) {
        console.warn('Inicialización post-authReady falló (se ignorará):', e);
    }
});
