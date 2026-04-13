namespace EduLink.Domain.Entities;

public class SchoolCalendarEvent
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public Guid? ClassId { get; set; }
    public Guid CreatedById { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Category { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime? EndAt { get; set; }
    public bool IsAllDay { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public School School { get; set; } = null!;
    public Class? Class { get; set; }
    public User CreatedBy { get; set; } = null!;
}
