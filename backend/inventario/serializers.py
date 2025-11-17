# inventario/serializers.py
from rest_framework import serializers
from .models import Usuario, Categoria, Proveedor, Producto, ConfiguracionSistema
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.text import slugify
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()

class CategoriaSerializer(serializers.ModelSerializer):
    productos_count = serializers.SerializerMethodField()

    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'descripcion', 'activo', 'productos_count']

    def get_productos_count(self, obj):
        return obj.productos.count()


class ProveedorSerializer(serializers.ModelSerializer):
    productos_count = serializers.SerializerMethodField()

    class Meta:
        model = Proveedor
        fields = ['id', 'nombre', 'contacto', 'telefono', 'email', 'direccion', 'activo', 'productos_count']

    def get_productos_count(self, obj):
        return obj.productos.count()


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    categoria = serializers.PrimaryKeyRelatedField(queryset=Categoria.objects.all(), allow_null=True)
    proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all(), allow_null=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'descripcion', 'categoria', 'categoria_nombre',
            'proveedor', 'proveedor_nombre', 'stock', 'stock_minimo',
            'precio', 'fecha_registro', 'fecha_actualizacion', 'activo'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.categoria:
            data['categoria_nombre'] = instance.categoria.nombre
        if instance.proveedor:
            data['proveedor_nombre'] = instance.proveedor.nombre
        return data


class UsuarioSerializer(serializers.ModelSerializer):
    # Exponer flags críticos y último acceso (compatibilidad con frontend)
    is_superuser = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    # Exponer ultimo_acceso unificado (backend puede usar last_login u otro campo)
    ultimo_acceso = serializers.SerializerMethodField(read_only=True)
    nombre = serializers.CharField(read_only=True)

    def get_ultimo_acceso(self, obj):
        # Prioriza ultimo_acceso, si no existe usa last_login
        dt = getattr(obj, 'ultimo_acceso', None) or getattr(obj, 'last_login', None)
        if not dt:
            return None
        # dt debería ser timezone-aware; devolver ISO con offset
        dt_aware = timezone.localtime(dt)  # convierte al timezone del servidor (o usa timezone.utc)
        return dt_aware.isoformat()

    class Meta:
        model = User
        fields = [
            'id', 'usuario', 'nombres', 'apellidos', 'nombre', 'email', 'rol',
            'activo', 'fecha_creacion', 'ultimo_acceso', 'is_staff', 'is_active', 'is_superuser'
        ]
        read_only_fields = ['fecha_creacion', 'is_staff', 'is_active', 'nombre', 'is_superuser']

    def get_ultimo_acceso(self, obj):
        # Prioriza campo 'ultimo_acceso' si existe, si no usa last_login
        vc = None
        if hasattr(obj, 'ultimo_acceso'):
            vc = getattr(obj, 'ultimo_acceso')
        if not vc and hasattr(obj, 'last_login'):
            vc = getattr(obj, 'last_login')
        # devolver ISO o None para frontend (frontend mostrará 'Nunca' si es null)
        return vc.isoformat() if vc else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Aseguramos campo 'nombre' calculado
        if not data.get('nombre'):
            nombres = data.get('nombres') or ''
            apellidos = data.get('apellidos') or ''
            data['nombre'] = (nombres + ' ' + apellidos).strip()
        return data


class UsuarioCreateSerializer(serializers.ModelSerializer):
    # hacer usuario opcional: si no se envía, lo generamos
    usuario = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['usuario', 'nombres', 'apellidos', 'password', 'password_confirm', 'email', 'rol', 'activo']

    def validate(self, attrs):
        # contraseñas coinciden
        pwd = attrs.get('password')
        pwdc = attrs.get('password_confirm')
        if pwd != pwdc:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})

        # validación de password (ya aplicada por validators en el campo, pero capturamos para devolver mensaje amigable)
        try:
            validate_password(pwd, user=self.context.get('request').user if self.context.get('request') else None)
        except DjangoValidationError as e:
            # devolver en el formato que espera el frontend
            raise serializers.ValidationError({"password": list(e.messages)})

        # nombres/apellidos/email requeridos para generar username si hace falta
        nombres = (attrs.get('nombres') or '').strip()
        apellidos = (attrs.get('apellidos') or '').strip()
        email = (attrs.get('email') or '').strip()
        if not nombres or not apellidos:
            raise serializers.ValidationError({"nombres": "Nombres y apellidos son requeridos para crear el usuario."})

        # si no viene 'usuario', lo generamos aquí para comprobar unicidad
        if not attrs.get('usuario'):
            base = slugify(f"{nombres}.{apellidos}").lower()
            if not base:
                # fallback a la parte local del email
                if email and "@" in email:
                    base = slugify(email.split('@', 1)[0]).lower()
                else:
                    base = 'user'
            candidate = base
            suffix = 0
            while User.objects.filter(usuario=candidate).exists():
                suffix += 1
                candidate = f"{base}{suffix}"
            attrs['usuario'] = candidate

        # si el usuario explicitamente enviado existe -> error
        if attrs.get('usuario') and User.objects.filter(usuario=attrs['usuario']).exists():
            raise serializers.ValidationError({"usuario": "El nombre de usuario ya existe. Elige otro."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password', None)
        # validated_data contiene 'usuario' (generado o enviado)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['nombres', 'apellidos', 'email', 'rol', 'activo']

    def validate_rol(self, value):
        # proteger asignacion de superuser a menos que el request.user sea superuser
        request = self.context.get('request')
        if value and str(value).lower().find('super') != -1:
            if not request or not getattr(request.user, 'is_superuser', False):
                raise serializers.ValidationError("No tienes permisos para asignar el rol 'superuser'.")
        return value


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    # Mapeo camelCase <-> snake_case para frontend
    nombreRestaurante = serializers.CharField(source='nombre_restaurante')
    moneda = serializers.CharField()
    iva = serializers.DecimalField(max_digits=5, decimal_places=2)
    formatoFecha = serializers.CharField(source='formato_fecha')
    direccionRestaurante = serializers.CharField(source='direccion_restaurante', allow_blank=True, required=False)
    telefonoRestaurante = serializers.CharField(source='telefono_restaurante', allow_blank=True, required=False)
    stockMinimoGlobal = serializers.IntegerField(source='stock_minimo_global')
    alertaStockBajo = serializers.BooleanField(source='alerta_stock_bajo')
    unidadMedida = serializers.CharField(source='unidad_medida')
    categoriaPredeterminada = serializers.PrimaryKeyRelatedField(source='categoria_predeterminada', queryset=Categoria.objects.all(), allow_null=True, required=False)
    notificacionesAutomaticas = serializers.BooleanField(source='notificaciones_automaticas')
    emailNotificaciones = serializers.EmailField(source='email_notificaciones', allow_blank=True, required=False)
    notifStockBajo = serializers.BooleanField(source='notif_stock_bajo')
    notifStockAgotado = serializers.BooleanField(source='notif_stock_agotado')
    notifReportesAutomaticos = serializers.BooleanField(source='notif_reportes_automaticos')
    notifActividadUsuarios = serializers.BooleanField(source='notif_actividad_usuarios')
    frecuenciaReportes = serializers.CharField(source='frecuencia_reportes')
    horaNotificaciones = serializers.TimeField(source='hora_notificaciones')
    tiempoSesion = serializers.IntegerField(source='tiempo_sesion')
    intentosFallidos = serializers.IntegerField(source='intentos_fallidos')
    requerirConfirmacion = serializers.BooleanField(source='requerir_confirmacion')
    registroActividad = serializers.BooleanField(source='registro_actividad')
    backupAutomatico = serializers.BooleanField(source='backup_automatico')

    class Meta:
        model = ConfiguracionSistema
        fields = [
            'id',
            'nombreRestaurante','moneda','iva','formatoFecha','direccionRestaurante','telefonoRestaurante',
            'stockMinimoGlobal','alertaStockBajo','unidadMedida','categoriaPredeterminada','notificacionesAutomaticas',
            'emailNotificaciones','notifStockBajo','notifStockAgotado','notifReportesAutomaticos','notifActividadUsuarios',
            'frecuenciaReportes','horaNotificaciones','tiempoSesion','intentosFallidos','requerirConfirmacion','registroActividad','backupAutomatico'
        ]

    def create(self, validated_data):
        return ConfiguracionSistema.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
