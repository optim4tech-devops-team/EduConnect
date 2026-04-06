namespace EduLink.Domain.Entities;

public class StudentObservation
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public Guid SchoolId { get; set; }
    public School School { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string Category { get; set; } = "positive_observation";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
