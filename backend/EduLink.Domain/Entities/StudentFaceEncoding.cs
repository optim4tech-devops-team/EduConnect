namespace EduLink.Domain.Entities;
public class StudentFaceEncoding
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    // Stored as JSON array of 128 floats; pgvector extension used for similarity search
    public float[] Encoding { get; set; } = Array.Empty<float>();
    public string PhotoUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
