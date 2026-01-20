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

// Provider display info - featured shows as cards, others in dropdown
const PROVIDER_INFO = {
    // Featured providers (shown as cards)
    'openai': { name: 'OpenAI', hint: 'ChatGPT, GPT-4', featured: true },
    'anthropic': { name: 'Claude', hint: 'Anthropic', featured: true },
    'google': { name: 'Google Gemini', hint: 'Bard, Gemini Pro', featured: true },
    'mistral': { name: 'Mistral AI', hint: 'Mistral, Mixtral', featured: true },
    'perplexity': { name: 'Perplexity', hint: 'AI Search', featured: true },
    'stability': { name: 'Stability AI', hint: 'Stable Diffusion', featured: true },
    'replicate': { name: 'Replicate', hint: 'Open source models', featured: true },
    // Additional providers (shown in dropdown)
    'cohere': { name: 'Cohere', hint: 'Command, Embed', featured: false },
    'huggingface': { name: 'Hugging Face', hint: 'Inference API', featured: false },
    'azure-openai': { name: 'Azure OpenAI', hint: 'Microsoft Azure', featured: false },
    'aws-bedrock': { name: 'AWS Bedrock', hint: 'Amazon', featured: false },
    'meta-llama': { name: 'Meta Llama', hint: 'Llama 3', featured: false },
    'midjourney': { name: 'Midjourney', hint: 'Image generation', featured: false },
    'deepseek': { name: 'DeepSeek', hint: 'DeepSeek Coder', featured: false },
    'xai': { name: 'xAI Grok', hint: 'Grok', featured: false },
    'together': { name: 'Together AI', hint: 'Open source hosting', featured: false }
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

// ==========================================================================
// MODEL-SPECIFIC POWER DATA
// ==========================================================================
// Sources:
// - Luccioni et al. 2023 "Power Hungry Processing" (https://arxiv.org/abs/2311.16863)
//   Measured actual energy consumption of various AI models
// - Patterson et al. 2021 "Carbon Emissions and Large Neural Network Training"
//   (https://arxiv.org/abs/2104.10350) - Foundational AI energy research
// - Strubell et al. 2019 "Energy and Policy Considerations for Deep Learning in NLP"
// - MLPerf Inference benchmarks for hardware power consumption
//
// Power values represent INFERENCE (using the model), not TRAINING.
// Actual values vary based on hardware, batch size, and datacenter efficiency.
// ==========================================================================

const MODEL_DATA = {
    // ==========================================================================
    // OpenAI models (January 2026)
    // GPT-5.2 released December 2025 - first model above 90% ARC-AGI
    // Source: https://openai.com/index/introducing-gpt-5-2/
    // ==========================================================================
    'openai': {
        models: [
            { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', power: 550, params: '~600B (MoE)', tier: 'large',
              note: 'Most intelligent model for hard problems, 400K context' },
            { id: 'gpt-5.2-thinking', name: 'GPT-5.2 Thinking', power: 450, params: '~400B (MoE)', tier: 'large',
              note: 'Deep reasoning for coding and complex analysis' },
            { id: 'gpt-5.2-instant', name: 'GPT-5.2 Instant', power: 200, params: '~100B (MoE)', tier: 'medium',
              note: 'Fast everyday model, warm conversational tone' },
            { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', power: 500, params: '~500B (MoE)', tier: 'large',
              note: 'Specialized for professional software engineering' },
            { id: 'gpt-4o', name: 'GPT-4o (Legacy)', power: 350, params: '~200B (MoE)', tier: 'medium',
              note: 'Previous gen multimodal, still widely used' },
            { id: 'dall-e-3', name: 'DALL-E 3', power: 600, params: 'N/A', tier: 'image',
              note: 'Image generation - GPU intensive diffusion' },
        ],
        source: 'Patterson et al. 2021 baseline, scaled for GPT-5.2 architecture (openai.com/gpt-5/)'
    },

    // ==========================================================================
    // Anthropic Claude models (January 2026)
    // Claude 4.5 series released Nov 2025 - Opus 4.5 is flagship
    // Source: https://www.anthropic.com/news/claude-haiku-4-5
    // ==========================================================================
    'anthropic': {
        models: [
            { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', power: 550, params: '~300B+', tier: 'large',
              note: 'Flagship model, multi-day projects in hours' },
            { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', power: 300, params: '~100B', tier: 'medium',
              note: 'Best coding/agent performance, 1M token context' },
            { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', power: 100, params: '~35B', tier: 'small',
              note: 'Fast and cheap, matches old Sonnet 4 performance' },
        ],
        source: 'Luccioni et al. 2023 baseline, scaled for Claude 4.5 (anthropic.com/news)'
    },

    // ==========================================================================
    // Google Gemini models (January 2026)
    // Gemini 3 Flash released - outperforms 2.5 Pro at 3x speed
    // Source: https://blog.google/products/gemini/gemini-3-flash/
    // ==========================================================================
    'google': {
        models: [
            { id: 'gemini-3-pro', name: 'Gemini 3 Pro', power: 500, params: '~400B (MoE)', tier: 'large',
              note: 'Reasoning-first, adaptive thinking, 1M context' },
            { id: 'gemini-3-flash', name: 'Gemini 3 Flash', power: 180, params: '~100B (MoE)', tier: 'medium',
              note: 'Frontier intelligence at 3x speed of 2.5 Pro' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', power: 400, params: '~300B (MoE)', tier: 'large',
              note: 'Complex reasoning and coding' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', power: 120, params: '~50B (MoE)', tier: 'small',
              note: 'Cost-effective for general tasks' },
        ],
        source: 'Google efficiency reports, MoE architecture (ai.google.dev/gemini-api/docs/models)'
    },

    // Mistral models
    'mistral': {
        models: [
            { id: 'mistral-large', name: 'Mistral Large', power: 400, params: '123B', tier: 'large',
              note: 'Flagship model for complex tasks' },
            { id: 'mixtral-8x22b', name: 'Mixtral 8x22B', power: 300, params: '176B (MoE, 44B active)', tier: 'medium',
              note: 'MoE uses only fraction of parameters per query' },
            { id: 'mistral-7b', name: 'Mistral 7B', power: 80, params: '7B', tier: 'small',
              note: 'Efficient open-source model' },
            { id: 'mistral-small', name: 'Mistral Small', power: 150, params: '~22B', tier: 'small',
              note: 'Balanced for everyday tasks' },
        ],
        source: 'Luccioni et al. 2023 measured Mistral 7B; others scaled proportionally'
    },

    // Perplexity (uses various backends)
    'perplexity': {
        models: [
            { id: 'sonar-large', name: 'Sonar Large', power: 400, params: '~70B', tier: 'large',
              note: 'Research-focused with web access' },
            { id: 'sonar-small', name: 'Sonar Small', power: 150, params: '~8B', tier: 'small',
              note: 'Quick answers with citations' },
        ],
        source: 'Estimates based on underlying model architectures'
    },

    // Stability AI
    'stability': {
        models: [
            { id: 'sdxl', name: 'Stable Diffusion XL', power: 500, params: '6.6B', tier: 'image',
              note: 'High-quality image generation' },
            { id: 'sd-3', name: 'Stable Diffusion 3', power: 550, params: '8B', tier: 'image',
              note: 'Latest generation with improved quality' },
            { id: 'sd-turbo', name: 'SD Turbo', power: 300, params: '2.6B', tier: 'image',
              note: 'Faster generation, fewer steps' },
            { id: 'stable-video', name: 'Stable Video Diffusion', power: 1000, params: '~1.5B', tier: 'video',
              note: 'Video generation - very GPU intensive' },
        ],
        source: 'Luccioni et al. 2023 directly measured SD energy consumption'
    },

    // Replicate (hosts various open source models)
    'replicate': {
        models: [
            { id: 'llama-70b', name: 'Llama 3 70B', power: 350, params: '70B', tier: 'large',
              note: 'Meta\'s largest open model' },
            { id: 'llama-8b', name: 'Llama 3 8B', power: 100, params: '8B', tier: 'small',
              note: 'Efficient open-source option' },
            { id: 'flux-pro', name: 'Flux Pro', power: 450, params: '12B', tier: 'image',
              note: 'High-quality image generation' },
        ],
        source: 'Based on model parameter counts and Luccioni et al. measurements'
    },

    // Cohere
    'cohere': {
        models: [
            { id: 'command-r-plus', name: 'Command R+', power: 400, params: '104B', tier: 'large',
              note: 'Enterprise-grade reasoning' },
            { id: 'command-r', name: 'Command R', power: 200, params: '35B', tier: 'medium',
              note: 'Balanced RAG model' },
            { id: 'embed-v3', name: 'Embed v3', power: 50, params: '~1B', tier: 'small',
              note: 'Embeddings - very efficient' },
        ],
        source: 'Estimates based on published parameter counts'
    },

    // Meta Llama (self-hosted or via providers)
    'meta-llama': {
        models: [
            { id: 'llama-3-405b', name: 'Llama 3.1 405B', power: 600, params: '405B', tier: 'large',
              note: 'Largest open model available' },
            { id: 'llama-3-70b', name: 'Llama 3.1 70B', power: 350, params: '70B', tier: 'medium',
              note: 'Strong performance, open weights' },
            { id: 'llama-3-8b', name: 'Llama 3.1 8B', power: 100, params: '8B', tier: 'small',
              note: 'Efficient for edge deployment' },
        ],
        source: 'Luccioni et al. 2023 measured Llama models directly'
    },

    // Midjourney
    'midjourney': {
        models: [
            { id: 'mj-v6', name: 'Midjourney v6', power: 600, params: 'Unknown', tier: 'image',
              note: 'Premium image generation' },
            { id: 'mj-v5', name: 'Midjourney v5', power: 500, params: 'Unknown', tier: 'image',
              note: 'Previous generation' },
        ],
        source: 'Estimated based on similar diffusion model measurements'
    },

    // DeepSeek
    'deepseek': {
        models: [
            { id: 'deepseek-v2', name: 'DeepSeek V2', power: 200, params: '236B (MoE, 21B active)', tier: 'medium',
              note: 'Very efficient MoE architecture' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder', power: 150, params: '33B', tier: 'medium',
              note: 'Specialized for code' },
        ],
        source: 'Notably efficient due to MoE; estimates based on active parameters'
    },

    // xAI
    'xai': {
        models: [
            { id: 'grok-2', name: 'Grok 2', power: 450, params: 'Unknown (~300B)', tier: 'large',
              note: 'Latest xAI model' },
            { id: 'grok-1', name: 'Grok 1', power: 350, params: '314B (MoE)', tier: 'large',
              note: 'Open weights available' },
        ],
        source: 'Estimates based on disclosed architecture'
    },

    // Together AI (hosts various models)
    'together': {
        models: [
            { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', power: 180, params: '56B (MoE, 14B active)', tier: 'medium',
              note: 'Popular efficient MoE model' },
            { id: 'llama-70b', name: 'Llama 3 70B', power: 350, params: '70B', tier: 'large',
              note: 'Full Llama 3 model' },
            { id: 'qwen-72b', name: 'Qwen 72B', power: 360, params: '72B', tier: 'large',
              note: 'Alibaba\'s flagship' },
        ],
        source: 'Based on hosted model specifications'
    },

    // Azure OpenAI (same as OpenAI)
    'azure-openai': {
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', power: 400, params: '~200B (MoE)', tier: 'large',
              note: 'Same as OpenAI, Azure-hosted' },
            { id: 'gpt-4', name: 'GPT-4', power: 450, params: '~200B (MoE)', tier: 'large',
              note: 'Previous generation' },
            { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo', power: 200, params: '~20B', tier: 'medium',
              note: 'Cost-effective option' },
        ],
        source: 'Same models as OpenAI; power unchanged'
    },

    // AWS Bedrock
    'aws-bedrock': {
        models: [
            { id: 'claude-3-opus', name: 'Claude 3 Opus', power: 500, params: '~200B+', tier: 'large',
              note: 'Anthropic via AWS' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', power: 300, params: '~70B', tier: 'medium',
              note: 'Balanced option' },
            { id: 'titan-text', name: 'Amazon Titan Text', power: 250, params: 'Unknown', tier: 'medium',
              note: 'AWS native model' },
            { id: 'llama-70b', name: 'Llama 3 70B', power: 350, params: '70B', tier: 'large',
              note: 'Meta via AWS' },
        ],
        source: 'Based on underlying model specifications'
    },

    // Hugging Face Inference
    'huggingface': {
        models: [
            { id: 'llama-70b', name: 'Llama 3 70B', power: 350, params: '70B', tier: 'large',
              note: 'Popular hosted option' },
            { id: 'mistral-7b', name: 'Mistral 7B', power: 80, params: '7B', tier: 'small',
              note: 'Efficient inference' },
            { id: 'falcon-180b', name: 'Falcon 180B', power: 500, params: '180B', tier: 'large',
              note: 'TII\'s large model' },
        ],
        source: 'Luccioni et al. 2023 measured several HF-hosted models'
    }
};

// Power tier explanations for the info tooltip
const POWER_TIERS = {
    'small': { range: '50-150W', desc: 'Smaller models with fewer parameters. Fast and efficient.' },
    'medium': { range: '150-350W', desc: 'Mid-sized models. Good balance of capability and efficiency.' },
    'large': { range: '350-600W', desc: 'Largest text models. Most capable but use more energy.' },
    'image': { range: '300-600W', desc: 'Image generation. GPU-intensive diffusion process.' },
    'video': { range: '800-1200W+', desc: 'Video generation. Very intensive, many frames to generate.' }
};

// State for selected model
let selectedModel = null;

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
    selectedModel = null;

    document.querySelector('.location-options').classList.remove('hidden');
    document.getElementById('location-result').classList.add('hidden');
    document.getElementById('country-select').value = '';
    document.getElementById('step-results').classList.add('hidden');
    document.getElementById('step-model').classList.add('hidden');

    // Reset provider cards
    document.querySelectorAll('.provider-card').forEach(card => {
        card.classList.remove('selected', 'disabled');
    });
}

// Render provider cards
function renderProviders() {
    const grid = document.getElementById('provider-grid');
    const dropdown = document.getElementById('provider-dropdown');
    grid.innerHTML = '';

    // Render featured providers as cards
    Object.entries(PROVIDER_INFO)
        .filter(([id, info]) => info.featured)
        .forEach(([id, info]) => {
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

    // Render other providers in dropdown
    if (dropdown) {
        dropdown.innerHTML = '<option value="">More providers...</option>';
        Object.entries(PROVIDER_INFO)
            .filter(([id, info]) => !info.featured)
            .forEach(([id, info]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${info.name} - ${info.hint}`;
                dropdown.appendChild(option);
            });
    }
}

// Handle dropdown provider selection
function selectDropdownProvider(selectElement) {
    const providerId = selectElement.value;
    if (providerId) {
        selectProvider(providerId);
        // Reset dropdown visual
        selectElement.value = '';
    }
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
    selectedModel = null; // Reset model selection

    // Update UI
    document.querySelectorAll('.provider-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.provider === providerId);
    });

    // Show model selection step
    showModelSelection(providerId);
}

// Show model selection for the chosen provider
function showModelSelection(providerId) {
    const modelSection = document.getElementById('step-model');
    const modelGrid = document.getElementById('model-grid');
    const modelSource = document.getElementById('model-source');

    // Get models for this provider
    const providerData = MODEL_DATA[providerId];
    if (!providerData || !providerData.models) {
        // Provider not in MODEL_DATA, skip model selection
        // Use default power and go straight to results
        selectedModel = { id: 'default', name: 'Default', power: 400, tier: 'medium' };
        showResults();
        return;
    }

    // Clear and populate model grid
    modelGrid.innerHTML = '';
    providerData.models.forEach(model => {
        const card = document.createElement('div');
        card.className = `model-card tier-${model.tier}`;
        card.dataset.modelId = model.id;
        card.onclick = () => selectModel(model);

        // Power badge color
        let powerClass = 'power-medium';
        if (model.power <= 150) powerClass = 'power-low';
        else if (model.power >= 400) powerClass = 'power-high';

        card.innerHTML = `
            <div class="model-name">${model.name}</div>
            <div class="model-params">${model.params}</div>
            <div class="model-power ${powerClass}">${model.power}W</div>
            <div class="model-note">${model.note}</div>
        `;
        modelGrid.appendChild(card);
    });

    // Show source for this provider's estimates
    modelSource.innerHTML = `
        <p class="source-note">
            <strong>Source:</strong> ${providerData.source}
        </p>
    `;

    // Show the model section
    modelSection.classList.remove('hidden');
    document.getElementById('step-results').classList.add('hidden');

    // Scroll to model section
    modelSection.scrollIntoView({ behavior: 'smooth' });
}

// Select a specific model
async function selectModel(model) {
    selectedModel = model;

    // Update UI
    document.querySelectorAll('.model-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.modelId === model.id);
    });

    // Now show results
    await showResults();
}

// Map AI provider to cloud infrastructure
const PROVIDER_TO_CLOUD = {
    'openai': { cloud: 'azure', note: 'OpenAI runs on Microsoft Azure infrastructure' },
    'anthropic': { cloud: 'aws', note: 'Anthropic (Claude) runs primarily on AWS' },
    'google': { cloud: 'gcp', note: 'Google Gemini runs on Google Cloud Platform' },
    'mistral': { cloud: 'azure', note: 'Mistral AI partners with Microsoft Azure' },
    'perplexity': { cloud: 'aws', note: 'Perplexity runs on AWS infrastructure' },
    'stability': { cloud: 'aws', note: 'Stability AI uses AWS for model hosting' },
    'replicate': { cloud: 'aws', note: 'Replicate hosts models on AWS' },
    'cohere': { cloud: 'aws', note: 'Cohere uses AWS and GCP' },
    'huggingface': { cloud: 'aws', note: 'Hugging Face Inference API uses AWS' },
    'azure-openai': { cloud: 'azure', note: 'Azure OpenAI runs on Microsoft Azure datacenters' },
    'aws-bedrock': { cloud: 'aws', note: 'AWS Bedrock runs on Amazon Web Services' },
    'meta-llama': { cloud: 'aws', note: 'Meta Llama typically hosted on AWS/Azure' },
    'midjourney': { cloud: 'gcp', note: 'Midjourney runs on Google Cloud Platform' },
    'deepseek': { cloud: 'aws', note: 'DeepSeek uses cloud infrastructure in Asia' },
    'xai': { cloud: 'aws', note: 'xAI Grok runs on Oracle Cloud / AWS' },
    'together': { cloud: 'aws', note: 'Together AI hosts on AWS' }
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

    // Model info
    if (selectedModel) {
        document.getElementById('detail-model').textContent = selectedModel.name;
        const powerEl = document.getElementById('detail-power');
        powerEl.textContent = `${selectedModel.power}W`;
        // Color code based on power tier
        powerEl.classList.remove('power-low', 'power-medium', 'power-high');
        if (selectedModel.power <= 150) powerEl.classList.add('power-low');
        else if (selectedModel.power >= 400) powerEl.classList.add('power-high');
        else powerEl.classList.add('power-medium');
    } else {
        document.getElementById('detail-model').textContent = 'Not selected';
        document.getElementById('detail-power').textContent = '400W (default)';
    }

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

    // Auto-select "Quick Answer" task to show immediate data
    setTimeout(() => {
        const quickBtn = document.querySelector('.task-btn');
        if (quickBtn && !document.querySelector('.task-btn.active')) {
            selectTask('quick', quickBtn);
        }
    }, 500);
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
    // Use model-specific power if available
    const modelPower = selectedModel ? selectedModel.power : null;

    USAGE_SCENARIOS.forEach(scenario => {
        // Override scenario power with model power if selected
        const adjustedScenario = modelPower ? { ...scenario, power: modelPower } : scenario;
        const emissions = calculateScenarioEmissions(adjustedScenario, intensity);
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

    // Add sources note with model info if selected
    const sources = document.createElement('div');
    sources.className = 'sources';
    if (selectedModel) {
        sources.innerHTML = `
            Using <strong>${selectedModel.name}</strong> at <strong>${selectedModel.power}W</strong>.
            Power estimates from
            <a href="https://arxiv.org/abs/2311.16863" target="_blank">Luccioni et al. 2023</a> and
            <a href="https://arxiv.org/abs/2104.10350" target="_blank">Patterson et al. 2021</a>.
        `;
    } else {
        sources.innerHTML = `
            Sources: Power estimates based on
            <a href="https://arxiv.org/abs/2104.10350" target="_blank">Patterson et al. 2021</a> and
            <a href="https://mlco2.github.io/impact/" target="_blank">ML CO2 Impact</a>.
            Actual emissions vary by model size and hardware.
        `;
    }
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
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('loading');
    });
    btnElement.classList.add('active');
    btnElement.classList.add('loading');

    // Set hidden latency value from task mapping
    const task = TASK_MAPPING[taskType];
    document.getElementById('latency-input').value = task.latency;

    // Calculate immediately (no need to click "Calculate")
    calculateEmissionsForTask(taskType).finally(() => {
        btnElement.classList.remove('loading');
    });
}

// Calculate emissions for selected task
async function calculateEmissionsForTask(taskType) {
    if (!currentResult) return;

    const task = TASK_MAPPING[taskType];
    const latency = task.latency;
    // Use model-specific power if available, otherwise fall back to task mapping
    const power = selectedModel ? selectedModel.power : task.power;

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
    selectedModel = null;

    // Reset task buttons
    document.querySelectorAll('.task-btn').forEach(btn => btn.classList.remove('active'));

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
