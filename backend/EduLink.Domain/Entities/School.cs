namespace EduLink.Domain.Entities;
public class School
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Class> Classes { get; set; } = new List<Class>();
    public ICollection<Badge> Badges { get; set; } = new List<Badge>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
}
