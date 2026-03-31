namespace EduLink.Domain.Entities;
public class StudentBadge
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid BadgeId { get; set; }
    public Badge Badge { get; set; } = null!;
    public Guid AwardedById { get; set; }
    public User AwardedBy { get; set; } = null!;
    public string? Note { get; set; }
    public DateTime AwardedAt { get; set; } = DateTime.UtcNow;
}
