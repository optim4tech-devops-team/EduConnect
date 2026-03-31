namespace EduLink.Domain.Entities;
public class PostStudentTag
{
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public float? AiConfidence { get; set; }
    public bool IsConfirmed { get; set; } = false;
}
