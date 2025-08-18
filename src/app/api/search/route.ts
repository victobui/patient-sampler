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

    // Prepare the prompt for Perplexity AI
    const userPrompt = `generate a Patient summary based on the following information: ${fileContent}`;

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
      fileContent: fileContent // Include the original file content for chat context
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
