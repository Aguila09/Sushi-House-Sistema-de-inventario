from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from .models import Categoria, Proveedor, Producto, ConfiguracionSistema


class APISmokeTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.User = get_user_model()

	def create_user(self, usuario="user", email="user@example.com", password="pass1234", **extra):
		defaults = dict(nombres="Nombre", apellidos="Apellido", activo=True)
		defaults.update(extra)
		return self.User.objects.create_user(usuario=usuario, email=email, password=password, **defaults)

	def get_token(self, usuario, password):
		resp = self.client.post("/api/token/", {"usuario": usuario, "password": password}, format="json")
		return resp

	def auth(self, token):
		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

	def test_token_blocked_when_user_inactive(self):
		self.create_user(usuario="inactive", email="inactive@example.com", password="x", activo=False)
		r = self.get_token("inactive", "x")
		self.assertEqual(r.status_code, 401, r.content)

	def test_backup_requires_admin(self):
		# Non-admin
		self.create_user(usuario="oper", email="oper@example.com", password="x")
		r = self.get_token("oper", "x")
		self.assertEqual(r.status_code, 200, r.content)
		self.auth(r.data["access"]) if "access" in r.data else self.auth(r.json().get("access"))
		r2 = self.client.get("/api/backup/")
		self.assertEqual(r2.status_code, 403, r2.content)

		# Admin
		self.client.credentials()
		self.create_user(usuario="admin", email="admin@example.com", password="x", is_staff=True, is_superuser=True, rol="superuser")
		r = self.get_token("admin", "x")
		self.assertEqual(r.status_code, 200, r.content)
		token = r.data.get("access") if hasattr(r, 'data') else r.json().get("access")
		self.auth(token)
		r3 = self.client.get("/api/backup/")
		self.assertEqual(r3.status_code, 200, r3.content)
		self.assertIn("configuracion", r3.json())

	def test_restore_config_only(self):
		# Admin token
		self.create_user(usuario="admin2", email="admin2@example.com", password="x", is_staff=True, is_superuser=True, rol="superuser")
		r = self.get_token("admin2", "x")
		token = r.data.get("access") if hasattr(r, 'data') else r.json().get("access")
		self.auth(token)

		# Serializer espera campos en camelCase segun ConfiguracionSistemaSerializer
		payload = {"configuracion": {"nombreRestaurante": "Sushi Test", "stockMinimoGlobal": 7}}
		r2 = self.client.post("/api/restore/", payload, format="json")
		self.assertEqual(r2.status_code, 200, r2.content)
		cfg = ConfiguracionSistema.objects.first()
		self.assertIsNotNone(cfg)
		self.assertEqual(cfg.nombre_restaurante, "Sushi Test")
		self.assertEqual(cfg.stock_minimo_global, 7)

	def test_system_reset_endpoint(self):
		# Seed inventario
		c = Categoria.objects.create(nombre="Cat", descripcion="d")
		p = Proveedor.objects.create(nombre="Prov")
		Producto.objects.create(nombre="Prod", descripcion="", categoria=c, proveedor=p, stock=5, stock_minimo=1, precio="10.00")
		self.assertGreater(Producto.objects.count(), 0)

		# Admin token
		self.create_user(usuario="admin3", email="admin3@example.com", password="x", is_staff=True, is_superuser=True, rol="superuser")
		r = self.get_token("admin3", "x")
		token = r.data.get("access") if hasattr(r, 'data') else r.json().get("access")
		self.auth(token)

		r2 = self.client.post("/api/system/reset/", {}, format="json")
		self.assertEqual(r2.status_code, 200, r2.content)
		self.assertEqual(Producto.objects.count(), 0)
		self.assertEqual(Categoria.objects.count(), 0)
		self.assertEqual(Proveedor.objects.count(), 0)
