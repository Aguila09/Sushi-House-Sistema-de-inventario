// Sistema de autenticación y gestión de usuarios
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.bindAuthEvents();
    }

    checkAuthentication() {
        const currentUser = storage.get('currentUser');
        const token = storage.get('authToken');

        if (currentUser && token) {
            this.currentUser = currentUser;
            this.updateUI();
            return;
        }

        // Si ya estamos en la página de login, no redirigir
        const pathname = window.location.pathname;
        const isLoginPage = pathname.endsWith('/pages/login.html') || pathname.endsWith('login.html');
        if (isLoginPage) return;

        // Si estamos dentro de /pages/, redirigir a login relativo (login.html en la misma carpeta)
        // Si estamos en la raíz, redirigir a pages/login.html
        if (pathname.includes('/pages/')) {
            window.location.href = 'login.html';
        } else {
            window.location.href = 'pages/login.html';
        }
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
            // Simular autenticación
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const users = storage.getUsuarios();
            const user = users.find(u => 
                u.email === credentials.email && 
                u.estado === 'activo'
            );

            if (user) {
                // En un sistema real, aquí verificaríamos la contraseña
                this.login(user);
            } else {
                throw new Error('Credenciales inválidas o usuario inactivo');
            }
        } catch (error) {
            this.showNotification('Error de autenticación: ' + error.message, 'error');
        } finally {
            this.setLoginLoading(false);
        }
    }

    login(user) {
        this.currentUser = user;
        
        // Guardar sesión
        storage.set('currentUser', user);
        storage.set('authToken', this.generateToken());
        storage.set('lastLogin', new Date().toISOString());
        
        // Actualizar último acceso del usuario
        const users = storage.getUsuarios();
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex].ultimoAcceso = new Date().toISOString();
            storage.setUsuarios(users);
        }
        
        this.showNotification(`Bienvenido, ${user.nombre}`, 'success');
        
        // Redirigir al dashboard
        setTimeout(() => {
            // redirigir a la raíz desde la carpeta pages/login.html
            window.location.href = '../index.html';
        }, 1000);
    }

    logout() {
        this.showConfirmModal(
            '¿Está seguro de que desea cerrar sesión?',
            () => {
                storage.remove('currentUser');
                storage.remove('authToken');
                this.currentUser = null;
                this.showNotification('Sesión cerrada correctamente', 'info');
                
                setTimeout(() => {
                    // Si estamos en /pages/ quedarnos en login relativo
                    const pathname = window.location.pathname;
                    if (pathname.includes('/pages/')) {
                        window.location.href = 'login.html';
                    } else {
                        window.location.href = 'pages/login.html';
                    }
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
        // Nombre a mostrar (orden de preferencia)
        const name = this.currentUser?.nombre || this.currentUser?.usuario || this.currentUser?.email || 'Usuario';

        // Actualizar todos los elementos que podrían mostrar el nombre
        document.querySelectorAll('#userName, .username, .user-info span').forEach(el => {
            el.textContent = name;
        });

        // Actualizar avatar (iniciales) si existe elemento .user-info .avatar o .avatar
        const initials = this.getInitials(name);
        document.querySelectorAll('.user-info .avatar, .avatar, .avatar-small').forEach(av => {
            av.textContent = initials;
        });
        
        // Mostrar/ocultar elementos según permisos
        this.updatePermissions();
    }

    getInitials(nombre) {
        if (!nombre) return '';
        return nombre.split(' ').map(n => n[0] || '').join('').toUpperCase().substring(0, 2);
    }

    updatePermissions() {
        if (!this.currentUser) return;
        
        // Ejemplo: ocultar funcionalidades para usuarios no admin
        if (this.currentUser.rol !== 'admin') {
            document.querySelectorAll('[data-role="admin"]').forEach(el => {
                el.style.display = 'none';
            });
        }
    }

    generateToken() {
        return 'token_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
    }

    showNotification(message, type = 'info') {
        // Reutilizar el sistema de notificaciones principal si está disponible
        if (window.app && typeof window.app.showNotification === 'function') {
            window.app.showNotification(message, type);
        } else {
            // Sistema básico de notificaciones para login
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
        // Reutilizar el modal de confirmación principal si está disponible
        const modal = document.getElementById('modalConfirm');
        const messageElement = document.getElementById('confirmMessage');
        const btnAccept = document.getElementById('btnConfirmAccept');

        if (messageElement) messageElement.textContent = message;

        if (modal && btnAccept) {
            // clonar para limpiar handlers previos
            const newBtn = btnAccept.cloneNode(true);
            btnAccept.parentNode.replaceChild(newBtn, btnAccept);
            newBtn.addEventListener('click', () => {
                onConfirm();
                modal.classList.remove('show');
            });
            modal.classList.add('show');
            return;
        }

        // Fallback simple
        if (confirm(message)) onConfirm();
    }

    // Métodos de verificación de permisos
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

// Inicializar sistema de autenticación
let auth;
document.addEventListener('DOMContentLoaded', () => {
    auth = new AuthSystem();
});