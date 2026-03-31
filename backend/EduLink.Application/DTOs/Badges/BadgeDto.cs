namespace EduLink.Application.DTOs.Badges;
public record BadgeDto(Guid Id, string Name, string? IconUrl, string? Description);
public record StudentBadgeDto(
    Guid Id,
    BadgeDto Badge,
    string AwardedByName,
    string? Note,
    DateTime AwardedAt
);
