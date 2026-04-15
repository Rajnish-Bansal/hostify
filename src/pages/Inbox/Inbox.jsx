import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Plus, Filter, MoreHorizontal, MessageSquare, ChevronRight } from 'lucide-react';
import io from 'socket.io-client';
import Navbar from '../../components/organisms/Navbar/Navbar';
import { useAuth } from '../../context/AuthContext';
import { fetchConversations, fetchMessages, sendMessage } from '../../services/api'; // Added sendMessage API helper
import './Inbox.css';

const socket = io(window.location.origin); // Use the current host for Socket.io in production

const Inbox = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]); // Clear mock data
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all'); 
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  // Fetch conversations on load
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await fetchConversations();
        setConversations(data);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadConversations();
  }, [user]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedConversation) return;
      try {
        const data = await fetchMessages(selectedConversation._id || selectedConversation.id);
        setMessages(data);
        socket.emit('join_conversation', selectedConversation._id || selectedConversation.id);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    loadMessages();
  }, [selectedConversation]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      // 1. Update messages if in the active conversation
      if (selectedConversation && (data.conversationId === selectedConversation._id)) {
        setMessages(prev => [...prev, {
          _id: data._id || Date.now().toString(),
          sender: data.senderId,
          text: data.text,
          timestamp: data.timestamp
        }]);
      }

      // 2. Update conversation list for last message summary
      setConversations(prev => prev.map(conv => {
          if (conv._id === data.conversationId) {
              return { ...conv, lastMessage: data.text, updatedAt: new Date() };
          }
          return conv;
      }));
    });

    return () => socket.off('receive_message');
  }, [selectedConversation]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const messageText = newMessage;
    setNewMessage(''); // Optimistically clear input

    try {
      console.log('[Inbox] Sending message via API...');
      await sendMessage(selectedConversation._id, messageText, user?.id || user?._id);
      // The socket broadcast will handle adding it to the state for us
    } catch (err) {
      console.error('[Inbox] Failed to send message:', err);
      // Fallback: put the text back if it failed
      setNewMessage(messageText);
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="inbox-page">
      <Navbar />
      
      <div className={`inbox-container ${selectedConversation ? 'chat-active' : ''}`}>
        {/* Sidebar: Conversations List */}
        <div className={`inbox-sidebar ${selectedConversation ? 'mobile-hide' : ''}`}>
          <div className="inbox-header">
            <h1>Messages</h1>
            <div className="header-actions">
              <button className="icon-btn"><Search size={20} /></button>
              <button className="icon-btn"><Filter size={20} /></button>
            </div>
          </div>

          <div className="inbox-tabs">
            <button 
              className={activeTab === 'all' ? 'active' : ''} 
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button 
              className={activeTab === 'unread' ? 'active' : ''} 
              onClick={() => setActiveTab('unread')}
            >
              Unread
            </button>
            <button 
              className={activeTab === 'archived' ? 'active' : ''} 
              onClick={() => setActiveTab('archived')}
            >
              Archived
            </button>
          </div>

          <div className="conversations-list">
            {conversations.map(conv => {
              const otherParticipant = conv.participants?.find(p => p._id !== user?.id && p._id !== user?._id) || conv.participants?.[0] || {};
              return (
                <div 
                  key={conv._id} 
                  className={`conversation-item ${selectedConversation?._id === conv._id ? 'selected' : ''} ${conv.unread ? 'unread' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="user-avatar" style={{ backgroundImage: `url(${otherParticipant.image})` }}></div>
                  <div className="conv-info">
                    <div className="conv-header">
                      <span className="user-name">{otherParticipant.name || 'User'}</span>
                      <span className="conv-time">{new Date(conv.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="listing-name">{conv.listing?.title || 'Listing'}</div>
                    <div className="last-message">{conv.lastMessage || 'No messages yet'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="inbox-chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                {(() => {
                  const otherParticipant = selectedConversation.participants?.find(p => p._id !== user?.id && p._id !== user?._id) || selectedConversation.participants?.[0] || {};
                  return (
                    <div className="chat-user-info">
                      {selectedConversation && (
                        <button className="mobile-back-btn" onClick={() => setSelectedConversation(null)}>
                          <ChevronLeft size={24} />
                        </button>
                      )}
                      <div className="user-avatar" style={{ backgroundImage: `url(${otherParticipant.image})` }}></div>
                       <div>
                        <div className="user-name">{otherParticipant.name || 'User'}</div>
                        <div className="online-status">Recently active</div>
                       </div>
                    </div>
                  );
                })()}
                <div className="header-actions">
                  <button className="icon-btn-text">Support</button>
                  <button className="icon-btn"><MoreHorizontal size={20} /></button>
                </div>
              </div>

              <div className="chat-messages">
                <div className="booking-status-card">
                  <div className="status-header">
                    <MessageSquare size={16} /> Inquiry about {selectedConversation.listing?.title}
                  </div>
                  <p>Check the details and coordinate your stay.</p>
                  <button className="btn-secondary-lite">View Details</button>
                </div>

                {messages.map(msg => (
                  <div key={msg._id || msg.id} className={`message-bubble ${msg.sender === (user?.id || user?._id) || msg.senderId === (user?.id || user?._id) ? 'sent' : 'received'}`}>
                    <div className="bubble-content">
                      <p>{msg.text}</p>
                      <span className="bubble-time">{new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-area">
                <form onSubmit={handleSendMessage}>
                  <div className="input-wrapper">
                    <button type="button" className="plus-btn"><Plus size={20} /></button>
                    <input 
                      type="text" 
                      placeholder="Type a message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
                      <Send size={20} />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="empty-chat-state">
              <div className="empty-icon">🛋️</div>
              <h2>Select a message</h2>
              <p>Choose a conversation from the list or start a new inquiry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
