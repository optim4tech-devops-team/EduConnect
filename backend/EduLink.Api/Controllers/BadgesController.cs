using EduLink.Application.DTOs.Badges;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/badges")]
[Authorize]
public class BadgesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<BadgesController> _logger;

    public BadgesController(AppDbContext db, ILogger<BadgesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /api/badges
    [HttpGet]
    public async Task<IActionResult> GetBadges()
    {
        var schoolId = GetSchoolId();

        var badges = await _db.Badges
            .Where(b => b.SchoolId == schoolId)
            .OrderBy(b => b.Name)
            .Select(b => new BadgeDto(b.Id, b.Name, b.IconUrl, b.Description))
            .ToListAsync();

        return Ok(badges);
    }

    // POST /api/badges
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> CreateBadge([FromBody] CreateBadgeRequest request)
    {
        var schoolId = GetSchoolId();

        var badge = new Badge
        {
            Id          = Guid.NewGuid(),
            Name        = request.Name,
            Description = request.Description,
            IconUrl     = request.IconUrl,
            SchoolId    = schoolId
        };

        _db.Badges.Add(badge);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBadges), new { }, new BadgeDto(badge.Id, badge.Name, badge.IconUrl, badge.Description));
    }

    // POST /api/badges/award
    [HttpPost("award")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> AwardBadge([FromBody] AwardBadgeRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        // Verify badge belongs to this school
        var badge = await _db.Badges
            .FirstOrDefaultAsync(b => b.Id == request.BadgeId && b.SchoolId == schoolId);

        if (badge is null)
            return NotFound(new { message = "Badge not found." });

        // Verify student exists and belongs to this school
        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == request.StudentId && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound(new { message = "Student not found." });

        // Verify the teacher is assigned to the student's class
        if (student.Class.TeacherId != userId)
            return Forbid();

        var studentBadge = new StudentBadge
        {
            Id          = Guid.NewGuid(),
            StudentId   = request.StudentId,
            BadgeId     = request.BadgeId,
            AwardedById = userId,
            Note        = request.Note,
            AwardedAt   = DateTime.UtcNow
        };

        _db.StudentBadges.Add(studentBadge);
        await _db.SaveChangesAsync();

        // Notify parent(s) of the student
        var parentIds = await _db.StudentParents
            .Where(sp => sp.StudentId == request.StudentId)
            .Select(sp => sp.ParentId)
            .ToListAsync();

        if (parentIds.Count > 0)
        {
            var fcmTokens = await _db.Users
                .Where(u => parentIds.Contains(u.Id) && u.FcmToken != null)
                .Select(u => new { u.Id, u.FcmToken })
                .ToListAsync();

            foreach (var item in fcmTokens)
            {
                _logger.LogInformation(
                    "[FCM] Would notify parent {ParentId} (token: {Token}): student {StudentId} awarded badge '{BadgeName}'",
                    item.Id, item.FcmToken, request.StudentId, badge.Name);
                // TODO: await _firebaseService.SendAsync(item.FcmToken!, "Badge Awarded", $"{student.FullName} received the '{badge.Name}' badge!");
            }
        }

        return CreatedAtAction(nameof(GetStudentBadges), new { studentId = request.StudentId }, new { id = studentBadge.Id });
    }

    // GET /api/badges/student/{studentId}
    [HttpGet("student/{studentId:guid}")]
    public async Task<IActionResult> GetStudentBadges(Guid studentId)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        // Verify student exists and belongs to this school
        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == studentId && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        if (role == "Teacher")
        {
            if (student.Class.TeacherId != userId)
                return Forbid();
        }
        else if (role == "Parent")
        {
            var isParent = await _db.StudentParents
                .AnyAsync(sp => sp.ParentId == userId && sp.StudentId == studentId);

            if (!isParent)
                return Forbid();
        }
        else
        {
            return Forbid();
        }

        var studentBadges = await _db.StudentBadges
            .Include(sb => sb.Badge)
            .Include(sb => sb.AwardedBy)
            .Where(sb => sb.StudentId == studentId)
            .OrderByDescending(sb => sb.AwardedAt)
            .Select(sb => new StudentBadgeDto(
                sb.Id,
                new BadgeDto(sb.Badge.Id, sb.Badge.Name, sb.Badge.IconUrl, sb.Badge.Description),
                sb.AwardedBy.FullName,
                sb.Note,
                sb.AwardedAt))
            .ToListAsync();

        return Ok(studentBadges);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Guid GetUserId()   => HttpContext.Items["UserId"]   is Guid g ? g             : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s             : Guid.Empty;
    private string GetRole()   => HttpContext.Items["Role"]     as string ?? string.Empty;
}

public record CreateBadgeRequest(string Name, string? Description, string? IconUrl);
