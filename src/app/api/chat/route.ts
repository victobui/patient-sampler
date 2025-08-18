import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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
    const { message, patientContext, systemPrompt, chatHistory } = await request.json();

    if (!message || !patientContext) {
      return NextResponse.json(
        { error: 'Message and patient context are required' },
        { status: 400 }
      );
    }

    // Build conversation context with patient information
    const messages = [
      {
        role: "system",
        content: `${systemPrompt || "Be precise and concise."}

You are a medical AI assistant helping with questions about a specific patient. Here is the patient's medical information:

${patientContext}

Please answer questions about this patient based on the provided medical information. If asked about information not in the patient record, clearly state that the information is not available in the current patient data.`
      }
    ];

    // Add chat history
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((msg: ChatMessage) => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message
    });

    // Call Perplexity AI
    const requestBody = {
      model: "sonar-pro",
      messages: messages,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1000,
      presence_penalty: 0,
      frequency_penalty: 0,
      stream: false,
      // Perplexity-specific parameters for medical queries
      search_mode: "web",
      search_domain_filter: ["ncbi.nlm.nih.gov", "mayoclinic.org", "webmd.com", "medlineplus.gov"],
      search_recency_filter: "month"
    } as Parameters<typeof client.chat.completions.create>[0] & {
      search_mode: string;
      search_domain_filter: string[];
      search_recency_filter: string;
    };

    const response = await client.chat.completions.create(requestBody) as PerplexityResponse;

    // Extract the response data
    const result = {
      content: response.choices[0].message.content || '',
      model: response.model,
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      search_results: response.search_results || []
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
