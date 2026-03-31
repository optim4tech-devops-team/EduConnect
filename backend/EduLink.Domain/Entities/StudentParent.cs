namespace EduLink.Domain.Entities;
public class StudentParent
{
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid ParentId { get; set; }
    public User Parent { get; set; } = null!;
}
