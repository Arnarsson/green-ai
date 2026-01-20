// Green AI Dashboard - Intuitive Flow
const API_BASE = '';

// State
let regions = [];
let providers = [];
let selectedCountry = null;
let selectedProvider = null;
let currentResult = null;

// Country names for display
const COUNTRY_NAMES = {
    'DK': 'Denmark', 'NO': 'Norway', 'SE': 'Sweden', 'FI': 'Finland',
    'DE': 'Germany', 'FR': 'France', 'GB': 'United Kingdom', 'IE': 'Ireland',
    'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria',
    'ES': 'Spain', 'IT': 'Italy', 'PT': 'Portugal', 'PL': 'Poland',
    'US': 'United States', 'CA': 'Canada', 'BR': 'Brazil',
    'JP': 'Japan', 'KR': 'South Korea', 'SG': 'Singapore', 'AU': 'Australia',
    'IN': 'India', 'CN': 'China'
};

// Provider display info
const PROVIDER_INFO = {
    'openai': { name: 'OpenAI', hint: 'ChatGPT, GPT-4' },
    'anthropic': { name: 'Claude', hint: 'Anthropic' },
    'cohere': { name: 'Cohere', hint: 'Command, Embed' },
    'huggingface': { name: 'Hugging Face', hint: 'Inference API' },
    'azure-openai': { name: 'Azure OpenAI', hint: 'Microsoft Azure' },
    'aws-bedrock': { name: 'AWS Bedrock', hint: 'Amazon' }
};

// Usage scenarios with typical parameters
// Sources:
// - Power consumption: Patterson et al. 2021 "Carbon Emissions and Large Neural Network Training"
// - Hugging Face ML CO2 Impact: https://mlco2.github.io/impact/
// - IEA data on device energy consumption
const USAGE_SCENARIOS = [
    {
        icon: '💬',
        title: '1 hour of chat',
        desc: '~50 messages back and forth',
        requests: 50,
        avgLatency: 2000,  // 2 sec per response
        power: 400
    },
    {
        icon: '📝',
        title: '1 hour writing docs',
        desc: 'With AI assistance',
        requests: 30,
        avgLatency: 3000,  // longer responses
        power: 400
    },
    {
        icon: '🎨',
        title: '10 AI images',
        desc: 'Image generation',
        requests: 10,
        avgLatency: 15000,  // 15 sec per image
        power: 600  // higher for image gen
    },
    {
        icon: '🧠',
        title: '1 hour coding',
        desc: 'With reasoning/analysis',
        requests: 20,
        avgLatency: 8000,  // longer for reasoning
        power: 500
    }
];

// Real-world equivalents for context
// Sources:
// - EPA: Average car emits 121g CO2/km (https://www.epa.gov/greenvehicles)
// - IEA: Smartphone charge ~8g CO2 (varies by grid)
// - Google: Search ~0.2g CO2 (https://googleblog.blogspot.com/2009/01/powering-google-search.html)
// - Streaming: ~36g CO2/hour (IEA 2020)
const EQUIVALENTS = {
    driving: { perUnit: 121, unit: 'meters driven', icon: '🚗' },  // 121g per km = 0.121g per meter
    phoneCharges: { perUnit: 8, unit: 'phone charges', icon: '📱' },
    googleSearches: { perUnit: 0.2, unit: 'Google searches', icon: '🔍' },
    streaming: { perUnit: 0.6, unit: 'minutes of Netflix', icon: '📺' }  // 36g/hour = 0.6g/min
};

// Task complexity mapping (human tasks → machine latency in ms)
// Sources: Empirical measurements from AI provider benchmarks
const TASK_MAPPING = {
    'quick': { latency: 500, power: 300, label: 'Quick Answer' },      // Simple lookup, 0.5 sec
    'standard': { latency: 3000, power: 400, label: 'Short Writing' }, // Email/summary, 3 sec
    'complex': { latency: 10000, power: 500, label: 'Deep Dive' }      // Coding/reasoning, 10 sec
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    populateCountrySelect();
    renderProviders();
    updateStats();
    loadAnalytics();
});

// Load regions and providers from API
async function loadData() {
    try {
        const [regionsRes, providersRes] = await Promise.all([
            fetch(`${API_BASE}/v1/regions`),
            fetch(`${API_BASE}/v1/providers`)
        ]);
        regions = await regionsRes.json();
        providers = await providersRes.json();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// Populate country dropdown
function populateCountrySelect() {
    const select = document.getElementById('country-select');
    const countries = new Set();

    // Get unique countries from regions
    regions.forEach(r => countries.add(r.country));

    // Sort and add options
    const sortedCountries = Array.from(countries).sort((a, b) => {
        const nameA = COUNTRY_NAMES[a] || a;
        const nameB = COUNTRY_NAMES[b] || b;
        return nameA.localeCompare(nameB);
    });

    sortedCountries.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = COUNTRY_NAMES[code] || code;
        select.appendChild(option);
    });
}

// Detect location via browser geolocation
async function detectLocation() {
    const btn = document.getElementById('btn-geolocation');
    btn.textContent = 'Detecting...';
    btn.disabled = true;

    try {
        // Try IP-based geolocation (simpler, no permission needed)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.country_code) {
            selectCountry(data.country_code);
        } else {
            alert('Could not detect your location. Please select manually.');
        }
    } catch (error) {
        console.error('Geolocation failed:', error);
        alert('Could not detect your location. Please select manually.');
    } finally {
        btn.innerHTML = '<span class="icon">📍</span> Use my location';
        btn.disabled = false;
    }
}

// Select country
function selectCountry(countryCode) {
    if (!countryCode) return;

    selectedCountry = countryCode;

    // Update UI
    document.querySelector('.location-options').classList.add('hidden');
    document.getElementById('location-result').classList.remove('hidden');
    document.getElementById('selected-location').textContent = COUNTRY_NAMES[countryCode] || countryCode;
    document.getElementById('country-select').value = countryCode;

    // Enable provider selection
    updateProviderAvailability();
}

// Reset location
function resetLocation() {
    selectedCountry = null;
    selectedProvider = null;

    document.querySelector('.location-options').classList.remove('hidden');
    document.getElementById('location-result').classList.add('hidden');
    document.getElementById('country-select').value = '';
    document.getElementById('step-results').classList.add('hidden');

    // Reset provider cards
    document.querySelectorAll('.provider-card').forEach(card => {
        card.classList.remove('selected', 'disabled');
    });
}

// Render provider cards
function renderProviders() {
    const grid = document.getElementById('provider-grid');
    grid.innerHTML = '';

    Object.entries(PROVIDER_INFO).forEach(([id, info]) => {
        const card = document.createElement('div');
        card.className = 'provider-card';
        card.dataset.provider = id;
        card.onclick = () => selectProvider(id);

        card.innerHTML = `
            <div class="provider-name">${info.name}</div>
            <div class="provider-hint">${info.hint}</div>
        `;

        grid.appendChild(card);
    });
}

// Update provider availability based on location
function updateProviderAvailability() {
    document.querySelectorAll('.provider-card').forEach(card => {
        card.classList.remove('disabled');
    });
}

// Select provider
async function selectProvider(providerId) {
    if (!selectedCountry) {
        alert('Please select your location first');
        return;
    }

    selectedProvider = providerId;

    // Update UI
    document.querySelectorAll('.provider-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.provider === providerId);
    });

    // Find best datacenter for this provider + location
    await showResults();
}

// Map AI provider to cloud infrastructure
const PROVIDER_TO_CLOUD = {
    'openai': { cloud: 'aws', note: 'OpenAI runs on Microsoft Azure, but data suggests US regions' },
    'anthropic': { cloud: 'aws', note: 'Anthropic (Claude) runs primarily on AWS' },
    'cohere': { cloud: 'aws', note: 'Cohere uses AWS and GCP' },
    'huggingface': { cloud: 'aws', note: 'Hugging Face Inference API uses AWS' },
    'azure-openai': { cloud: 'azure', note: 'Azure OpenAI runs on Microsoft Azure datacenters' },
    'aws-bedrock': { cloud: 'aws', note: 'AWS Bedrock runs on Amazon Web Services' }
};

// Show results
async function showResults() {
    const provider = providers.find(p => p.name === selectedProvider);
    if (!provider) return;

    // Get cloud mapping
    const cloudMapping = PROVIDER_TO_CLOUD[selectedProvider] || { cloud: 'aws', note: 'Default assumption' };

    // Find the best region for this provider's cloud
    const providerRegions = regions.filter(r => r.provider === cloudMapping.cloud);

    // Find the closest/best region based on user's country
    const result = findBestRegion(providerRegions, selectedCountry);

    if (!result || !result.region) {
        // Fallback to any region
        const fallback = providerRegions.sort((a, b) => a.intensity_g_kwh - b.intensity_g_kwh)[0];
        currentResult = {
            provider: selectedProvider,
            providerName: PROVIDER_INFO[selectedProvider].name,
            region: fallback,
            country: selectedCountry,
            cloudProvider: cloudMapping.cloud,
            cloudNote: cloudMapping.note,
            explanation: [{ step: 1, text: 'Using default cleanest region' }]
        };
    } else {
        currentResult = {
            provider: selectedProvider,
            providerName: PROVIDER_INFO[selectedProvider].name,
            region: result.region,
            country: selectedCountry,
            cloudProvider: cloudMapping.cloud,
            cloudNote: cloudMapping.note,
            explanation: result.explanation
        };
    }

    // Update results UI
    displayResults(currentResult);
}

// Find best region for user's location (with explanation)
function findBestRegion(providerRegions, userCountry) {
    const explanation = [];

    // Priority 1: Region in user's country
    let inCountry = providerRegions.filter(r => r.country === userCountry);
    if (inCountry.length > 0) {
        const best = inCountry.sort((a, b) => a.intensity_g_kwh - b.intensity_g_kwh)[0];
        explanation.push({
            step: 1,
            text: `Found datacenter in your country (${COUNTRY_NAMES[userCountry] || userCountry})`
        });
        explanation.push({
            step: 2,
            text: `Selected <strong>${best.region_code}</strong> - the cleanest option at ${best.intensity_g_kwh} g/kWh`
        });
        return { region: best, explanation };
    }

    explanation.push({
        step: 1,
        text: `No datacenter in ${COUNTRY_NAMES[userCountry] || userCountry} for this provider`
    });

    // Priority 2: Region in same continent (simplified mapping)
    const europeanCountries = ['DK', 'NO', 'SE', 'FI', 'DE', 'FR', 'GB', 'IE', 'NL', 'BE', 'CH', 'AT', 'ES', 'IT', 'PT', 'PL'];
    const asianCountries = ['JP', 'KR', 'SG', 'IN', 'CN', 'AU'];
    const americanCountries = ['US', 'CA', 'BR'];

    let sameContinent = [];
    let continentName = '';

    if (europeanCountries.includes(userCountry)) {
        sameContinent = providerRegions.filter(r => europeanCountries.includes(r.country));
        continentName = 'Europe';
    } else if (asianCountries.includes(userCountry)) {
        sameContinent = providerRegions.filter(r => asianCountries.includes(r.country));
        continentName = 'Asia Pacific';
    } else if (americanCountries.includes(userCountry)) {
        sameContinent = providerRegions.filter(r => americanCountries.includes(r.country));
        continentName = 'Americas';
    }

    if (sameContinent.length > 0) {
        const best = sameContinent.sort((a, b) => a.intensity_g_kwh - b.intensity_g_kwh)[0];
        explanation.push({
            step: 2,
            text: `Looking for datacenters in ${continentName} (closest to you)`
        });
        explanation.push({
            step: 3,
            text: `Selected <strong>${best.region_code} (${best.city})</strong> - cleanest in ${continentName} at ${best.intensity_g_kwh} g/kWh`
        });

        // Show alternatives considered
        const alternatives = sameContinent.slice(0, 4).map(r => `${r.region_code}: ${r.intensity_g_kwh}g`).join(', ');
        explanation.push({
            step: 4,
            text: `Other ${continentName} options: ${alternatives}`
        });

        return { region: best, explanation };
    }

    // Priority 3: Cleanest region overall
    const best = providerRegions.sort((a, b) => a.intensity_g_kwh - b.intensity_g_kwh)[0];
    explanation.push({
        step: 2,
        text: `No nearby datacenters, selecting globally cleanest option`
    });
    explanation.push({
        step: 3,
        text: `Selected <strong>${best.region_code}</strong> at ${best.intensity_g_kwh} g/kWh`
    });

    return { region: best, explanation };
}

// Display results
function displayResults(result) {
    document.getElementById('step-results').classList.remove('hidden');

    const intensity = result.region.intensity_g_kwh;

    // Main intensity display
    document.getElementById('result-intensity').textContent = intensity;

    // Rating with traffic light background
    const ratingEl = document.getElementById('result-rating');
    const heroEl = document.querySelector('.result-hero');
    heroEl.classList.remove('traffic-green', 'traffic-yellow', 'traffic-red');

    if (intensity <= 150) {
        ratingEl.textContent = 'Excellent - Very Low Carbon';
        ratingEl.className = 'result-rating rating-excellent';
        heroEl.classList.add('traffic-green');
    } else if (intensity <= 300) {
        ratingEl.textContent = 'Good - Low Carbon';
        ratingEl.className = 'result-rating rating-good';
        heroEl.classList.add('traffic-yellow');
    } else {
        ratingEl.textContent = 'High Carbon';
        ratingEl.className = 'result-rating rating-poor';
        heroEl.classList.add('traffic-red');
    }

    // Details
    document.getElementById('detail-provider').textContent = `${result.providerName} (${result.cloudProvider.toUpperCase()})`;
    document.getElementById('detail-datacenter').textContent = `${result.region.region_code} (${result.region.city})`;
    document.getElementById('detail-location').textContent = COUNTRY_NAMES[result.country] || result.country;
    document.getElementById('detail-renewables').textContent = `${result.region.renewable_percentage || 0}%`;

    // Show detection explanation
    showExplanation(result);

    // Show comparison visual (your location vs best)
    showComparisonVisual(result);

    // Show usage scenarios
    showScenarios(result);

    // Show comparison with other regions
    showComparison(result);

    // Scroll to results
    document.getElementById('step-results').scrollIntoView({ behavior: 'smooth' });
}

// Calculate emissions for a scenario
function calculateScenarioEmissions(scenario, gridIntensity, pue = 1.2) {
    // Energy per request: Power (W) * Time (hours)
    const energyPerRequest = (scenario.power / 1000) * (scenario.avgLatency / 1000 / 3600);
    // Total energy with PUE
    const totalEnergy = energyPerRequest * scenario.requests * pue;
    // Emissions: Energy * Grid Intensity
    const emissions = totalEnergy * gridIntensity;
    return emissions;
}

// Show usage scenarios with calculated emissions
function showScenarios(result) {
    const grid = document.getElementById('scenario-grid');
    grid.innerHTML = '';

    const intensity = result.region.intensity_g_kwh;

    USAGE_SCENARIOS.forEach(scenario => {
        const emissions = calculateScenarioEmissions(scenario, intensity);
        const card = document.createElement('div');
        card.className = 'scenario-card';
        card.innerHTML = `
            <div class="scenario-icon">${scenario.icon}</div>
            <div class="scenario-title">${scenario.title}</div>
            <div class="scenario-desc">${scenario.desc}</div>
            <div class="scenario-emissions">${emissions.toFixed(2)}</div>
            <div class="scenario-unit">grams CO₂</div>
        `;
        grid.appendChild(card);
    });

    // Add sources note
    const sources = document.createElement('div');
    sources.className = 'sources';
    sources.innerHTML = `
        Sources: Power estimates based on
        <a href="https://arxiv.org/abs/2104.10350" target="_blank">Patterson et al. 2021</a> and
        <a href="https://mlco2.github.io/impact/" target="_blank">ML CO2 Impact</a>.
        Actual emissions vary by model size and hardware.
    `;
    grid.parentElement.appendChild(sources);
}

// Show real-world equivalents
function showEquivalents(emissionsG) {
    const section = document.getElementById('equivalents-section');
    const grid = document.getElementById('equivalents-grid');

    section.classList.remove('hidden');
    grid.innerHTML = '';

    // Calculate equivalents
    const metersdriven = (emissionsG / 121) * 1000; // 121g per km
    const phoneCharges = emissionsG / 8;
    const searches = emissionsG / 0.2;
    const streamingMin = emissionsG / 0.6;

    const equivs = [
        { icon: '🚗', value: metersdriven.toFixed(0), label: 'meters driven' },
        { icon: '📱', value: phoneCharges.toFixed(2), label: 'phone charges' },
        { icon: '🔍', value: searches.toFixed(0), label: 'Google searches' },
        { icon: '📺', value: streamingMin.toFixed(1), label: 'min of streaming' }
    ];

    equivs.forEach(eq => {
        const item = document.createElement('div');
        item.className = 'equivalent-item';
        item.innerHTML = `
            <div class="equivalent-icon">${eq.icon}</div>
            <span class="equivalent-value">${eq.value}</span>
            <span class="equivalent-label">${eq.label}</span>
        `;
        grid.appendChild(item);
    });
}

// Get human-readable equivalent for small emissions
function getEquivalentText(emissionsG) {
    if (emissionsG < 0.2) {
        return `Less than a Google search (0.2g)`;
    } else if (emissionsG < 1) {
        const searches = (emissionsG / 0.2).toFixed(1);
        return `≈ ${searches} Google searches`;
    } else if (emissionsG < 8) {
        const pct = ((emissionsG / 8) * 100).toFixed(0);
        return `≈ ${pct}% of charging your phone`;
    } else {
        const charges = (emissionsG / 8).toFixed(1);
        return `≈ ${charges} phone charges`;
    }
}

// Show comparison with other regions
function showComparison(result) {
    const list = document.getElementById('comparison-list');
    list.innerHTML = '';

    // Get regions for same cloud provider
    const cloudProvider = result.region.provider;
    const relevantRegions = regions
        .filter(r => r.provider === cloudProvider)
        .sort((a, b) => a.intensity_g_kwh - b.intensity_g_kwh)
        .slice(0, 5);

    relevantRegions.forEach(region => {
        const isCurrent = region.region_code === result.region.region_code;
        const intensityClass = region.intensity_g_kwh <= 100 ? 'low' : region.intensity_g_kwh <= 300 ? 'mid' : 'high';

        const item = document.createElement('div');
        item.className = `comparison-item ${isCurrent ? 'current' : ''}`;
        item.innerHTML = `
            <span class="comparison-region">${region.region_code} (${region.city})${isCurrent ? ' ← You' : ''}</span>
            <span class="comparison-intensity ${intensityClass}">${region.intensity_g_kwh} g/kWh</span>
        `;
        list.appendChild(item);
    });
}

// Select task type (replaces manual latency input)
function selectTask(taskType, btnElement) {
    if (!currentResult) {
        alert('Please select a location and AI provider first');
        return;
    }

    // Update button state
    document.querySelectorAll('.task-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    // Set hidden latency value from task mapping
    const task = TASK_MAPPING[taskType];
    document.getElementById('latency-input').value = task.latency;

    // Calculate immediately (no need to click "Calculate")
    calculateEmissionsForTask(taskType);
}

// Calculate emissions for selected task
async function calculateEmissionsForTask(taskType) {
    if (!currentResult) return;

    const task = TASK_MAPPING[taskType];
    const latency = task.latency;
    const power = task.power;

    try {
        const response = await fetch(`${API_BASE}/v1/estimate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latency_ms: latency,
                provider: currentResult.provider,
                region: currentResult.region.region_code,
                power_watts: power
            })
        });

        const data = await response.json();

        // Show result
        document.getElementById('estimate-result').classList.remove('hidden');
        document.getElementById('estimate-emissions').textContent = data.emissions_g.toFixed(4);

        // Show human-readable equivalent
        const equivalentText = getEquivalentText(data.emissions_g);
        document.getElementById('estimate-equivalent').textContent = equivalentText;

        // Update impact meter (visual bar)
        updateImpactMeter(data.emissions_g);

        // Calculate LED bulb equivalent (10W LED bulb)
        // LED uses 0.01 kWh per hour, at average grid ~400g/kWh = 4g CO2/hour = 0.067g/min
        const ledMinutes = (data.emissions_g / 0.067).toFixed(1);
        document.getElementById('bulb-time').textContent = ledMinutes;

        // Show equivalents for daily usage (assume 50 requests)
        const dailyEmissions = data.emissions_g * 50;
        showEquivalents(dailyEmissions);

        // Update analytics
        loadAnalytics();
    } catch (error) {
        console.error('Failed to calculate:', error);
    }
}

// Update the impact meter visual
function updateImpactMeter(emissionsG) {
    const meter = document.getElementById('impact-fill');
    if (!meter) return;

    // Scale: 0g = 0%, 1g = 100% (most single requests are < 1g)
    const percent = Math.min(100, (emissionsG / 0.5) * 100);
    meter.style.width = `${percent}%`;

    // Color based on emission level
    meter.classList.remove('green', 'yellow', 'red');
    if (emissionsG < 0.05) {
        meter.classList.add('green');
    } else if (emissionsG < 0.2) {
        meter.classList.add('yellow');
    } else {
        meter.classList.add('red');
    }
}

// Calculate emissions for a single request (legacy, kept for compatibility)
async function calculateEmissions() {
    if (!currentResult) return;

    const latency = parseInt(document.getElementById('latency-input').value) || 2500;

    try {
        const response = await fetch(`${API_BASE}/v1/estimate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latency_ms: latency,
                provider: currentResult.provider,
                region: currentResult.region.region_code,
                power_watts: 400
            })
        });

        const data = await response.json();

        document.getElementById('estimate-result').classList.remove('hidden');
        document.getElementById('estimate-emissions').textContent = data.emissions_g.toFixed(4);

        // Show human-readable equivalent
        const equivalentText = getEquivalentText(data.emissions_g);
        document.getElementById('estimate-equivalent').textContent = equivalentText;

        // Update impact meter
        updateImpactMeter(data.emissions_g);

        // Calculate LED bulb equivalent
        const ledMinutes = (data.emissions_g / 0.067).toFixed(1);
        const bulbEl = document.getElementById('bulb-time');
        if (bulbEl) bulbEl.textContent = ledMinutes;

        // Show equivalents for daily usage (assume 50 requests)
        const dailyEmissions = data.emissions_g * 50;
        showEquivalents(dailyEmissions);

        // Update analytics
        loadAnalytics();
    } catch (error) {
        console.error('Failed to calculate:', error);
    }
}

// Reset everything
function resetAll() {
    resetLocation();
    document.getElementById('estimate-result').classList.add('hidden');
    currentResult = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update stats
function updateStats() {
    if (regions.length === 0) return;

    const sorted = [...regions].sort((a, b) => a.intensity_g_kwh - b.intensity_g_kwh);

    document.getElementById('stat-cleanest-region').textContent = `${sorted[0].region_code}`;
    document.getElementById('stat-dirtiest-region').textContent = `${sorted[sorted.length - 1].region_code}`;
    document.getElementById('stat-regions').textContent = regions.length;
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/v1/analytics`);
        const data = await response.json();
        document.getElementById('stat-requests').textContent = data.total_requests;
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

// Show detection explanation (why this datacenter was selected)
function showExplanation(result) {
    const content = document.getElementById('explanation-content');
    if (!content) return;

    // Start with the cloud provider explanation
    let html = `<p><em>${result.cloudNote}</em></p>`;

    // Add each step of the detection logic
    if (result.explanation && result.explanation.length > 0) {
        result.explanation.forEach(step => {
            html += `
                <div class="explanation-step">
                    <span class="step-number">${step.step}</span>
                    <span class="step-text">${step.text}</span>
                </div>
            `;
        });
    }

    content.innerHTML = html;
}

// Show comparison visual (your location vs best available)
function showComparisonVisual(result) {
    const container = document.getElementById('bar-container');
    const savingsText = document.getElementById('savings-text');
    if (!container || !savingsText) return;

    const yourIntensity = result.region.intensity_g_kwh;

    // Find the cleanest region for this cloud provider
    const cloudProvider = result.region.provider;
    const cloudRegions = regions.filter(r => r.provider === cloudProvider);
    const cleanest = cloudRegions.sort((a, b) => a.intensity_g_kwh - b.intensity_g_kwh)[0];

    // Find maximum for scaling
    const maxIntensity = Math.max(yourIntensity, 500);

    // Calculate widths as percentages
    const yourWidth = Math.max(10, (yourIntensity / maxIntensity) * 100);
    const cleanestWidth = Math.max(10, (cleanest.intensity_g_kwh / maxIntensity) * 100);

    // Determine bar colors
    const yourClass = yourIntensity <= 150 ? 'positive' : yourIntensity <= 300 ? 'neutral' : 'negative';

    // Build comparison bars
    container.innerHTML = `
        <div class="bar-row">
            <span class="label">${result.region.city} (You)</span>
            <div class="bar ${yourClass}" style="width: ${yourWidth}%;">${yourIntensity}g</div>
        </div>
        <div class="bar-row">
            <span class="label">${cleanest.city} (Best)</span>
            <div class="bar positive" style="width: ${cleanestWidth}%;">${cleanest.intensity_g_kwh}g</div>
        </div>
    `;

    // Calculate potential savings
    if (cleanest.region_code !== result.region.region_code) {
        const savingsPercent = Math.round((1 - cleanest.intensity_g_kwh / yourIntensity) * 100);
        if (savingsPercent > 0) {
            savingsText.innerHTML = `💡 Moving this workload to <strong>${cleanest.city}</strong> would reduce emissions by <strong>${savingsPercent}%</strong>.`;
        } else {
            savingsText.innerHTML = `✅ You're already using one of the cleanest regions!`;
        }
    } else {
        savingsText.innerHTML = `✅ You're using the cleanest available region for this provider!`;
    }
}
