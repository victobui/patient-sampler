import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  search_results?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://api.perplexity.ai"
});

// Rough token estimation function (1 token ≈ 4 characters for most text)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Function to summarize patient data if it's too long
async function summarizePatientData(fileContent: string): Promise<string> {
  try {
    const summaryResponse = await client.chat.completions.create({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant. Create a comprehensive but concise summary of the following patient medical information. Preserve all critical medical details, diagnoses, medications, procedures, and key findings while reducing the overall length."
        },
        {
          role: "user",
          content: `Please summarize this patient medical information:\n\n${fileContent}`
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
      stream: false
    });

    return summaryResponse.choices[0].message.content || fileContent;
  } catch (error) {
    console.error('Patient data summarization error:', error);
    // Fallback: return original content if summarization fails
    return fileContent;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchTerm, systemPrompt } = await request.json();

    if (!searchTerm) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      );
    }

    // Define the directory to search in
    const searchDirectory = path.join(process.cwd(), 'public', 'sample-data');
    
    // Construct the file path
    const fileName = `${searchTerm}.txt`;
    const filePath = path.join(searchDirectory, fileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `File ${fileName} not found in the specified directory` },
        { status: 404 }
      );
    }

    // Read the file content
    let fileContent: string;
    try {
      fileContent = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: `Failed to read file ${fileName}` },
        { status: 500 }
      );
    }

    // Check if patient data is too long and summarize if needed
    const maxPatientDataTokens = 8000; // Reserve space for other content
    const estimatedTokens = estimateTokens(fileContent);
    
    let processedPatientData = fileContent;
    if (estimatedTokens > maxPatientDataTokens) {
      console.log(`Patient data too long (${estimatedTokens} tokens), summarizing...`);
      processedPatientData = await summarizePatientData(fileContent);
    }

    // Prepare the prompt for Perplexity AI
    const userPrompt = `generate a Patient summary based on the following information: ${processedPatientData}`;

    // Call Perplexity AI with proper typing
    const requestBody = {
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt || "Be precise and concise." },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1000,
      presence_penalty: 0,
      frequency_penalty: 0,
      stream: false,
      // Perplexity-specific parameters
      search_mode: "web",
      search_domain_filter: ["government.gov", "nature.com", "science.org"],
      search_recency_filter: "month"
    } as Parameters<typeof client.chat.completions.create>[0] & {
      search_mode: string;
      search_domain_filter: string[];
      search_recency_filter: string;
    };

    const response = await client.chat.completions.create(requestBody) as PerplexityResponse;

    // Extract the response data with proper type handling
    const result = {
      content: response.choices[0].message.content || '',
      model: response.model,
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      search_results: response.search_results || [],
      fileContent: processedPatientData, // Use processed (potentially summarized) data for chat context
      metadata: {
        originalTokens: estimateTokens(fileContent),
        processedTokens: estimateTokens(processedPatientData),
        summarized: estimatedTokens > maxPatientDataTokens
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
