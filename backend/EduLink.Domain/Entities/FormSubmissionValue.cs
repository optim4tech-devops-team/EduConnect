namespace EduLink.Domain.Entities;

public class FormSubmissionValue
{
    public Guid Id { get; set; }
    public Guid FormSubmissionId { get; set; }
    public FormSubmission FormSubmission { get; set; } = null!;
    public Guid FormFieldId { get; set; }
    public FormField FormField { get; set; } = null!;
    public string Value { get; set; } = string.Empty;
}
