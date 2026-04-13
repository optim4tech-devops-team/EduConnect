namespace EduLink.Domain.Entities;

public class School
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public string Plan { get; set; } = "starter";
    public int MaxStudents { get; set; } = 200;
    public int MaxTeachers { get; set; } = 20;
    public DateTime? SubscriptionEndsAt { get; set; }
    public Guid? PrimaryAdminUserId { get; set; }
    public string FamilyMessagingMode { get; set; } = "separate_parents";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User? PrimaryAdmin { get; set; }
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Class> Classes { get; set; } = new List<Class>();
    public ICollection<Badge> Badges { get; set; } = new List<Badge>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    public ICollection<SchoolCalendarEvent> CalendarEvents { get; set; } = new List<SchoolCalendarEvent>();
    public ICollection<ClassRoutineRule> RoutineRules { get; set; } = new List<ClassRoutineRule>();
    public ICollection<MealPlanEntry> MealPlanEntries { get; set; } = new List<MealPlanEntry>();
    public ICollection<ComplianceDocument> ComplianceDocuments { get; set; } = new List<ComplianceDocument>();
}
