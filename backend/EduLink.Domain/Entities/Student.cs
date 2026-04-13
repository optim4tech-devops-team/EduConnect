namespace EduLink.Domain.Entities;
public class Student
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateOnly? BirthDate { get; set; }
    public Guid ClassId { get; set; }
    public Class Class { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<StudentParent> StudentParents { get; set; } = new List<StudentParent>();
    public ICollection<StudentFaceEncoding> FaceEncodings { get; set; } = new List<StudentFaceEncoding>();
    public ICollection<PostStudentTag> PostStudentTags { get; set; } = new List<PostStudentTag>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<DailyReport> DailyReports { get; set; } = new List<DailyReport>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<StudentBadge> StudentBadges { get; set; } = new List<StudentBadge>();
    public ICollection<StudentObservation> StudentObservations { get; set; } = new List<StudentObservation>();
}
