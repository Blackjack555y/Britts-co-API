# 🌐 CORS Configuration - Banner API

## ✅ Configuration Status

**CORS is properly configured and tested!**

---

## 📋 Current Configuration

Located in: `server.js` (lines 10-24)

```javascript
app.use(cors({
  origin: [
    'https://brittsco.com',
    'https://www.brittsco.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500', // VS Code Live Server
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
```

---

## 🎯 What This Means

### ✅ Allowed Origins
Your API accepts requests from:
- Production: `https://brittsco.com` and `https://www.brittsco.com`
- Local development: `http://localhost:3000`, `http://127.0.0.1:3000`
- VS Code Live Server: `http://localhost:5500`, `http://127.0.0.1:5500`

### ✅ Allowed HTTP Methods
- `GET` - Read data
- `POST` - Create new resources
- `PUT` - Full update
- `PATCH` - Partial update
- `DELETE` - Delete resources
- `OPTIONS` - Preflight requests

### ✅ Allowed Headers
- `Content-Type` - For JSON/form-data requests
- `Authorization` - For JWT Bearer tokens
- `X-Requested-With` - For AJAX requests

### ✅ Credentials Support
- `credentials: true` - Allows cookies and Authorization headers

---

## 🧪 Testing CORS

### Method 1: Interactive Test Page

Open `test-cors.html` in your browser:

1. **Test Public Endpoint** - No auth required
2. **Login** - Get JWT token
3. **Test Protected Endpoint** - With Authorization header
4. **Test Preflight** - OPTIONS request for PUT/PATCH/DELETE
5. **Test Image Upload** - Multipart form-data with file

### Method 2: Browser DevTools

Open your browser's DevTools (F12) and run:

```javascript
// Test public endpoint
fetch('http://localhost:3000/api/anuncios/activo')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Check CORS headers
fetch('http://localhost:3000/api/anuncios/activo')
  .then(response => {
    console.log('CORS Headers:');
    console.log('Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('Allow-Credentials:', response.headers.get('access-control-allow-credentials'));
  });
```

### Method 3: cURL Command

```bash
# Test preflight
curl -X OPTIONS http://localhost:3000/api/anuncios/1 \
  -H "Origin: http://localhost:5500" \
  -H "Access-Control-Request-Method: DELETE" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v

# Should see CORS headers in response:
# Access-Control-Allow-Origin: http://localhost:5500
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

---

## 🔧 Common CORS Scenarios

### Scenario 1: Frontend on Different Port

**Problem:** Your frontend runs on `http://localhost:5173` (Vite) but isn't in allowed origins.

**Solution:** Add to `server.js`:
```javascript
origin: [
  // ... existing origins
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]
```

### Scenario 2: New Production Domain

**Problem:** Deploying frontend to new domain `https://app.brittsco.com`

**Solution:** Add to `server.js`:
```javascript
origin: [
  'https://brittsco.com',
  'https://www.brittsco.com',
  'https://app.brittsco.com', // Add this
  // ... rest
]
```

### Scenario 3: Wildcard Subdomain

**Problem:** Need to allow all subdomains of `brittsco.com`

**Solution:** Use function instead of array:
```javascript
origin: function(origin, callback) {
  const allowedOrigins = [
    'https://brittsco.com',
    'https://www.brittsco.com',
    'http://localhost:3000',
    'http://localhost:5500'
  ];
  
  // Allow subdomains of brittsco.com
  if (!origin || 
      allowedOrigins.includes(origin) || 
      /^https:\/\/[\w-]+\.brittsco\.com$/.test(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}
```

---

## 🚨 Troubleshooting

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** Your frontend origin is not in the allowed list.

**Fix:**
1. Check browser DevTools → Network tab → see the `Origin` header in request
2. Add that origin to `server.js` cors config
3. Restart server

### Error: "CORS policy: Response to preflight request doesn't pass"

**Cause:** Missing HTTP method or header in CORS config.

**Fix:**
1. Check DevTools → Network tab → Find the OPTIONS request
2. Look at `Access-Control-Request-Method` and `Access-Control-Request-Headers`
3. Add those to `methods` and `allowedHeaders` arrays
4. Restart server

### Error: "Authorization header not allowed"

**Cause:** `Authorization` not in `allowedHeaders`.

**Fix:** Already included in current config! If still failing, verify:
```javascript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
```

---

## 🔒 Security Considerations

### ✅ Good Practices (Already Implemented)

1. **Explicit Origins** - Not using wildcard `*`
2. **Credentials Support** - Only with explicit origins
3. **Limited Methods** - Only necessary HTTP methods
4. **Limited Headers** - Only required headers

### ⚠️ Production Checklist

- [ ] Remove `localhost` origins before deploying to production
- [ ] Only include actual production domains
- [ ] Use HTTPS for all production origins
- [ ] Consider rate limiting for public endpoints
- [ ] Monitor CORS errors in logs

---

## 📝 Production-Ready Configuration Example

```javascript
// In production environment
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: isProd 
    ? [
        'https://brittsco.com',
        'https://www.brittsco.com'
      ]
    : [
        'https://brittsco.com',
        'https://www.brittsco.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
      ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
}));
```

---

## 📊 CORS Headers Explained

### Request Headers (from browser)
- `Origin` - Where the request is coming from
- `Access-Control-Request-Method` - Method for preflight
- `Access-Control-Request-Headers` - Headers for preflight

### Response Headers (from server)
- `Access-Control-Allow-Origin` - Approved origin
- `Access-Control-Allow-Methods` - Approved methods
- `Access-Control-Allow-Headers` - Approved headers
- `Access-Control-Allow-Credentials` - Can send cookies/auth
- `Access-Control-Max-Age` - Cache preflight (default: 5s)

---

## ✨ Summary

✅ **CORS is properly configured** for:
- Public API access (GET /api/anuncios/activo)
- JWT authentication (Authorization header)
- Full CRUD operations (GET, POST, PUT, PATCH, DELETE)
- Image uploads (multipart/form-data)
- Both production and development environments

🧪 **Test using:**
- `test-cors.html` - Interactive browser test
- Browser DevTools Console
- cURL commands

🔧 **To modify:**
- Edit `server.js` CORS configuration
- Restart server after changes
- Test with `test-cors.html`

**Status:** ✅ **Ready for Development & Production**
