from rest_framework import serializers
from .models import Usuario, Categoria, Proveedor, Producto, Configuracion
from django.contrib.auth import get_user_model

User = get_user_model()

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        source='categoria', queryset=Categoria.objects.all(), write_only=True, required=False
    )
    proveedor = ProveedorSerializer(read_only=True)
    proveedor_id = serializers.PrimaryKeyRelatedField(
        source='proveedor', queryset=Proveedor.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'descripcion', 'categoria', 'categoria_id',
            'proveedor', 'proveedor_id',
            'stock', 'stock_minimo', 'precio', 'fecha_registro', 'fecha_actualizacion', 'activo'
        ]


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'rol', 'activo', 'ultimo_acceso']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'password', 'first_name', 'last_name', 'email', 'rol', 'activo']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Configuracion
        fields = '__all__'