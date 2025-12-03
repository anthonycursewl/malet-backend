# Actualización de Perfil de Usuario

Esta implementación agrega la funcionalidad de actualización de perfil de usuario, incluyendo la subida de imágenes para avatar y banner, siguiendo la arquitectura hexagonal establecida en el proyecto.

## 📋 Características Implementadas

- ✅ Actualización de información básica del perfil (nombre, username)
- ✅ Subida de imagen de avatar
- ✅ Subida de imagen de banner
- ✅ Eliminación automática de imágenes anteriores al actualizar
- ✅ Almacenamiento en AWS S3
- ✅ Arquitectura hexagonal
- ✅ Autenticación JWT requerida

## 🏗️ Arquitectura

### Capa de Dominio (`domain/`)

#### Entidad
- **`entities/user.entity.ts`**: Actualizada con campos `avatar_url` y `banner_url`

#### Puertos de Entrada (`ports/in/`)
- **`update-user-profile.usecase.ts`**: Define el contrato para actualizar el perfil

#### Puertos de Salida (`ports/out/`)
- **`user.repository.ts`**: Actualizado con métodos `findById` y `updateProfile`

### Capa de Aplicación (`application/`)
- **`update-user-profile.service.ts`**: Implementa la lógica de negocio para actualizar el perfil, gestionar archivos y coordinar con el repositorio

### Capa de Infraestructura (`infrastructure/`)

#### Adaptadores
- **`adapters/controllers/user-profile.controller.ts`**: Controlador REST para manejar las peticiones HTTP

#### Persistencia
- **`persistence/user.repository.adapter.ts`**: Actualizado con implementaciones de `findById` y `updateProfile`

### Módulo Compartido (`shared/`)
- **`infrastructure/file-storage/file-storage.port.ts`**: Puerto para almacenamiento de archivos
- **`infrastructure/file-storage/s3-file-storage.adapter.ts`**: Implementación con AWS S3
- **`infrastructure/file-storage/file-storage.module.ts`**: Módulo global de almacenamiento

## 🔧 Configuración

### Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# AWS S3 Configuration
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="your-bucket-name"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
```

### Base de Datos

Los campos agregados al modelo `user` en Prisma:

```prisma
model user {
  // ... campos existentes
  avatar_url String?    @db.VarChar(500)
  banner_url String?    @db.VarChar(500)
}
```

**Nota**: Necesitarás ejecutar la migración de Prisma:

```bash
npx prisma migrate dev --name add_user_avatar_banner
```

Si hay drift en la base de datos, consulta con tu equipo antes de ejecutar `prisma migrate reset`.

## 📡 API Endpoint

### PUT `/users/profile/update`

Actualiza el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `name` (opcional): Nuevo nombre del usuario
- `username` (opcional): Nuevo username
- `avatar` (opcional): Archivo de imagen para el avatar
- `banner` (opcional): Archivo de imagen para el banner

**Ejemplo con cURL:**

```bash
curl -X PUT http://localhost:3000/users/profile/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=John Doe" \
  -F "username=johndoe" \
  -F "avatar=@/path/to/avatar.jpg" \
  -F "banner=@/path/to/banner.jpg"
```

**Ejemplo con JavaScript (fetch):**

```javascript
const formData = new FormData();
formData.append('name', 'John Doe');
formData.append('username', 'johndoe');
formData.append('avatar', avatarFile); // File object
formData.append('banner', bannerFile); // File object

const response = await fetch('http://localhost:3000/users/profile/update', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const updatedUser = await response.json();
```

**Respuesta exitosa (200):**

```json
{
  "id": "abc123",
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2024-01-01T00:00:00.000Z",
  "avatar_url": "https://bucket.s3.region.amazonaws.com/avatars/uuid.jpg",
  "banner_url": "https://bucket.s3.region.amazonaws.com/banners/uuid.jpg"
}
```

## 🔐 Seguridad

- El endpoint requiere autenticación JWT mediante el guard `JwtAuthGuard`
- Solo el usuario autenticado puede actualizar su propio perfil
- Los archivos se almacenan con nombres únicos (UUID) para evitar colisiones
- Las contraseñas nunca se retornan en las respuestas

## 📦 Dependencias Utilizadas

- `@aws-sdk/client-s3`: SDK de AWS para S3 (ya instalado)
- `@nestjs/platform-express`: Para manejo de archivos multipart (ya instalado)
- `uuid`: Para generar nombres únicos de archivos (ya instalado)

## 🧪 Testing

Para probar la funcionalidad:

1. Asegúrate de tener configuradas las credenciales de AWS S3
2. Obtén un token JWT válido mediante login
3. Usa Postman, Insomnia o cURL para hacer una petición PUT con archivos

## 📝 Notas Adicionales

- Las imágenes antiguas se eliminan automáticamente de S3 cuando se suben nuevas
- Los archivos se organizan en carpetas: `avatars/` y `banners/`
- Los archivos se configuran como públicos (`ACL: 'public-read'`)
- Si la eliminación de un archivo falla, no interrumpe el flujo (se registra en consola)

## 🔄 Flujo de Actualización

1. El usuario envía una petición con los datos a actualizar
2. El servicio verifica que el usuario existe
3. Si hay archivos nuevos:
   - Se elimina el archivo anterior de S3 (si existe)
   - Se sube el nuevo archivo a S3
   - Se obtiene la URL pública
4. Se actualiza el registro en la base de datos
5. Se retorna el usuario actualizado (sin contraseña)

## 🚀 Próximos Pasos Sugeridos

- [ ] Agregar validación de tipos de archivo (solo imágenes)
- [ ] Agregar límite de tamaño de archivo
- [ ] Implementar redimensionamiento de imágenes
- [ ] Agregar tests unitarios y de integración
- [ ] Implementar versionado de imágenes
- [ ] Agregar CDN para mejor rendimiento
