# File Upload and Analysis Logic Breakdown

For the file upload functionality to work correctly with large files, it's essential to first upload the file to a storage service to generate a public URL. Sending the entire file content directly as text to an AI service like Perplexity can easily exceed the model's token limit, resulting in an error.

The following logic outlines a robust, two-step process: first, upload the file to get a URL, and second, send that URL to the AI for analysis.

---

### How `api/files/route.ts` Works

This API route is designed to handle file uploads from the user, process them through the Perplexity AI, and return a summary.

1.  **Receive Incoming Data:**
    *   The function is a `POST` handler that expects `FormData`.
    *   It extracts the uploaded `file` and the optional `systemPrompt` from the form data.
    *   If no file is found, it immediately returns a 400 error.

2.  **Upload File to Vercel Blob:**
    *   The script uses the `put` function from the `@vercel/blob` library to upload the file to Vercel's Blob storage.
    *   `access: 'public'` is set to ensure the uploaded file has a publicly accessible URL.
    *   A `token` (Vercel Blob Read-Write Token) is required to authorize this upload operation.
    *   The `put` function returns a `blob` object, which contains the public `url` of the newly uploaded file.

3.  **Construct Perplexity API Payload:**
    *   A `payload` object is created to be sent to the Perplexity API.
    *   The `messages` array is structured specifically for file analysis:
        *   A `system` message sets the context for the AI.
        *   The `user` message contains an array with two distinct parts:
            1.  A `text` object containing the instruction (e.g., "Summarize and analyze the following document.").
            2.  A `file_url` object containing the `blob.url` generated in the previous step. This tells Perplexity to fetch the file from that URL instead of processing it as inline text.

4.  **Call Perplexity API:**
    *   A `fetch` request is made to the Perplexity API endpoint (`https://api.perplexity.ai/chat/completions`).
    *   The request includes the necessary `Authorization` header with the Perplexity API key and the JSON-stringified `payload` in the body.

5.  **Process the Response:**
    *   The code checks if the API call was successful. If not, it throws an error.
    *   It parses the JSON response from Perplexity to get the AI-generated summary.
    *   It also reads the original `file.text()` to include in the final response. This is useful for providing context to the chat functionality on the frontend without needing to re-download the file.

6.  **Format and Return Result:**
    *   A final `result` object is created, structuring the data (summary content, model info, token usage, and original file content) in the format expected by the frontend application.
    *   This `result` object is sent back to the client as a JSON response.

7.  **Error Handling:**
    *   The entire process is wrapped in a `try...catch` block to gracefully handle any errors that might occur during the file upload or the API call, returning a 500 status code

---
# Note 

You would need a url attached to each file as shown in the code. 
I have set up a temporary blob for this but other than that maybe we could link it with a sharepoint folder and then just have the file url's point to that or use the blob I have setup here or somewhere else and just have the url be generated upon upload and then deleted. 

## files api

![files api](../../../../public/Screenshot%202025-08-27%20143119.png)