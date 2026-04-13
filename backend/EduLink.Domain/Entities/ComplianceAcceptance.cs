namespace EduLink.Domain.Entities;

public class ComplianceAcceptance
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public Guid DocumentId { get; set; }
    public Guid UserId { get; set; }
    public DateTime AcceptedAt { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    public School School { get; set; } = null!;
    public ComplianceDocument Document { get; set; } = null!;
    public User User { get; set; } = null!;
}
