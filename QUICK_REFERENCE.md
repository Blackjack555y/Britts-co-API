# 🎠 Carousel Feature - Quick Reference Card

## Setup Checklist
```bash
✅ npm run migrate:carousel     # Run once to add DB support
✅ Verify /uploads/carousels/   # Directory auto-created by migration
✅ npm start                     # Start server
```

## Create Carousel (JavaScript)
```javascript
const formData = new FormData();
formData.append('tipo', 'carousel');
formData.append('mensaje', 'Your message here');
formData.append('image', primaryImageFile);           // Required
formData.append('carousel_images', carouselSlide1);   // Min 2 required
formData.append('carousel_images', carouselSlide2);
formData.append('activo', 'true');

fetch('/api/anuncios', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
}).then(r => r.json()).then(console.log);
```

## Create Carousel (cURL)
```bash
curl -X POST http://localhost:3000/api/anuncios \
  -H "Authorization: Bearer TOKEN" \
  -F "tipo=carousel" \
  -F "mensaje=Test" \
  -F "image=@primary.jpg" \
  -F "carousel_images=@slide1.jpg" \
  -F "carousel_images=@slide2.jpg"
```

## Get Active Carousel (Public)
```javascript
const response = await fetch('/api/anuncios/activo');
if (response.status === 200) {
  const carousel = await response.json();
  if (carousel.tipo === 'carousel') {
    // carousel.carousel_images is an array
    carousel.carousel_images.forEach((img, i) => {
      console.log(`Slide ${i}:`, img);
    });
  }
}
```

## Display Carousel
```javascript
let currentSlide = 0;
const images = carousel.carousel_images;

// Show current slide
function showSlide(index) {
  document.getElementById('carousel-img').src = images[index];
}

// Next slide
function next() {
  currentSlide = (currentSlide + 1) % images.length;
  showSlide(currentSlide);
}

// Previous slide
function prev() {
  currentSlide = (currentSlide - 1 + images.length) % images.length;
  showSlide(currentSlide);
}

// Auto-rotate every 5 seconds
setInterval(next, 5000);
```

## HTML Template
```html
<div id="carousel" style="display:none;">
  <img id="carousel-img" src="" alt="carousel">
  <button onclick="prev()">← Prev</button>
  <button onclick="next()">Next →</button>
  <div id="thumbnails"></div>
</div>

<script>
fetch('/api/anuncios/activo')
  .then(r => r.status === 200 ? r.json() : null)
  .then(data => {
    if (data?.tipo === 'carousel') {
      showSlide(0);
      document.getElementById('carousel').style.display = 'block';
    }
  });
</script>
```

## Update Carousel
```javascript
const formData = new FormData();
formData.append('mensaje', 'Updated message');
// Optional: Replace carousel images
formData.append('carousel_images', newSlide1);
formData.append('carousel_images', newSlide2);

fetch(`/api/anuncios/${id}`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

## Delete Carousel
```javascript
fetch(`/api/anuncios/${id}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
// Automatically deletes all carousel image files
```

## Validation Rules
| Rule | Requirement |
|------|-------------|
| **Primary Image** | Required. Max 5MB. JPEG/PNG/GIF |
| **Carousel Images** | Min 2 images. Max 10 images. 5MB each |
| **Message** | Optional but recommended |
| **Authentication** | JWT token required for POST/PUT/DELETE |
| **File Naming** | Auto-generated: `slide-{timestamp}-{random}.{ext}` |
| **Storage** | `/uploads/carousels/` directory |

## Response Structure
```json
{
  "success": true,
  "mensaje": "Anuncio creado exitosamente",
  "data": {
    "id": 42,
    "tipo": "carousel",
    "titulo": "Optional Title",
    "mensaje": "Your message",
    "imagen_url": "/uploads/carousels/slide-1703400000-abc.jpg",
    "carousel_images": [
      "/uploads/carousels/slide-1703400001-def.jpg",
      "/uploads/carousels/slide-1703400002-ghi.jpg"
    ],
    "activo": true,
    "dismissible": true,
    "link_url": null,
    "include_pages": null,
    "exclude_pages": null,
    "starts_at": null,
    "ends_at": null,
    "created_at": "2024-12-24T10:00:00.000Z",
    "updated_at": "2024-12-24T10:00:00.000Z"
  }
}
```

## Common Errors
| Error | Cause | Solution |
|-------|-------|----------|
| `tipo requerido` | Missing tipo field | Add `tipo: 'carousel'` |
| `Para carrusel, se requiere una imagen principal` | Missing primary image | Upload image via `image` field |
| `se requieren al menos 2 imágenes adicionales` | < 2 carousel images | Upload 2+ files via `carousel_images` field |
| `File type not allowed` | Wrong file format | Use JPEG, PNG, or GIF only |
| `401 Unauthorized` | Missing/invalid token | Add valid JWT token to Authorization header |
| `404 Anuncio no encontrado` | Invalid ID | Verify carousel ID exists |

## Directory Structure
```
uploads/
  anuncios/           # Banner/popup images
  carousels/          # Carousel images
    slide-*.jpg
    slide-*.png
    slide-*.gif
  requerimientos/     # Form uploads
```

## Testing
```bash
# 1. Open test page
open test-carousel.html

# 2. Get JWT token
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"BrittscoAC","password":"DatCom2026*"}'

# 3. Create test carousel
# Use test-carousel.html form with token

# 4. View active carousel
curl http://localhost:3000/api/anuncios/activo
```

## Logs
```
📤 [Anuncios] POST / - Creando anuncio...
📸 [Anuncios] Imagen principal subida: slide-1703400000-abc.jpg
🎠 [Anuncios] Carrusel con 3 imágenes
✅ [Anuncios] Creado: 42 carousel (con imagen)

🗑️ [Anuncios] DELETE /:id - Eliminando anuncio: 42
🗑️ [Anuncios] Carousel Imagen eliminada: slide-1703400000-abc.jpg
🗑️ [Anuncios] Carousel Imagen eliminada: slide-1703400001-def.jpg
✅ [Anuncios] Eliminado: 42
```

## Key Features
- ✅ Multi-image rotating carousel
- ✅ Single-active enforcement
- ✅ Automatic file cleanup
- ✅ Time-based activation (starts_at/ends_at)
- ✅ Page targeting (include_pages/exclude_pages)
- ✅ JWT authentication
- ✅ Frontend agnostic
- ✅ Backward compatible

## Files Modified
- `anuncios.js` - Complete carousel endpoints
- `config/multer.js` - Carousel upload config
- `scripts/migrate-carousel-support.js` - DB migration
- `package.json` - Migration script

## Documentation
- `CAROUSEL_FEATURE.md` - Full documentation
- `CAROUSEL_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `test-carousel.html` - Interactive testing tool
- `QUICK_REFERENCE.md` - This file

## Support
📖 Read: `CAROUSEL_FEATURE.md` (troubleshooting section)
🧪 Test: Open `test-carousel.html` in browser
🔧 Debug: Check logs for 🎠 emoji operations
📞 Issue: Verify migration ran and files uploaded correctly
