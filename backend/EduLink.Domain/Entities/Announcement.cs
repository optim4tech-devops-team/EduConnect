namespace EduLink.Domain.Entities;
public class Announcement
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public School School { get; set; } = null!;
    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public string Target { get; set; } = "all"; // all | class | parent
    public Guid? ClassId { get; set; }
    public Class? Class { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
