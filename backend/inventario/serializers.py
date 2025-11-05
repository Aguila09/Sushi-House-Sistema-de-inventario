# inventario/serializers.py
from rest_framework import serializers
from .models import Usuario, Categoria, Proveedor, Producto, ConfiguracionSistema  # ✅ Cambiado aquí
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

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
    class Meta:
        model = User
        fields = [
            'id', 'usuario', 'nombres', 'apellidos', 'nombre', 'email', 'rol', 
            'activo', 'fecha_creacion', 'ultimo_acceso', 'is_staff', 'is_active'
        ]
        read_only_fields = ['fecha_creacion', 'is_staff', 'is_active', 'nombre']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['usuario', 'nombres', 'apellidos', 'password', 'password_confirm', 'email', 'rol', 'activo']  # ✅ Cambiado de username a usuario

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['nombres', 'apellidos', 'email', 'rol', 'activo']


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):  # ✅ Cambiado nombre
    class Meta:
        model = ConfiguracionSistema
        fields = '__all__'