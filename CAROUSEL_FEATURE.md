# Carousel Announcement Feature

## Overview
The carousel feature extends the announcement system to support rotating image carousels. A carousel announcement displays a primary image with a collection of rotating images that the frontend can cycle through automatically or with user controls.

## Architecture

### Database Schema
The `DBW00003` table now includes a `carousel_images` column (LONGTEXT) that stores a JSON array of image URLs:

```sql
ALTER TABLE DBW00003 ADD COLUMN carousel_images LONGTEXT NULL AFTER imagen_url;
ALTER TABLE DBW00003 MODIFY COLUMN tipo ENUM('info','success','warning','danger','banner','popup','carousel');
```

### File Structure
```
/uploads/carousels/          -- Directory for carousel images
    slide-{timestamp}-{random}.{ext}
    slide-{timestamp}-{random}.{ext}
    ...
```

### Configuration
- **Max files per carousel**: 10 images
- **Max file size**: 5 MB per image
- **Allowed formats**: JPEG, PNG, GIF
- **Multer config**: `config/multer.js` with `carouselUpload` instance

## API Usage

### Creating a Carousel Announcement

**POST** `/api/anuncios`

Required fields:
- `tipo`: Must be `'carousel'`
- `imagen_url` (form field): Primary/cover image file
- `carousel_images` (form field): Array of 2+ carousel slide images
- `mensaje`: Announcement message

Optional fields:
- `titulo`: Announcement title
- `link_url`: Link when announcement is clicked
- `activo`: Set to true/1 to activate immediately
- `dismissible`: Allow user to dismiss (default: true)
- `include_pages`: CSV list of pages to show on (e.g., "index.html,about.html")
- `exclude_pages`: CSV list of pages to exclude (e.g., "admin.html")
- `starts_at`: ISO datetime for activation window start
- `ends_at`: ISO datetime for activation window end

**Example request using cURL:**
```bash
curl -X POST http://localhost:3000/api/anuncios \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "tipo=carousel" \
  -F "titulo=Promotional Carousel" \
  -F "mensaje=Rotating images showcase" \
  -F "image=@/path/to/primary.jpg" \
  -F "carousel_images=@/path/to/slide1.jpg" \
  -F "carousel_images=@/path/to/slide2.jpg" \
  -F "carousel_images=@/path/to/slide3.jpg" \
  -F "activo=true" \
  -F "dismissible=false"
```

**Example request using JavaScript/Fetch:**
```javascript
const formData = new FormData();
formData.append('tipo', 'carousel');
formData.append('titulo', 'Summer Collection');
formData.append('mensaje', 'Check out our latest products');
formData.append('image', primaryImageFile);  // Primary cover image
formData.append('carousel_images', slide1);  // At least 2 required
formData.append('carousel_images', slide2);
formData.append('carousel_images', slide3);
formData.append('activo', 'true');

const response = await fetch('/api/anuncios', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  },
  body: formData
});

const result = await response.json();
console.log(result.data);
// Output includes:
// {
//   id: 42,
//   tipo: 'carousel',
//   titulo: 'Summer Collection',
//   mensaje: 'Check out our latest products',
//   imagen_url: '/uploads/carousels/slide-1703400000-abc.jpg',
//   carousel_images: [
//     '/uploads/carousels/slide-1703400001-def.jpg',
//     '/uploads/carousels/slide-1703400002-ghi.jpg',
//     '/uploads/carousels/slide-1703400003-jkl.jpg'
//   ],
//   activo: true,
//   dismissible: false,
//   created_at: '2024-12-24T10:00:00.000Z',
//   updated_at: '2024-12-24T10:00:00.000Z'
// }
```

### Updating a Carousel

**PUT** `/api/anuncios/:id`

You can update any field. To replace carousel images:

```bash
curl -X PUT http://localhost:3000/api/anuncios/42 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "carousel_images=@/path/to/new_slide1.jpg" \
  -F "carousel_images=@/path/to/new_slide2.jpg" \
  -F "mensaje=Updated message"
```

**Important**: When updating carousel_images:
- Old carousel images are automatically deleted from disk
- Provide all new images you want to keep (at least 2)
- If you omit carousel_images, existing ones are preserved

### Retrieving Active Carousel

**GET** `/api/anuncios/activo` (Public endpoint)

Response when carousel is active:
```json
{
  "id": 42,
  "tipo": "carousel",
  "titulo": "Summer Collection",
  "mensaje": "Check out our latest products",
  "imagen_url": "/uploads/carousels/slide-1703400000-abc.jpg",
  "carousel_images": [
    "/uploads/carousels/slide-1703400001-def.jpg",
    "/uploads/carousels/slide-1703400002-ghi.jpg",
    "/uploads/carousels/slide-1703400003-jkl.jpg"
  ],
  "link_url": "https://example.com/products",
  "activo": true,
  "dismissible": false,
  "include_pages": null,
  "exclude_pages": null,
  "starts_at": null,
  "ends_at": null,
  "created_at": "2024-12-24T10:00:00.000Z",
  "updated_at": "2024-12-24T10:00:00.000Z"
}
```

### Listing All Carousels

**GET** `/api/anuncios` (Protected - requires JWT token)

Returns all announcements including carousels with their images parsed as arrays.

### Deleting a Carousel

**DELETE** `/api/anuncios/:id` (Protected - admin only)

Automatically deletes:
- The announcement record from database
- Primary image file from `/uploads/carousels/`
- All carousel image files from `/uploads/carousels/`

```bash
curl -X DELETE http://localhost:3000/api/anuncios/42 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Frontend Integration

### Displaying a Carousel

```html
<div id="carousel-container" style="display: none;">
  <div id="carousel-main" style="position: relative;">
    <img id="carousel-image" src="" alt="carousel" style="width: 100%; height: auto;">
    <div id="carousel-thumbnails" style="margin-top: 10px; display: flex; gap: 5px;"></div>
  </div>
</div>

<script>
async function displayCarousel() {
  try {
    const response = await fetch('/api/anuncios/activo');
    
    if (response.status === 204) {
      console.log('No active announcement');
      return;
    }
    
    const announcement = await response.json();
    
    // Only handle carousel type
    if (announcement.tipo !== 'carousel') {
      return;
    }
    
    const container = document.getElementById('carousel-container');
    const mainImg = document.getElementById('carousel-image');
    const thumbnails = document.getElementById('carousel-thumbnails');
    
    let currentIndex = 0;
    const images = announcement.carousel_images;
    
    // Display initial image
    mainImg.src = images[currentIndex];
    mainImg.alt = announcement.titulo || 'Carousel';
    
    // Create thumbnail buttons
    images.forEach((img, index) => {
      const thumb = document.createElement('img');
      thumb.src = img;
      thumb.style.width = '60px';
      thumb.style.height = '60px';
      thumb.style.cursor = 'pointer';
      thumb.style.opacity = index === 0 ? '1' : '0.6';
      thumb.onclick = () => {
        currentIndex = index;
        updateCarousel();
      };
      thumbnails.appendChild(thumb);
    });
    
    function updateCarousel() {
      mainImg.src = images[currentIndex];
      // Update thumbnail opacity
      document.querySelectorAll('#carousel-thumbnails img').forEach((thumb, i) => {
        thumb.style.opacity = i === currentIndex ? '1' : '0.6';
      });
    }
    
    // Auto-rotate every 5 seconds
    setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
      updateCarousel();
    }, 5000);
    
    // Show container
    container.style.display = 'block';
    
  } catch (err) {
    console.error('Error loading carousel:', err);
  }
}

// Call on page load
displayCarousel();
</script>
```

### Alternative: Using a Carousel Library

```html
<div id="carousel-container" style="display: none;">
  <div class="carousel-wrapper">
    <img id="carousel-main" src="" alt="carousel" />
    <button id="prev-btn">← Previous</button>
    <button id="next-btn">Next →</button>
    <div id="carousel-indicators"></div>
  </div>
</div>

<script>
async function displayCarouselWithControls() {
  const response = await fetch('/api/anuncios/activo');
  if (response.status === 204) return;
  
  const announcement = await response.json();
  if (announcement.tipo !== 'carousel') return;
  
  const images = announcement.carousel_images;
  let current = 0;
  
  const container = document.getElementById('carousel-container');
  const mainImg = document.getElementById('carousel-main');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const indicators = document.getElementById('carousel-indicators');
  
  // Set initial image
  mainImg.src = images[current];
  
  // Create indicators (dots)
  images.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = i === 0 ? 'indicator active' : 'indicator';
    dot.onclick = () => goToSlide(i);
    indicators.appendChild(dot);
  });
  
  function updateSlide() {
    mainImg.src = images[current];
    document.querySelectorAll('.indicator').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
    });
  }
  
  function goToSlide(index) {
    current = index;
    updateSlide();
  }
  
  prevBtn.onclick = () => {
    current = (current - 1 + images.length) % images.length;
    updateSlide();
  };
  
  nextBtn.onclick = () => {
    current = (current + 1) % images.length;
    updateSlide();
  };
  
  container.style.display = 'block';
}

displayCarouselWithControls();
</script>

<style>
.carousel-wrapper {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.carousel-wrapper img {
  width: 100%;
  height: auto;
  display: block;
}

button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  padding: 10px;
  cursor: pointer;
  z-index: 10;
}

#prev-btn { left: 0; }
#next-btn { right: 0; }

#carousel-indicators {
  text-align: center;
  padding: 10px 0;
}

.indicator {
  height: 10px;
  width: 10px;
  margin: 0 5px;
  background-color: #bbb;
  border-radius: 50%;
  display: inline-block;
  cursor: pointer;
}

.indicator.active {
  background-color: #717171;
}
</style>
```

## Key Differences from Banner/Popup

| Feature | Banner/Popup | Carousel |
|---------|-------------|----------|
| Primary image | 1 image (optional) | 1 image (required) |
| Additional images | None | 2-10 images (required) |
| Storage | `/uploads/anuncios/` | `/uploads/carousels/` |
| JSON field | N/A | `carousel_images` array |
| Upload handling | Single file | Multiple files (array) |
| Validation | Type check | Type + minimum 2 carousel images |
| Frontend display | Static image | Rotating carousel |

## Setup & Migration

1. **Run migration** (adds column and updates ENUM):
   ```bash
   npm run migrate:carousel
   ```

2. **Verify table structure**:
   ```bash
   npm run db:tables
   ```

3. **Restart server**:
   ```bash
   npm start
   ```

## Security Considerations

- **File upload**: Restricted to JPEG, PNG, GIF only; max 5MB each
- **Directory permissions**: `/uploads/carousels/` must be writable by Node.js process
- **Cleanup**: Old carousel images automatically deleted when updated/deleted
- **Authentication**: All write operations require valid JWT token with admin credentials
- **Validation**: Minimum 2 carousel images enforced for carousel type

## Error Handling

**Missing primary image:**
```json
{
  "success": false,
  "error": "Para carrusel, se requiere una imagen principal (image field)"
}
```

**Insufficient carousel images:**
```json
{
  "success": false,
  "error": "Para carrusel se requieren al menos 2 imágenes adicionales (carousel_images field)"
}
```

**File type not allowed:**
```json
{
  "success": false,
  "error": "File type not allowed. Only JPEG, PNG, GIF files are accepted"
}
```

## Troubleshooting

**Q: Carousel images not appearing?**
- Check `/uploads/carousels/` directory exists and is readable
- Verify image paths in database match actual files
- Check browser console for fetch errors

**Q: Can't upload carousel images?**
- Ensure JWT token is valid
- Check Content-Type header is multipart/form-data
- Verify file size < 5MB and format is JPEG/PNG/GIF

**Q: Old images not deleted when updating?**
- Check file system permissions on `/uploads/carousels/`
- Verify Node.js process has write access
- Check server logs for deletion errors (look for 🗑️ emoji)

## Code Examples

### Complete Admin Panel Integration

```javascript
class CarouselManager {
  constructor(apiUrl = '/api/anuncios') {
    this.apiUrl = apiUrl;
    this.token = localStorage.getItem('auth_token');
  }
  
  async createCarousel(formData) {
    formData.set('tipo', 'carousel');
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return response.json();
  }
  
  async updateCarousel(id, formData) {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return response.json();
  }
  
  async deleteCarousel(id) {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return response.json();
  }
  
  async getCarousels() {
    const response = await fetch(this.apiUrl, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    
    const data = await response.json();
    return data.data.filter(item => item.tipo === 'carousel');
  }
}

// Usage
const manager = new CarouselManager();
const formData = new FormData(document.getElementById('carouselForm'));
try {
  const result = await manager.createCarousel(formData);
  console.log('Created carousel:', result.data.id);
} catch (err) {
  console.error('Error:', err.message);
}
```

## Performance Notes

- **Database**: Carousel images stored as JSON string (LONGTEXT) - suitable for up to 10 images
- **Memory**: Parsed on every API response; consider caching for high-traffic sites
- **Storage**: Plan for ~200KB-500KB per carousel (10 images × 50KB average)
- **Bandwidth**: Frontend downloads all carousel images; consider lazy-loading in frontend

## Future Enhancements

1. **Image cropping**: Auto-crop to standard dimensions
2. **Video support**: Allow video files in carousel_images
3. **Animation presets**: Control transition effects
4. **Analytics**: Track carousel interactions
5. **Drag-n-drop**: Reorder carousel images
6. **Fallback images**: Backup images if primary fails to load
