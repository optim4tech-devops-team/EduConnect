using EduLink.Application.DTOs.Students;
using EduLink.Application.Services;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AiService _aiService;

    public StudentsController(AppDbContext db, AiService aiService)
    {
        _db = db;
        _aiService = aiService;
    }

    /// <summary>Returns all students. Admins/Teachers can filter by classId.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetStudents([FromQuery] Guid? classId)
    {
        var schoolId = GetSchoolId();

        var query = _db.Students
            .Include(s => s.Class)
            .Include(s => s.StudentParents)
                .ThenInclude(sp => sp.Parent)
            .Include(s => s.StudentBadges)
            .Where(s => s.Class.SchoolId == schoolId);

        if (classId.HasValue)
            query = query.Where(s => s.ClassId == classId.Value);

        var students = await query
            .OrderBy(s => s.FullName)
            .Select(s => new StudentDto(
                s.Id,
                s.FullName,
                s.BirthDate,
                s.ClassId,
                s.Class.Name,
                s.AvatarUrl,
                s.Notes,
                s.IsActive,
                s.StudentBadges.Count,
                s.StudentParents.Select(sp => new ParentSummaryDto(
                    sp.Parent.Id,
                    sp.Parent.FullName,
                    sp.Parent.Phone,
                    sp.Parent.AvatarUrl
                )).ToList()
            ))
            .ToListAsync();

        return Ok(students);
    }

    /// <summary>Creates a new student.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> CreateStudent([FromBody] CreateStudentRequest request)
    {
        var schoolId = GetSchoolId();

        // Verify the class belongs to this school
        var classExists = await _db.Classes
            .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId);

        if (!classExists)
            return BadRequest(new { message = "Class not found or does not belong to your school." });

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            ClassId = request.ClassId,
            BirthDate = request.BirthDate,
            Notes = request.Notes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Students.Add(student);
        await _db.SaveChangesAsync();

        var cls = await _db.Classes.FindAsync(request.ClassId);

        var dto = new StudentDto(
            student.Id,
            student.FullName,
            student.BirthDate,
            student.ClassId,
            cls?.Name ?? string.Empty,
            student.AvatarUrl,
            student.Notes,
            student.IsActive,
            0,
            new List<ParentSummaryDto>()
        );

        return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, dto);
    }

    /// <summary>Returns a single student by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetStudent(Guid id)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .Include(s => s.StudentParents)
                .ThenInclude(sp => sp.Parent)
            .Include(s => s.StudentBadges)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        var dto = new StudentDto(
            student.Id,
            student.FullName,
            student.BirthDate,
            student.ClassId,
            student.Class.Name,
            student.AvatarUrl,
            student.Notes,
            student.IsActive,
            student.StudentBadges.Count,
            student.StudentParents.Select(sp => new ParentSummaryDto(
                sp.Parent.Id,
                sp.Parent.FullName,
                sp.Parent.Phone,
                sp.Parent.AvatarUrl
            )).ToList()
        );

        return Ok(dto);
    }

    /// <summary>Updates an existing student.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> UpdateStudent(Guid id, [FromBody] CreateStudentRequest request)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        // Verify new class belongs to school
        var classExists = await _db.Classes
            .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId);

        if (!classExists)
            return BadRequest(new { message = "Class not found or does not belong to your school." });

        student.FullName = request.FullName;
        student.ClassId = request.ClassId;
        student.BirthDate = request.BirthDate;
        student.Notes = request.Notes;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Soft-deletes a student by setting IsActive to false.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> DeleteStudent(Guid id)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        student.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Assigns a parent user to a student.</summary>
    [HttpPost("{id:guid}/assign-parent")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> AssignParent(Guid id, [FromBody] AssignParentRequest request)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound(new { message = "Student not found." });

        var parent = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == request.ParentId && u.SchoolId == schoolId && u.Role == Domain.Enums.UserRole.Parent);

        if (parent is null)
            return BadRequest(new { message = "Parent user not found." });

        var alreadyLinked = await _db.StudentParents
            .AnyAsync(sp => sp.StudentId == id && sp.ParentId == request.ParentId);

        if (alreadyLinked)
            return Conflict(new { message = "Parent is already assigned to this student." });

        _db.StudentParents.Add(new StudentParent
        {
            StudentId = id,
            ParentId = request.ParentId
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Enqueues a Hangfire job to enroll the student's face photos in the AI service.</summary>
    [HttpPost("{id:guid}/enroll-face")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> EnrollFace(Guid id, [FromBody] EnrollFaceRequest request)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound(new { message = "Student not found." });

        if (request.PhotoUrls is null || request.PhotoUrls.Count == 0)
            return BadRequest(new { message = "At least one photo URL is required." });

        // Enqueue Hangfire background job
        BackgroundJob.Enqueue<AiService>(svc =>
            svc.EnrollFacesAsync(id, request.PhotoUrls));

        return Accepted(new { message = "Face enrollment job enqueued." });
    }

    private Guid GetSchoolId()
    {
        var val = HttpContext.Items["SchoolId"];
        return val is Guid g ? g : Guid.Empty;
    }
}

// Local request models used only in this controller
public record AssignParentRequest(Guid ParentId);
public record EnrollFaceRequest(List<string> PhotoUrls);
