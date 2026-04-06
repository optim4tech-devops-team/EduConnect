namespace EduLink.Domain.Entities;

public class FormSubmission
{
    public Guid Id { get; set; }
    public Guid FormTemplateId { get; set; }
    public FormTemplate FormTemplate { get; set; } = null!;
    public Guid SchoolId { get; set; }
    public School School { get; set; } = null!;
    public Guid SubmittedById { get; set; }
    public User SubmittedBy { get; set; } = null!;
    public Guid? ReviewedById { get; set; }
    public User? ReviewedBy { get; set; }
    public Guid? StudentId { get; set; }
    public Student? Student { get; set; }
    public string Status { get; set; } = "submitted";
    public string? Note { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public ICollection<FormSubmissionValue> Values { get; set; } = new List<FormSubmissionValue>();
}
