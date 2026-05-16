namespace EduLink.Domain.Entities;

public class DemoRequest
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string SchoolName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? StudentCount { get; set; }
    public string? City { get; set; }
    public string Status { get; set; } = "new";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
