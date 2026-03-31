namespace EduLink.Domain.Entities;
public class Badge
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconUrl { get; set; }
    public string? Description { get; set; }
    public Guid SchoolId { get; set; }
    public School School { get; set; } = null!;
    public ICollection<StudentBadge> StudentBadges { get; set; } = new List<StudentBadge>();
}
