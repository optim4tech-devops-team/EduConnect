using EduLink.Application.DTOs.Assignments;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AssignmentsController> _logger;

    public AssignmentsController(AppDbContext db, ILogger<AssignmentsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /api/assignments
    [HttpGet]
    public async Task<IActionResult> GetAssignments()
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        if (role == "Teacher")
        {
            var assignments = await _db.Assignments
                .Include(a => a.Teacher)
                .Include(a => a.Class)
                .Include(a => a.Submissions).ThenInclude(s => s.Student)
                .Where(a => a.TeacherId == userId && a.Class.SchoolId == schoolId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(assignments.Select(a => MapToDto(a, null)));
        }

        if (role == "Parent")
        {
            // Parent sees assignments for their child's class, with submission status
            var children = await _db.StudentParents
                .Include(sp => sp.Student)
                .Where(sp => sp.ParentId == userId)
                .Select(sp => sp.Student)
                .ToListAsync();

            if (!children.Any())
                return Ok(Array.Empty<object>());

            // Collect class IDs of all children
            var classIds = children.Select(c => c.ClassId).Distinct().ToList();
            var childIds = children.Select(c => c.Id).ToList();

            var assignments = await _db.Assignments
                .Include(a => a.Teacher)
                .Include(a => a.Class)
                .Include(a => a.Submissions).ThenInclude(s => s.Student)
                .Where(a => classIds.Contains(a.ClassId) && a.Class.SchoolId == schoolId)
                .OrderByDescending(a => a.DueDate)
                .ToListAsync();

            // For parent: include their child's submission for each assignment
            var result = assignments.Select(a =>
            {
                var mySubmission = a.Submissions.FirstOrDefault(s => childIds.Contains(s.StudentId));
                return MapToDto(a, mySubmission);
            });

            return Ok(result);
        }

        return Forbid();
    }

    // POST /api/assignments
    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateAssignmentRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        var cls = await _db.Classes
            .FirstOrDefaultAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId && c.TeacherId == userId);

        if (cls is null)
            return BadRequest(new { message = "Class not found or you are not the assigned teacher." });

        var assignment = new Assignment
        {
            Id            = Guid.NewGuid(),
            TeacherId     = userId,
            ClassId       = request.ClassId,
            Title         = request.Title,
            Description   = request.Description,
            DueDate       = request.DueDate,
            AttachmentUrl = request.AttachmentUrl,
            CreatedAt     = DateTime.UtcNow
        };

        _db.Assignments.Add(assignment);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAssignment), new { id = assignment.Id }, new { id = assignment.Id });
    }

    // GET /api/assignments/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAssignment(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();
        var role     = GetRole();

        var assignment = await _db.Assignments
            .Include(a => a.Teacher)
            .Include(a => a.Class)
            .Include(a => a.Submissions).ThenInclude(s => s.Student)
            .FirstOrDefaultAsync(a => a.Id == id && a.Class.SchoolId == schoolId);

        if (assignment is null)
            return NotFound();

        if (role == "Teacher")
        {
            if (assignment.TeacherId != userId)
                return Forbid();

            return Ok(MapToDto(assignment, null));
        }

        if (role == "Parent")
        {
            var childIds = await _db.StudentParents
                .Where(sp => sp.ParentId == userId)
                .Select(sp => sp.StudentId)
                .ToListAsync();

            // Ensure at least one child is in the assignment's class
            var hasChild = await _db.Students
                .AnyAsync(s => childIds.Contains(s.Id) && s.ClassId == assignment.ClassId);

            if (!hasChild)
                return Forbid();

            var mySubmission = assignment.Submissions.FirstOrDefault(s => childIds.Contains(s.StudentId));
            return Ok(MapToDto(assignment, mySubmission));
        }

        return Forbid();
    }

    // PUT /api/assignments/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> UpdateAssignment(Guid id, [FromBody] CreateAssignmentRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        var assignment = await _db.Assignments
            .Include(a => a.Class)
            .FirstOrDefaultAsync(a => a.Id == id && a.TeacherId == userId && a.Class.SchoolId == schoolId);

        if (assignment is null)
            return NotFound();

        assignment.Title         = request.Title;
        assignment.Description   = request.Description;
        assignment.DueDate       = request.DueDate;
        assignment.AttachmentUrl = request.AttachmentUrl;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Assignment updated." });
    }

    // DELETE /api/assignments/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> DeleteAssignment(Guid id)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        var assignment = await _db.Assignments
            .Include(a => a.Class)
            .FirstOrDefaultAsync(a => a.Id == id && a.TeacherId == userId && a.Class.SchoolId == schoolId);

        if (assignment is null)
            return NotFound();

        _db.Assignments.Remove(assignment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/assignments/{id}/submit
    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = "Parent")]
    public async Task<IActionResult> Submit(Guid id, [FromBody] SubmitAssignmentRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        var assignment = await _db.Assignments
            .Include(a => a.Class)
            .FirstOrDefaultAsync(a => a.Id == id && a.Class.SchoolId == schoolId);

        if (assignment is null)
            return NotFound();

        // Verify parent owns this student
        var isParentOfStudent = await _db.StudentParents
            .AnyAsync(sp => sp.ParentId == userId && sp.StudentId == request.StudentId);

        if (!isParentOfStudent)
            return Forbid();

        // Verify student is in the assignment's class
        var student = await _db.Students.FindAsync(request.StudentId);
        if (student is null || student.ClassId != assignment.ClassId)
            return BadRequest(new { message = "Student is not enrolled in this assignment's class." });

        // Prevent duplicate submissions
        var existing = await _db.Submissions
            .FirstOrDefaultAsync(s => s.AssignmentId == id && s.StudentId == request.StudentId);

        if (existing is not null)
            return BadRequest(new { message = "Submission already exists for this student." });

        var submission = new Submission
        {
            Id           = Guid.NewGuid(),
            AssignmentId = id,
            StudentId    = request.StudentId,
            FileUrl      = request.FileUrl,
            Note         = request.Note,
            SubmittedAt  = DateTime.UtcNow
        };

        _db.Submissions.Add(submission);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAssignment), new { id }, new { submissionId = submission.Id });
    }

    // PUT /api/assignments/{id}/submissions/{submissionId}/grade
    [HttpPut("{id:guid}/submissions/{submissionId:guid}/grade")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GradeSubmission(Guid id, Guid submissionId, [FromBody] GradeSubmissionRequest request)
    {
        var userId   = GetUserId();
        var schoolId = GetSchoolId();

        // Ensure the assignment belongs to this teacher
        var assignment = await _db.Assignments
            .Include(a => a.Class)
            .FirstOrDefaultAsync(a => a.Id == id && a.TeacherId == userId && a.Class.SchoolId == schoolId);

        if (assignment is null)
            return NotFound();

        var submission = await _db.Submissions
            .FirstOrDefaultAsync(s => s.Id == submissionId && s.AssignmentId == id);

        if (submission is null)
            return NotFound();

        submission.Grade    = request.Grade;
        submission.Feedback = request.Feedback;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Submission graded." });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static AssignmentDto MapToDto(Assignment a, Submission? mySubmission) => new(
        a.Id,
        a.TeacherId,
        a.Teacher.FullName,
        a.ClassId,
        a.Class.Name,
        a.Title,
        a.Description,
        a.DueDate,
        a.AttachmentUrl,
        a.CreatedAt,
        a.Submissions.Count,
        mySubmission is null ? null : MapSubmissionDto(mySubmission)
    );

    private static SubmissionDto MapSubmissionDto(Submission s) => new(
        s.Id,
        s.StudentId,
        s.Student.FullName,
        s.FileUrl,
        s.Note,
        s.SubmittedAt,
        s.Grade,
        s.Feedback
    );

    private Guid GetUserId()   => HttpContext.Items["UserId"]   is Guid g ? g             : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s             : Guid.Empty;
    private string GetRole()   => HttpContext.Items["Role"]     as string ?? string.Empty;
}

public record SubmitAssignmentRequest(Guid StudentId, string? FileUrl, string? Note);
public record GradeSubmissionRequest(string? Grade, string? Feedback);
