# 🚀 Quick Start Guide - Banner System

## 1️⃣ First Time Setup

```powershell
# Install dependencies
npm install

# Run migration
npm run migrate:anuncios-images

# Add to .env file:
JWT_SECRET=britts-co-secret-2025-change-this-in-production

# Start server
npm start
```

Server should show:
```
📦 Pool de conexiones MySQL creado
Servidor corriendo en el puerto 3000
```

---

## 2️⃣ Get JWT Token (Required for Admin Operations)

**PowerShell:**
```powershell
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"usuario":"your_admin_user","contrasena":"your_password"}'

$token = $login.token
Write-Host "Token: $token"
```

**Save this token!** You'll need it for all admin operations.

---

## 3️⃣ Create Banner with Image

**PowerShell:**
```powershell
$headers = @{ "Authorization" = "Bearer $token" }

$form = @{
  tipo = "banner"
  titulo = "Promoción Especial"
  mensaje = "Descuento 30% este fin de semana"
  link_url = "https://brittsco.com/promo"
  activo = "true"
  dismissible = "true"
  image = Get-Item "C:\path\to\image.jpg"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/anuncios" `
  -Method POST -Headers $headers -Form $form
```

---

## 4️⃣ Check Active Banner (Public - No Auth)

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/anuncios/activo"
```

**Browser:** Just visit `http://localhost:3000/api/anuncios/activo`

---

## 5️⃣ List All Banners (Admin)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/anuncios" `
  -Headers @{ "Authorization" = "Bearer $token" }
```

---

## 6️⃣ Update Banner

```powershell
$headers = @{ "Authorization" = "Bearer $token" }

# Partial update (JSON)
$body = @{
  activo = $false
  titulo = "Updated Title"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/anuncios/1" `
  -Method PATCH -Headers $headers `
  -ContentType "application/json" -Body $body
```

---

## 7️⃣ Delete Banner (Admin Only)

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/anuncios/1" `
  -Method DELETE `
  -Headers @{ "Authorization" = "Bearer $token" }
```

---

## 📋 Common Field Values

**tipo:**
- `banner` - Top banner
- `popup` - Modal popup
- `info` - Blue info banner
- `success` - Green success banner
- `warning` - Yellow warning banner
- `danger` - Red danger banner

**activo:**
- `true` - Banner is active (only ONE can be active at a time)
- `false` - Banner is inactive

**dismissible:**
- `true` - User can close the banner
- `false` - Banner cannot be closed

**include_pages:** (optional)
- Comma-separated list: `"index.html,Soluciones.html"`
- Leave empty to show on all pages

**exclude_pages:** (optional)
- Comma-separated list: `"Contacto.html"`
- Pages where banner should NOT appear

**starts_at / ends_at:** (optional)
- Format: `"2025-12-24 00:00:00"`
- Leave empty for immediate/permanent

---

## 🔑 Admin User (from .env)

Only user with `codigo = ZZ2006` can DELETE banners.

All authenticated users can:
- ✅ View all banners (GET)
- ✅ Create banners (POST)
- ✅ Update banners (PUT/PATCH)

---

## 🖼️ Image Requirements

- **Formats:** JPEG, PNG, GIF only
- **Max Size:** 5MB
- **Storage:** `uploads/anuncios/`
- **URL Pattern:** `/uploads/anuncios/anuncio-{timestamp}-{random}.jpg`

---

## ⚠️ Important Notes

1. **Only ONE banner can be active at a time**
   - When you activate a banner, all others are automatically deactivated

2. **Image files are auto-managed**
   - Update banner with new image → old image deleted
   - Delete banner → image file deleted

3. **Token expires after 24 hours**
   - Re-login to get a new token

4. **Public endpoint** (`/activo`) requires NO authentication
   - Used by frontend to display banner

---

## 🐛 Quick Troubleshooting

**Server won't start:**
```powershell
# Check .env has JWT_SECRET
# Reinstall dependencies
npm install
```

**Token errors:**
```powershell
# Get new token
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"usuario":"admin","contrasena":"pass"}'
$token = $login.token
```

**Image upload fails:**
```powershell
# Check file size < 5MB
# Check file is JPG/PNG/GIF
# Check uploads/anuncios/ folder exists
```

---

## 📞 Need Help?

See full documentation: `BANNER_SYSTEM_REPORT.md`

Check implementation files:
- `middleware/auth.js` - Authentication
- `config/multer.js` - Image uploads
- `anuncios.js` - API endpoints

---

## 🌐 CORS Configuration

The API is configured to accept requests from:
- ✅ `https://brittsco.com`
- ✅ `https://www.brittsco.com`
- ✅ `http://localhost:3000`
- ✅ `http://127.0.0.1:3000`
- ✅ `http://localhost:5500` (VS Code Live Server)
- ✅ `http://127.0.0.1:5500`

**Allowed Methods:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

**Allowed Headers:** `Content-Type`, `Authorization`, `X-Requested-With`

### Test CORS Configuration

Open `test-cors.html` in your browser to verify all CORS settings are working correctly.

```powershell
# Using VS Code Live Server or any local server
# Just open test-cors.html in browser
```

The test page will verify:
1. ✅ Public endpoint access (no auth)
2. ✅ JWT token generation
3. ✅ Protected endpoint with Authorization header
4. ✅ CORS preflight for PUT/PATCH/DELETE
5. ✅ Multipart form-data image uploads

### Add Custom Origin

To add a new allowed origin (e.g., production frontend), edit `server.js`:

```javascript
app.use(cors({
  origin: [
    'https://brittsco.com',
    'https://www.brittsco.com',
    'https://your-new-domain.com', // Add here
    // ... rest
  ],
  // ... rest of config
}));
```
