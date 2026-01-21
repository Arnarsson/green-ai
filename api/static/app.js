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
        name: 'Gemini',
        emoji: '✨',
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
    },
    xai: {
        name: 'xAI (Grok)',
        emoji: '🚀',
        clouds: ['aws', 'gcp'],
        defaultRegion: 'us-west-2',
        defaultIntensity: 350
    },
    deepseek: {
        name: 'DeepSeek',
        emoji: '🔍',
        clouds: ['aws'],
        defaultRegion: 'us-east-1',
        defaultIntensity: 400
    },
    perplexity: {
        name: 'Perplexity',
        emoji: '🌐',
        clouds: ['aws', 'gcp'],
        defaultRegion: 'us-west-2',
        defaultIntensity: 350
    },
    amazon: {
        name: 'Amazon Bedrock',
        emoji: '📦',
        clouds: ['aws'],
        defaultRegion: 'us-east-1',
        defaultIntensity: 380
    },
    azure: {
        name: 'Azure OpenAI',
        emoji: '☁️',
        clouds: ['azure'],
        defaultRegion: 'eastus',
        defaultIntensity: 370
    },
    other: {
        name: 'Other',
        emoji: '➕',
        clouds: ['aws', 'gcp', 'azure'],
        defaultRegion: 'us-east-1',
        defaultIntensity: 400,
        isOther: true
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
    ],
    xai: [
        { id: 'grok-3', name: 'Grok 3', size: 'flagship', powerMultiplier: 2.0 },
        { id: 'grok-3-mini', name: 'Grok 3 Mini', size: 'fast', powerMultiplier: 0.6 },
        { id: 'grok-vision', name: 'Grok Vision', size: 'multimodal', powerMultiplier: 1.5 }
    ],
    deepseek: [
        { id: 'deepseek-v3', name: 'DeepSeek V3', size: '671B MoE', powerMultiplier: 1.8 },
        { id: 'deepseek-r1', name: 'DeepSeek R1', size: 'reasoning', powerMultiplier: 2.5 },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', size: 'code specialist', powerMultiplier: 0.8 }
    ],
    perplexity: [
        { id: 'sonar-large', name: 'Sonar Large', size: 'search-enhanced', powerMultiplier: 1.2 },
        { id: 'sonar-small', name: 'Sonar Small', size: 'fast search', powerMultiplier: 0.5 },
        { id: 'sonar-reasoning', name: 'Sonar Reasoning', size: 'deep search', powerMultiplier: 2.0 }
    ],
    amazon: [
        { id: 'titan-text', name: 'Titan Text', size: 'general', powerMultiplier: 1.0 },
        { id: 'titan-express', name: 'Titan Express', size: 'fast', powerMultiplier: 0.4 },
        { id: 'nova-pro', name: 'Nova Pro', size: 'flagship', powerMultiplier: 1.5 }
    ],
    azure: [
        { id: 'azure-gpt-4o', name: 'GPT-4o (Azure)', size: 'flagship', powerMultiplier: 1.5 },
        { id: 'azure-gpt-4o-mini', name: 'GPT-4o Mini (Azure)', size: 'efficient', powerMultiplier: 0.4 },
        { id: 'azure-o1', name: 'o1 (Azure)', size: 'reasoning', powerMultiplier: 3.5 }
    ],
    other: [
        { id: 'other-small', name: 'Small model (~7B)', size: '~7B params', powerMultiplier: 0.2 },
        { id: 'other-medium', name: 'Medium model (~70B)', size: '~70B params', powerMultiplier: 1.0 },
        { id: 'other-large', name: 'Large model (~400B+)', size: '~400B+ params', powerMultiplier: 2.5 }
    ]
};

// OpenRouter model mappings (our ID → OpenRouter model ID)
const OPENROUTER_MODELS = {
    // OpenAI
    'gpt-5.2': 'openai/gpt-4o',  // Using gpt-4o as proxy for detection
    'gpt-5.2-thinking': 'openai/gpt-4o',
    'gpt-5.2-instant': 'openai/gpt-4o-mini',
    'o3': 'openai/o1-preview',
    'o3-mini': 'openai/o1-mini',
    // Anthropic
    'opus-4.5': 'anthropic/claude-3.5-sonnet',  // Using sonnet for cheaper detection
    'sonnet-4': 'anthropic/claude-3.5-sonnet',
    'haiku-4': 'anthropic/claude-3-haiku',
    // Google
    'gemini-2.5-pro': 'google/gemini-pro-1.5',
    'gemini-2.5-flash': 'google/gemini-flash-1.5',
    'gemini-2.5-flash-lite': 'google/gemini-flash-1.5-8b',
    // Cohere
    'command-a': 'cohere/command-r-plus',
    'command-r-plus': 'cohere/command-r-plus',
    'command-r7b': 'cohere/command-r',
    // Mistral
    'mistral-large': 'mistralai/mistral-large',
    'mistral-small': 'mistralai/mistral-small',
    'codestral': 'mistralai/codestral-latest',
    'pixtral-large': 'mistralai/pixtral-large-latest',
    // Llama (via various providers)
    'llama-4-maverick': 'meta-llama/llama-3.1-405b-instruct',
    'llama-4-scout': 'meta-llama/llama-3.1-70b-instruct',
    'llama-4-scout-mini': 'meta-llama/llama-3.1-8b-instruct'
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
// ERROR HANDLING
// ============================================
function showError(message) {
    const banner = document.getElementById('error-banner');
    const msgEl = document.getElementById('error-message');
    if (banner && msgEl) {
        msgEl.textContent = message;
        banner.classList.remove('hidden');
        // Auto-hide after 5 seconds
        setTimeout(() => banner.classList.add('hidden'), 5000);
    }
}

function hideError() {
    const banner = document.getElementById('error-banner');
    if (banner) banner.classList.add('hidden');
}

// ============================================
// OPENROUTER DETECTION (via backend proxy)
// ============================================

// Generate unique session ID for rate limiting
const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Detection status (fetched from server)
let detectionStatus = {
    available: false,
    remaining_calls: 0,
    max_calls: 3
};

// Fetch detection status from server
async function fetchDetectionStatus() {
    try {
        const response = await fetch(`/v1/detect-datacenter/status?session_id=${SESSION_ID}`);
        if (response.ok) {
            detectionStatus = await response.json();
        }
    } catch (error) {
        console.warn('Could not fetch detection status:', error);
    }
    return detectionStatus;
}

async function detectWithOpenRouter(modelId, providerKey) {
    const openrouterModel = OPENROUTER_MODELS[modelId];
    if (!openrouterModel) {
        console.warn('No OpenRouter mapping for model:', modelId);
        return null;
    }

    // Check if detection is available
    if (!detectionStatus.available || detectionStatus.remaining_calls <= 0) {
        console.log('Detection not available or limit reached');
        return null;
    }

    try {
        const response = await fetch('/v1/detect-datacenter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: openrouterModel,
                session_id: SESSION_ID
            })
        });

        const data = await response.json();

        // Update remaining calls
        detectionStatus.remaining_calls = data.remaining_calls;

        if (!data.success) {
            console.warn('Detection failed:', data.error);
            return null;
        }

        // Build detection result
        const detectionResult = {
            latencyMs: data.latency_ms,
            cfRay: data.cf_ray,
            model: data.detected_model,
            provider: providerKey,
            confidence: data.confidence,
            likelyRegion: data.likely_region,
            detectedAt: new Date().toISOString()
        };

        console.log('Detection result:', detectionResult);
        return detectionResult;

    } catch (error) {
        console.error('Detection request failed:', error);
        return null;
    }
}

function getRemainingDetections() {
    return detectionStatus.remaining_calls;
}

function canDetect() {
    return detectionStatus.available && detectionStatus.remaining_calls > 0;
}

// Settings modal functions
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.toggle('hidden');

    // Update status display when opening
    if (!modal.classList.contains('hidden')) {
        updateDetectionStatus();
    }
}

async function updateDetectionStatus() {
    await fetchDetectionStatus();
    const statusEl = document.getElementById('key-status');

    if (detectionStatus.available) {
        const remaining = detectionStatus.remaining_calls;
        const max = detectionStatus.max_calls;
        if (remaining > 0) {
            statusEl.textContent = `✓ Real detection enabled · ${remaining}/${max} detections remaining this session`;
            statusEl.classList.remove('error');
        } else {
            statusEl.textContent = `✓ Real detection enabled · Session limit reached (refresh for more)`;
            statusEl.classList.add('error');
        }
    } else {
        statusEl.textContent = '⚠️ Real detection not available (API key not configured on server)';
        statusEl.classList.add('error');
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    populateCountryDropdown();
    populateProviders();
    await loadDatacenters();
    await fetchDetectionStatus(); // Check if real detection is available
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
// PROGRESS INDICATOR
// ============================================
function updateProgress(step) {
    const steps = document.querySelectorAll('.progress-step');
    const lines = document.querySelectorAll('.progress-line');

    steps.forEach((stepEl, index) => {
        const stepNum = index + 1;
        stepEl.classList.remove('active', 'completed');

        if (stepNum < step) {
            stepEl.classList.add('completed');
        } else if (stepNum === step) {
            stepEl.classList.add('active');
        }
    });

    lines.forEach((line, index) => {
        line.classList.toggle('completed', index < step - 1);
    });
}

// ============================================
// MAP SCROLL HELPER
// ============================================
function scrollToMap() {
    const mapPanel = document.getElementById('map-panel');
    if (mapPanel && !mapPanel.classList.contains('hidden')) {
        mapPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        btn.textContent = '❌ Not supported';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
        showError('Geolocation is not supported by your browser. Please use the dropdown.');
        return;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 15000,  // Increased timeout for mobile
                maximumAge: 300000,  // Accept cached position up to 5 min old
                enableHighAccuracy: false  // Faster, uses network location
            });
        });

        // Reverse geocode to get country
        const { latitude, longitude } = position.coords;

        btn.textContent = '📍 Got location...';

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
                headers: {
                    'User-Agent': 'GreenAI-CarbonCalculator/1.0'  // Required by Nominatim
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding service unavailable');
        }

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

        // Provide specific error messages
        let errorMsg = 'Location failed';
        if (error.code === 1) {
            errorMsg = '❌ Permission denied';
            showError('Location blocked. Use a quick pick button below instead!');
        } else if (error.code === 2) {
            errorMsg = '❌ Unavailable';
            showError('Location unavailable. Use a quick pick button below!');
        } else if (error.code === 3) {
            errorMsg = '❌ Timeout';
            showError('Location timed out. Use a quick pick button below!');
        } else {
            errorMsg = '❌ Failed';
            showError('Location failed. Use a quick pick button below!');
        }

        btn.textContent = errorMsg;

        // Highlight the quick pick alternatives
        highlightQuickPicks();

        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 3000);
        return;
    }

    btn.textContent = originalText;
    btn.disabled = false;
}

// Highlight quick pick buttons when location fails
function highlightQuickPicks() {
    const suggestions = document.querySelector('.country-suggestions');
    if (suggestions) {
        suggestions.classList.add('highlighted');
        suggestions.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove highlight after a few seconds
        setTimeout(() => {
            suggestions.classList.remove('highlighted');
        }, 4000);
    }
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

    // Update progress
    updateProgress(2);
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
        if (provider.isOther) {
            btn.classList.add('other-provider');
        }
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

    // Update progress
    updateProgress(3);
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

    // Update emission estimates in usage cards
    updateUsageEstimates();

    // Update progress
    updateProgress(4);
}

// ============================================
// CALCULATOR: STEP 4 - USAGE
// ============================================
function selectUsage(usageKey) {
    selectedUsage = usageKey;

    // Update card states
    document.querySelectorAll('.usage-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.usage === usageKey);
    });

    // Show CTA
    document.getElementById('step-cta').classList.remove('hidden');

    // Keep progress at step 4 until results shown
}

// Update usage card emission estimates based on selected model
function updateUsageEstimates() {
    if (!selectedModel || !selectedLocation) return;

    const model = Object.values(PROVIDERS).flatMap(p => p.models).find(m => m.id === selectedModel);
    if (!model) return;

    // Get base carbon intensity from selected location
    const region = DATACENTER_REGIONS[selectedLocation.region] || { intensity: 400 };
    const intensity = region.intensity;

    // Base calculation: 400W × 3s = 0.33 Wh = 0.00033 kWh → grams
    const baseKwh = (400 * 3) / (1000 * 3600); // 400W for 3 seconds
    const baseCO2 = baseKwh * 1.2 * intensity * 1000; // PUE 1.2, convert to grams

    // Adjust for model size (rough multipliers based on parameters)
    const modelMultiplier = model.params ?
        (model.params.includes('1T') ? 4 : model.params.includes('400B') ? 2.5 : model.params.includes('70B') ? 1.5 : 1) : 1;

    // Calculate for each usage tier
    const quickCO2 = (baseCO2 * modelMultiplier * 1).toFixed(2);
    const standardCO2 = (baseCO2 * modelMultiplier * 6).toFixed(2);
    const deepCO2 = (baseCO2 * modelMultiplier * 20).toFixed(2);

    // Update the estimate displays
    const estQuick = document.getElementById('est-quick');
    const estStandard = document.getElementById('est-standard');
    const estDeep = document.getElementById('est-deep');

    if (estQuick) estQuick.textContent = `~${quickCO2}g`;
    if (estStandard) estStandard.textContent = `~${standardCO2}g`;
    if (estDeep) estDeep.textContent = `~${deepCO2}g`;
}

// ============================================
// CALCULATOR: SHOW RESULTS
// ============================================
async function showResults() {
    if (!selectedLocation || !selectedProvider || !selectedModel || !selectedUsage) return;

    const provider = PROVIDERS[selectedProvider];
    const usage = USAGE_PROFILES[selectedUsage];

    // If we have an OpenRouter key and calls remaining, run detection
    let detectionResult = null;
    if (canDetect()) {
        // Show loading indicator
        const ctaBtn = document.querySelector('#step-cta .btn');
        if (ctaBtn) {
            const remaining = getRemainingDetections();
            ctaBtn.textContent = `🔍 Detecting... (${remaining} left)`;
            ctaBtn.disabled = true;
        }

        detectionResult = await detectWithOpenRouter(selectedModel, selectedProvider);

        if (ctaBtn) {
            ctaBtn.textContent = '🌱 Show me the damage';
            ctaBtn.disabled = false;
        }
    }

    // Get model power multiplier
    const models = MODELS[selectedProvider] || [];
    const model = models.find(m => m.id === selectedModel) || { powerMultiplier: 1.0, name: 'Unknown' };
    const adjustedPower = usage.powerW * model.powerMultiplier;

    // Find the likely datacenter for this provider
    const providerDCs = allDatacenters.filter(dc =>
        provider.clouds.includes(dc.provider)
    );

    // Smart datacenter selection: find the CLOSEST datacenter to the user
    const userContinent = getContinent(selectedLocation.code);
    const userCoords = COUNTRY_COORDS[selectedLocation.code];

    let likelyDC = null;
    let selectionMethod = 'default';

    if (userCoords) {
        // Calculate distance to all datacenters on the same continent
        const sameContinentDCs = providerDCs.filter(dc =>
            getContinent(dc.country) === userContinent && dc.coords
        );

        if (sameContinentDCs.length > 0) {
            // Find the closest one by actual distance
            likelyDC = sameContinentDCs.reduce((closest, dc) => {
                const dist = calculateDistance(userCoords[0], userCoords[1], dc.coords[0], dc.coords[1]);
                dc._distance = dist;
                if (!closest || dist < closest._distance) {
                    return dc;
                }
                return closest;
            }, null);
            selectionMethod = 'closest';
        }
    }

    // Fallback: provider's default region
    if (!likelyDC) {
        likelyDC = providerDCs.find(dc => dc.region === provider.defaultRegion);
        selectionMethod = 'provider_default';
    }

    // Last resort: first available
    if (!likelyDC) {
        likelyDC = providerDCs[0];
        selectionMethod = 'first_available';
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
        selectionMethod = 'hardcoded_fallback';
    }

    // If detection succeeded, update selection method and potentially refine datacenter
    if (detectionResult) {
        selectionMethod = 'detected';
        // Use latency to potentially pick a different datacenter
        if (detectionResult.latencyMs && detectionResult.latencyMs < 100) {
            // Very low latency suggests we're close to the selected DC
            // Keep the closest DC selection
        }
    }

    // Calculate emissions with model-adjusted power
    const emissions = calculateEmissions(likelyDC.intensity, adjustedPower, usage.durationMs);

    // Calculate distance to selected datacenter
    const distanceKm = userCoords && likelyDC.coords
        ? calculateDistance(userCoords[0], userCoords[1], likelyDC.coords[0], likelyDC.coords[1])
        : null;

    currentResult = {
        emissions,
        provider,
        model,
        usage,
        adjustedPower,
        datacenter: likelyDC,
        userLocation: selectedLocation,
        selectionMethod,
        distanceKm,
        detection: detectionResult  // Include detection data
    };

    // Update result panel
    updateResultPanel(currentResult);

    // Show result panel
    document.getElementById('result-panel').classList.remove('hidden');
    document.getElementById('step-cta').classList.add('hidden');

    // Update progress to results
    updateProgress(5);

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

            // Zoom to the datacenter being used and highlight it
            if (likelyDC.coords) {
                map.setView(likelyDC.coords, 5, { animate: true, duration: 1 });
                highlightDatacenter(likelyDC);
            }
        }, 50);
    }, 300);
}

// Highlight the selected datacenter on the map
function highlightDatacenter(dc) {
    // Remove previous highlights
    markers.forEach(m => {
        const el = m.marker.getElement();
        if (el) {
            const markerDiv = el.querySelector('.dc-marker');
            if (markerDiv) markerDiv.classList.remove('selected');
        }
    });

    // Find and highlight the matching marker
    const match = markers.find(m =>
        m.dc.region === dc.region && m.dc.provider === dc.provider
    );

    if (match) {
        const el = match.marker.getElement();
        if (el) {
            const markerDiv = el.querySelector('.dc-marker');
            if (markerDiv) markerDiv.classList.add('selected');
        }
        // Open the popup for the selected datacenter
        match.marker.openPopup();
        // Also show the details panel
        showDcDetails(dc);
    }
}

function updateResultPanel(result) {
    const { emissions, provider, model, usage, datacenter, userLocation, selectionMethod, distanceKm, detection } = result;

    // Animate counter from 0 to emissions value
    animateCounter(emissions);

    // Update gauge needle and grade
    updateGauge(emissions, datacenter.intensity);

    // Visual comparison cards
    updateComparisonCards(emissions);

    // Journey map
    updateJourneyMap(result);

    // Details
    document.getElementById('detail-grid').textContent = `${datacenter.intensity} g/kWh`;
    document.getElementById('detail-region').textContent = `${datacenter.city || datacenter.region}`;
    document.getElementById('detail-renewable').textContent = `${datacenter.renewable || '~30'}%`;

    // Initialize scale slider
    updateScale(10);

    // What-if section
    updateWhatIf(result);
}

// Animated counter from 0 to target value
function animateCounter(target) {
    const el = document.getElementById('result-value');
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing function (ease-out cubic)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * easeOut;
        el.textContent = current.toFixed(2);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// Update gauge needle position and grade badge
function updateGauge(emissions, intensity) {
    const needle = document.getElementById('gauge-needle');
    const gradeEl = document.getElementById('carbon-grade');

    // Calculate angle based on emissions (0-1g range maps to -90 to 90 degrees)
    // Lower emissions = more to the left (green), higher = right (red)
    const normalizedValue = Math.min(emissions / 0.5, 1); // Normalize to 0-1 range
    const angle = -90 + (normalizedValue * 180); // -90 to 90 degrees

    needle.style.transform = `rotate(${angle}deg)`;

    // Determine grade
    let grade, gradeClass;
    if (emissions < 0.05) { grade = 'A+'; gradeClass = 'grade-a'; }
    else if (emissions < 0.1) { grade = 'A'; gradeClass = 'grade-a'; }
    else if (emissions < 0.2) { grade = 'B'; gradeClass = 'grade-b'; }
    else if (emissions < 0.3) { grade = 'C'; gradeClass = 'grade-c'; }
    else if (emissions < 0.5) { grade = 'D'; gradeClass = 'grade-d'; }
    else { grade = 'F'; gradeClass = 'grade-d'; }

    gradeEl.textContent = grade;
    gradeEl.className = `carbon-grade ${gradeClass}`;
}

// Update visual comparison cards
function updateComparisonCards(emissions) {
    // Raindrop: ~0.05g each (USGS median)
    const raindrops = (emissions / 0.05).toFixed(1);
    document.getElementById('comp-raindrop').textContent = raindrops;

    // Google search: ~0.2g each (Google 2023)
    const searches = (emissions / 0.2).toFixed(1);
    document.getElementById('comp-search').textContent = searches;

    // Human breath: ~0.2g CO2 each (EPA)
    const breaths = (emissions / 0.2).toFixed(1);
    document.getElementById('comp-breath').textContent = breaths;
}

// Update journey map visualization
function updateJourneyMap(result) {
    const { distanceKm, datacenter, emissions } = result;

    document.getElementById('journey-distance').textContent = distanceKm
        ? `${distanceKm.toLocaleString()}km`
        : '~5,000km';
    document.getElementById('journey-dc').textContent = datacenter.city || datacenter.region;
    document.getElementById('journey-grid').textContent = `${datacenter.intensity}g/kWh`;
    document.getElementById('journey-co2').textContent = `${emissions.toFixed(2)}g CO₂`;
}

// Update scale calculations based on slider
function updateScale(requestsPerDay) {
    if (!currentResult) return;

    const emissions = currentResult.emissions;
    const daily = emissions * requestsPerDay;
    const monthly = daily * 30;
    const yearly = daily * 365;

    document.getElementById('slider-value').textContent = requestsPerDay;
    document.getElementById('scale-daily').textContent = formatEmissions(daily);
    document.getElementById('scale-monthly').textContent = formatEmissions(monthly);
    document.getElementById('scale-yearly').textContent = formatEmissions(yearly);

    // Real-world equivalent for yearly
    // Driving: ~120g CO2/km (EPA average car)
    const drivingKm = (yearly / 120).toFixed(1);
    document.getElementById('scale-equivalent').innerHTML =
        `🚗 That's like driving <strong>${drivingKm}km</strong> per year`;
}

function formatEmissions(grams) {
    if (grams < 1) return `${grams.toFixed(2)}g`;
    if (grams < 1000) return `${grams.toFixed(0)}g`;
    return `${(grams / 1000).toFixed(1)}kg`;
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

function generatePlotTwist(userLocation, datacenter, provider, selectionMethod, distanceKm) {
    const userContinent = getContinent(userLocation.code);
    const dcContinent = getContinent(datacenter.country);

    // Add estimation disclaimer based on selection method
    const methodNote = selectionMethod === 'closest'
        ? `We're estimating ${provider.name} routes you to their nearest ${datacenter.provider.toUpperCase()} datacenter.`
        : `This is our best guess — ${provider.name} doesn't publish routing details.`;

    if (userContinent !== dcContinent) {
        const distance = distanceKm || estimateDistance(userLocation.code, datacenter);
        return PLOT_TWISTS.far_datacenter
            .replace('{user_country}', userLocation.name)
            .replace('{provider}', provider.name)
            .replace('{dc_location}', datacenter.city || datacenter.region)
            .replace('{distance}', distance.toLocaleString());
    }

    if (datacenter.renewable && datacenter.renewable > 70) {
        return `${methodNote} Good news: ${datacenter.city || datacenter.region} runs on ${datacenter.renewable}% renewables!`;
    }

    if (datacenter.intensity > 400) {
        return `${methodNote} Bad news: ${datacenter.city || datacenter.region} still relies heavily on fossil fuels.`;
    }

    if (['GB', 'DE', 'FR', 'NL', 'IE'].includes(userLocation.code) && datacenter.country === 'US') {
        return `${methodNote} Your request is crossing the Atlantic — EU privacy folks are sweating.`;
    }

    // Default: show selection method with distance
    if (distanceKm && distanceKm < 1000) {
        return `${methodNote} At just ${distanceKm.toLocaleString()}km away, latency should be snappy.`;
    }

    return `${methodNote} ${datacenter.city || datacenter.region} is ${distanceKm ? distanceKm.toLocaleString() + 'km from you' : 'your likely datacenter'}.`;
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
    const { emissions, provider, usage, datacenter, adjustedPower } = result;

    // Find the cleanest datacenter for this provider
    const providerDCs = allDatacenters.filter(dc =>
        provider.clouds.includes(dc.provider)
    ).sort((a, b) => a.intensity - b.intensity);

    if (providerDCs.length > 1) {
        const cleanest = providerDCs[0];
        const cleanestEmissions = calculateEmissions(cleanest.intensity, adjustedPower, usage.durationMs);
        const savings = ((emissions - cleanestEmissions) / emissions * 100).toFixed(0);

        if (savings > 10) {
            document.getElementById('what-if').classList.remove('hidden');

            // Update current side
            document.getElementById('whatif-current').textContent = `${emissions.toFixed(2)}g`;
            document.getElementById('whatif-current-region').textContent = datacenter.city || datacenter.region;

            // Update best side
            document.getElementById('whatif-best').textContent = `${cleanestEmissions.toFixed(2)}g`;
            document.getElementById('whatif-best-region').textContent = cleanest.city || cleanest.region;

            // Update savings badge
            document.getElementById('whatif-savings').textContent = `-${savings}%`;
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

    // Reset progress
    updateProgress(1);
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
        showError('Failed to load datacenter data. Please refresh the page.');
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

    // Track which datacenter is being viewed
    viewedDatacenter = dc;

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

// Track currently viewed datacenter for "use this region" feature
let viewedDatacenter = null;

function useSelectedDatacenter() {
    if (!viewedDatacenter || !currentResult) return;

    // Recalculate emissions with the new datacenter
    const newDC = viewedDatacenter;
    const { usage, adjustedPower, userLocation } = currentResult;

    const newEmissions = calculateEmissions(newDC.intensity, adjustedPower, usage.durationMs);

    // Calculate new distance
    const userCoords = COUNTRY_COORDS[userLocation.code];
    const newDistanceKm = userCoords && newDC.coords
        ? calculateDistance(userCoords[0], userCoords[1], newDC.coords[0], newDC.coords[1])
        : null;

    // Update current result with new datacenter
    currentResult.datacenter = newDC;
    currentResult.emissions = newEmissions;
    currentResult.distanceKm = newDistanceKm;
    currentResult.selectionMethod = 'user_selected';

    // Update the UI
    updateResultPanel(currentResult);

    // Highlight the new datacenter on the map
    highlightDatacenter(newDC);

    // Show a brief confirmation
    const btn = document.getElementById('dc-use-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✓ Updated!';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 1500);

    // Scroll to results to show the update
    document.getElementById('result-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
// DETAIL EXPLAINERS
// ============================================
const DETAIL_EXPLAINERS = {
    grid: {
        title: 'Grid Carbon Intensity',
        content: `
            <p><strong>What is it?</strong> Grid carbon intensity measures how much CO₂ is emitted per kilowatt-hour of electricity generated in a region. It's measured in grams of CO₂ per kWh (g/kWh).</p>
            <p><strong>Why does it matter?</strong> The same AI computation uses the same amount of electricity everywhere, but the carbon impact varies dramatically based on how that electricity is generated.</p>
            <div class="explainer-highlight">
                <strong>Quick reference:</strong><br>
                🟢 &lt;100 g/kWh = Very clean (nuclear, hydro, wind)<br>
                🟡 100-300 g/kWh = Mixed grid<br>
                🟠 300-500 g/kWh = Fossil-heavy<br>
                🔴 &gt;500 g/kWh = Coal-dominated
            </div>
            <p><strong>Data source:</strong> <a href="https://ember-climate.org/" target="_blank">Ember Climate</a> provides real-time and historical carbon intensity data for power grids worldwide.</p>
        `
    },
    region: {
        title: 'Datacenter Region',
        content: `
            <p><strong>What is it?</strong> This is the physical location of the datacenter processing your AI request. Cloud providers (AWS, GCP, Azure) have datacenters distributed globally.</p>
            <p><strong>How do we determine it?</strong> We estimate the likely datacenter based on:</p>
            <ul style="margin: 8px 0 8px 20px; color: var(--muted);">
                <li>Your geographic location (closest datacenter reduces latency)</li>
                <li>The AI provider's infrastructure (e.g., Anthropic uses AWS/GCP)</li>
                <li>Known routing patterns for major providers</li>
            </ul>
            <div class="explainer-highlight">
                <strong>Note:</strong> This is an estimate. Actual routing may vary based on load balancing, server availability, and provider decisions we can't observe.
            </div>
            <p><strong>Why it matters:</strong> Different regions have vastly different carbon intensities. Sweden (45g/kWh) vs India (650g/kWh) means a 14x difference in carbon footprint for the same computation!</p>
        `
    },
    renewable: {
        title: 'Renewable Energy Percentage',
        content: `
            <p><strong>What is it?</strong> The percentage of electricity in this region's grid that comes from renewable sources like solar, wind, hydro, and geothermal.</p>
            <p><strong>Key insight:</strong> Higher renewable percentage generally correlates with lower carbon intensity, but not always:</p>
            <ul style="margin: 8px 0 8px 20px; color: var(--muted);">
                <li>🇫🇷 France: ~75% nuclear (very low carbon, but not "renewable")</li>
                <li>🇳🇴 Norway: ~95% hydro (renewable AND low carbon)</li>
                <li>🇩🇪 Germany: ~50% renewables (but still uses coal backup)</li>
            </ul>
            <div class="explainer-highlight">
                <strong>Corporate claims vs reality:</strong> Many cloud providers claim "100% renewable" but this often means buying RECs (Renewable Energy Certificates) rather than actually using renewable power 24/7. The grid intensity we show reflects actual power generation, not accounting tricks.
            </div>
            <p><strong>Data sources:</strong> <a href="https://www.iea.org/" target="_blank">International Energy Agency (IEA)</a> and regional grid operators.</p>
        `
    }
};

function showDetailExplainer(type) {
    const explainer = document.getElementById('detail-explainer');
    const title = document.getElementById('explainer-title');
    const content = document.getElementById('explainer-content');

    const data = DETAIL_EXPLAINERS[type];
    if (!data) return;

    title.textContent = data.title;
    content.innerHTML = data.content;
    explainer.classList.remove('hidden');

    // Smooth scroll to explainer
    explainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideDetailExplainer() {
    const explainer = document.getElementById('detail-explainer');
    explainer.classList.add('hidden');
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

// ============================================
// LEADERBOARD MODAL
// ============================================
function toggleLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    modal.classList.toggle('hidden');

    if (!modal.classList.contains('hidden')) {
        renderLeaderboard('all');
    }
}

function filterLeaderboard(provider) {
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === provider);
    });
    renderLeaderboard(provider);
}

function renderLeaderboard(filter) {
    const table = document.getElementById('leaderboard-table');
    let dcs = [...allDatacenters].sort((a, b) => a.intensity - b.intensity);

    if (filter !== 'all') {
        dcs = dcs.filter(dc => dc.provider === filter);
    }

    table.innerHTML = dcs.slice(0, 20).map((dc, i) => {
        const rank = i + 1;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const intensityClass = getIntensityColor(dc.intensity);
        const grade = getIntensityRating(dc.intensity);

        return `
            <div class="leaderboard-row">
                <div class="leaderboard-rank ${rankClass}">#${rank}</div>
                <div>
                    <div class="leaderboard-name">${dc.city}, ${dc.country}</div>
                    <div class="leaderboard-provider">${dc.provider.toUpperCase()} / ${dc.region}</div>
                </div>
                <div class="leaderboard-intensity ${intensityClass}">${dc.intensity}g</div>
                <div class="leaderboard-grade ${intensityClass}" style="background: var(--${intensityClass}-bg); color: var(--${intensityClass});">${grade}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// COMPARE MODE MODAL
// ============================================
function toggleCompareMode() {
    const modal = document.getElementById('compare-modal');
    modal.classList.toggle('hidden');

    if (!modal.classList.contains('hidden')) {
        populateCompareSelects();
    }
}

function populateCompareSelects() {
    const selects = ['compare-select-1', 'compare-select-2', 'compare-select-3'];

    selects.forEach((selectId, index) => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;

        // Clear existing options except first
        select.innerHTML = index === 2
            ? '<option value="">(Optional)</option>'
            : '<option value="">Select model...</option>';

        // Add all models from all providers
        Object.entries(MODELS).forEach(([providerKey, models]) => {
            const provider = PROVIDERS[providerKey];
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = `${providerKey}:${model.id}`;
                option.textContent = `${provider.emoji} ${model.name}`;
                select.appendChild(option);
            });
        });

        // Restore value if it exists
        if (currentValue) select.value = currentValue;
    });
}

function updateComparison() {
    const resultsEl = document.getElementById('compare-results');
    const selections = [
        document.getElementById('compare-select-1').value,
        document.getElementById('compare-select-2').value,
        document.getElementById('compare-select-3').value
    ].filter(v => v);

    if (selections.length < 2) {
        resultsEl.classList.add('hidden');
        return;
    }

    resultsEl.classList.remove('hidden');

    // Calculate emissions for each selection
    const results = selections.map(sel => {
        const [providerKey, modelId] = sel.split(':');
        const provider = PROVIDERS[providerKey];
        const model = MODELS[providerKey].find(m => m.id === modelId);

        // Use standard usage profile and default datacenter
        const usage = USAGE_PROFILES.standard;
        const adjustedPower = usage.powerW * model.powerMultiplier;
        const intensity = provider.defaultIntensity;
        const emissions = calculateEmissions(intensity, adjustedPower, usage.durationMs);

        return { providerKey, provider, model, emissions };
    });

    // Find winner (lowest emissions)
    const minEmissions = Math.min(...results.map(r => r.emissions));

    resultsEl.innerHTML = results.map(r => {
        const isWinner = r.emissions === minEmissions;
        return `
            <div class="compare-card ${isWinner ? 'winner' : ''}">
                <div class="compare-model-name">${r.model.name}</div>
                <div class="compare-provider">${r.provider.emoji} ${r.provider.name}</div>
                <div class="compare-emission">${r.emissions.toFixed(2)}g</div>
                <div class="compare-label">CO₂/request</div>
            </div>
        `;
    }).join('');
}

// ============================================
// SHARE MODAL
// ============================================
function toggleShare() {
    const modal = document.getElementById('share-modal');
    modal.classList.toggle('hidden');

    if (!modal.classList.contains('hidden') && currentResult) {
        updateShareCard();
    }
}

function updateShareCard() {
    if (!currentResult) return;

    const { emissions, model, datacenter } = currentResult;

    // Update share card content
    document.getElementById('share-value').textContent = `${emissions.toFixed(2)}g`;
    document.getElementById('share-model').textContent = model.name;

    // Grade
    let grade;
    if (emissions < 0.05) grade = 'A+';
    else if (emissions < 0.1) grade = 'A';
    else if (emissions < 0.2) grade = 'B';
    else if (emissions < 0.3) grade = 'C';
    else grade = 'D';
    document.getElementById('share-grade').textContent = grade;

    // Calculate percentile (simulated based on emissions)
    // Lower emissions = better percentile
    const percentile = Math.max(1, Math.min(99, Math.round(100 - (emissions / 0.5 * 50))));
    document.getElementById('share-comparison').textContent =
        `Cleaner than ${percentile}% of AI setups`;
}

function copyShareLink() {
    if (!currentResult) return;

    const url = new URL(window.location.href);
    url.searchParams.set('e', currentResult.emissions.toFixed(3));
    url.searchParams.set('m', currentResult.model.id);

    navigator.clipboard.writeText(url.toString()).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = originalText, 2000);
    });
}

function downloadShareCard() {
    // Create a simple text-based share (could be enhanced with canvas)
    const { emissions, model } = currentResult;
    const text = `🌍 My AI Carbon Footprint\n\n${emissions.toFixed(2)}g CO₂ per request\nUsing: ${model.name}\n\nCalculate yours at: ${window.location.origin}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'green-ai-footprint.txt';
    a.click();
    URL.revokeObjectURL(url);
}
