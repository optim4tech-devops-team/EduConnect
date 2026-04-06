using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/students/{studentId:guid}/observations")]
[Authorize(Roles = "SchoolAdmin,Teacher,Parent")]
public class ObservationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ObservationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetObservations(Guid studentId)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var role = GetRole();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == studentId && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        if (role == "Teacher" && student.Class.TeacherId != userId)
            return Forbid();

        if (role == "Parent")
        {
            var isParent = await _db.StudentParents
                .AnyAsync(sp => sp.ParentId == userId && sp.StudentId == studentId);

            if (!isParent)
                return Forbid();
        }

        var observations = await _db.StudentObservations
            .Where(o => o.StudentId == studentId)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                o.StudentId,
                o.Title,
                o.Note,
                o.Category,
                o.CreatedAt,
                TeacherName = o.Teacher.FullName,
                o.TeacherId
            })
            .ToListAsync();

        return Ok(observations);
    }

    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreateObservation(Guid studentId, [FromBody] CreateObservationRequest request)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == studentId && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        if (student.Class.TeacherId != userId)
            return Forbid();

        var observation = new StudentObservation
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TeacherId = userId,
            SchoolId = schoolId,
            Title = request.Title.Trim(),
            Note = request.Note.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category)
                ? "positive_observation"
                : request.Category.Trim().ToLowerInvariant(),
            CreatedAt = DateTime.UtcNow
        };

        _db.StudentObservations.Add(observation);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetObservations), new { studentId }, new
        {
            observation.Id,
            observation.StudentId,
            observation.Title,
            observation.Category,
            observation.CreatedAt
        });
    }

    private Guid GetUserId() => HttpContext.Items["UserId"] is Guid g ? g : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s : Guid.Empty;
    private string GetRole() => HttpContext.Items["Role"] as string ?? string.Empty;
}

public record CreateObservationRequest(string Title, string Note, string? Category);
