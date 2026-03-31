namespace EduLink.Application.DTOs.Badges;
public record AwardBadgeRequest(Guid StudentId, Guid BadgeId, string? Note);
