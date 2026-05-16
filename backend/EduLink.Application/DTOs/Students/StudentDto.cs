namespace EduLink.Application.DTOs.Students;
public record StudentDto(
    Guid Id,
    string FullName,
    DateOnly? BirthDate,
    Guid ClassId,
    string ClassName,
    string? AvatarUrl,
    string? Gender,
    string? Allergies,
    string? MedicationNotes,
    string? HealthNotes,
    bool IsActive,
    int BadgeCount,
    List<ParentSummaryDto> Parents
);

public record ParentSummaryDto(Guid Id, string FullName, string? Phone, string? AvatarUrl);
