using EduLink.Application.DTOs.Attendance;
using EduLink.Domain.Entities;
using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(AppDbContext db, ILogger<AttendanceController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // POST /api/attendance/bulk
    [HttpPost("bulk")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> BulkUpsert([FromBody] AttendanceBulkRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        // Verify the class belongs to this teacher and school
        var cls = await _db.Classes
            .FirstOrDefaultAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId && c.TeacherId == userId);

        if (cls is null)
            return BadRequest(new { message = "Class not found or you are not the assigned teacher." });

        // Load existing attendance records for this class and date
        var existing = await _db.Attendances
            .Where(a => a.ClassId == request.ClassId && a.Date == request.Date)
            .ToListAsync();

        var absentStudentIds = new List<Guid>();

        foreach (var entry in request.Entries)
        {
            var record = existing.FirstOrDefault(a => a.StudentId == entry.StudentId);

            if (record is null)
            {
                record = new Attendance
                {
                    Id        = Guid.NewGuid(),
                    StudentId = entry.StudentId,
                    ClassId   = request.ClassId,
                    Date      = request.Date,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Attendances.Add(record);
            }

            record.Status = entry.Status;
            record.Note   = entry.Note;

            if (entry.Status == AttendanceStatus.Absent)
                absentStudentIds.Add(entry.StudentId);
        }

        await _db.SaveChangesAsync();

        // Notify parents of absent students
        if (absentStudentIds.Count > 0)
        {
            var parentIds = await _db.StudentParents
                .Where(sp => absentStudentIds.Contains(sp.StudentId))
                .Select(sp => sp.ParentId)
                .Distinct()
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
                        "[FCM] Would notify parent {ParentId} (token: {Token}): child absent on {Date} in class {ClassId}",
                        item.Id, item.FcmToken, request.Date, request.ClassId);
                    // TODO: await _firebaseService.SendAsync(item.FcmToken!, "Absence Alert", $"Your child was absent on {request.Date}.");
                }
            }
        }

        return Ok(new { message = "Attendance saved.", count = request.Entries.Count });
    }

    // GET /api/attendance?classId=&date=
    [HttpGet]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetAttendance([FromQuery] Guid classId, [FromQuery] DateOnly date)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        var cls = await _db.Classes
            .FirstOrDefaultAsync(c => c.Id == classId && c.SchoolId == schoolId && c.TeacherId == userId);

        if (cls is null)
            return BadRequest(new { message = "Class not found or you are not the assigned teacher." });

        var records = await _db.Attendances
            .Include(a => a.Student)
            .Where(a => a.ClassId == classId && a.Date == date)
            .OrderBy(a => a.Student.FullName)
            .Select(a => new
            {
                a.Id,
                a.StudentId,
                StudentName = a.Student.FullName,
                Status      = a.Status.ToString(),
                a.Note,
                a.Date
            })
            .ToListAsync();

        return Ok(records);
    }

    // GET /api/attendance/student/{studentId}
    [HttpGet("student/{studentId:guid}")]
    public async Task<IActionResult> GetStudentAttendance(Guid studentId)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        // Verify the student exists and belongs to this school
        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == studentId && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        if (role == "Teacher")
        {
            // Teacher must be assigned to the student's class
            if (student.Class.TeacherId != userId)
                return Forbid();
        }
        else if (role == "Parent")
        {
            // Parent must be linked to this student
            var isParent = await _db.StudentParents
                .AnyAsync(sp => sp.ParentId == userId && sp.StudentId == studentId);

            if (!isParent)
                return Forbid();
        }
        else
        {
            return Forbid();
        }

        var records = await _db.Attendances
            .Where(a => a.StudentId == studentId)
            .OrderByDescending(a => a.Date)
            .Select(a => new
            {
                a.Id,
                a.Date,
                Status = a.Status.ToString(),
                a.Note,
                a.ClassId
            })
            .ToListAsync();

        return Ok(records);
    }

    // GET /api/attendance/summary?year=&month=&classId=
    [HttpGet("summary")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> GetSchoolAttendanceSummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] Guid? classId)
    {
        var schoolId = GetSchoolId();
        if (schoolId == Guid.Empty)
            return Unauthorized();

        var now = DateTime.UtcNow;
        var selectedYear = year ?? now.Year;
        var selectedMonth = month ?? now.Month;

        if (selectedYear < 2000 || selectedYear > 2100)
            return BadRequest(new { message = "Gecerli bir yil secmelisin." });

        if (selectedMonth < 1 || selectedMonth > 12)
            return BadRequest(new { message = "Gecerli bir ay secmelisin." });

        var classesQuery = _db.Classes
            .AsNoTracking()
            .Where(c => c.SchoolId == schoolId);

        if (classId.HasValue)
        {
            classesQuery = classesQuery.Where(c => c.Id == classId.Value);
        }

        var classes = await classesQuery
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        if (classId.HasValue && classes.Count == 0)
        {
            return BadRequest(new { message = "Secilen sinif bu okula ait degil." });
        }

        var classIds = classes.Select(c => c.Id).ToList();
        if (classIds.Count == 0)
        {
            return Ok(new
            {
                year = selectedYear,
                month = selectedMonth,
                totalStudents = 0,
                uniqueStudentsWithAttendance = 0,
                totalRecords = 0,
                presentCount = 0,
                absentCount = 0,
                lateCount = 0,
                excusedCount = 0,
                byClass = Array.Empty<object>()
            });
        }

        var firstDay = new DateOnly(selectedYear, selectedMonth, 1);
        var nextMonth = firstDay.AddMonths(1);

        var attendanceRows = await _db.Attendances
            .AsNoTracking()
            .Where(a =>
                classIds.Contains(a.ClassId) &&
                a.Date >= firstDay &&
                a.Date < nextMonth)
            .Select(a => new
            {
                a.ClassId,
                a.StudentId,
                a.Status
            })
            .ToListAsync();

        var studentCount = await _db.Students
            .AsNoTracking()
            .Where(s => classIds.Contains(s.ClassId) && s.IsActive)
            .CountAsync();

        var presentCount = attendanceRows.Count(a => a.Status == AttendanceStatus.Present);
        var absentCount = attendanceRows.Count(a => a.Status == AttendanceStatus.Absent);
        var lateCount = attendanceRows.Count(a => a.Status == AttendanceStatus.Late);
        var excusedCount = attendanceRows.Count(a => a.Status == AttendanceStatus.Excused);

        var byClass = classes.Select(cls =>
        {
            var rows = attendanceRows.Where(item => item.ClassId == cls.Id).ToList();
            var classPresent = rows.Count(item => item.Status == AttendanceStatus.Present);
            var classAbsent = rows.Count(item => item.Status == AttendanceStatus.Absent);
            var classLate = rows.Count(item => item.Status == AttendanceStatus.Late);
            var classExcused = rows.Count(item => item.Status == AttendanceStatus.Excused);
            var total = rows.Count;
            var attendanceRate = total == 0
                ? 0
                : Math.Round((double)classPresent / total * 100, 1);

            return new
            {
                classId = cls.Id,
                className = cls.Name,
                totalRecords = total,
                presentCount = classPresent,
                absentCount = classAbsent,
                lateCount = classLate,
                excusedCount = classExcused,
                attendanceRate
            };
        });

        return Ok(new
        {
            year = selectedYear,
            month = selectedMonth,
            totalStudents = studentCount,
            uniqueStudentsWithAttendance = attendanceRows.Select(row => row.StudentId).Distinct().Count(),
            totalRecords = attendanceRows.Count,
            presentCount,
            absentCount,
            lateCount,
            excusedCount,
            byClass
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Guid GetUserId()   => HttpContext.Items["UserId"]   is Guid g ? g             : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s             : Guid.Empty;
    private string GetRole()   => HttpContext.Items["Role"]     as string ?? string.Empty;
}
