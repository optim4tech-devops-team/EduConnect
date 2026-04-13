namespace EduLink.Domain.Entities;

public class Class
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid SchoolId { get; set; }
    public School School { get; set; } = null!;
    public Guid? TeacherId { get; set; }
    public User? Teacher { get; set; }
    public string AcademicYear { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Student> Students { get; set; } = new List<Student>();
    public ICollection<Post> Posts { get; set; } = new List<Post>();
    public ICollection<Assignment> Assignments { get; set; } = new List<Assignment>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<SchoolCalendarEvent> CalendarEvents { get; set; } = new List<SchoolCalendarEvent>();
    public ICollection<ClassRoutineRule> RoutineRules { get; set; } = new List<ClassRoutineRule>();
    public ICollection<MealPlanEntry> MealPlanEntries { get; set; } = new List<MealPlanEntry>();
}
