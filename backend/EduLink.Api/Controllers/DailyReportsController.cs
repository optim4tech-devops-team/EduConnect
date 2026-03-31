using EduLink.Application.DTOs.DailyReports;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/daily-reports")]
[Authorize]
public class DailyReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public DailyReportsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/daily-reports?studentId=&date=
    [HttpGet]
    public async Task<IActionResult> GetReports([FromQuery] Guid? studentId, [FromQuery] DateOnly? date)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        if (role == "Teacher")
        {
            var query = _db.DailyReports
                .Include(r => r.Student).ThenInclude(s => s.Class)
                .Include(r => r.Teacher)
                .Where(r => r.TeacherId == userId && r.Student.Class.SchoolId == schoolId);

            if (studentId.HasValue)
                query = query.Where(r => r.StudentId == studentId.Value);

            if (date.HasValue)
                query = query.Where(r => r.ReportDate == date.Value);

            var reports = await query
                .OrderByDescending(r => r.ReportDate)
                .Select(r => MapToDto(r))
                .ToListAsync();

            return Ok(reports);
        }

        if (role == "Parent")
        {
            // Parent can only view reports for their own children
            var childIds = await _db.StudentParents
                .Where(sp => sp.ParentId == userId)
                .Select(sp => sp.StudentId)
                .ToListAsync();

            if (!childIds.Any())
                return Ok(Array.Empty<object>());

            var query = _db.DailyReports
                .Include(r => r.Student).ThenInclude(s => s.Class)
                .Include(r => r.Teacher)
                .Where(r => childIds.Contains(r.StudentId) && r.Student.Class.SchoolId == schoolId);

            if (studentId.HasValue)
            {
                if (!childIds.Contains(studentId.Value))
                    return Forbid();
                query = query.Where(r => r.StudentId == studentId.Value);
            }

            if (date.HasValue)
                query = query.Where(r => r.ReportDate == date.Value);

            var reports = await query
                .OrderByDescending(r => r.ReportDate)
                .Select(r => MapToDto(r))
                .ToListAsync();

            return Ok(reports);
        }

        return Forbid();
    }

    // POST /api/daily-reports
    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreateReport([FromBody] CreateDailyReportRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        // Verify teacher owns the student's class
        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == request.StudentId && s.Class.SchoolId == schoolId && s.Class.TeacherId == userId);

        if (student is null)
            return BadRequest(new { message = "Student not found or you are not the assigned teacher." });

        // Prevent duplicate report for same student and date
        var existing = await _db.DailyReports
            .AnyAsync(r => r.StudentId == request.StudentId && r.ReportDate == request.ReportDate);

        if (existing)
            return BadRequest(new { message = "A daily report already exists for this student on this date." });

        var report = new DailyReport
        {
            Id           = Guid.NewGuid(),
            StudentId    = request.StudentId,
            TeacherId    = userId,
            ReportDate   = request.ReportDate,
            Mood         = request.Mood,
            Meals        = request.Meals,
            SleepMinutes = request.SleepMinutes,
            Activities   = request.Activities?.ToArray(),
            Notes        = request.Notes,
            CreatedAt    = DateTime.UtcNow
        };

        _db.DailyReports.Add(report);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetReport), new { id = report.Id }, new { id = report.Id });
    }

    // GET /api/daily-reports/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetReport(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        var report = await _db.DailyReports
            .Include(r => r.Student).ThenInclude(s => s.Class)
            .Include(r => r.Teacher)
            .FirstOrDefaultAsync(r => r.Id == id && r.Student.Class.SchoolId == schoolId);

        if (report is null)
            return NotFound();

        if (role == "Teacher")
        {
            if (report.TeacherId != userId)
                return Forbid();

            return Ok(MapToDto(report));
        }

        if (role == "Parent")
        {
            var isParent = await _db.StudentParents
                .AnyAsync(sp => sp.ParentId == userId && sp.StudentId == report.StudentId);

            if (!isParent)
                return Forbid();

            return Ok(MapToDto(report));
        }

        return Forbid();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static object MapToDto(DailyReport r) => new
    {
        r.Id,
        r.StudentId,
        StudentName  = r.Student.FullName,
        r.TeacherId,
        TeacherName  = r.Teacher.FullName,
        r.ReportDate,
        Mood         = r.Mood.ToString(),
        r.Meals,
        r.SleepMinutes,
        r.Activities,
        r.Notes,
        r.CreatedAt
    };

    private Guid GetUserId()   => HttpContext.Items["UserId"]   is Guid g ? g             : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s             : Guid.Empty;
    private string GetRole()   => HttpContext.Items["Role"]     as string ?? string.Empty;
}
