using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AnnouncementsController> _logger;

    public AnnouncementsController(AppDbContext db, ILogger<AnnouncementsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /api/announcements
    [HttpGet]
    public async Task<IActionResult> GetAnnouncements()
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        IQueryable<Announcement> query = _db.Announcements
            .Include(a => a.Sender)
            .Include(a => a.Class)
            .Where(a => a.SchoolId == schoolId);

        if (role == "Teacher")
        {
            // Teacher's own classes or school-wide announcements
            var teacherClassIds = await _db.Classes
                .Where(c => c.TeacherId == userId && c.SchoolId == schoolId)
                .Select(c => c.Id)
                .ToListAsync();

            query = query.Where(a =>
                a.Target == "all" ||
                (a.ClassId != null && teacherClassIds.Contains(a.ClassId.Value)));
        }
        else if (role == "Parent")
        {
            // Parent sees school-wide or class-targeted announcements for their children's classes
            var childClassIds = await _db.StudentParents
                .Include(sp => sp.Student)
                .Where(sp => sp.ParentId == userId)
                .Select(sp => sp.Student.ClassId)
                .Distinct()
                .ToListAsync();

            query = query.Where(a =>
                a.Target == "all" ||
                a.Target == "parent" ||
                (a.ClassId != null && childClassIds.Contains(a.ClassId.Value)));
        }
        else if (role == "Admin")
        {
            // Admin sees all school announcements
        }
        else
        {
            return Forbid();
        }

        var announcements = await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Content,
                a.Target,
                a.ClassId,
                ClassName   = a.Class != null ? a.Class.Name : null,
                a.SenderId,
                SenderName  = a.Sender.FullName,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(announcements);
    }

    // POST /api/announcements
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        // If classId is specified, verify the class belongs to this school
        if (request.ClassId.HasValue)
        {
            var classQuery = _db.Classes.Where(c => c.Id == request.ClassId.Value && c.SchoolId == schoolId);

            // Teacher can only post to their own class
            if (role == "Teacher")
                classQuery = classQuery.Where(c => c.TeacherId == userId);

            var cls = await classQuery.FirstOrDefaultAsync();
            if (cls is null)
                return BadRequest(new { message = "Class not found or access denied." });
        }

        var announcement = new Announcement
        {
            Id       = Guid.NewGuid(),
            SchoolId = schoolId,
            SenderId = userId,
            Title    = request.Title,
            Content  = request.Content,
            Target   = request.Target ?? "all",
            ClassId  = request.ClassId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync();

        // Send push notifications to all relevant users
        await SendAnnouncementNotificationsAsync(announcement, schoolId);

        return CreatedAtAction(nameof(GetAnnouncements), new { }, new { id = announcement.Id });
    }

    // DELETE /api/announcements/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> DeleteAnnouncement(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        var announcement = await _db.Announcements
            .FirstOrDefaultAsync(a => a.Id == id && a.SchoolId == schoolId);

        if (announcement is null)
            return NotFound();

        // Teacher can only delete their own; Admin can delete any
        if (role == "Teacher" && announcement.SenderId != userId)
            return Forbid();

        _db.Announcements.Remove(announcement);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task SendAnnouncementNotificationsAsync(Announcement announcement, Guid schoolId)
    {
        IQueryable<string> tokenQuery;

        if (announcement.Target == "all")
        {
            // All active users in the school
            tokenQuery = _db.Users
                .Where(u => u.SchoolId == schoolId && u.IsActive && u.FcmToken != null)
                .Select(u => u.FcmToken!);
        }
        else if (announcement.Target == "parent")
        {
            // All parents in the school
            tokenQuery = _db.Users
                .Where(u => u.SchoolId == schoolId && u.IsActive && u.FcmToken != null
                    && u.Role == Domain.Enums.UserRole.Parent)
                .Select(u => u.FcmToken!);
        }
        else if (announcement.ClassId.HasValue)
        {
            // Parents of students in that class
            var classId = announcement.ClassId.Value;
            var parentIds = await _db.StudentParents
                .Include(sp => sp.Student)
                .Where(sp => sp.Student.ClassId == classId)
                .Select(sp => sp.ParentId)
                .Distinct()
                .ToListAsync();

            tokenQuery = _db.Users
                .Where(u => parentIds.Contains(u.Id) && u.IsActive && u.FcmToken != null)
                .Select(u => u.FcmToken!);
        }
        else
        {
            return;
        }

        var tokens = await tokenQuery.ToListAsync();

        foreach (var token in tokens)
        {
            _logger.LogInformation(
                "[FCM] Would send announcement '{Title}' to token {Token}",
                announcement.Title, token);
            // TODO: await _firebaseService.SendAsync(token, announcement.Title, announcement.Content);
        }
    }

    private Guid GetUserId()   => HttpContext.Items["UserId"]   is Guid g ? g             : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s             : Guid.Empty;
    private string GetRole()   => HttpContext.Items["Role"]     as string ?? string.Empty;
}

public record CreateAnnouncementRequest(string Title, string Content, Guid? ClassId, string? Target);
