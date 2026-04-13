namespace EduLink.Domain.Entities;

public class ClassRoutineRule
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public Guid ClassId { get; set; }
    public Guid CreatedById { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ItemName { get; set; }
    public string? MessageTemplate { get; set; }
    public int Weekday { get; set; }
    public int SendAtHour { get; set; }
    public int SendAtMinute { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public School School { get; set; } = null!;
    public Class Class { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
