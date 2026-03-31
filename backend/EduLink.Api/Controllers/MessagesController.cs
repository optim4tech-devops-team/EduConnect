using EduLink.Application.DTOs.Messages;
using EduLink.Domain.Entities;
using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using EduLink.Api.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/conversations")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<ChatHub> _hubContext;

    public MessagesController(AppDbContext db, IHubContext<ChatHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    // GET /api/conversations
    [HttpGet]
    public async Task<IActionResult> GetConversations()
    {
        var userId = GetUserId();

        // Get all conversations where the user is a participant
        var conversationIds = await _db.ConversationParticipants
            .Where(cp => cp.UserId == userId)
            .Select(cp => cp.ConversationId)
            .ToListAsync();

        var conversations = await _db.Conversations
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
                .ThenInclude(m => m.Sender)
            .Where(c => conversationIds.Contains(c.Id))
            .ToListAsync();

        var result = conversations.Select(c =>
        {
            var lastMessage = c.Messages.MaxBy(m => m.CreatedAt);
            var unreadCount = _db.Messages
                .Count(m => m.ConversationId == c.Id && !m.IsRead && m.SenderId != userId);

            return new ConversationDto(
                c.Id,
                c.Type.ToString(),
                c.Name,
                c.Participants.Select(p => new ParticipantDto(
                    p.UserId,
                    p.User.FullName,
                    p.User.AvatarUrl,
                    p.User.Role.ToString())).ToList(),
                lastMessage is null ? null : MapMessageDto(lastMessage),
                unreadCount
            );
        }).OrderByDescending(c => c.LastMessage?.CreatedAt ?? DateTime.MinValue).ToList();

        return Ok(result);
    }

    // POST /api/conversations
    [HttpPost]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request)
    {
        var userId = GetUserId();

        if (userId == request.OtherUserId)
            return BadRequest(new { message = "Cannot create a conversation with yourself." });

        // Check if the other user exists
        var otherUser = await _db.Users.FindAsync(request.OtherUserId);
        if (otherUser is null)
            return NotFound(new { message = "User not found." });

        // Prevent duplicate: find existing direct conversation between these two users
        var existing = await _db.Conversations
            .Include(c => c.Participants)
            .Where(c => c.Type == ConversationType.Direct &&
                        c.Participants.Any(p => p.UserId == userId) &&
                        c.Participants.Any(p => p.UserId == request.OtherUserId))
            .FirstOrDefaultAsync();

        if (existing is not null)
            return Ok(new { id = existing.Id, alreadyExists = true });

        var conversation = new Conversation
        {
            Id        = Guid.NewGuid(),
            Type      = ConversationType.Direct,
            ClassId   = null,
            Name      = null,
            CreatedAt = DateTime.UtcNow
        };

        _db.Conversations.Add(conversation);

        _db.ConversationParticipants.Add(new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId         = userId,
            JoinedAt       = DateTime.UtcNow
        });

        _db.ConversationParticipants.Add(new ConversationParticipant
        {
            ConversationId = conversation.Id,
            UserId         = request.OtherUserId,
            JoinedAt       = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMessages), new { id = conversation.Id }, new { id = conversation.Id });
    }

    // GET /api/conversations/{id}/messages?page=1&pageSize=20
    [HttpGet("{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();

        // Verify participant
        var isParticipant = await _db.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == id && cp.UserId == userId);

        if (!isParticipant)
            return Forbid();

        var totalCount = await _db.Messages.CountAsync(m => m.ConversationId == id);

        var messages = await _db.Messages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == id)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Mark messages from others as read
        var unread = messages
            .Where(m => m.SenderId != userId && !m.IsRead)
            .ToList();

        if (unread.Count > 0)
        {
            foreach (var msg in unread)
                msg.IsRead = true;

            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            page,
            pageSize,
            totalCount,
            items = messages.Select(MapMessageDto).Reverse().ToList()
        });
    }

    // POST /api/conversations/{id}/messages
    [HttpPost("{id:guid}/messages")]
    public async Task<IActionResult> SendMessage(Guid id, [FromBody] SendMessageRequest request)
    {
        var userId = GetUserId();

        // Verify participant
        var isParticipant = await _db.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == id && cp.UserId == userId);

        if (!isParticipant)
            return Forbid();

        var message = new Message
        {
            Id             = Guid.NewGuid(),
            ConversationId = id,
            SenderId       = userId,
            Content        = request.Content,
            MediaUrl       = request.MediaUrl,
            IsRead         = false,
            CreatedAt      = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync();

        // Load sender info for the broadcast payload
        var sender = await _db.Users.FindAsync(userId);

        var payload = new
        {
            id             = message.Id,
            conversationId = message.ConversationId,
            senderId       = message.SenderId,
            senderName     = sender?.FullName ?? string.Empty,
            senderAvatar   = sender?.AvatarUrl,
            content        = message.Content,
            mediaUrl       = message.MediaUrl,
            isRead         = message.IsRead,
            createdAt      = message.CreatedAt
        };

        // Broadcast to all participants via SignalR
        var participantIds = await _db.ConversationParticipants
            .Where(cp => cp.ConversationId == id)
            .Select(cp => cp.UserId)
            .ToListAsync();

        foreach (var participantId in participantIds)
        {
            await _hubContext.Clients
                .Group($"user_{participantId}")
                .SendAsync("ReceiveMessage", payload);
        }

        return CreatedAtAction(nameof(GetMessages), new { id }, MapMessageDto(message, sender));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static MessageDto MapMessageDto(Message m) => new(
        m.Id,
        m.ConversationId,
        m.SenderId,
        m.Sender?.FullName ?? string.Empty,
        m.Sender?.AvatarUrl,
        m.Content,
        m.MediaUrl,
        m.IsRead,
        m.CreatedAt
    );

    private static MessageDto MapMessageDto(Message m, User? sender) => new(
        m.Id,
        m.ConversationId,
        m.SenderId,
        sender?.FullName ?? string.Empty,
        sender?.AvatarUrl,
        m.Content,
        m.MediaUrl,
        m.IsRead,
        m.CreatedAt
    );

    private Guid GetUserId() => HttpContext.Items["UserId"] is Guid g ? g : Guid.Empty;
}

public record CreateConversationRequest(Guid OtherUserId, Guid? StudentId);
public record SendMessageRequest(string? Content, string? MediaUrl);
