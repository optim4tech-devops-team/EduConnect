namespace EduLink.Application.DTOs.Students;
public record CreateStudentRequest(
    string FullName,
    Guid ClassId,
    DateOnly? BirthDate,
    string? Gender,
    string? Allergies,
    string? MedicationNotes,
    string? HealthNotes,
    string? AvatarUrl
);
