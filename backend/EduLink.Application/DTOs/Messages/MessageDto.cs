namespace EduLink.Application.DTOs.Messages;
public record ConversationDto(
    Guid Id,
    string Type,
    string? Name,
    List<ParticipantDto> Participants,
    MessageDto? LastMessage,
    int UnreadCount
);

public record ParticipantDto(Guid UserId, string FullName, string? AvatarUrl, string Role);

public record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderId,
    string SenderName,
    string? SenderAvatar,
    string? Content,
    string? MediaUrl,
    bool IsRead,
    DateTime CreatedAt
);
