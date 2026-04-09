namespace EduLink.Domain.Entities;
public class StudentParent
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid ParentId { get; set; }
    public User Parent { get; set; } = null!;
    public string? Relationship { get; set; }
    public bool IsPrimaryContact { get; set; }
    public bool CanPickup { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
