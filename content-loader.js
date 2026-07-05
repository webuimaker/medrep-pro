// ══════════════════════════════════════════════════════════════
// content-loader.js
// Fetches the editable content (content/doctors.json, content/products.json,
// content/categories.json — all editable at /admin via Decap CMS) and
// rebuilds them into the exact shapes MedRep Pro's app code expects
// (DOCTORS, META, SPEC_COLORS). Anyone editing content later only ever
// needs to touch the JSON files or the /admin UI — never this file.
// ══════════════════════════════════════════════════════════════

async function loadContent() {
  const [doctorsData, productsData, categoriesData, settingsData] = await Promise.all([
    fetch('content/doctors.json').then(r => r.json()),
    fetch('content/products.json').then(r => r.json()),
    fetch('content/categories.json').then(r => r.json()),
    fetch('content/settings.json').then(r => r.json()).catch(() => ({})),
  ]);

  // ── DOCTORS ──────────────────────────────────────────────
  // App shape: {id, name, initials, deg, spec, catalog, hospital}
  const DOCTORS = doctorsData.doctors
    .filter(d => d.status !== 'Inactive')
    .map((d, i) => ({
      id: i + 1,
      name: d.name,
      initials: (d.name || '')
        .replace(/^Dr\.?\s*/i, '')
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      deg: d.qualification,
      spec: d.specialty,
      catalog: d.catalog,
      hospital: d.hospital,
      clinic: d.clinic || '',
      city: d.city || '',
      state: d.state || '',
      mobile: d.mobile || '',
      email: d.email || '',
      notes: d.notes || '',
      products: d.products || [],
    }));

  // ── SPEC_COLORS ──────────────────────────────────────────
  // Kept as a small built-in palette (cosmetic only). Add a specialty
  // here if a new one is introduced via the CMS and needs its own color.
  const SPEC_COLORS = {
    'Orthopaedics':       { color: '#E85D26', bg: '#FFF3EE' },
    'Gynaecology':        { color: '#D946A8', bg: '#FDF0FB' },
    'General Physician':  { color: '#1B7FC4', bg: '#EBF5FF' },
    'Ophthalmology':      { color: '#7B2FBE', bg: '#F5EEFF' },
    'ENT':                { color: '#7B2FBE', bg: '#F5EEFF' },
    'Dentistry':          { color: '#7B2FBE', bg: '#F5EEFF' },
    'Paediatrics':        { color: '#0891B2', bg: '#E0F7FA' },
    'Neurology':          { color: '#E85D26', bg: '#FFF3EE' },
    'Dermatology':        { color: '#7B2FBE', bg: '#F5EEFF' },
    'Gastroenterology':   { color: '#1B7FC4', bg: '#EBF5FF' },
    'Physician':          { color: '#1B7FC4', bg: '#EBF5FF' },
  };

  // ── META (categories + their products) ──────────────────
  // App shape: META[catId] = {id, title, color, bg, icon, specialties, products:[{name, molecule, image}]}
  const META = {};
  categoriesData.categories.forEach(cat => {
    META[cat.id] = {
      id: cat.id,
      title: cat.title,
      color: cat.color,
      bg: cat.bg,
      icon: cat.icon,
      specialties: cat.specialties || [],
      products: [],
    };
  });

  productsData.products
    .filter(p => p.status !== 'Inactive')
    .forEach(p => {
      // Products can now belong to more than one category. Accept the new
      // `categories` array, but fall back to the old single `category`
      // string for any entry that hasn't been migrated yet.
      const catIds = Array.isArray(p.categories) && p.categories.length
        ? p.categories
        : (p.category ? [p.category] : []);

      catIds.forEach(catId => {
        if (!META[catId]) return; // category was deleted/renamed — skip safely
        META[catId].products.push({
          name: p.name,
          molecule: p.molecule,
          image: p.image && p.image.length ? p.image : 'images/placeholder-product.png',
          assignedDoctors: p.assignedDoctors || [],
          materialsCount: p.materialsCount || 1,
        });
      });
    });

  // ── SETTINGS (cover / thank-you slides) ──────────────────
  const SETTINGS = {
    coverImage: settingsData.coverImage || '',
    thanksImage: settingsData.thanksImage || '',
  };

  return { DOCTORS, META, SPEC_COLORS, SETTINGS };
}
