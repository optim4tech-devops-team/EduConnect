using System.Security.Claims;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;

    public ChatHub(AppDbContext db)
    {
        _db = db;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }
        await base.OnConnectedAsync();
    }

    public async Task SendMessage(Guid conversationId, string? content, string? clientMessageId, string? mediaUrl = null)
    {
        var userId = GetUserId();
        if (!userId.HasValue)
        {
            throw new HubException("Unauthorized");
        }

        // Verify the user is a participant in this conversation
        var isParticipant = await _db.ConversationParticipants
            .AnyAsync(cp => cp.ConversationId == conversationId && cp.UserId == userId.Value);

        if (!isParticipant)
        {
            throw new HubException("You are not a participant of this conversation.");
        }

        if (mediaUrl is null && !string.IsNullOrWhiteSpace(clientMessageId)
            && Uri.TryCreate(clientMessageId, UriKind.Absolute, out _))
        {
            mediaUrl = clientMessageId;
            clientMessageId = null;
        }

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = userId.Value,
            Content = content,
            MediaUrl = mediaUrl,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync();

        // Load sender info
        var sender = await _db.Users.FindAsync(userId.Value);

        var payload = new
        {
            id = message.Id,
            conversationId = message.ConversationId,
            senderId = message.SenderId,
            senderName = sender?.FullName ?? string.Empty,
            senderAvatar = sender?.AvatarUrl,
            senderRole = sender?.Role.ToString(),
            senderLabel = GetSenderLabel(sender),
            content = message.Content,
            mediaUrl = message.MediaUrl,
            isRead = message.IsRead,
            createdAt = message.CreatedAt,
            clientMessageId
        };

        // Broadcast to all participants
        var participants = await _db.ConversationParticipants
            .Where(cp => cp.ConversationId == conversationId)
            .Select(cp => cp.UserId)
            .ToListAsync();

        foreach (var participantId in participants)
        {
            await Clients.Group($"user_{participantId}").SendAsync("ReceiveMessage", payload);
        }
    }

    public async Task SendTyping(Guid conversationId)
    {
        var userId = GetUserId();
        if (!userId.HasValue) return;

        var participants = await _db.ConversationParticipants
            .Where(cp => cp.ConversationId == conversationId && cp.UserId != userId.Value)
            .Select(cp => cp.UserId)
            .ToListAsync();

        var sender = await _db.Users.FindAsync(userId.Value);

        foreach (var participantId in participants)
        {
            await Clients.Group($"user_{participantId}")
                .SendAsync("UserTyping", new { conversationId, userId = userId.Value, senderName = sender?.FullName });
        }
    }

    public async Task MarkAsRead(Guid conversationId)
    {
        var userId = GetUserId();
        if (!userId.HasValue)
        {
            throw new HubException("Unauthorized");
        }

        var unreadMessages = await _db.Messages
            .Where(m => m.ConversationId == conversationId
                        && m.SenderId != userId.Value
                        && !m.IsRead)
            .ToListAsync();

        foreach (var msg in unreadMessages)
        {
            msg.IsRead = true;
        }

        if (unreadMessages.Any())
        {
            await _db.SaveChangesAsync();
        }

        await Clients.Caller.SendAsync("MessagesRead", conversationId);
    }

    private Guid? GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)
                    ?? Context.User?.FindFirst("sub");

        if (claim is not null && Guid.TryParse(claim.Value, out var id))
            return id;

        return null;
    }

    private static string GetSenderLabel(User? sender)
    {
        return sender?.Role switch
        {
            Domain.Enums.UserRole.Teacher => "Öğretmen",
            Domain.Enums.UserRole.Parent => "Veli",
            Domain.Enums.UserRole.SchoolAdmin => "Okul Yönetimi",
            Domain.Enums.UserRole.Admin => "Yönetim",
            _ => sender?.FullName ?? string.Empty
        };
    }
}
