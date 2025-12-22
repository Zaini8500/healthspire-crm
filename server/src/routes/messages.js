import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Project from '../models/Project.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
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

    const convoIds = conversations.map((c) => c._id);
    const unread = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: convoIds },
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        },
      },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ]);

    const unreadMap = new Map(unread.map((x) => [String(x._id), Number(x.count) || 0]));
    const out = conversations.map((c) => {
      const obj = typeof c.toObject === 'function' ? c.toObject() : c;
      obj.unreadCount = unreadMap.get(String(c._id)) || 0;
      return obj;
    });

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get or create conversation with a user
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { participantIds, projectId } = req.body || {};

    // Client project-scoped conversation
    if (projectId) {
      const project = await Project.findById(projectId).lean();
      if (!project) return res.status(404).json({ error: 'Project not found' });

      if (req.user.role === 'client') {
        const clientId = req.user.clientId ? String(req.user.clientId) : '';
        if (!clientId || String(project.clientId || '') !== clientId) {
          return res.status(403).json({ error: 'Access denied: project does not belong to client' });
        }
      }

      // Find existing conversation for this project + current user
      const existing = await Conversation.findOne({ projectId, participants: req.user._id })
        .populate('participants', 'name email avatar')
        .populate('lastMessage');
      if (existing) return res.json(existing);

      const participantSet = new Set([req.user._id.toString()]);

      // Add assigned staff (project.employeeId -> Employee -> User via email)
      if (project.employeeId) {
        const emp = await Employee.findById(project.employeeId).lean();
        const email = String(emp?.email || '').toLowerCase().trim();
        if (email) {
          const staffUser = await User.findOneAndUpdate(
            { email },
            {
              $setOnInsert: {
                email,
                username: email,
                role: 'staff',
                status: 'active',
                createdBy: 'project-employee-sync',
              },
              $set: {
                name: emp?.name || `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim(),
                avatar: emp?.avatar || '',
              },
            },
            { new: true, upsert: true }
          );
          if (staffUser?._id) participantSet.add(staffUser._id.toString());
        }
      }

      // Add admins so the client can always reach an admin
      const admins = await User.find({ role: 'admin', status: 'active' }).select('_id').lean();
      for (const a of admins) {
        if (a?._id) participantSet.add(String(a._id));
      }

      const allParticipants = Array.from(participantSet);
      const conversation = await Conversation.create({
        projectId,
        participants: allParticipants,
        isGroup: allParticipants.length > 2,
        groupName: String(project.title || '').trim() || 'Project Chat',
        createdBy: req.user._id,
        admins: admins.map((a) => a._id),
      });

      const populatedConvo = await Conversation.findById(conversation._id)
        .populate('participants', 'name email avatar')
        .populate('lastMessage');

      return res.status(201).json(populatedConvo);
    }

    // Clients must use project-scoped conversations only
    if (req.user.role === 'client') {
      return res.status(400).json({ error: 'projectId is required for client conversations' });
    }
    
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
