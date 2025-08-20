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

// Rough token estimation function (1 token ≈ 4 characters for most text)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Function to summarize conversation history when approaching token limit
async function summarizeHistory(messages: Array<{role: string; content: string}>): Promise<string> {
  const conversationText = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n\n');

  try {
    const summaryResponse = await client.chat.completions.create({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant. Summarize the following conversation history concisely while preserving all important medical information, patient details, and key discussion points. Keep the summary comprehensive but compact."
        },
        {
          role: "user",
          content: `Please summarize this conversation history:\n\n${conversationText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      stream: false
    });

    return summaryResponse.choices[0].message.content || '';
  } catch (error) {
    console.error('Summarization error:', error);
    // Fallback: return last few messages if summarization fails
    return messages.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
  }
}

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
    const baseSystemPrompt = `${systemPrompt || "Be precise and concise."}

You are a medical AI assistant helping with questions about a specific patient. Here is the patient's medical information:

${patientContext}

Please answer questions about this patient based on the provided medical information. If asked about information not in the patient record, clearly state that the information is not available in the current patient data.`;

    const messages = [
      {
        role: "system",
        content: baseSystemPrompt
      }
    ];

    // Estimate tokens for system message and patient context
    const totalTokens = estimateTokens(baseSystemPrompt);
    const maxAllowedTokens = 12000; // Conservative limit to stay under model's context window
    const reserveTokensForResponse = 1000; // Reserve tokens for the AI response
    const availableTokens = maxAllowedTokens - reserveTokensForResponse - totalTokens;

    // Add chat history with token management
    if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
      let historyTokens = 0;
      const historyMessages: Array<{role: string; content: string}> = [];

      // Calculate tokens for all history messages
      for (const msg of chatHistory) {
        const msgTokens = estimateTokens(msg.content);
        historyTokens += msgTokens;
        historyMessages.push({
          role: msg.role,
          content: msg.content
        });
      }

      // If history is too long, summarize it
      if (historyTokens > availableTokens * 0.7) { // Use 70% of available tokens for history
        console.log(`History too long (${historyTokens} tokens), summarizing...`);
        
        const summary = await summarizeHistory(historyMessages);
        messages.push({
          role: "system",
          content: `Previous conversation summary: ${summary}`
        });
        
        // Keep only the last 2-3 messages for immediate context
        const recentMessages = chatHistory.slice(-2);
        recentMessages.forEach((msg: ChatMessage) => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      } else {
        // Add all history if within token limits
        chatHistory.forEach((msg: ChatMessage) => {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }
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
      search_results: response.search_results || [],
      // Add metadata about summarization for debugging
      metadata: {
        summarized: totalTokens + (chatHistory?.length || 0) * 100 > availableTokens * 0.7,
        estimatedInputTokens: totalTokens
      }
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
