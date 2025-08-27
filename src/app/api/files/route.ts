import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "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";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const VERCEL_BLOB_TOKEN = "vercel_blob_rw_krM83PhlMjeOduZK_gFZyL0KzvKyfku42hOVo6dIPPROm5l";

export async function POST(request: NextRequest) {
  let blobUrl: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const systemPrompt = formData.get('systemPrompt') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Step 1: Upload the file to Vercel Blob storage to get a public URL.
    const blob = await put(file.name, file, {
      access: 'public',
      token: VERCEL_BLOB_TOKEN
    });
    blobUrl = blob.url; // Store the URL for deletion later

    // Step 2: Construct the request body for Perplexity API using the file URL.
    const payload = {
      model: "sonar-pro",
      messages: [
        { 
          role: "system", 
          content: systemPrompt || "You are an expert analyst. Summarize the key findings from the provided document." 
        },
        {
          role: "user",
          content: [
            {
              type: 'text',
              text: 'Summarize and analyze the following document.'
            },
            {
              type: 'file_url',
              file_url: {
                url: blob.url // Use the public URL from Vercel Blob
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
      stream: false,
    };

    // Step 3: Make the request to Perplexity using fetch.
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Perplexity API Error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to get response from Perplexity API');
    }

    const data = await response.json();
    const fileContent = await file.text(); // Still read for chat context if needed

    // Step 4: Format the result to match the frontend's expectation.
    const result = {
      content: data.choices[0].message.content || '',
      model: data.model,
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      search_results: [], // No web search in this path
      fileContent: fileContent, // Provide original content for subsequent chat context
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('File Upload API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Step 5: Delete the file from Vercel Blob storage after the request is complete.
    if (blobUrl) {
      try {
        await del(blobUrl, { token: VERCEL_BLOB_TOKEN });
        console.log(`Successfully deleted blob: ${blobUrl}`);
      } catch (delError) {
        console.error(`Failed to delete blob: ${blobUrl}`, delError);
        // Log the deletion error, but don't let it crash the main response
      }
    }
  }
}