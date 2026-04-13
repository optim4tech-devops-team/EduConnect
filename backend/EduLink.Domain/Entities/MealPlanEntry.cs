namespace EduLink.Domain.Entities;

public class MealPlanEntry
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public Guid? ClassId { get; set; }
    public Guid CreatedById { get; set; }
    public DateOnly Date { get; set; }
    public string? Breakfast { get; set; }
    public string? Lunch { get; set; }
    public string? Snack { get; set; }
    public string? Notes { get; set; }
    public string? Allergens { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public School School { get; set; } = null!;
    public Class? Class { get; set; }
    public User CreatedBy { get; set; } = null!;
}
