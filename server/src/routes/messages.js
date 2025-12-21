import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all conversations for current user
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'name email avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get or create conversation with a user
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { participantIds } = req.body;
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    // Add current user to participants if not already included
    const allParticipants = [...new Set([...participantIds, req.user._id.toString()])];
    
    // For 1:1 chat, check if conversation already exists
    if (allParticipants.length === 2) {
      const existingConvo = await Conversation.findOne({
        participants: { $all: allParticipants, $size: allParticipants.length }
      })
        .populate('participants', 'name email avatar')
        .populate('lastMessage');

      if (existingConvo) {
        return res.json(existingConvo);
      }
    }

    // Create new conversation
    const conversation = await Conversation.create({
      participants: allParticipants,
      isGroup: allParticipants.length > 2,
      createdBy: req.user._id,
      admins: [req.user._id]
    });

    const populatedConvo = await Conversation.findById(conversation._id)
      .populate('participants', 'name email avatar');

    res.status(201).json(populatedConvo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify user is participant in this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied: not a participant in this conversation' });
    }

    const query = { conversationId };
    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'name email avatar');

    // Mark messages as read
    await Message.updateMany(
      { 
        conversationId,
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id }
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json(messages.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Send a message
router.post('/messages', authenticate, async (req, res) => {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    session = null;
  }

  const { conversationId, content, attachments = [] } = req.body;
  
  if (!content?.trim() && (!attachments || attachments.length === 0)) {
    if (session) session.endSession();
    return res.status(400).json({ error: 'Message content or attachment is required' });
  }

  // Verify user is participant in this conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    if (session) session.endSession();
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  if (!conversation.participants.includes(req.user._id)) {
    if (session) session.endSession();
    return res.status(403).json({ error: 'Access denied: not a participant in this conversation' });
  }

  const doWrite = async (useSession) => {
    const opts = useSession ? { session } : undefined;

    const created = await Message.create(
      [{
        conversationId,
        sender: req.user._id,
        content: content?.trim(),
        attachments,
        readBy: [req.user._id],
      }],
      opts
    );

    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: created[0]._id,
        $addToSet: { participants: req.user._id },
      },
      useSession ? { new: true, session } : { new: true }
    );

    return created[0]._id;
  };

  try {
    // Prefer transactions, but fall back gracefully for standalone MongoDB.
    if (session) {
      try {
        session.startTransaction();
        const messageId = await doWrite(true);
        await session.commitTransaction();
        session.endSession();

        const populatedMessage = await Message.findById(messageId).populate('sender', 'name email avatar');
        return res.status(201).json(populatedMessage);
      } catch (e) {
        try {
          await session.abortTransaction();
        } catch {}
        session.endSession();
        // Continue to non-transactional fallback below.
      }
    }

    const messageId = await doWrite(false);
    const populatedMessage = await Message.findById(messageId).populate('sender', 'name email avatar');
    return res.status(201).json(populatedMessage);
  } catch (e) {
    if (session) {
      try {
        session.endSession();
      } catch {}
    }
    return res.status(500).json({ error: e.message });
  }
});

// Mark messages as read
router.post('/messages/read', authenticate, async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Message IDs array is required' });
    }

    await Message.updateMany(
      { 
        _id: { $in: messageIds },
        sender: { $ne: req.user._id },
        readBy: { $ne: req.user._id }
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
