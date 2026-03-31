namespace EduLink.Application.DTOs.Assignments;
public record CreateAssignmentRequest(
    Guid ClassId,
    string Title,
    string? Description,
    DateTime DueDate,
    string? AttachmentUrl
);
