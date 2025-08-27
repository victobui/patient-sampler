# SanoExplore Web Toggle and Domain Configuration

This document explains where to find and modify the web search functionality, temperature settings, and search domains in the Patient Summary App.

## 🌐 Web Search Toggle Location

The web search functionality is controlled in the API route files through Perplexity-specific parameters.

### Search API Route
**File:** `src/app/api/search/route.ts`
**Lines:** 114-134

```typescript
// filepath: src/app/api/search/route.ts
const requestBody = {
  model: "sonar-pro",
  messages: [...],
  temperature: 0.2,  // ← Temperature setting
  // ...other parameters...
  // Perplexity-specific parameters
  search_mode: "web",  // ← Toggle web search ON/OFF
  search_domain_filter: ["government.gov", "nature.com", "science.org"],  // ← Domain configuration
  search_recency_filter: "month"  // ← Time filter
};
```

### Chat API Route
**File:** `src/app/api/chat/route.ts`
**Lines:** 125-130

```typescript
// filepath: src/app/api/chat/route.ts
const requestBody = {
  model: "sonar-pro",
  messages: messages,
  temperature: 0.2,  // ← Temperature setting
  // ...other parameters...
  // Perplexity-specific parameters for medical queries
  search_mode: "web",  // ← Toggle web search ON/OFF
  search_domain_filter: ["ncbi.nlm.nih.gov", "mayoclinic.org", "webmd.com", "medlineplus.gov"],  // ← Domain configuration
  search_recency_filter: "month"  // ← Time filter
};
```

## ⚙️ Configuration Options

### 1. Temperature Adjustment
**Purpose:** Controls response creativity/randomness
- **Range:** 0.0 to 1.0
- **Current:** 0.2 (conservative for medical data)
- **Lower values:** More focused, deterministic responses
- **Higher values:** More creative, varied responses

### 2. Web Search Toggle
**Parameter:** `search_mode`
- **"web":** Enable web search
- **"text":** Disable web search (text-only mode)

### 3. Domain Configuration
**Parameter:** `search_domain_filter`

#### Current Search Domains:
- **Search API:** `["government.gov", "nature.com", "science.org"]`
- **Chat API:** `["ncbi.nlm.nih.gov", "mayoclinic.org", "webmd.com", "medlineplus.gov"]`

#### Recommended Medical Domains:
```javascript
[
  "ncbi.nlm.nih.gov",      // PubMed/NIH databases
  "mayoclinic.org",        // Mayo Clinic
  "webmd.com",             // WebMD
  "medlineplus.gov",       // MedlinePlus
  "who.int",               // World Health Organization
  "cdc.gov",               // Centers for Disease Control
  "nih.gov",               // National Institutes of Health
  "fda.gov",               // Food and Drug Administration
  "uptodate.com",          // UpToDate medical reference
  "bmj.com"                // British Medical Journal
]
```

### 4. Time Filter
**Parameter:** `search_recency_filter`
- **"hour":** Last hour
- **"day":** Last 24 hours
- **"week":** Last week
- **"month":** Last month (current setting)
- **"year":** Last year

## 🔧 What needs to modify

### To Change Temperature:
1. Open `src/app/api/search/route.ts`
2. Locate line ~97: `temperature: 0.2`
3. Change value (e.g., `temperature: 0.1` for more focused responses)
4. Repeat for `src/app/api/chat/route.ts` line ~127

### To Disable Web Search:
1. Change `search_mode: "web"` to `search_mode: "text"`
2. Apply to both API routes

### To Add/Remove Search Domains:
1. Modify the `search_domain_filter` array
2. Add trusted medical/scientific domains
3. Remove unreliable sources

### Example Configuration for Enhanced Medical Search:
```typescript
const requestBody = {
  model: "sonar-pro",
  messages: messages,
  temperature: 0.1,  // More conservative for medical
  // ...
  search_mode: "web",
  search_domain_filter: [
    "ncbi.nlm.nih.gov",
    "mayoclinic.org", 
    "who.int",
    "cdc.gov",
    "nih.gov",
    "uptodate.com"
  ],
  search_recency_filter: "year"  // Broader time range for medical research
};
```
# SanoExplore Implementation

## We essentially want to get the following changed to reflect what we would want 

![Screenshot 2025-08-22 114202](./public/Screenshot%202025-08-22%20114202.png)

If you have it implmented the traditional method for the API then it would be as follows:

![Screenshot 2](./public/Screenshot%202025-08-22%20114454.png)

This is where temperature would be adjusted and web would be on to = 'web' or off to = 'text' and if on the Domains would be active as discussed above.