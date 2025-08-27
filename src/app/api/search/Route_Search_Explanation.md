### Search Route (/api/search) - Initial Patient Processing
**Purpose:** Load and process patient data for the first time

## Flow:

1. Takes a *searchTerm* (like "614")
2. Reads the corresponding file (614.txt) from **sample-data**
3. If file is too large (>8000 tokens), it *summarizes the raw patient data*
4. Generates an initial AI summary using the processed patient data
5. **Returns both the AI summary AND the processed patient data**
### Key Return Values:
```tsx
{
  content: "AI-generated summary", // What user sees
  fileContent: processedPatientData, // Raw/summarized patient data for chat context
  // ... other metadata
}
```
## Frontend State Management
After search completes, the frontend saves the patient data:
```tsx
// ...existing code...
const data = await response.json();
setResults(data);
setPatientContext(data.fileContent || ''); // ← This is the key!
// ...existing code...
```

The *patientContext* state variable now holds the processed patient data that will be used for ALL future conversations.