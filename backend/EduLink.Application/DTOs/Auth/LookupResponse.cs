namespace EduLink.Application.DTOs.Auth;

public record LookupResponse(
    string SchoolName,
    string? SchoolLogoUrl,
    string MaskedIdentifier
);
