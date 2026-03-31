using EduLink.Domain.Enums;
namespace EduLink.Domain.Entities;
public class Post
{
    public Guid Id { get; set; }
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public Guid ClassId { get; set; }
    public Class Class { get; set; } = null!;
    public string? Caption { get; set; }
    public PostType PostType { get; set; } = PostType.Photo;
    public bool IsPublished { get; set; } = false;
    public bool AiProcessed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<PostMedia> Media { get; set; } = new List<PostMedia>();
    public ICollection<PostStudentTag> StudentTags { get; set; } = new List<PostStudentTag>();
}
