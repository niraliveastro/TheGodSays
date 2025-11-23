
import React, { useState, useEffect } from 'react';

const Chat = ({ pageTitle }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Add a default message when the component mounts
    setMessages([{ text: `Welcome to the ${pageTitle} AI chat! How can I help you today?`, isUser: false }]);
  }, [pageTitle]);

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
    <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', height: '420px', background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', animation: 'fadeInUp 280ms ease-out' }}>
      <style>{`@keyframes fadeInUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '999px', background: '#22c55e', boxShadow: '0 0 0 6px rgba(34,197,94,0.15)' }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Assistant</h2>
        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>for {pageTitle}</span>
      </div>
      <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '12px', paddingRight: 4 }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: msg.isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <span style={{ background: msg.isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f3f4f6', color: msg.isUser ? 'white' : '#111827', padding: '10px 12px', borderRadius: 14, borderTopLeftRadius: msg.isUser ? 14 : 4, borderTopRightRadius: msg.isUser ? 4 : 14, maxWidth: '76%', lineHeight: 1.35, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', fontSize: 14 }}>
              {msg.text}
            </span>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
            <span style={{ background: '#f3f4f6', color: '#111827', padding: '10px 12px', borderRadius: 14, borderTopLeftRadius: 4, maxWidth: '76%', lineHeight: 1.35, boxShadow: '0 4px 14px rgba(0,0,0,0.06)', fontSize: 14 }}>
              Thinking...
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          style={{ flexGrow: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', fontSize: 14 }}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage} style={{ marginLeft: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
