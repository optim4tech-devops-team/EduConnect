namespace EduLink.Domain.Entities;
public class PostMedia
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;
    public string MediaUrl { get; set; } = string.Empty;
    public string MediaType { get; set; } = "photo"; // photo | video
    public string? CloudinaryPublicId { get; set; }
}
