namespace EduLink.Domain.Entities;

public class FormField
{
    public Guid Id { get; set; }
    public Guid FormTemplateId { get; set; }
    public FormTemplate FormTemplate { get; set; } = null!;
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
    public string? Placeholder { get; set; }
    public string? OptionsJson { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public ICollection<FormSubmissionValue> SubmissionValues { get; set; } = new List<FormSubmissionValue>();
}
