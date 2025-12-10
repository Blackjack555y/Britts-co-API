# Copilot instructions for this repo

Overview
- This is a static, multi‑page marketing/support site for Britts Co. Pages live at the repo root (`index.html`, `Soluciones.html`, `Contacto.html`, `Requerimientos*.html`, etc.).
- Styling is under `css/` (shared styles like `menu_stylesheet.css`, page‑specific CSS like `Requerimientos.css`). Behavior lives in `javascript/` (one file per page in most cases).
- Assets are under `images/` and `fonts/`. Some image paths include spaces and are percent‑encoded in CSS (e.g., `images/Plumas%20-%20Banners/...`).

Layout and navigation
- Each page uses a common header pattern:
  - Logo container (`.logo-container .logo-image`), hamburger (`.menu-toggle`), and a `<nav class="header-container">` with a top‑level `<ul>` and optional nested `.dropdown` menus.
  - Mobile menu toggling is done by a global `toggleMenu()` function that toggles the `show` class on `.header-container ul`. See `javascript/landing_page_script.js`, `javascript/Requerimientos.js`, and `javascript/contacto.js` for identical implementations.
  - The WhatsApp floating bubble is an `<a>` with `class="whatsapp-bubble"` and is styled in `css/menu_stylesheet.css` (see also the variant in `menu_stylesheet.css` for the landing page).

Page patterns and scripts
- Home (`index.html`)
  - Loads `css/menu_stylesheet.css` and `javascript/menu_script.js` for header, plus `javascript/landing_page_script.js` for page effects.
  - `landing_page_script.js` randomizes the `.cta-button` colors and sets a background image on `.top-image-container` from `images/Plumas - Banners/*.png`. Ensure both selectors exist in the DOM when adding/altering content.
- Requerimientos forms (`Requerimientos.html`, `Requerimientos2.html`)
  - Both share `css/Requerimientos.css` for a dark form card UI, loader overlay (`#loader-overlay`), and footer styles.
  - Scripts: `javascript/Requerimientos.js` and `javascript/Requerimientos2.js` handle `<form id="formularioRequerimiento">` submission using `FormData` and `fetch`.
    - Current dev endpoint: `http://localhost:3000/api/formulario` (see comment with prod URL `https://britts-co.onrender.com/api/formulario`).
    - Expected OK response includes `{ codigo }`; on success, code is displayed via `#mensajeExito` and the form is reset. Loader is shown/hidden by toggling `#loader-overlay` display between `flex` and `none`.
- Contact (`Contacto.html`)
  - Uses `javascript/contacto.js` to POST `FormData` to `https://britts-co.onrender.com/api/contacto`. Expects `{ message }` and writes it to `#mensajeRespuesta`. Uses the same loader overlay pattern.

CSS conventions
- Shared: header/nav styles and responsive dropdown in `css/menu_stylesheet.css`; repeated footer styles appear in multiple CSS files for consistency (`.main-footer`, `.footer-content`, `.footer-links`, `.footer-contact`).
- Forms: see `css/Requerimientos.css` for input focus states, custom `<select>` arrow via a data URL, and loader keyframes (`.loader .circle`, `.dot`, `.outline`). If you add a new form page, reuse this structure and IDs to benefit from existing styles/scripts.
- Fonts: Google Fonts `Open Sans` is imported; a custom italic face is declared via `@font-face` in some CSS. Keep font file paths consistent with `css/` and `fonts/` directories when adding fonts.

Integration points and data flow
- Forms send `multipart/form-data` via `FormData` (no manual `Content-Type`). Server returns JSON. Success paths update specific DOM containers:
  - Requerimientos: `#mensajeExito` (and optionally `#codigoRequerimiento`).
  - Contacto: `#mensajeRespuesta`.
- The loader overlay is a full‑screen `#loader-overlay` with an animated `.loader` inside. Show it before network calls, hide it in `finally {}` blocks.

Conventions and tips for adding pages/features
- One page ⇔ one CSS and one JS file when behavior/styling is unique. Mirror filenames (e.g., `PaginaX.html` → `css/PaginaX.css` and `javascript/PaginaX.js`).
- Copy the header and footer blocks from an existing page to ensure consistent navigation and styling. Always include the hamburger markup (`.menu-toggle`) and define `toggleMenu()` in the page script if not already present globally.
- When referencing images with spaces in their path from CSS, percent‑encode spaces (e.g., `Plumas%20-%20Banners`). From JS, prefer exact literal paths or `encodeURI`.
- Keep ID/class hooks stable: `#formularioRequerimiento`, `#mensajeExito`, `#loader-overlay`, `.header-container ul`. Scripts assume these exist.

Local development and debugging
- Site is static. Prefer serving via a local web server (e.g., VS Code Live Server) instead of opening files with `file://` to avoid CORS issues.
- For Requerimientos dev, run the backend on port 3000 or switch the fetch URL to the Render endpoint. Watch for CORS responses when changing origins.

Key files to study first
- `index.html`, `Soluciones.html`, `Contacto.html`, `Requerimientos.html`, `Requerimientos2.html`
- `css/menu_stylesheet.css`, `css/Requerimientos.css`
- `javascript/landing_page_script.js`, `javascript/menu_script.js`, `javascript/contacto.js`, `javascript/Requerimientos.js`, `javascript/Requerimientos2.js`
