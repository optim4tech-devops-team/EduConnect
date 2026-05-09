using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/classes")]
[Authorize]
public class ClassesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ClassesController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/classes
    [HttpGet]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> GetClasses()
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        IQueryable<Class> query = _db.Classes
            .Include(c => c.Teacher)
            .Include(c => c.Students)
            .Where(c => c.SchoolId == schoolId);

        if (role == "Teacher")
            query = query.Where(c => c.TeacherId == userId);

        var classes = await query
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.AcademicYear,
                c.SchoolId,
                c.TeacherId,
                TeacherName   = c.Teacher != null ? c.Teacher.FullName : null,
                StudentCount  = c.Students.Count(s => s.IsActive),
                c.CreatedAt
            })
            .ToListAsync();

        return Ok(classes);
    }

    // POST /api/classes
    [HttpPost]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
    {
        var schoolId = GetSchoolId();
        User? teacher = null;
        if (request.TeacherId.HasValue)
        {
            teacher = await _db.Users
                .FirstOrDefaultAsync(u => u.Id == request.TeacherId.Value && u.SchoolId == schoolId);

            if (teacher is null)
                return BadRequest(new { message = "Teacher not found in this school." });
        }

        var cls = new Class
        {
            Id           = Guid.NewGuid(),
            Name         = request.Name,
            SchoolId     = schoolId,
            TeacherId    = request.TeacherId,
            AcademicYear = request.AcademicYear ?? string.Empty,
            CreatedAt    = DateTime.UtcNow
        };

        _db.Classes.Add(cls);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetClass), new { id = cls.Id }, new
        {
            cls.Id,
            cls.Name,
            cls.AcademicYear,
            cls.SchoolId,
            cls.TeacherId,
            TeacherName = teacher?.FullName,
            StudentCount = 0,
            cls.CreatedAt
        });
    }

    // GET /api/classes/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> GetClass(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        var cls = await _db.Classes
            .Include(c => c.Teacher)
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

        if (cls is null)
            return NotFound();

        if (role == "Teacher" && cls.TeacherId != userId)
            return Forbid();

        return Ok(new
        {
            cls.Id,
            cls.Name,
            cls.AcademicYear,
            cls.SchoolId,
            cls.TeacherId,
            TeacherName  = cls.Teacher != null ? cls.Teacher.FullName : null,
            Students     = cls.Students
                .Where(s => s.IsActive)
                .Select(s => new { s.Id, s.FullName, s.AvatarUrl, s.BirthDate })
                .ToList(),
            cls.CreatedAt
        });
    }

    // PUT /api/classes/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> UpdateClass(Guid id, [FromBody] UpdateClassRequest request)
    {
        var schoolId = GetSchoolId();

        var cls = await _db.Classes
            .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

        if (cls is null)
            return NotFound();

        if (request.TeacherId.HasValue)
        {
            // Verify the new teacher exists in this school
            var teacherExists = await _db.Users
                .AnyAsync(u => u.Id == request.TeacherId.Value && u.SchoolId == schoolId);

            if (!teacherExists)
                return BadRequest(new { message = "Teacher not found in this school." });

            cls.TeacherId = request.TeacherId.Value;
        }
        else if (request.ClearTeacher)
        {
            cls.TeacherId = null;
        }

        if (request.Name is not null)
            cls.Name = request.Name;

        if (request.AcademicYear is not null)
            cls.AcademicYear = request.AcademicYear;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Class updated." });
    }

    // POST /api/classes/{id}/teacher
    [HttpPost("{id:guid}/teacher")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> AssignTeacher(Guid id, [FromBody] AssignClassTeacherRequest request)
    {
        var schoolId = GetSchoolId();

        var cls = await _db.Classes
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

        if (cls is null)
            return NotFound();

        if (!request.TeacherId.HasValue)
        {
            cls.TeacherId = null;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                cls.Id,
                cls.Name,
                cls.AcademicYear,
                cls.SchoolId,
                cls.TeacherId,
                TeacherName = (string?)null,
                StudentCount = cls.Students.Count(s => s.IsActive)
            });
        }

        var teacher = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == request.TeacherId.Value && u.SchoolId == schoolId);

        if (teacher is null)
            return BadRequest(new { message = "Teacher not found in this school." });

        cls.TeacherId = teacher.Id;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            cls.Id,
            cls.Name,
            cls.AcademicYear,
            cls.SchoolId,
            cls.TeacherId,
            TeacherName = teacher.FullName,
            StudentCount = cls.Students.Count(s => s.IsActive)
        });
    }

    // DELETE /api/classes/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> DeleteClass(Guid id)
    {
        var schoolId = GetSchoolId();

        var cls = await _db.Classes
            .Include(c => c.Students)
            .FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);

        if (cls is null)
            return NotFound();

        // Soft delete: deactivate all students in the class
        foreach (var student in cls.Students)
            student.IsActive = false;

        // We mark the class as deleted by removing it; downstream data remains
        // (EF cascade rules handle orphan cleanup where configured)
        // For a true soft-delete pattern a DeletedAt column would be added to Class.
        // Here we remove and rely on Restrict FK to surface any integrity issues early.
        _db.Classes.Remove(cls);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Guid GetUserId()   => HttpContext.Items["UserId"]   is Guid g ? g             : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s             : Guid.Empty;
    private string GetRole()   => HttpContext.Items["Role"]     as string ?? string.Empty;
}

public record CreateClassRequest(string Name, Guid? TeacherId, string? AcademicYear);
public record UpdateClassRequest(string? Name, Guid? TeacherId, string? AcademicYear, bool ClearTeacher = false);
public record AssignClassTeacherRequest(Guid? TeacherId);
