/**
 * Green AI - Carbon Calculator + Map
 * Staged reveal: Calculator first, map slides out after results
 */

// ============================================
// STATE
// ============================================
let map = null;
let markers = [];
let allDatacenters = [];
let selectedLocation = null;
let selectedProvider = null;
let selectedModel = null;
let selectedUsage = null;
let currentResult = null;

// Provider definitions with their cloud infrastructure
const PROVIDERS = {
    openai: {
        name: 'OpenAI',
        emoji: '🤖',
        clouds: ['aws', 'azure'],
        defaultRegion: 'us-east-1',
        defaultIntensity: 380
    },
    anthropic: {
        name: 'Anthropic',
        emoji: '🧠',
        clouds: ['aws', 'gcp'],
        defaultRegion: 'us-west-2',
        defaultIntensity: 120
    },
    google: {
        name: 'Google AI',
        emoji: '🔮',
        clouds: ['gcp'],
        defaultRegion: 'us-central1',
        defaultIntensity: 450
    },
    cohere: {
        name: 'Cohere',
        emoji: '💬',
        clouds: ['aws', 'gcp'],
        defaultRegion: 'us-east-1',
        defaultIntensity: 380
    },
    mistral: {
        name: 'Mistral',
        emoji: '🌪️',
        clouds: ['azure', 'gcp'],
        defaultRegion: 'eu-west-1',
        defaultIntensity: 280
    },
    llama: {
        name: 'Llama (Meta)',
        emoji: '🦙',
        clouds: ['aws', 'azure', 'gcp'],
        defaultRegion: 'varies',
        defaultIntensity: 350
    }
};

// Usage profiles with power draw and duration
const USAGE_PROFILES = {
    quick: { powerW: 200, durationMs: 500, name: 'Quick chat' },
    standard: { powerW: 300, durationMs: 3000, name: 'Writing' },
    deep: { powerW: 400, durationMs: 10000, name: 'Deep thinking' }
};

// Models per provider with power multipliers (relative to base) - Jan 2026
const MODELS = {
    openai: [
        { id: 'gpt-5.2', name: 'GPT-5.2', size: 'flagship', powerMultiplier: 1.5 },
        { id: 'gpt-5.2-thinking', name: 'GPT-5.2 Thinking', size: 'deep reasoning', powerMultiplier: 3.5 },
        { id: 'gpt-5.2-instant', name: 'GPT-5.2 Instant', size: 'fast', powerMultiplier: 0.4 },
        { id: 'o3', name: 'o3', size: 'reasoning', powerMultiplier: 4.0 },
        { id: 'o3-mini', name: 'o3-mini', size: 'efficient reasoning', powerMultiplier: 1.5 }
    ],
    anthropic: [
        { id: 'opus-4.5', name: 'Claude Opus 4.5', size: 'most capable', powerMultiplier: 3.0 },
        { id: 'sonnet-4', name: 'Claude Sonnet 4', size: 'balanced', powerMultiplier: 1.0 },
        { id: 'haiku-4', name: 'Claude Haiku 4', size: 'fastest', powerMultiplier: 0.3 }
    ],
    google: [
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', size: 'flagship', powerMultiplier: 1.5 },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', size: 'fast', powerMultiplier: 0.5 },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', size: 'cheapest', powerMultiplier: 0.15 }
    ],
    cohere: [
        { id: 'command-a', name: 'Command A', size: 'flagship', powerMultiplier: 1.2 },
        { id: 'command-r-plus', name: 'Command R+', size: '128K RAG', powerMultiplier: 1.0 },
        { id: 'command-r7b', name: 'Command R7B', size: 'on-device', powerMultiplier: 0.1 }
    ],
    mistral: [
        { id: 'mistral-large', name: 'Mistral Large', size: '128K flagship', powerMultiplier: 1.3 },
        { id: 'mistral-small', name: 'Mistral Small', size: 'efficient', powerMultiplier: 0.3 },
        { id: 'codestral', name: 'Codestral', size: 'code specialist', powerMultiplier: 0.8 },
        { id: 'pixtral-large', name: 'Pixtral Large', size: 'vision', powerMultiplier: 1.4 }
    ],
    llama: [
        { id: 'llama-4-maverick', name: 'Llama 4 Maverick', size: '400B MoE', powerMultiplier: 2.0 },
        { id: 'llama-4-scout', name: 'Llama 4 Scout', size: '109B MoE', powerMultiplier: 0.8 },
        { id: 'llama-4-scout-mini', name: 'Llama 4 Scout Mini', size: 'efficient', powerMultiplier: 0.3 }
    ]
};

// Factual comparisons with verified sources
const QUIPS = {
    tiny: [
        { text: "About the mass of a raindrop", source: "USGS: median raindrop mass 0.034-0.052g" },
        { text: "Less than one human breath", source: "EPA: avg exhale contains ~200mg CO2" }
    ],
    small: [
        { text: "Similar to one Google search", source: "Google 2023: 0.2g CO2 per search" },
        { text: "About one human breath", source: "EPA: avg exhale ~200mg CO2" }
    ],
    medium: [
        { text: "Similar to boiling water for 1 cup of tea", source: "Carbon Trust: ~15g CO2 per kettle boil" },
        { text: "Like charging a smartphone once", source: "EPA: ~8-12g CO2 per full charge" }
    ],
    large: [
        { text: "Similar to driving a car 100 meters", source: "EPA: avg car emits 404g CO2/mile" },
        { text: "About 1 minute of average EU electricity use", source: "EEA: EU avg ~230g CO2/kWh" }
    ]
};

// Scale comparisons with verified sources
const SCALE_QUIPS = {
    huge: { text: "Equivalent to human respiration for 1 year", source: "Human metabolism: ~200kg CO2/year exhaled (IPCC)" },
    large: { text: "About 1 economy flight km per person", source: "DEFRA 2023: ~255g CO2/passenger-km" },
    medium: { text: "Like driving a car 100km", source: "EPA: avg car ~120g CO2/km" },
    small: { text: "What a mature tree absorbs in 6 months", source: "US Forest Service: ~22kg CO2/year per tree" },
    tiny: { text: "About 50 Google searches", source: "Google 2023: 0.2g CO2 per search" }
};

// Plot twist templates
const PLOT_TWISTS = {
    far_datacenter: "You're in {user_country} but {provider} runs in {dc_location}. That's {distance}km of electrons. The internet is just spicy wires.",
    clean_grid: "Plot twist: {dc_location} runs on {renewable}% renewables. Your AI is basically solar-powered.",
    dirty_grid: "Bad news: {dc_location} still burns coal like it's 1985. Your AI has a smoking habit.",
    same_continent: "At least you're on the same continent as your AI. The latency thanks you, even if the planet doesn't.",
    eu_user_us_dc: "Fun fact: Your request is about to cross the Atlantic. EU GDPR lawyers are nervously sweating."
};

// Country data for dropdown
const COUNTRIES = [
    { code: 'US', name: 'United States', emoji: '🇺🇸', intensity: 380 },
    { code: 'GB', name: 'United Kingdom', emoji: '🇬🇧', intensity: 230 },
    { code: 'DE', name: 'Germany', emoji: '🇩🇪', intensity: 380 },
    { code: 'FR', name: 'France', emoji: '🇫🇷', intensity: 60 },
    { code: 'NL', name: 'Netherlands', emoji: '🇳🇱', intensity: 380 },
    { code: 'SE', name: 'Sweden', emoji: '🇸🇪', intensity: 45 },
    { code: 'NO', name: 'Norway', emoji: '🇳🇴', intensity: 30 },
    { code: 'DK', name: 'Denmark', emoji: '🇩🇰', intensity: 180 },
    { code: 'FI', name: 'Finland', emoji: '🇫🇮', intensity: 100 },
    { code: 'IE', name: 'Ireland', emoji: '🇮🇪', intensity: 320 },
    { code: 'ES', name: 'Spain', emoji: '🇪🇸', intensity: 200 },
    { code: 'IT', name: 'Italy', emoji: '🇮🇹', intensity: 330 },
    { code: 'PL', name: 'Poland', emoji: '🇵🇱', intensity: 700 },
    { code: 'JP', name: 'Japan', emoji: '🇯🇵', intensity: 450 },
    { code: 'KR', name: 'South Korea', emoji: '🇰🇷', intensity: 420 },
    { code: 'AU', name: 'Australia', emoji: '🇦🇺', intensity: 580 },
    { code: 'CA', name: 'Canada', emoji: '🇨🇦', intensity: 120 },
    { code: 'BR', name: 'Brazil', emoji: '🇧🇷', intensity: 90 },
    { code: 'IN', name: 'India', emoji: '🇮🇳', intensity: 650 },
    { code: 'SG', name: 'Singapore', emoji: '🇸🇬', intensity: 400 }
];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    populateCountryDropdown();
    populateProviders();
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
// CALCULATOR: STEP 1 - LOCATION
// ============================================
function populateCountryDropdown() {
    const select = document.getElementById('country-select');
    COUNTRIES.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = `${country.emoji} ${country.name}`;
        select.appendChild(option);
    });
}

async function detectLocation() {
    const btn = document.getElementById('btn-geo');
    const originalText = btn.textContent;
    btn.textContent = '📍 Detecting...';
    btn.disabled = true;

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: false
            });
        });

        // Reverse geocode to get country
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        const countryCode = data.address?.country_code?.toUpperCase();

        if (countryCode) {
            const country = COUNTRIES.find(c => c.code === countryCode);
            if (country) {
                setLocation(country);
            } else {
                // Country not in our list, use generic
                setLocation({ code: countryCode, name: data.address?.country || countryCode, emoji: '🌍', intensity: 300 });
            }
        } else {
            throw new Error('Could not determine country');
        }
    } catch (error) {
        console.error('Geolocation failed:', error);
        btn.textContent = '❌ Failed - try dropdown';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
        return;
    }

    btn.textContent = originalText;
    btn.disabled = false;
}

function selectCountry(countryCode) {
    if (!countryCode) return;
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
        setLocation(country);
    }
}

function setLocation(country) {
    selectedLocation = country;

    // Update UI
    document.getElementById('selected-location').textContent = `${country.name} ${country.emoji}`;
    document.getElementById('location-result').classList.remove('hidden');
    document.getElementById('country-select').value = '';

    // Show next step
    document.getElementById('step-provider').classList.remove('hidden');
}

function resetLocation() {
    selectedLocation = null;
    document.getElementById('location-result').classList.add('hidden');
    document.getElementById('step-provider').classList.add('hidden');
    document.getElementById('step-model').classList.add('hidden');
    document.getElementById('step-usage').classList.add('hidden');
    document.getElementById('step-cta').classList.add('hidden');

    // Reset provider selection
    document.querySelectorAll('.provider-btn').forEach(btn => btn.classList.remove('selected'));
    selectedProvider = null;

    // Reset model selection
    document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('selected'));
    selectedModel = null;

    // Reset usage selection
    document.querySelectorAll('.usage-btn').forEach(btn => btn.classList.remove('selected'));
    selectedUsage = null;
}

// ============================================
// CALCULATOR: STEP 2 - PROVIDER
// ============================================
function populateProviders() {
    const grid = document.getElementById('provider-grid');
    grid.innerHTML = '';

    Object.entries(PROVIDERS).forEach(([key, provider]) => {
        const btn = document.createElement('button');
        btn.className = 'provider-btn';
        btn.dataset.provider = key;
        btn.onclick = () => selectProvider(key);
        btn.innerHTML = `
            <span class="provider-icon">${provider.emoji}</span>
            <span class="provider-name">${provider.name}</span>
        `;
        grid.appendChild(btn);
    });
}

function selectProvider(providerKey) {
    selectedProvider = providerKey;
    selectedModel = null; // Reset model when provider changes

    // Update button states
    document.querySelectorAll('.provider-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.provider === providerKey);
    });

    // Populate models for this provider
    populateModels(providerKey);

    // Show model step, hide usage until model is selected
    document.getElementById('step-model').classList.remove('hidden');
    document.getElementById('step-usage').classList.add('hidden');
    document.getElementById('step-cta').classList.add('hidden');
}

// ============================================
// CALCULATOR: STEP 3 - MODEL
// ============================================
function populateModels(providerKey) {
    const grid = document.getElementById('model-grid');
    const models = MODELS[providerKey] || [];

    grid.innerHTML = models.map(model => `
        <button class="model-btn" data-model="${model.id}" onclick="selectModel('${model.id}')">
            <span class="model-name">${model.name}</span>
            <span class="model-size">${model.size}</span>
        </button>
    `).join('');
}

function selectModel(modelId) {
    selectedModel = modelId;

    // Update button states
    document.querySelectorAll('.model-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.model === modelId);
    });

    // Show usage step
    document.getElementById('step-usage').classList.remove('hidden');
}

// ============================================
// CALCULATOR: STEP 4 - USAGE
// ============================================
function selectUsage(usageKey) {
    selectedUsage = usageKey;

    // Update button states
    document.querySelectorAll('.usage-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.usage === usageKey);
    });

    // Show CTA
    document.getElementById('step-cta').classList.remove('hidden');
}

// ============================================
// CALCULATOR: SHOW RESULTS
// ============================================
function showResults() {
    if (!selectedLocation || !selectedProvider || !selectedModel || !selectedUsage) return;

    const provider = PROVIDERS[selectedProvider];
    const usage = USAGE_PROFILES[selectedUsage];

    // Get model power multiplier
    const models = MODELS[selectedProvider] || [];
    const model = models.find(m => m.id === selectedModel) || { powerMultiplier: 1.0, name: 'Unknown' };
    const adjustedPower = usage.powerW * model.powerMultiplier;

    // Find the likely datacenter for this provider
    const providerDCs = allDatacenters.filter(dc =>
        provider.clouds.includes(dc.provider)
    );

    // Smart datacenter selection: prefer same continent as user, then default region
    const userContinent = getContinent(selectedLocation.code);

    // First: try to find a datacenter on the same continent as the user
    let likelyDC = providerDCs.find(dc => getContinent(dc.country) === userContinent);

    // Second: fall back to provider's default region
    if (!likelyDC) {
        likelyDC = providerDCs.find(dc => dc.region === provider.defaultRegion);
    }

    // Last resort: first available
    if (!likelyDC) {
        likelyDC = providerDCs[0];
    }

    if (!likelyDC) {
        // Fallback if no datacenter found
        likelyDC = {
            city: 'Unknown',
            country: 'US',
            region: provider.defaultRegion,
            intensity: provider.defaultIntensity,
            renewable: 30,
            coords: [37.4, -122.0] // Default to SF area
        };
    }

    // Calculate emissions with model-adjusted power
    const emissions = calculateEmissions(likelyDC.intensity, adjustedPower, usage.durationMs);

    currentResult = {
        emissions,
        provider,
        model,
        usage,
        adjustedPower,
        datacenter: likelyDC,
        userLocation: selectedLocation
    };

    // Update result panel
    updateResultPanel(currentResult);

    // Show result panel
    document.getElementById('result-panel').classList.remove('hidden');
    document.getElementById('step-cta').classList.add('hidden');

    // Initialize and show map
    setTimeout(() => {
        if (!map) {
            initMap();
        }

        // Filter markers for this provider
        renderMarkers(provider.clouds);

        // Show map panel with animation
        document.getElementById('app').classList.add('map-open');
        document.getElementById('map-panel').classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('map-panel').classList.add('visible');
            map.invalidateSize(); // Leaflet needs this after container resize

            // Zoom to the datacenter being used
            if (likelyDC.coords) {
                map.setView(likelyDC.coords, 5, { animate: true });
            }
        }, 50);
    }, 300);
}

function updateResultPanel(result) {
    const { emissions, provider, model, usage, datacenter, userLocation } = result;

    // Main result
    document.getElementById('result-value').textContent = emissions.toFixed(2);

    // Quip with source
    const quip = getQuip(emissions);
    document.getElementById('result-quip').textContent = `"${quip.text}"`;
    document.getElementById('result-source').textContent = `source: ${quip.source}`;

    // Details - include model name
    document.getElementById('detail-grid').textContent = `${datacenter.intensity} g/kWh`;
    document.getElementById('detail-region').textContent = `${datacenter.city || datacenter.region} (${model?.name || provider.name})`;
    document.getElementById('detail-renewable').textContent = `${datacenter.renewable || '~30'}%`;

    // Plot twist
    const twist = generatePlotTwist(userLocation, datacenter, provider);
    document.getElementById('twist-text').textContent = twist;

    // What-if section
    updateWhatIf(result);

    // At-scale calculations
    updateAtScale(result);
}

function getQuip(emissionsG) {
    let quips;
    if (emissionsG < 0.05) quips = QUIPS.tiny;
    else if (emissionsG < 0.1) quips = QUIPS.small;
    else if (emissionsG < 0.3) quips = QUIPS.medium;
    else quips = QUIPS.large;

    const quip = quips[Math.floor(Math.random() * quips.length)];
    return quip; // Returns { text, source }
}

function generatePlotTwist(userLocation, datacenter, provider) {
    const userContinent = getContinent(userLocation.code);
    const dcContinent = getContinent(datacenter.country);

    if (userContinent !== dcContinent) {
        const distance = estimateDistance(userLocation.code, datacenter);
        return PLOT_TWISTS.far_datacenter
            .replace('{user_country}', userLocation.name)
            .replace('{provider}', provider.name)
            .replace('{dc_location}', datacenter.city || datacenter.region)
            .replace('{distance}', distance.toLocaleString());
    }

    if (datacenter.renewable && datacenter.renewable > 70) {
        return PLOT_TWISTS.clean_grid
            .replace('{dc_location}', datacenter.city || datacenter.region)
            .replace('{renewable}', datacenter.renewable);
    }

    if (datacenter.intensity > 400) {
        return PLOT_TWISTS.dirty_grid
            .replace('{dc_location}', datacenter.city || datacenter.region);
    }

    if (['GB', 'DE', 'FR', 'NL', 'IE'].includes(userLocation.code) && datacenter.country === 'US') {
        return PLOT_TWISTS.eu_user_us_dc;
    }

    return PLOT_TWISTS.same_continent;
}

function getContinent(countryCode) {
    const continents = {
        US: 'NA', CA: 'NA', MX: 'NA',
        GB: 'EU', DE: 'EU', FR: 'EU', NL: 'EU', SE: 'EU', NO: 'EU', DK: 'EU', FI: 'EU', IE: 'EU', ES: 'EU', IT: 'EU', PL: 'EU', CH: 'EU', BE: 'EU', AT: 'EU',
        JP: 'AS', KR: 'AS', SG: 'AS', IN: 'AS', CN: 'AS', TW: 'AS',
        AU: 'OC', NZ: 'OC',
        BR: 'SA', AR: 'SA', CL: 'SA'
    };
    return continents[countryCode] || 'unknown';
}

// Calculate distance using Haversine formula (verified: https://en.wikipedia.org/wiki/Haversine_formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
}

// User country approximate coordinates for distance calculation
const COUNTRY_COORDS = {
    US: [39.8, -98.6], CA: [56.1, -106.3], MX: [23.6, -102.5],
    GB: [55.4, -3.4], DE: [51.2, 10.5], FR: [46.2, 2.2], NL: [52.1, 5.3],
    SE: [60.1, 18.6], NO: [60.5, 8.5], DK: [56.3, 9.5], FI: [61.9, 25.7],
    IE: [53.4, -8.2], ES: [40.5, -3.7], IT: [41.9, 12.6], PL: [51.9, 19.1],
    JP: [36.2, 138.3], KR: [35.9, 127.8], SG: [1.4, 103.8], IN: [20.6, 79.0],
    AU: [-25.3, 133.8], BR: [-14.2, -51.9]
};

function estimateDistance(userCountry, datacenter) {
    // If datacenter has coordinates, use Haversine formula
    if (datacenter.coords && COUNTRY_COORDS[userCountry]) {
        const [userLat, userLon] = COUNTRY_COORDS[userCountry];
        const [dcLat, dcLon] = datacenter.coords;
        return calculateDistance(userLat, userLon, dcLat, dcLon);
    }

    // Fallback to continent estimates
    const distances = {
        'EU-NA': 7000, 'NA-EU': 7000,
        'EU-AS': 8000, 'AS-EU': 8000,
        'NA-AS': 10000, 'AS-NA': 10000,
        'EU-OC': 16000, 'OC-EU': 16000,
        'NA-OC': 12000, 'OC-NA': 12000,
        'EU-SA': 9000, 'SA-EU': 9000,
        'NA-SA': 7000, 'SA-NA': 7000
    };
    const fromC = getContinent(userCountry);
    const toC = getContinent(datacenter.country);
    return distances[`${fromC}-${toC}`] || 5000;
}

function updateWhatIf(result) {
    const { emissions, provider, usage } = result;

    // Find the cleanest datacenter for this provider
    const providerDCs = allDatacenters.filter(dc =>
        provider.clouds.includes(dc.provider)
    ).sort((a, b) => a.intensity - b.intensity);

    if (providerDCs.length > 1) {
        const cleanest = providerDCs[0];
        const cleanestEmissions = calculateEmissions(cleanest.intensity, usage.powerW, usage.durationMs);
        const savings = ((emissions - cleanestEmissions) / emissions * 100).toFixed(0);

        if (savings > 10) {
            document.getElementById('what-if').classList.remove('hidden');
            document.getElementById('whatif-text').innerHTML =
                `If ${provider.name} ran in ${cleanest.city || cleanest.region}: <strong>${cleanestEmissions.toFixed(2)}g</strong> per request`;
            document.getElementById('whatif-saving').textContent =
                `You'd save ${savings}% — "${getComparisonQuip(savings)}"`;
        } else {
            document.getElementById('what-if').classList.add('hidden');
        }
    }
}

function getComparisonQuip(savingsPercent) {
    if (savingsPercent > 70) return "Like switching from SUV to bicycle";
    if (savingsPercent > 50) return "Mass of 2 ants vs a raindrop";
    if (savingsPercent > 30) return "From regular to oat milk vibes";
    return "Not huge, but every electron counts";
}

function updateAtScale(result) {
    const { emissions, provider, usage } = result;

    // Monthly at 1M requests
    const monthlyKg = (emissions * 1000000) / 1000;
    document.getElementById('scale-now').textContent = `${monthlyKg.toFixed(0)} kg`;

    // Find best region
    const providerDCs = allDatacenters.filter(dc =>
        provider.clouds.includes(dc.provider)
    ).sort((a, b) => a.intensity - b.intensity);

    if (providerDCs.length > 0) {
        const cleanest = providerDCs[0];
        const cleanestEmissions = calculateEmissions(cleanest.intensity, usage.powerW, usage.durationMs);
        const cleanestMonthly = (cleanestEmissions * 1000000) / 1000;

        document.getElementById('scale-best').textContent = `${cleanestMonthly.toFixed(0)} kg`;

        const saved = monthlyKg - cleanestMonthly;
        document.getElementById('scale-saving-text').textContent = `Save ${saved.toFixed(0)}kg/month`;
        const scaleQuip = getScaleQuip(saved);
        document.getElementById('scale-quip').innerHTML = `"${scaleQuip.text}" <span class="quip-source">(${scaleQuip.source})</span>`;
    }
}

function getScaleQuip(savedKg) {
    if (savedKg > 100) return SCALE_QUIPS.huge;
    if (savedKg > 50) return SCALE_QUIPS.large;
    if (savedKg > 20) return SCALE_QUIPS.medium;
    if (savedKg > 10) return SCALE_QUIPS.small;
    return SCALE_QUIPS.tiny;
}

// ============================================
// CALCULATOR: RESET
// ============================================
function resetCalculator() {
    // Hide map
    document.getElementById('app').classList.remove('map-open');
    document.getElementById('map-panel').classList.remove('visible');

    setTimeout(() => {
        document.getElementById('map-panel').classList.add('hidden');
    }, 500);

    // Hide result panel
    document.getElementById('result-panel').classList.add('hidden');

    // Reset all selections
    resetLocation();
    currentResult = null;
}

// ============================================
// MAP INITIALIZATION
// ============================================
function initMap() {
    map = L.map('map', {
        center: [35, -20],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    map.on('click', (e) => {
        if (!e.originalEvent.target.classList.contains('dc-marker')) {
            hideDcDetails();
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

        allDatacenters = regions.map(r => ({
            provider: r.provider,
            region: r.region_code,
            city: r.city || r.region_code,
            country: r.country,
            intensity: r.intensity_g_kwh,
            renewable: r.renewable_percentage || 0,
            coords: r.coordinates || null
        })).filter(dc => dc.coords);

    } catch (error) {
        console.error('Failed to load datacenters:', error);
    }
}

// ============================================
// MAP MARKERS
// ============================================
function renderMarkers(filterClouds = null) {
    // Clear existing
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];

    // Filter datacenters
    let dcs = allDatacenters;
    if (filterClouds && filterClouds.length > 0) {
        dcs = allDatacenters.filter(dc => filterClouds.includes(dc.provider));
    }

    dcs.forEach(dc => {
        const colorClass = getIntensityColor(dc.intensity);
        const size = 14;

        const icon = L.divIcon({
            className: '',
            html: `<div class="dc-marker ${colorClass}" style="width:${size}px;height:${size}px;"></div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });

        const marker = L.marker(dc.coords, { icon })
            .addTo(map)
            .on('click', () => showDcDetails(dc));

        const popupContent = `
            <div class="popup-title">${dc.city}, ${dc.country}</div>
            <div class="popup-region">${dc.provider} / ${dc.region}</div>
            <div class="popup-intensity ${colorClass}">${dc.intensity}</div>
            <div class="popup-unit">g CO₂/kWh</div>
        `;
        marker.bindPopup(popupContent, { closeButton: false, offset: [0, -8] });
        marker.on('mouseover', () => marker.openPopup());
        marker.on('mouseout', () => marker.closePopup());

        markers.push({ marker, dc });
    });

    document.getElementById('stat-count').textContent = dcs.length;
}

function getIntensityColor(intensity) {
    if (intensity < 100) return 'green';
    if (intensity < 300) return 'yellow';
    if (intensity < 500) return 'orange';
    return 'red';
}

// ============================================
// DATACENTER DETAILS
// ============================================
function showDcDetails(dc) {
    if (!currentResult) return;

    const detailsEl = document.getElementById('dc-details');
    detailsEl.classList.remove('hidden');

    document.getElementById('dc-name').textContent = `${dc.city}, ${dc.country}`;
    document.getElementById('dc-region').textContent = `${dc.provider} / ${dc.region}`;
    document.getElementById('dc-intensity').textContent = dc.intensity;
    document.getElementById('dc-renewable').textContent = `${dc.renewable || '~30'}%`;
    document.getElementById('dc-rating').textContent = getIntensityRating(dc.intensity);

    // Calculate what-if emissions
    const whatIfEmissions = calculateEmissions(dc.intensity, currentResult.usage.powerW, currentResult.usage.durationMs);
    const currentEmissions = currentResult.emissions;
    const diff = ((currentEmissions - whatIfEmissions) / currentEmissions * 100).toFixed(0);

    const savingEl = document.getElementById('dc-saving');
    if (diff > 0) {
        savingEl.textContent = `-${diff}% emissions`;
        savingEl.className = 'dc-saving green';
    } else if (diff < 0) {
        savingEl.textContent = `+${Math.abs(diff)}% emissions`;
        savingEl.className = 'dc-saving red';
    } else {
        savingEl.textContent = 'Same as current';
        savingEl.className = 'dc-saving';
    }

    // Quip about this datacenter
    document.getElementById('dc-quip').textContent = `"${getDcQuip(dc)}"`;
}

function hideDcDetails() {
    document.getElementById('dc-details').classList.add('hidden');
}

function getDcQuip(dc) {
    if (dc.country === 'SE' || dc.country === 'NO') return "Runs on hydropower and good vibes. Must be nice.";
    if (dc.country === 'FR') return "Nuclear-powered AI. Your requests glow in the dark (not really).";
    if (dc.intensity < 100) return "Green machine! Your conscience can rest easy here.";
    if (dc.intensity > 500) return "Coal-powered computing. The 1800s called, they want their energy back.";
    if (dc.country === 'US') return "The classic choice. Reliable, but could be greener.";
    return "A solid middle-ground option.";
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
// CALCULATIONS
// ============================================
function calculateEmissions(intensityGkwh, powerW, durationMs) {
    const hours = durationMs / 1000 / 3600;
    const energyKwh = (powerW / 1000) * hours;
    const pue = 1.2;
    return energyKwh * pue * intensityGkwh;
}

// ============================================
// FOOTER STATS
// ============================================
function updateFooterStats() {
    if (allDatacenters.length === 0) return;

    const sorted = [...allDatacenters].sort((a, b) => a.intensity - b.intensity);
    const cleanest = sorted[0];
    const dirtiest = sorted[sorted.length - 1];

    document.getElementById('stat-cleanest').textContent = cleanest?.city || 'Quebec';
    document.getElementById('stat-dirtiest').textContent = dirtiest?.city || 'Mumbai';
    document.getElementById('stat-count').textContent = allDatacenters.length || '60+';
}
