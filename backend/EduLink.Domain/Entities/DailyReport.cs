using EduLink.Domain.Enums;
namespace EduLink.Domain.Entities;
public class DailyReport
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public DateOnly ReportDate { get; set; }
    public MoodType Mood { get; set; } = MoodType.Happy;
    public string? Meals { get; set; }
    public int? SleepMinutes { get; set; }
    public string[]? Activities { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
