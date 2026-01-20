/**
 * Green AI - Carbon Weather Map
 * Interactive visualization of AI datacenter carbon intensity
 */

// ============================================
// STATE
// ============================================
let map = null;
let markers = [];
let allDatacenters = [];
let selectedDatacenter = null;
let currentFilter = 'all';

// Provider to cloud mapping (which cloud providers host each AI provider)
const PROVIDER_CLOUDS = {
    openai: ['aws', 'azure'],
    anthropic: ['aws', 'gcp'],
    google: ['gcp'],
    aws: ['aws'],
    azure: ['azure'],
    gcp: ['gcp']
};

// Reference datacenter for comparisons (Virginia, high intensity)
const REFERENCE_DC = {
    city: 'Virginia',
    country: 'US',
    intensity: 380
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initMap();
    await loadDatacenters();
    updateFooterStats();
});

// ============================================
// THEME
// ============================================
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeIcon(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

// ============================================
// MAP INITIALIZATION
// ============================================
function initMap() {
    // Create map centered on Atlantic (shows both US and EU)
    map = L.map('map', {
        center: [35, -20],
        zoom: 3,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: true
    });

    // Add tile layer (CartoDB positron for clean look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Close details when clicking empty map
    map.on('click', (e) => {
        if (!e.originalEvent.target.classList.contains('dc-marker')) {
            deselectDatacenter();
        }
    });
}

// ============================================
// DATA LOADING
// ============================================
async function loadDatacenters() {
    try {
        const response = await fetch('/v1/regions');
        const regions = await response.json();

        // Transform API data into our format
        allDatacenters = regions.map(r => ({
            provider: r.provider,
            region: r.region_code,
            city: r.city || r.region_code,
            country: r.country,
            intensity: r.intensity_g_kwh,
            renewable: r.renewable_percentage || 0,
            coords: r.coordinates || null
        })).filter(dc => dc.coords); // Only include those with coordinates

        // Render all markers
        renderMarkers();
    } catch (error) {
        console.error('Failed to load datacenters:', error);
    }
}

// ============================================
// MARKER RENDERING
// ============================================
function renderMarkers() {
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];

    // Filter based on current selection
    let datacenters = allDatacenters;
    if (currentFilter !== 'all') {
        const clouds = PROVIDER_CLOUDS[currentFilter] || [currentFilter];
        datacenters = allDatacenters.filter(dc => clouds.includes(dc.provider));
    }

    // Create markers
    datacenters.forEach(dc => {
        const colorClass = getIntensityColor(dc.intensity);
        const size = 16;

        const icon = L.divIcon({
            className: '',
            html: `<div class="dc-marker ${colorClass}" style="width:${size}px;height:${size}px;"></div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });

        const marker = L.marker(dc.coords, { icon })
            .addTo(map)
            .on('click', () => selectDatacenter(dc, marker));

        // Add popup on hover
        const popupContent = `
            <div class="popup-title">${dc.city}, ${dc.country}</div>
            <div class="popup-region">${dc.provider} / ${dc.region}</div>
            <div class="popup-intensity ${colorClass}">${dc.intensity}</div>
            <div class="popup-unit">g CO₂/kWh</div>
        `;
        marker.bindPopup(popupContent, {
            closeButton: false,
            offset: [0, -8]
        });
        marker.on('mouseover', () => marker.openPopup());
        marker.on('mouseout', () => marker.closePopup());

        markers.push({ marker, dc });
    });

    // Update count in footer
    document.getElementById('stat-count').textContent = datacenters.length;
}

function getIntensityColor(intensity) {
    if (intensity < 100) return 'green';
    if (intensity < 300) return 'yellow';
    if (intensity < 500) return 'orange';
    return 'red';
}

function getIntensityRating(intensity) {
    if (intensity < 50) return 'A+';
    if (intensity < 100) return 'A';
    if (intensity < 200) return 'B';
    if (intensity < 300) return 'C';
    if (intensity < 400) return 'D';
    if (intensity < 500) return 'E';
    return 'F';
}

// ============================================
// PROVIDER FILTERING
// ============================================
function filterProvider(provider) {
    currentFilter = provider;

    // Update chip states
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.provider === provider);
    });

    // Re-render markers
    renderMarkers();

    // Deselect current datacenter if it's not in the new filter
    if (selectedDatacenter) {
        const clouds = PROVIDER_CLOUDS[provider] || [provider];
        if (provider !== 'all' && !clouds.includes(selectedDatacenter.provider)) {
            deselectDatacenter();
        }
    }
}

// ============================================
// DATACENTER SELECTION
// ============================================
function selectDatacenter(dc, marker) {
    selectedDatacenter = dc;

    // Update marker styles
    document.querySelectorAll('.dc-marker').forEach(el => el.classList.remove('selected'));
    marker.getElement().querySelector('.dc-marker').classList.add('selected');

    // Hide insight tooltip
    document.getElementById('map-insight').classList.add('hidden');

    // Show and update details panel
    document.getElementById('details-empty').classList.add('hidden');
    document.getElementById('details-content').classList.remove('hidden');

    updateDetailsPanel(dc);
}

function deselectDatacenter() {
    selectedDatacenter = null;

    // Remove selection from markers
    document.querySelectorAll('.dc-marker').forEach(el => el.classList.remove('selected'));

    // Show insight tooltip
    document.getElementById('map-insight').classList.remove('hidden');

    // Hide details panel
    document.getElementById('details-empty').classList.remove('hidden');
    document.getElementById('details-content').classList.add('hidden');
}

// ============================================
// DETAILS PANEL
// ============================================
function updateDetailsPanel(dc) {
    const colorClass = getIntensityColor(dc.intensity);
    const rating = getIntensityRating(dc.intensity);

    // Location card
    document.getElementById('detail-location').textContent = `${dc.city}, ${dc.country}`;
    document.getElementById('detail-region').textContent = `${dc.provider} / ${dc.region}`;

    const intensityEl = document.getElementById('detail-intensity');
    intensityEl.textContent = dc.intensity;
    intensityEl.className = `metric-value ${colorClass}`;

    document.getElementById('detail-renewable').textContent = `${dc.renewable}%`;

    const ratingEl = document.getElementById('detail-rating');
    ratingEl.textContent = rating;
    ratingEl.className = `metric-value ${colorClass}`;

    // Per-request estimate (assuming 2 second request at 300W)
    const perRequestG = calculateEmissions(dc.intensity, 300, 2000);
    document.getElementById('estimate-value').textContent = `${perRequestG.toFixed(3)}g CO₂`;

    // Comparison to reference (Virginia)
    const refEmissions = calculateEmissions(REFERENCE_DC.intensity, 300, 2000);
    const ratio = refEmissions / perRequestG;
    const contextEl = document.getElementById('estimate-context');
    if (ratio > 1.1) {
        contextEl.innerHTML = `That's <strong>${ratio.toFixed(1)}x cleaner</strong> than ${REFERENCE_DC.city} (US)`;
    } else if (ratio < 0.9) {
        contextEl.innerHTML = `That's <strong>${(1/ratio).toFixed(1)}x more</strong> than ${REFERENCE_DC.city} (US)`;
    } else {
        contextEl.innerHTML = `Similar to ${REFERENCE_DC.city} (US)`;
    }

    // Comparison list
    updateComparisonList(dc);

    // Scale calculations (1M requests)
    const monthlyHere = (perRequestG * 1000000) / 1000; // kg
    const monthlyVirginia = (refEmissions * 1000000) / 1000;
    const saved = monthlyVirginia - monthlyHere;

    document.getElementById('scale-here').textContent = `${monthlyHere.toFixed(0)} kg`;
    document.getElementById('scale-virginia').textContent = `${monthlyVirginia.toFixed(0)} kg`;

    const savedEl = document.getElementById('scale-saved');
    if (saved > 0) {
        savedEl.textContent = `Save ${saved.toFixed(0)} kg/month`;
        savedEl.className = 'scale-saved green';
    } else {
        savedEl.textContent = `+${Math.abs(saved).toFixed(0)} kg/month`;
        savedEl.className = 'scale-saved red';
    }
}

function updateComparisonList(dc) {
    // Find diverse comparison points
    const comparisons = [
        { city: 'Virginia', country: 'US', intensity: 380 },
        { city: 'Frankfurt', country: 'DE', intensity: 380 },
        { city: 'Tokyo', country: 'JP', intensity: 450 }
    ].filter(c => c.city !== dc.city);

    const html = comparisons.slice(0, 3).map(comp => {
        const saving = ((comp.intensity - dc.intensity) / comp.intensity * 100).toFixed(0);
        const isPositive = saving > 0;
        return `
            <div class="comparison-row">
                <span class="comparison-from">${comp.city}, ${comp.country}</span>
                <span class="comparison-arrow">→</span>
                <span class="comparison-saving ${isPositive ? 'green' : 'red'}">${isPositive ? '-' : '+'}${Math.abs(saving)}% emissions</span>
            </div>
        `;
    }).join('');

    document.getElementById('comparison-list').innerHTML = html;
}

function calculateEmissions(intensity, powerW, durationMs) {
    // Energy (kWh) = Power (W) / 1000 * Time (hours)
    const hours = durationMs / 1000 / 3600;
    const energyKwh = (powerW / 1000) * hours;

    // CO2 (g) = Energy * PUE * Grid Intensity
    const pue = 1.2;
    const co2g = energyKwh * pue * intensity;

    return co2g;
}

// ============================================
// FOOTER STATS
// ============================================
function updateFooterStats() {
    // Find cleanest and dirtiest
    if (allDatacenters.length === 0) return;

    const sorted = [...allDatacenters].sort((a, b) => a.intensity - b.intensity);
    const cleanest = sorted[0];
    const dirtiest = sorted[sorted.length - 1];

    document.getElementById('stat-cleanest').textContent = cleanest.city;
    document.getElementById('stat-dirtiest').textContent = dirtiest.city;
    document.getElementById('stat-count').textContent = allDatacenters.length;
}
