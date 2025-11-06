// --- app.js (versión robusta con reintentos) ---

/**
 * waitForAuth: espera a que AuthSystem o window.auth estén disponibles.
 * waitForAppClass: espera a que SushiHouseApp (clase) o window.app existan.
 *
 * Hacemos reintentos controlados en lugar de fallar inmediatamente,
 * para cubrir casos de live-reload, orden de carga variable o re-evaluaciones.
 */

function waitForAuth({ timeout = 6000, interval = 50 } = {}) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            const okAuth = (typeof window.AuthSystem === 'function') || !!window.auth;
            if (okAuth) return resolve();
            if (Date.now() - start >= timeout) return reject(new Error('Timeout esperando AuthSystem'));
            setTimeout(check, interval);
        };
        check();
    });
}

function waitForAppClass({ timeout = 6000, interval = 50 } = {}) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            // consideramos la clase disponible si:
            // - existe la clase global SushiHouseApp (typeof === 'function')
            // - o ya existe una instancia window.app
            const okAppClass = (typeof window.SushiHouseApp === 'function') || !!window.app;
            if (okAppClass) return resolve();
            if (Date.now() - start >= timeout) return reject(new Error('Timeout esperando SushiHouseApp'));
            setTimeout(check, interval);
        };
        check();
    });
}

// Intento de inicialización con tres capas:
// 1) esperar auth y clase/app (reintentos)
// 2) intentar inicializar (si ya hay instancia, usarla)
// 3) si falla la creación por NameError, reintentar algunas veces
async function tryInitialize({ maxAttempts = 8, attemptInterval = 200 } = {}) {
    // Primero, asegurarnos de que auth está listo
    try {
        await waitForAuth({ timeout: 6000, interval: 60 });
    } catch (e) {
        console.warn('waitForAuth falló:', e);
        // Permitimos seguir aun si no hay auth, puede ser una página pública
    }

    // Ahora esperar la clase o la instancia
    try {
        await waitForAppClass({ timeout: 6000, interval: 60 });
    } catch (e) {
        console.warn('waitForAppClass: la clase/instancia no apareció en el tiempo esperado:', e);
        // Intentaremos igualmente, con reintentos manuales
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`Inicialización: intento ${attempt}/${maxAttempts}...`);

            // Si ya hay instancia, la reutilizamos
            if (window.app) {
                console.log('Ya existe window.app -> usando instancia existente');
                // Verificar listeners y devolverla
                if (typeof window.app.verifyEventListeners === 'function') {
                    try { window.app.verifyEventListeners(); } catch (e) { console.warn(e); }
                }
                return window.app;
            }

            // Si la clase está disponible, crear nueva instancia
            if (typeof window.SushiHouseApp === 'function') {
                console.log('SushiHouseApp encontrada como clase -> creando instancia');
                window.app = new window.SushiHouseApp();
                if (typeof window.app.verifyEventListeners === 'function') {
                    try { window.app.verifyEventListeners(); } catch (e) { console.warn(e); }
                }
                return window.app;
            }

            // Si la clase no está, intentar acceder al identificador global (por si fue declarada sin window)
            if (typeof SushiHouseApp === 'function') {
                console.log('SushiHouseApp encontrada (no en window) -> creando instancia y exponiendo en window');
                window.SushiHouseApp = SushiHouseApp;
                window.app = new window.SushiHouseApp();
                if (typeof window.app.verifyEventListeners === 'function') {
                    try { window.app.verifyEventListeners(); } catch (e) { console.warn(e); }
                }
                return window.app;
            }

            // Si llegamos aquí, no existe la clase aún. Esperar y reintentar.
            console.log('SushiHouseApp no encontrada todavía, esperando antes del próximo intento...');
            await new Promise(r => setTimeout(r, attemptInterval));
        } catch (err) {
            // Si en algún intento lanza un ReferenceError o similar, lo atrapamos y reintentamos
            console.warn('Error creando instancia (se reintentará):', err);
            await new Promise(r => setTimeout(r, attemptInterval));
        }
    }

    // Si fallaron todos los intentos, informar (pero no romper la UI)
    console.error('No se pudo inicializar SushiHouseApp después de varios intentos.');
    // Mostrar aviso visible opcional para el usuario
    try {
        const warnId = '__app_init_warn';
        if (!document.getElementById(warnId)) {
            const warn = document.createElement('div');
            warn.id = warnId;
            warn.style.cssText = 'position:fixed;top:10px;left:10px;padding:12px;background:#ffd;z-index:9999;border:1px solid #cc9;border-radius:6px;';
            warn.textContent = 'No fue posible iniciar la aplicación (SushiHouseApp no cargó). Revisa la consola.';
            document.body.appendChild(warn);
        }
    } catch (e) {
        /* ignore dom errors */
    }
    return null;
}

// Inicialización pública (mantener API anterior)
window.initializeSushiHouseApp = async () => {
    console.log('Inicializando aplicación (robusta)...');

    try {
        const appInstance = await tryInitialize();
        if (appInstance) {
            console.log('Inicialización completada (app lista)');
            return appInstance;
        } else {
            throw new Error('Inicialización incompleta: no se dispone de appInstance');
        }
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        throw error;
    }
};

// Arranque al DOMContentLoaded: detecta si estamos en páginas relevantes y lanza init
document.addEventListener('DOMContentLoaded', () => {
    const pathname = window.location.pathname || '';
    const isDashboardPage = pathname.includes('index.html') ||
        !!document.getElementById('tablaProductos') ||
        !!document.querySelector('.dashboard');

    if (isDashboardPage) {
        console.log('Página del dashboard detectada, se intentará inicializar la app...');
        // No bloquear: llamamos a initializeSushiHouseApp que reintentará si hace falta
        window.initializeSushiHouseApp().catch(err => {
            console.error('initializeSushiHouseApp falló al iniciar automáticamente:', err);
        });
    }
});

// Reintento adicional si auth se vuelve listo más tarde
window.addEventListener('authReady', () => {
    console.log('Evento authReady recibido — intento de inicialización en background');
    window.initializeSushiHouseApp().catch(err => {
        console.warn('Inicialización post-authReady fallida (se ignorará):', err);
    });
});
