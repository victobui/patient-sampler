# The Complete Data Flow
---
```
1. User searches  
    ↓  
2. Search Route  
    ↓  
3. File read & patient data summarized (if needed)  
    ↓  
4. patientContext = processed patient data  
    ↓  
5. User asks questions  
    ↓  
6. Chat Route  
    ↓  
7. Chat Route uses patientContext + conversation history  
    ↓  
8. If conversation gets long → Chat Route summarizes conversation history  
    ↓  
9. Repeat steps 5-8 for ongoing chat  
```
## *NOTE (Two different Types of Summarization)

1. **Search Route**: Summarizes *patient medical records* when file is too large
2. **Chat Route:** Summarizes *conversation history* when chat gets too long

### 1. User searches → Search Route

*Frontend (page.tsx):*

```tsx
// Lines 51-72
const handleSearch = async () => {
  // ...validation...
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchTerm: searchTerm.trim(),
      systemPrompt,
    }),
  });
```
### 2. File read & patient data summarized (if needed)

*Search route (api/Search/route.ts)*

```tsx
// Lines 90-98 - File Reading
let fileContent: string;
try {
  fileContent = fs.readFileSync(filePath, 'utf-8');
} catch {
  return NextResponse.json({ error: `Failed to read file ${fileName}` }, { status: 500 });
}

// Lines 101-108 - Summarization Check & Execution
const maxPatientDataTokens = 8000;
const estimatedTokens = estimateTokens(fileContent);

let processedPatientData = fileContent;
if (estimatedTokens > maxPatientDataTokens) {
  console.log(`Patient data too long (${estimatedTokens} tokens), summarizing...`);
  processedPatientData = await summarizePatientData(fileContent); // Lines 36-53
}
```

### 3. patientContext = processed patient data

*Search Route Returns Data (api/search/route.ts)*

```tsx
// Lines 139-145
const result = {
  content: response.choices[0].message.content || '',
  model: response.model,
  usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  search_results: response.search_results || [],
  fileContent: processedPatientData, // ← This becomes patientContext
  metadata: { /* ... */ }
};
```

*Frontend Stores Patient Context: (page.tsx)*
```tsx
// Lines 79-80
const data = await response.json();
setResults(data);
setPatientContext(data.fileContent || ''); // ← Stored in state
```

### 4. User asks questions → Chat Route
*Frontend Chat Handler: (page.tsx)*
```tsx
// Lines 89-116
const handleChatSubmit = async () => {
  // ...validation and user message handling...
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: currentMessage,
      patientContext, // ← Sends stored patient context
      systemPrompt,
      chatHistory: chatMessages, // ← Conversation history array
    }),
  });
```
### 5. Chat Route uses patientContext + conversation history
*Chat Route System Prompt Building: (api/chat/route.ts)*
```tsx
// Lines 84-90
const baseSystemPrompt = `${systemPrompt || "Be precise and concise."}

You are a medical AI assistant helping with questions about a specific patient. Here is the patient's medical information:

${patientContext} // ← Patient context embedded

Please answer questions about this patient based on the provided medical information.`;
```
*Chat History Processing (api/chat/route.ts)*
```tsx
// Lines 106-114
if (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) {
  let historyTokens = 0;
  const historyMessages: Array<{role: string; content: string}> = [];

  // Calculate tokens for all history messages
  for (const msg of chatHistory) {
    const msgTokens = estimateTokens(msg.content);
    historyTokens += msgTokens;
    historyMessages.push({ role: msg.role, content: msg.content });
  }
```
### 6. If conversation gets long → Chat Route summarizes conversation history
*Token Check & Summarization Trigger: (api/chat/route.ts)*
```tsx
// Lines 121-137
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
    messages.push({ role: msg.role, content: msg.content });
  });
}
```

### 7. Repeat steps 4-6 for ongoing chat
*Frontend State Management - Messages Array Growth: (page.tsx)*
```tsx
// Lines 100 & 130 respectfully
// User message added to array
setChatMessages(prev => [...prev, userMessage]);

// Assistant response added to array  
setChatMessages(prev => [...prev, assistantMessage]);
```
#### Key State Variables:

- **chatMessages**: Growing array of conversation history
- **patientContext**: Constant patient data from initial search
- Both get passed to chat route on every subsequent message 

The *chatMessages* array keeps growing with each exchange, while *patientContext* remains constant throughout the entire session, ensuring the AI always has the original patient context plus the evolving conversation history.