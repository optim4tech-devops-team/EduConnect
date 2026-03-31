namespace EduLink.Application.DTOs.Assignments;
public record AssignmentDto(
    Guid Id,
    Guid TeacherId,
    string TeacherName,
    Guid ClassId,
    string ClassName,
    string Title,
    string? Description,
    DateTime DueDate,
    string? AttachmentUrl,
    DateTime CreatedAt,
    int SubmissionCount,
    SubmissionDto? MySubmission // veli için kendi çocuğunun teslimi
);

public record SubmissionDto(
    Guid Id,
    Guid StudentId,
    string StudentName,
    string? FileUrl,
    string? Note,
    DateTime SubmittedAt,
    string? Grade,
    string? Feedback
);
