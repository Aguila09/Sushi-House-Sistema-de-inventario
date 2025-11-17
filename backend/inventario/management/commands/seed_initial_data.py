from django.core.management.base import BaseCommand
from inventario.models import Categoria, Proveedor, Producto, ConfiguracionSistema
from decimal import Decimal

class Command(BaseCommand):
    help = "Crea datos iniciales (categorías, proveedores y algunos productos de ejemplo)."

    def handle(self, *args, **options):
        cfg, _ = ConfiguracionSistema.objects.get_or_create()
        self.stdout.write(self.style.SUCCESS("Configuración verificada/creada."))

        categorias = [
            ("Rollos", "Rollos clásicos y especiales"),
            ("Bebidas", "Bebidas frías y calientes"),
            ("Entradas", "Entradas y botanas"),
        ]
        cat_objs = []
        for nombre, desc in categorias:
            obj, _ = Categoria.objects.get_or_create(nombre=nombre, defaults={"descripcion": desc, "activo": True})
            cat_objs.append(obj)
        self.stdout.write(self.style.SUCCESS(f"Categorías: {Categoria.objects.count()}"))

        prov, _ = Proveedor.objects.get_or_create(nombre="Proveedor Genérico", defaults={"contacto": "", "telefono": "", "email": "", "direccion": ""})
        self.stdout.write(self.style.SUCCESS(f"Proveedores: {Proveedor.objects.count()}"))

        if Producto.objects.count() == 0:
            Producto.objects.create(nombre="California Roll", descripcion="8 piezas", categoria=cat_objs[0], proveedor=prov, stock=20, stock_minimo=5, precio=Decimal('85.00'))
            Producto.objects.create(nombre="Agua Mineral", descripcion="600 ml", categoria=cat_objs[1], proveedor=prov, stock=50, stock_minimo=10, precio=Decimal('20.00'))
            Producto.objects.create(nombre="Gyozas", descripcion="Orden de 6", categoria=cat_objs[2], proveedor=prov, stock=15, stock_minimo=3, precio=Decimal('65.00'))
            self.stdout.write(self.style.SUCCESS("Productos de ejemplo creados."))
        else:
            self.stdout.write("Productos existentes; no se crean duplicados.")

        self.stdout.write(self.style.SUCCESS("Seed inicial completado."))
