'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SearchResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  search_results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  fileContent?: string;
  metadata?: {
    originalTokens?: number;
    processedTokens?: number;
    summarized?: boolean;
  };
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('Be precise and concise.');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [patientContext, setPatientContext] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Clear search term if a file is selected
      setSearchTerm('');
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setChatMessages([]);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('systemPrompt', systemPrompt);

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze file');
      }

      const data = await response.json();
      setResults(data);
      setPatientContext(data.fileContent || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during file analysis');
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Do not reset selectedFile state here to show the file name in results
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term (e.g., 614)');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);
    setChatMessages([]);
    // Clear file selection if a search is performed
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: searchTerm.trim(),
          systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search');
      }

      const data = await response.json();
      setResults(data);
      setPatientContext(data.fileContent || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!currentMessage.trim() || !patientContext) {
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          patientContext,
          systemPrompt,
          chatHistory: chatMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get chat response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat error occurred');
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Patient Summary Generator
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search for file (e.g., 614 for 614.txt)
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Clear file selection when typing a search term
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setSelectedFile(null);
                }}
                placeholder="Enter file number (e.g., 614)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="text-center my-2 text-sm text-gray-500">OR</div>

            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Upload a file to analyze
              </label>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt (optional)
              </label>
              <textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system prompt for AI"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleSearch}
                disabled={loading || !searchTerm.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && searchTerm ? 'Processing...' : 'Generate Summary from Search'}
              </button>
              <button
                onClick={handleUploadAndAnalyze}
                disabled={loading || !selectedFile}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && selectedFile ? 'Uploading...' : 'Analyze Uploaded File'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Results</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">AI Generated Summary</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="whitespace-pre-wrap">{results.content}</p>
                  </div>
                </div>

                {selectedFile && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzed File</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p><strong>File Name:</strong> {selectedFile.name}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Model Information</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p><strong>Model:</strong> {results.model}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Token Usage</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p><strong>Prompt Tokens:</strong> {results.usage.prompt_tokens}</p>
                    <p><strong>Completion Tokens:</strong> {results.usage.completion_tokens}</p>
                    <p><strong>Total Tokens:</strong> {results.usage.total_tokens}</p>
                    {results.metadata?.summarized && (
                      <div className="mt-2 p-2 bg-blue-100 rounded">
                        <p className="text-blue-800">
                          <strong>Auto-Summarization Applied:</strong> Patient data was summarized to prevent truncation.
                        </p>
                        {results.metadata.originalTokens && results.metadata.processedTokens && (
                          <p className="text-sm text-blue-600 mt-1">
                            Reduced from {results.metadata.originalTokens} to {results.metadata.processedTokens} tokens
                          </p>
                        )}
                      </div>
                    )}
                    {results.usage.total_tokens > 10000 && !results.metadata?.summarized && (
                      <p className="text-amber-600 mt-2">
                        <strong>Note:</strong> Large token usage detected. Content may have been summarized to prevent truncation.
                      </p>
                    )}
                  </div>
                </div>

                {results.search_results && results.search_results.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Search Results</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      {results.search_results.map((result, index) => (
                        <div key={index} className="mb-4 last:mb-0">
                          <h4 className="font-medium text-blue-600">
                            <a href={result.url} target="_blank" rel="noopener noreferrer">
                              {result.title}
                            </a>
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{result.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Continue Conversation</h2>
              
              {/* Chat Messages */}
              <div ref={chatMessagesRef} className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                      <p>Thinking...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about this patient..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={chatLoading || !currentMessage.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chatLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}