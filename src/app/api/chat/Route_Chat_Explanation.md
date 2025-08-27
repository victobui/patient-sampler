# Chat Route (/api/chat) - Ongoing Conversations
**Purpose:** Handle follow-up questions using the pre-loaded patient context

## Flow:

1. Receives: *user message* + *patientContext* + *chat history array*
2. Builds system prompt with patient context embedded
3. If chat history gets too long, it *summarizes the conversation history* (not the patient data)
4. Sends everything to AI for contextual response
### Key Chat Input:
```tsx
// ...existing code...
body: JSON.stringify({
  message: currentMessage,
  patientContext, // ← Same data from search route
  systemPrompt,
  chatHistory: chatMessages, // ← Growing array of conversation
}),
// ...existing code...
```
