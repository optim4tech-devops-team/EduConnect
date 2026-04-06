namespace EduLink.Domain.Entities;

public class FormTemplate
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public School School { get; set; } = null!;
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = "custom";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<FormField> Fields { get; set; } = new List<FormField>();
    public ICollection<FormSubmission> Submissions { get; set; } = new List<FormSubmission>();
}
