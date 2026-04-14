const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route GET /api/conversations
 * @desc  Get all conversations for the authenticated user
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
    .populate('participants', 'name image')
    .populate('listing', 'title photos')
    .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching conversations', error: err.message });
  }
});

/**
 * @route GET /api/conversations/:id/messages
 * @desc  Get message history for a conversation
 * @access Private
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages', error: err.message });
  }
});

/**
 * @route POST /api/conversations
 * @desc  Create or find a conversation between two users
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  const { participantId, listingId } = req.body;
  
  try {
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId] },
      listing: listingId
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user.id, participantId],
        listing: listingId
      });
      await conversation.save();
      
      // Populate before sending back
      await conversation.populate('participants', 'name image');
      await conversation.populate('listing', 'title photos');
    }

    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ message: 'Error creating conversation', error: err.message });
  }
});

/**
 * @route POST /api/conversations/:id/messages
 * @desc  Send a message in a conversation
 * @access Private
 */
router.post('/:id/messages', authenticateToken, async (req, res) => {
  const { text, senderId } = req.body;
  const conversationId = req.params.id;

  try {
    // 1. Create and save the message
    const newMessage = new Message({
      conversationId,
      sender: senderId || req.user.id,
      text,
      timestamp: new Date()
    });
    await newMessage.save();

    // 2. Update the conversation's last message and updatedAt timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      updatedAt: new Date()
    });

    // 3. Broadcast the message to all participants in the conversation room
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('receive_message', {
        _id: newMessage._id,
        conversationId,
        senderId: senderId || req.user.id,
        text,
        timestamp: newMessage.timestamp
      });
      console.log(`[API] Message saved & broadcasted for conversation ${conversationId}`);
    }

    res.status(201).json(newMessage);
  } catch (err) {
    console.error('[API] Error sending message:', err);
    res.status(500).json({ message: 'Error sending message', error: err.message });
  }
});

module.exports = router;
