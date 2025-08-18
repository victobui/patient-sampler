# Patient Summary Generator

A Next.js web application that searches for specific patient files and generates summaries using Perplexity AI.

## Features

- **File Search**: Search for patient files by ID (e.g., 614.txt)
- **AI-Powered Summaries**: Generate patient summaries using Perplexity AI
- **Customizable System Prompts**: Modify the AI system prompt as needed
- **Comprehensive Output**: View AI response, model info, token usage, and search results

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Key**
   Update the Perplexity API key in `src/app/api/search/route.ts`:
   ```typescript
   const client = new OpenAI({
     apiKey: "your-perplexity-api-key-here",
     baseURL: "https://api.perplexity.ai"
   });
   ```

3. **Add Patient Files**
   Place your patient `.txt` files in the `public/sample-data/` directory.
   - Files should be named with the patient ID (e.g., `614.txt`, `615.txt`)
   - The application will search for files in this directory

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. **Search for Patient Files**
   - Enter a patient ID (e.g., 614) in the search bar
   - Optionally modify the system prompt
   - Click "Generate Patient Summary"

## File Structure

```
patient-summary-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.ts          # API endpoint for file search and AI processing
│   │   ├── page.tsx                  # Main UI component
│   │   └── layout.tsx                # App layout
│   └── ...
├── public/
│   └── sample-data/
│       └── 614.txt                   # Sample patient file
└── ...
```

## Sample Patient File Format

Patient files should contain medical information in text format:

```
Patient ID: 614
Name: John Smith
Age: 45
Date of Birth: 01/15/1979
Medical Record Number: MRN-614-2024

Chief Complaint: Chest pain and shortness of breath

History of Present Illness:
[Patient history details...]

Past Medical History:
- Hypertension (diagnosed 2018)
- Hyperlipidemia (diagnosed 2020)
[Additional history...]

Current Medications:
- Lisinopril 10mg daily
[Additional medications...]

[Additional sections...]
```

## API Integration

The application uses the Perplexity AI API with the following configuration:

- **Model**: sonar-pro
- **Search Mode**: web
- **Temperature**: 0.2
- **Max Tokens**: 1000
- **Search Domains**: government.gov, nature.com, science.org
- **Search Recency**: month

## Features Included

1. **Patient File Search**: Automatically locates and reads patient files by ID
2. **AI Summary Generation**: Sends file content to Perplexity AI with the prompt "generate a Patient summary based on the following information"
3. **Customizable System Prompt**: Users can modify the AI system prompt
4. **Comprehensive Results Display**:
   - AI-generated summary
   - Model information
   - Token usage statistics
   - Search results from Perplexity

## Notes

- Ensure patient files are properly formatted and contain relevant medical information
- The application includes error handling for missing files and API failures
- All API calls are processed server-side for security
- Sample file (614.txt) is included for testing

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
