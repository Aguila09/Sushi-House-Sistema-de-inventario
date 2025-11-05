// Sistema de autenticación y gestión de usuarios
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.api = apiClient;
        this.init();
        
        // Escuchar eventos de refresh de token
        window.addEventListener('tokenRefreshed', async (event) => {
            try {
                // Actualizar información del usuario cuando el token se refresca
                const userResponse = await this.api.get('/usuarios/me/');
                this.currentUser = userResponse;
                localStorage.setItem('currentUser', JSON.stringify(userResponse));
                this.updateUI();
            } catch (error) {
                console.error('Error actualizando usuario después de refresh:', error);
            }
        });
    }

    init() {
        this.checkAuthentication();
        this.bindAuthEvents();
    }

    checkAuthentication() {
        const currentUser = localStorage.getItem('currentUser');
        const token = localStorage.getItem('authToken');

        if (currentUser && token) {
            this.currentUser = JSON.parse(currentUser);
            this.updateUI();
            return;
        }

        // Si ya estamos en la página de login, no redirigir
        const pathname = window.location.pathname || '';
        const isLoginPage = pathname.includes('login.html');
        if (isLoginPage) return;

        // Redirigir a login sin añadir entrada al historial
        window.location.replace('login.html');
    }

    bindAuthEvents() {
        // Logout
        document.getElementById('btnLogout')?.addEventListener('click', () => this.logout());
        
        // Login form
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const credentials = Object.fromEntries(formData.entries());
        
        this.setLoginLoading(true);

        try {
            console.log('Iniciando proceso de login...');
            let usernameToUse = credentials.email;
            
            if (usernameToUse && usernameToUse.includes('@')) {
                console.log('Email detectado, resolviendo usuario...');
                try {
                    const resolveResponse = await fetch('http://localhost:8000/api/auth/resolve-user/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: usernameToUse })
                    });
                    
                    if (resolveResponse.ok) {
                        const userData = await resolveResponse.json();
                        if (userData.usuario) {
                            usernameToUse = userData.usuario;
                            console.log('Usuario resuelto:', usernameToUse);
                        }
                    } else if (resolveResponse.status === 404) {
                        throw new Error('No existe ningún usuario con ese email');
                    }
                } catch (e) {
                    throw new Error(e.message || 'Usuario o contraseña incorrectos');
                }
            }

            console.log('Solicitando token...');
            const tokenPayload = {
                usuario: usernameToUse,
                password: credentials.password
            };
            
            const response = await this.api.post('/token/', tokenPayload);

            if (response && response.access) {
                console.log('Token recibido, actualizando cliente API...');
                // Actualizar el token en el cliente API
                this.api.token = response.access;
                localStorage.setItem('authToken', response.access);
                localStorage.setItem('refreshToken', response.refresh);
                
                console.log('Obteniendo información del usuario...');
                // Obtener información del usuario actual con el nuevo token
                const userResponse = await this.api.get('/usuarios/me/');
                console.log('Información de usuario recibida:', userResponse);
                
                this.currentUser = userResponse;
                localStorage.setItem('currentUser', JSON.stringify(userResponse));
                
                const displayName = userResponse.nombre || userResponse.usuario || userResponse.email || 'Usuario';
                this.showNotification(`Bienvenido, ${displayName}`, 'success');
                
                console.log('Redirigiendo al dashboard...');
                setTimeout(() => {
                    window.location.replace('index.html');
                }, 1000);
            } else {
                throw new Error('Credenciales inválidas');
            }
        } catch (error) {
            this.showNotification('Error de autenticación: ' + error.message, 'error');
        } finally {
            this.setLoginLoading(false);
        }
    }

    logout() {
        this.showConfirmModal(
            '¿Está seguro de que desea cerrar sesión?',
            () => {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                this.currentUser = null;
                this.showNotification('Sesión cerrada correctamente', 'info');
                
                setTimeout(() => {
                    window.location.replace('login.html');
                }, 1000);
            }
        );
    }

    setLoginLoading(loading) {
        const btnSubmit = document.querySelector('#loginForm button[type="submit"]');
        if (btnSubmit) {
            if (loading) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<div class="btn-loading"></div> Autenticando...';
            } else {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = 'Iniciar Sesión';
            }
        }
    }

    updateUI() {
        const name = this.currentUser?.first_name || this.currentUser?.username || 'Usuario';
        document.querySelectorAll('#userName, .username, .user-info span').forEach(el => {
            el.textContent = name;
        });

        const initials = this.getInitials(name);
        document.querySelectorAll('.user-info .avatar, .avatar, .avatar-small').forEach(av => {
            av.textContent = initials;
        });
        
        this.updatePermissions();
    }

    getInitials(nombre) {
        if (!nombre) return '';
        return nombre.split(' ').map(n => n[0] || '').join('').toUpperCase().substring(0, 2);
    }

    updatePermissions() {
        if (!this.currentUser) return;
        
        if (!this.currentUser.is_staff) {
            document.querySelectorAll('[data-role="admin"]').forEach(el => {
                el.style.display = 'none';
            });
        }
    }

    showNotification(message, type = 'info') {
        if (window.app && typeof window.app.showNotification === 'function') {
            window.app.showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-left: 4px solid #3498db;
                z-index: 1000;
                max-width: 300px;
            `;
            
            if (type === 'error') notification.style.borderLeftColor = '#e74c3c';
            if (type === 'success') notification.style.borderLeftColor = '#2ecc71';
            if (type === 'warning') notification.style.borderLeftColor = '#f39c12';
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => notification.remove(), 5000);
        }
    }

    showConfirmModal(message, onConfirm) {
        const modal = document.getElementById('modalConfirm');
        const messageElement = document.getElementById('confirmMessage');
        const btnAccept = document.getElementById('btnConfirmAccept');

        if (messageElement) messageElement.textContent = message;

        if (modal && btnAccept) {
            const newBtn = btnAccept.cloneNode(true);
            btnAccept.parentNode.replaceChild(newBtn, btnAccept);
            newBtn.addEventListener('click', () => {
                onConfirm();
                modal.classList.remove('show');
            });
            modal.classList.add('show');
            return;
        }

        if (confirm(message)) onConfirm();
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const permissions = {
            'admin': ['create', 'read', 'update', 'delete', 'manage_users'],
            'usuario': ['create', 'read', 'update'],
            'invitado': ['read']
        };
        
        return permissions[this.currentUser.rol]?.includes(permission) || false;
    }

    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            this.showNotification('No tiene permisos para realizar esta acción', 'error');
            return false;
        }
        return true;
    }
}

// Exponer la clase para que index.html la detecte si hace la comprobación
window.AuthSystem = AuthSystem;

let auth;
// Instanciar inmediatamente para que esté disponible para otros módulos que lo necesiten.
// (Los event listeners dentro de AuthSystem usan optional chaining, así que si los elementos del DOM
// no existen aún, no fallarán.)
try {
    auth = new AuthSystem();
    window.auth = auth;
    console.log('auth.js: AuthSystem instanciado y expuesto en window.auth');
    // Avisar a cualquier otro script que esté escuchando que auth ya está listo
    window.dispatchEvent(new Event('authReady'));
} catch (e) {
    console.error('auth.js: error instanciando AuthSystem:', e);
}