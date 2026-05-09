using EduLink.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace EduLink.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── DbSets ──────────────────────────────────────────────────────────────
    public DbSet<School> Schools => Set<School>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<StudentParent> StudentParents => Set<StudentParent>();
    public DbSet<StudentFaceEncoding> StudentFaceEncodings => Set<StudentFaceEncoding>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostMedia> PostMedias => Set<PostMedia>();
    public DbSet<PostStudentTag> PostStudentTags => Set<PostStudentTag>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Submission> Submissions => Set<Submission>();
    public DbSet<DailyReport> DailyReports => Set<DailyReport>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<StudentBadge> StudentBadges => Set<StudentBadge>();
    public DbSet<StudentObservation> StudentObservations => Set<StudentObservation>();
    public DbSet<SchoolCalendarEvent> SchoolCalendarEvents => Set<SchoolCalendarEvent>();
    public DbSet<ClassRoutineRule> ClassRoutineRules => Set<ClassRoutineRule>();
    public DbSet<MealPlanEntry> MealPlanEntries => Set<MealPlanEntry>();
    public DbSet<ComplianceDocument> ComplianceDocuments => Set<ComplianceDocument>();
    public DbSet<ComplianceAcceptance> ComplianceAcceptances => Set<ComplianceAcceptance>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<FormTemplate> FormTemplates => Set<FormTemplate>();
    public DbSet<FormField> FormFields => Set<FormField>();
    public DbSet<FormSubmission> FormSubmissions => Set<FormSubmission>();
    public DbSet<FormSubmissionValue> FormSubmissionValues => Set<FormSubmissionValue>();

    // ── Model configuration ──────────────────────────────────────────────────
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable pgvector extension
        modelBuilder.HasPostgresExtension("vector");

        // ── School ──────────────────────────────────────────────────────────
        modelBuilder.Entity<School>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).IsRequired().HasMaxLength(200);
            entity.Property(s => s.Plan).HasMaxLength(50);
            entity.Property(s => s.FamilyMessagingMode).HasMaxLength(40).HasDefaultValue("separate_parents");

            entity.HasOne(s => s.PrimaryAdmin)
                  .WithMany()
                  .HasForeignKey(s => s.PrimaryAdminUserId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ── User ────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.Phone)
                  .IsUnique()
                  .HasFilter("\"Phone\" IS NOT NULL");
            entity.Property(u => u.Email).IsRequired().HasMaxLength(256);
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(200);

            entity.HasOne(u => u.School)
                  .WithMany(s => s.Users)
                  .HasForeignKey(u => u.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Class ───────────────────────────────────────────────────────────
        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            entity.Property(c => c.AcademicYear).IsRequired().HasMaxLength(20);

            entity.HasOne(c => c.School)
                  .WithMany(s => s.Classes)
                  .HasForeignKey(c => c.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.Teacher)
                  .WithMany()
                  .HasForeignKey(c => c.TeacherId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Student ─────────────────────────────────────────────────────────
        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.FullName).IsRequired().HasMaxLength(200);

            entity.HasOne(s => s.Class)
                  .WithMany(c => c.Students)
                  .HasForeignKey(s => s.ClassId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StudentObservation ──────────────────────────────────────────────
        modelBuilder.Entity<StudentObservation>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Title).IsRequired().HasMaxLength(180);
            entity.Property(o => o.Note).IsRequired().HasMaxLength(1000);
            entity.Property(o => o.Category).IsRequired().HasMaxLength(80);
            entity.Property(o => o.Type).IsRequired().HasMaxLength(40);
            entity.Property(o => o.Status).IsRequired().HasMaxLength(40);
            entity.Property(o => o.TeacherObservation).HasMaxLength(1000);
            entity.Property(o => o.SchoolAction).HasMaxLength(1000);
            entity.Property(o => o.HomeSuggestion).HasMaxLength(1000);
            entity.Property(o => o.ParentResponse).HasMaxLength(1000);
            entity.Property(o => o.TeacherClosureNote).HasMaxLength(1000);

            entity.HasOne(o => o.Student)
                  .WithMany(s => s.StudentObservations)
                  .HasForeignKey(o => o.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(o => o.Teacher)
                  .WithMany()
                  .HasForeignKey(o => o.TeacherId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(o => o.School)
                  .WithMany()
                  .HasForeignKey(o => o.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── SchoolCalendarEvent ─────────────────────────────────────────────
        modelBuilder.Entity<SchoolCalendarEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(180);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Category).HasMaxLength(80);
            entity.Property(e => e.Description).HasMaxLength(1000);

            entity.HasOne(e => e.School)
                  .WithMany(s => s.CalendarEvents)
                  .HasForeignKey(e => e.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Class)
                  .WithMany(c => c.CalendarEvents)
                  .HasForeignKey(e => e.ClassId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CreatedBy)
                  .WithMany()
                  .HasForeignKey(e => e.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ClassRoutineRule ────────────────────────────────────────────────
        modelBuilder.Entity<ClassRoutineRule>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Title).IsRequired().HasMaxLength(160);
            entity.Property(r => r.ItemName).HasMaxLength(160);
            entity.Property(r => r.MessageTemplate).HasMaxLength(800);

            entity.HasOne(r => r.School)
                  .WithMany(s => s.RoutineRules)
                  .HasForeignKey(r => r.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(r => r.Class)
                  .WithMany(c => c.RoutineRules)
                  .HasForeignKey(r => r.ClassId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.CreatedBy)
                  .WithMany()
                  .HasForeignKey(r => r.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── MealPlanEntry ───────────────────────────────────────────────────
        modelBuilder.Entity<MealPlanEntry>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Breakfast).HasMaxLength(300);
            entity.Property(m => m.Lunch).HasMaxLength(300);
            entity.Property(m => m.Snack).HasMaxLength(300);
            entity.Property(m => m.Notes).HasMaxLength(1000);
            entity.Property(m => m.Allergens).HasMaxLength(300);

            entity.HasOne(m => m.School)
                  .WithMany(s => s.MealPlanEntries)
                  .HasForeignKey(m => m.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.Class)
                  .WithMany(c => c.MealPlanEntries)
                  .HasForeignKey(m => m.ClassId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(m => m.CreatedBy)
                  .WithMany()
                  .HasForeignKey(m => m.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StudentParent — composite PK ────────────────────────────────────
        modelBuilder.Entity<StudentParent>(entity =>
        {
            entity.HasKey(sp => new { sp.StudentId, sp.ParentId });
            entity.Property(sp => sp.Relationship).HasMaxLength(50);

            entity.HasOne(sp => sp.Student)
                  .WithMany(s => s.StudentParents)
                  .HasForeignKey(sp => sp.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(sp => sp.Parent)
                  .WithMany(u => u.StudentParents)
                  .HasForeignKey(sp => sp.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ComplianceDocument ──────────────────────────────────────────────
        modelBuilder.Entity<ComplianceDocument>(entity =>
        {
            entity.HasKey(cd => cd.Id);
            entity.Property(cd => cd.Kind).IsRequired().HasMaxLength(50);
            entity.Property(cd => cd.Audience).IsRequired().HasMaxLength(40);
            entity.Property(cd => cd.Title).IsRequired().HasMaxLength(220);
            entity.Property(cd => cd.Content).IsRequired();

            entity.HasIndex(cd => new { cd.SchoolId, cd.Kind, cd.Audience, cd.Version }).IsUnique();

            entity.HasOne(cd => cd.School)
                  .WithMany(s => s.ComplianceDocuments)
                  .HasForeignKey(cd => cd.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(cd => cd.CreatedBy)
                  .WithMany()
                  .HasForeignKey(cd => cd.CreatedById)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ComplianceAcceptance ────────────────────────────────────────────
        modelBuilder.Entity<ComplianceAcceptance>(entity =>
        {
            entity.HasKey(ca => ca.Id);
            entity.Property(ca => ca.IpAddress).HasMaxLength(80);
            entity.Property(ca => ca.UserAgent).HasMaxLength(500);
            entity.HasIndex(ca => new { ca.DocumentId, ca.UserId }).IsUnique();

            entity.HasOne(ca => ca.School)
                  .WithMany()
                  .HasForeignKey(ca => ca.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ca => ca.Document)
                  .WithMany(cd => cd.Acceptances)
                  .HasForeignKey(ca => ca.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ca => ca.User)
                  .WithMany()
                  .HasForeignKey(ca => ca.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StudentFaceEncoding — pgvector column ───────────────────────────
        modelBuilder.Entity<StudentFaceEncoding>(entity =>
        {
            entity.HasKey(sfe => sfe.Id);
            entity.Property(sfe => sfe.PhotoUrl).IsRequired();

            // Map float[] to a pgvector column with dimension 128
            entity.Property(sfe => sfe.Encoding)
                  .HasColumnType("vector(128)")
                  .HasConversion(
                      v => new Vector(v),
                      v => v.ToArray())
                  .IsRequired();

            entity.HasOne(sfe => sfe.Student)
                  .WithMany(s => s.FaceEncodings)
                  .HasForeignKey(sfe => sfe.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Post ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(p => p.Id);

            entity.HasOne(p => p.Teacher)
                  .WithMany()
                  .HasForeignKey(p => p.TeacherId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.Class)
                  .WithMany(c => c.Posts)
                  .HasForeignKey(p => p.ClassId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── PostMedia ───────────────────────────────────────────────────────
        modelBuilder.Entity<PostMedia>(entity =>
        {
            entity.HasKey(pm => pm.Id);
            entity.Property(pm => pm.MediaUrl).IsRequired();
            entity.Property(pm => pm.MediaType).HasMaxLength(10).HasDefaultValue("photo");

            entity.HasOne(pm => pm.Post)
                  .WithMany(p => p.Media)
                  .HasForeignKey(pm => pm.PostId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── PostStudentTag — composite PK ───────────────────────────────────
        modelBuilder.Entity<PostStudentTag>(entity =>
        {
            entity.HasKey(pst => new { pst.PostId, pst.StudentId });

            entity.HasOne(pst => pst.Post)
                  .WithMany(p => p.StudentTags)
                  .HasForeignKey(pst => pst.PostId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pst => pst.Student)
                  .WithMany(s => s.PostStudentTags)
                  .HasForeignKey(pst => pst.StudentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Assignment ──────────────────────────────────────────────────────
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Title).IsRequired().HasMaxLength(300);

            entity.HasOne(a => a.Teacher)
                  .WithMany()
                  .HasForeignKey(a => a.TeacherId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Class)
                  .WithMany(c => c.Assignments)
                  .HasForeignKey(a => a.ClassId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Submission ──────────────────────────────────────────────────────
        modelBuilder.Entity<Submission>(entity =>
        {
            entity.HasKey(sub => sub.Id);

            entity.HasOne(sub => sub.Assignment)
                  .WithMany(a => a.Submissions)
                  .HasForeignKey(sub => sub.AssignmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(sub => sub.Student)
                  .WithMany(s => s.Submissions)
                  .HasForeignKey(sub => sub.StudentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── DailyReport — text[] column ─────────────────────────────────────
        modelBuilder.Entity<DailyReport>(entity =>
        {
            entity.HasKey(dr => dr.Id);

            entity.Property(dr => dr.Activities)
                  .HasColumnType("text[]");

            entity.HasOne(dr => dr.Student)
                  .WithMany(s => s.DailyReports)
                  .HasForeignKey(dr => dr.StudentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(dr => dr.Teacher)
                  .WithMany()
                  .HasForeignKey(dr => dr.TeacherId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Attendance ──────────────────────────────────────────────────────
        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.HasOne(a => a.Student)
                  .WithMany(s => s.Attendances)
                  .HasForeignKey(a => a.StudentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Class)
                  .WithMany(c => c.Attendances)
                  .HasForeignKey(a => a.ClassId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Badge ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Badge>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Name).IsRequired().HasMaxLength(100);

            entity.HasOne(b => b.School)
                  .WithMany(s => s.Badges)
                  .HasForeignKey(b => b.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StudentBadge ─────────────────────────────────────────────────────
        modelBuilder.Entity<StudentBadge>(entity =>
        {
            entity.HasKey(sb => sb.Id);

            entity.HasOne(sb => sb.Student)
                  .WithMany(s => s.StudentBadges)
                  .HasForeignKey(sb => sb.StudentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(sb => sb.Badge)
                  .WithMany(b => b.StudentBadges)
                  .HasForeignKey(sb => sb.BadgeId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(sb => sb.AwardedBy)
                  .WithMany()
                  .HasForeignKey(sb => sb.AwardedById)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Conversation ─────────────────────────────────────────────────────
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(c => c.Id);

            entity.HasOne(c => c.Class)
                  .WithMany()
                  .HasForeignKey(c => c.ClassId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ── ConversationParticipant — composite PK ───────────────────────────
        modelBuilder.Entity<ConversationParticipant>(entity =>
        {
            entity.HasKey(cp => new { cp.ConversationId, cp.UserId });

            entity.HasOne(cp => cp.Conversation)
                  .WithMany(c => c.Participants)
                  .HasForeignKey(cp => cp.ConversationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cp => cp.User)
                  .WithMany(u => u.ConversationParticipants)
                  .HasForeignKey(cp => cp.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Message ──────────────────────────────────────────────────────────
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(m => m.Id);

            entity.HasOne(m => m.Conversation)
                  .WithMany(c => c.Messages)
                  .HasForeignKey(m => m.ConversationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(m => m.Sender)
                  .WithMany(u => u.SentMessages)
                  .HasForeignKey(m => m.SenderId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── OtpCode ──────────────────────────────────────────────────────────
        modelBuilder.Entity<OtpCode>(entity =>
        {
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Identifier).IsRequired().HasMaxLength(256);
            entity.Property(o => o.Code).IsRequired().HasMaxLength(6);
            entity.HasIndex(o => new { o.Identifier, o.ExpiresAt });
        });

        // ── Announcement ─────────────────────────────────────────────────────
        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Title).IsRequired().HasMaxLength(300);
            entity.Property(a => a.Content).IsRequired();
            entity.Property(a => a.Target).HasMaxLength(20).HasDefaultValue("all");

            entity.HasOne(a => a.School)
                  .WithMany(s => s.Announcements)
                  .HasForeignKey(a => a.SchoolId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Sender)
                  .WithMany()
                  .HasForeignKey(a => a.SenderId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Class)
                  .WithMany()
                  .HasForeignKey(a => a.ClassId)
                  .IsRequired(false)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
            return;

        optionsBuilder.UseNpgsql(o => o.UseVector());
    }
}
