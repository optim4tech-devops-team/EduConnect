using EduLink.Domain.Enums;
namespace EduLink.Application.DTOs.DailyReports;
public record CreateDailyReportRequest(
    Guid StudentId,
    DateOnly ReportDate,
    MoodType Mood,
    string? Meals,
    int? SleepMinutes,
    List<string>? Activities,
    string? Notes
);
