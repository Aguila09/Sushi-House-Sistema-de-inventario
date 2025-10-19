// Sistema de validación mejorado
class ValidationSystem {
    constructor() {
        this.rules = {
            nombre: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/,
                message: "El nombre debe tener entre 2 y 100 caracteres y solo puede contener letras, números, espacios, guiones y puntos"
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Por favor ingrese un email válido"
            },
            precio: {
                required: true,
                min: 0,
                max: 1000000,
                message: "El precio debe ser un número entre 0 y 1,000,000"
            },
            stock: {
                required: true,
                min: 0,
                max: 100000,
                message: "El stock debe ser un número entre 0 y 100,000"
            },
            stockMinimo: {
                required: true,
                min: 0,
                max: 10000,
                message: "El stock mínimo debe ser un número entre 0 y 10,000"
            },
            telefono: {
                required: false,
                pattern: /^[\+]?[0-9\s\-\(\)]{7,15}$/,
                message: "Por favor ingrese un número de teléfono válido"
            },
            descripcion: {
                required: false,
                maxLength: 500,
                message: "La descripción no puede exceder los 500 caracteres"
            }
        };
    }

    validateField(fieldName, value) {
        const rule = this.rules[fieldName];
        if (!rule) return { isValid: true, message: '' };

        // Validación de campo requerido
        if (rule.required && (!value || value.toString().trim() === '')) {
            return { isValid: false, message: 'Este campo es requerido' };
        }

        // Si no es requerido y está vacío, es válido
        if (!rule.required && (!value || value.toString().trim() === '')) {
            return { isValid: true, message: '' };
        }

        // Validación de longitud mínima
        if (rule.minLength && value.toString().length < rule.minLength) {
            return { isValid: false, message: `Mínimo ${rule.minLength} caracteres requeridos` };
        }

        // Validación de longitud máxima
        if (rule.maxLength && value.toString().length > rule.maxLength) {
            return { isValid: false, message: `Máximo ${rule.maxLength} caracteres permitidos` };
        }

        // Validación de valor mínimo
        if (rule.min !== undefined && parseFloat(value) < rule.min) {
            return { isValid: false, message: `El valor mínimo permitido es ${rule.min}` };
        }

        // Validación de valor máximo
        if (rule.max !== undefined && parseFloat(value) > rule.max) {
            return { isValid: false, message: `El valor máximo permitido es ${rule.max}` };
        }

        // Validación de patrón
        if (rule.pattern && !rule.pattern.test(value.toString())) {
            return { isValid: false, message: rule.message };
        }

        return { isValid: true, message: '' };
    }

    validateForm(formData) {
        const errors = {};
        let isValid = true;

        Object.keys(formData).forEach(fieldName => {
            const validation = this.validateField(fieldName, formData[fieldName]);
            if (!validation.isValid) {
                errors[fieldName] = validation.message;
                isValid = false;
            }
        });

        // Validaciones cruzadas
        if (formData.stock !== undefined && formData.stockMinimo !== undefined) {
            if (parseInt(formData.stock) < parseInt(formData.stockMinimo)) {
                errors.stock = 'El stock actual no puede ser menor al stock mínimo';
                isValid = false;
            }
        }

        if (formData.clave && formData.confirmarClave) {
            if (formData.clave !== formData.confirmarClave) {
                errors.confirmarClave = 'Las contraseñas no coinciden';
                isValid = false;
            }
        }

        return { isValid, errors };
    }

    // Validación específica para productos
    validateProducto(producto) {
        const baseValidation = this.validateForm(producto);
        
        if (!baseValidation.isValid) {
            return baseValidation;
        }

        // Validación adicional: nombre único
        const productos = storage.getProductos();
        const nombreExiste = productos.some(p => 
            p.nombre.toLowerCase() === producto.nombre.toLowerCase() && 
            p.id !== (producto.id || null)
        );

        if (nombreExiste) {
            return {
                isValid: false,
                errors: { nombre: 'Ya existe un producto con este nombre' }
            };
        }

        return baseValidation;
    }

    // Validación específica para usuarios
    validateUsuario(usuario) {
        const baseValidation = this.validateForm(usuario);
        
        if (!baseValidation.isValid) {
            return baseValidation;
        }

        // Validación adicional: email único
        const usuarios = storage.getUsuarios();
        const emailExiste = usuarios.some(u => 
            u.email.toLowerCase() === usuario.email.toLowerCase() && 
            u.id !== (usuario.id || null)
        );

        if (emailExiste) {
            return {
                isValid: false,
                errors: { email: 'Ya existe un usuario con este email' }
            };
        }

        return baseValidation;
    }

    // Método para mostrar errores en el formulario
    showFieldErrors(formElement, errors) {
        // Limpiar errores previos
        this.clearFieldErrors(formElement);

        // Mostrar nuevos errores
        Object.keys(errors).forEach(fieldName => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            const errorElement = formElement.querySelector(`#error${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
            
            if (field && errorElement) {
                field.classList.add('error');
                errorElement.textContent = errors[fieldName];
            }
        });
    }

    // Método para limpiar errores
    clearFieldErrors(formElement) {
        const errorFields = formElement.querySelectorAll('.error');
        const errorMessages = formElement.querySelectorAll('.error-message');
        
        errorFields.forEach(field => field.classList.remove('error'));
        errorMessages.forEach(element => element.textContent = '');
    }

    // Validación en tiempo real
    setupRealTimeValidation(formElement) {
        const fields = formElement.querySelectorAll('input, select, textarea');
        
        fields.forEach(field => {
            field.addEventListener('blur', () => {
                const fieldName = field.name;
                const value = field.value;
                const validation = this.validateField(fieldName, value);
                
                const errorElement = formElement.querySelector(`#error${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
                
                if (errorElement) {
                    if (!validation.isValid) {
                        field.classList.add('error');
                        errorElement.textContent = validation.message;
                    } else {
                        field.classList.remove('error');
                        errorElement.textContent = '';
                    }
                }
            });

            // Contador de caracteres para textareas
            if (field.tagName === 'TEXTAREA' && field.maxLength) {
                const counterElement = document.getElementById(field.name + 'Counter');
                if (counterElement) {
                    field.addEventListener('input', () => {
                        counterElement.textContent = field.value.length;
                    });
                }
            }
        });
    }
}

// Instancia global del sistema de validación
const validator = new ValidationSystem();