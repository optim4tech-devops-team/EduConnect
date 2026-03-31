namespace EduLink.Domain.Entities;
public class Assignment
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public Guid ClassId { get; set; }
    public Class Class { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DueDate { get; set; }
    public string? AttachmentUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
