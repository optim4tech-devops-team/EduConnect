using EduLink.Domain.Enums;
namespace EduLink.Application.DTOs.Attendance;
public record AttendanceBulkRequest(
    Guid ClassId,
    DateOnly Date,
    List<AttendanceEntry> Entries
);

public record AttendanceEntry(Guid StudentId, AttendanceStatus Status, string? Note);
