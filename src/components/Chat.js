
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Chat = ({ pageTitle, initialData = null }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Add a default message when the component mounts
    setMessages([{ text: `Welcome to the ${pageTitle} AI chat! How can I help you today?`, isUser: false }]);
  }, [pageTitle]);

  // If initialData is provided, send it to the AI as a context payload
  // Use a ref to ensure we only send the context once (prevents double-send
  // in React StrictMode which mounts/unmounts components twice in dev).
  const contextSentRef = useRef(false);
  useEffect(() => {
    if (!initialData) return;
    if (contextSentRef.current) return;
    contextSentRef.current = true;

    const sendContext = async () => {
      // show a short assistant message to indicate data was provided
      setMessages((m) => [...m, { text: 'Providing your chart data to the AI assistant...', isUser: false }]);
      setIsLoading(true);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Send as a clear context marker so the backend/assistant can treat it as structured data
            prompt: `Here is the complete data for the current matching session.
Data includes:
1. Female Birth Details & Planetary Info
2. Male Birth Details & Planetary Info
3. Ashtakoot Compatibility Score & Breakdown

JSON Data:
${JSON.stringify(initialData)}

Please analyze this data. When responding, confirm you have received the birth details for ${initialData.female?.input?.name || 'Female'} and ${initialData.male?.input?.name || 'Male'}.
Provide insights based on their specific planetary positions and the match score.
FORMATTING INSTRUCTIONS:
- Use Markdown headers (###) for sections.
- Use bullet points (-) for lists.
- Use bold (**text**) for emphasis.
- Keep the response structured and easy to read.`,
            page: pageTitle,
            isContext: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send context to the server.');
        }

        const data = await response.json();

        // Display a short confirmation message from assistant (if response contains text)
        const assistantText = data?.response || 'Chart data received by the assistant.';
        setMessages((m) => [...m, { text: assistantText, isUser: false }]);
      } catch (error) {
        console.error('Error sending initial context to chat:', error);
        setMessages((m) => [...m, { text: 'Failed to provide chart data to the AI.', isUser: false }]);
      } finally {
        setIsLoading(false);
      }
    };

    // send the context asynchronously (don't block UI)
    sendContext();
  }, [initialData, pageTitle]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleSendMessage = async () => {
    if (input.trim() === '') return;

    const newMessages = [...messages, { text: input, isUser: true }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input, page: pageTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from the server.');
      }

      const data = await response.json();
      setMessages([...newMessages, { text: data.response, isUser: false }]);
    } catch (error) {
      console.error('Error fetching chat response:', error);
      setMessages([...newMessages, { text: 'Sorry, something went wrong. Please try again.', isUser: false }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: "20px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        height: "420px",
        background: "linear-gradient(to right, #fcd34d, #fbbf24, #f59e0b)",
        border: "1px solid rgba(251,191,36,0.7)",
        boxShadow: "0 0 25px rgba(250,204,21,0.5)",

        animation: "fadeInUp 280ms ease-out",
      }}
    >
      {" "}
      <style>{`
        @keyframes fadeInUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        .markdown-content p { margin: 0 0 8px 0; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content ul, .markdown-content ol { margin: 4px 0 8px 16px; padding: 0; }
        .markdown-content li { margin-bottom: 4px; }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin: 12px 0 8px 0; font-size: 1.1em; font-weight: 600; }
        .markdown-content strong { font-weight: 600; }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "999px",
            background: "#22c55e",
            boxShadow: "0 0 0 6px rgba(34,197,94,0.15)",
          }}
        />
        <h2
          style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}
        >
          Assistant
        </h2>
        <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "auto" }}>
          for {pageTitle}
        </span>
      </div>
      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          marginBottom: "12px",
          paddingRight: 4,
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: msg.isUser ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: msg.isUser
                  ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                  : "#f3f4f6",
                color: msg.isUser ? "white" : "#111827",
                padding: "10px 12px",
                borderRadius: 14,
                borderTopLeftRadius: msg.isUser ? 14 : 4,
                borderTopRightRadius: msg.isUser ? 4 : 14,
                maxWidth: "76%",
                lineHeight: 1.35,
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                fontSize: 14,
              }}
            >
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                background: "#f3f4f6",
                color: "#111827",
                padding: "10px 12px",
                borderRadius: 14,
                borderTopLeftRadius: 4,
                maxWidth: "76%",
                lineHeight: 1.35,
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                fontSize: 14,
              }}
            >
              Thinking...
            </span>
          </div>
        )}
      </div>
      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          style={{
            flexGrow: 1,
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            outline: "none",
            fontSize: 14,
          }}
          placeholder="Type your message..."
        />
        <button
          onClick={handleSendMessage}
          style={{
            marginLeft: "8px",
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
