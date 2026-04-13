namespace EduLink.Domain.Entities;

public class ComplianceDocument
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public Guid CreatedById { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int Version { get; set; } = 1;
    public bool IsRequired { get; set; }
    public bool RequireOnLogin { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }

    public School School { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public ICollection<ComplianceAcceptance> Acceptances { get; set; } = new List<ComplianceAcceptance>();
}
