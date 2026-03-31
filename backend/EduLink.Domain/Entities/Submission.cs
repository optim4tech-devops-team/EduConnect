namespace EduLink.Domain.Entities;
public class Submission
{
    public Guid Id { get; set; }
    public Guid AssignmentId { get; set; }
    public Assignment Assignment { get; set; } = null!;
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public string? FileUrl { get; set; }
    public string? Note { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public string? Grade { get; set; }
    public string? Feedback { get; set; }
}
