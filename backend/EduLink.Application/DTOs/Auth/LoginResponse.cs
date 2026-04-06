namespace EduLink.Application.DTOs.Auth;
public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    string Role,
    Guid UserId,
    string FullName,
    string? AvatarUrl,
    Guid SchoolId,
    string Email,
    string? Phone
);
