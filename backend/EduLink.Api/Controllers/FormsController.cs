using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/forms")]
[Authorize(Roles = "SchoolAdmin,Teacher,Parent")]
public class FormsController : ControllerBase
{
    private readonly AppDbContext _db;

    public FormsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates([FromQuery] string? category, [FromQuery] bool? isActive)
    {
        var schoolId = GetSchoolId();
        var role = GetRole();

        var query = _db.FormTemplates
            .Include(ft => ft.Fields)
            .Where(ft => ft.SchoolId == schoolId);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(ft => ft.Category == category);

        if (isActive.HasValue)
            query = query.Where(ft => ft.IsActive == isActive.Value);
        else if (role == "Parent")
            query = query.Where(ft => ft.IsActive);

        var templates = await query
            .OrderBy(ft => ft.Title)
            .Select(ft => new
            {
                ft.Id,
                ft.Title,
                ft.Description,
                ft.Category,
                ft.IsActive,
                ft.CreatedAt,
                FieldCount = ft.Fields.Count,
                Fields = ft.Fields
                    .OrderBy(f => f.SortOrder)
                    .Select(f => new
                    {
                        f.Id,
                        f.Key,
                        f.Label,
                        f.Type,
                        f.Placeholder,
                        f.OptionsJson,
                        f.IsRequired,
                        f.SortOrder
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(templates);
    }

    [HttpGet("templates/{id:guid}")]
    public async Task<IActionResult> GetTemplate(Guid id)
    {
        var schoolId = GetSchoolId();
        var role = GetRole();

        var template = await _db.FormTemplates
            .Include(ft => ft.Fields)
            .Where(ft => ft.Id == id && ft.SchoolId == schoolId)
            .Select(ft => new
            {
                ft.Id,
                ft.Title,
                ft.Description,
                ft.Category,
                ft.IsActive,
                ft.CreatedAt,
                Fields = ft.Fields
                    .OrderBy(f => f.SortOrder)
                    .Select(f => new
                    {
                        f.Id,
                        f.Key,
                        f.Label,
                        f.Type,
                        f.Placeholder,
                        f.OptionsJson,
                        f.IsRequired,
                        f.SortOrder
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (template is null)
            return NotFound();

        if (role == "Parent" && !template.IsActive)
            return Forbid();

        return Ok(template);
    }

    [HttpPost("templates")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> CreateTemplate([FromBody] UpsertFormTemplateRequest request)
    {
        if (request.Fields is null || request.Fields.Count == 0)
            return BadRequest(new { message = "Form en az bir alan icermelidir." });

        var schoolId = GetSchoolId();
        var userId = GetUserId();

        var template = new FormTemplate
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            CreatedById = userId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Category = request.Category.Trim().ToLowerInvariant(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        template.Fields = request.Fields
            .OrderBy(f => f.SortOrder)
            .Select(field => new FormField
            {
                Id = Guid.NewGuid(),
                Key = field.Key.Trim(),
                Label = field.Label.Trim(),
                Type = field.Type.Trim().ToLowerInvariant(),
                Placeholder = field.Placeholder,
                OptionsJson = field.OptionsJson,
                IsRequired = field.IsRequired,
                SortOrder = field.SortOrder
            })
            .ToList();

        _db.FormTemplates.Add(template);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, new
        {
            template.Id,
            template.Title,
            template.Category,
            template.IsActive
        });
    }

    [HttpPut("templates/{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpsertFormTemplateRequest request)
    {
        var schoolId = GetSchoolId();
        var template = await _db.FormTemplates
            .Include(ft => ft.Fields)
            .Include(ft => ft.Submissions)
            .FirstOrDefaultAsync(ft => ft.Id == id && ft.SchoolId == schoolId);

        if (template is null)
            return NotFound();

        template.Title = request.Title.Trim();
        template.Description = request.Description?.Trim();
        template.Category = request.Category.Trim().ToLowerInvariant();
        template.IsActive = request.IsActive;

        var submittedCount = template.Submissions.Count;
        if (request.Fields is { Count: > 0 })
        {
            if (submittedCount > 0)
                return BadRequest(new { message = "Bu form icin basvuru toplandi. Alan yapisini degistirmek yerine yeni bir form olusturun." });

            _db.FormFields.RemoveRange(template.Fields);
            template.Fields = request.Fields
                .OrderBy(f => f.SortOrder)
                .Select(field => new FormField
                {
                    Id = Guid.NewGuid(),
                    FormTemplateId = template.Id,
                    Key = field.Key.Trim(),
                    Label = field.Label.Trim(),
                    Type = field.Type.Trim().ToLowerInvariant(),
                    Placeholder = field.Placeholder,
                    OptionsJson = field.OptionsJson,
                    IsRequired = field.IsRequired,
                    SortOrder = field.SortOrder
                })
                .ToList();
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Form sablonu guncellendi." });
    }

    [HttpGet("submissions")]
    public async Task<IActionResult> GetSubmissions([FromQuery] Guid? templateId, [FromQuery] Guid? studentId, [FromQuery] string? status)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var role = GetRole();

        var query = _db.FormSubmissions
            .Include(fs => fs.FormTemplate)
            .Include(fs => fs.Student)
            .Include(fs => fs.SubmittedBy)
            .Include(fs => fs.Values)
                .ThenInclude(v => v.FormField)
            .Where(fs => fs.SchoolId == schoolId);

        if (templateId.HasValue)
            query = query.Where(fs => fs.FormTemplateId == templateId.Value);
        if (studentId.HasValue)
            query = query.Where(fs => fs.StudentId == studentId.Value);
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(fs => fs.Status == status);

        if (role == "Parent")
        {
            query = query.Where(fs => fs.SubmittedById == userId);
        }
        else if (role == "Teacher")
        {
            query = query.Where(fs =>
                fs.SubmittedById == userId ||
                (fs.StudentId != null && fs.Student != null && fs.Student.Class.TeacherId == userId));
        }

        var submissions = await query
            .OrderByDescending(fs => fs.SubmittedAt)
            .Select(fs => new
            {
                fs.Id,
                fs.FormTemplateId,
                TemplateTitle = fs.FormTemplate.Title,
                fs.StudentId,
                StudentName = fs.Student != null ? fs.Student.FullName : null,
                fs.SubmittedById,
                SubmittedByName = fs.SubmittedBy.FullName,
                fs.Status,
                fs.Note,
                fs.SubmittedAt,
                fs.ReviewedAt,
                Values = fs.Values
                    .OrderBy(v => v.FormField.SortOrder)
                    .Select(v => new
                    {
                        v.FormFieldId,
                        FieldKey = v.FormField.Key,
                        FieldLabel = v.FormField.Label,
                        FieldType = v.FormField.Type,
                        v.Value
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(submissions);
    }

    [HttpGet("submissions/{id:guid}")]
    public async Task<IActionResult> GetSubmission(Guid id)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var role = GetRole();

        var submission = await _db.FormSubmissions
            .Include(fs => fs.FormTemplate)
            .Include(fs => fs.Student)
            .Include(fs => fs.SubmittedBy)
            .Include(fs => fs.Values)
                .ThenInclude(v => v.FormField)
            .FirstOrDefaultAsync(fs => fs.Id == id && fs.SchoolId == schoolId);

        if (submission is null)
            return NotFound();

        if (role == "Parent" && submission.SubmittedById != userId)
            return Forbid();

        if (role == "Teacher")
        {
            var allowed = submission.SubmittedById == userId ||
                          (submission.StudentId != null &&
                           await _db.Students
                               .Include(s => s.Class)
                               .AnyAsync(s => s.Id == submission.StudentId && s.Class.TeacherId == userId));

            if (!allowed)
                return Forbid();
        }

        return Ok(new
        {
            submission.Id,
            submission.FormTemplateId,
            TemplateTitle = submission.FormTemplate.Title,
            submission.StudentId,
            StudentName = submission.Student?.FullName,
            submission.SubmittedById,
            SubmittedByName = submission.SubmittedBy.FullName,
            submission.Status,
            submission.Note,
            submission.SubmittedAt,
            submission.ReviewedAt,
            Values = submission.Values
                .OrderBy(v => v.FormField.SortOrder)
                .Select(v => new
                {
                    v.FormFieldId,
                    FieldKey = v.FormField.Key,
                    FieldLabel = v.FormField.Label,
                    FieldType = v.FormField.Type,
                    v.Value
                })
                .ToList()
        });
    }

    [HttpPost("submissions")]
    public async Task<IActionResult> CreateSubmission([FromBody] CreateFormSubmissionRequest request)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var role = GetRole();

        var template = await _db.FormTemplates
            .Include(ft => ft.Fields)
            .FirstOrDefaultAsync(ft => ft.Id == request.TemplateId && ft.SchoolId == schoolId);

        if (template is null)
            return NotFound(new { message = "Form sablonu bulunamadi." });

        if (!template.IsActive)
            return BadRequest(new { message = "Bu form su anda aktif degil." });

        Student? student = null;
        if (request.StudentId.HasValue)
        {
            student = await _db.Students
                .Include(s => s.Class)
                .FirstOrDefaultAsync(s => s.Id == request.StudentId.Value && s.Class.SchoolId == schoolId);

            if (student is null)
                return BadRequest(new { message = "Form ile iliskilendirilen ogrenci bulunamadi." });

            if (role == "Parent")
            {
                var isParent = await _db.StudentParents
                    .AnyAsync(sp => sp.ParentId == userId && sp.StudentId == request.StudentId.Value);

                if (!isParent)
                    return Forbid();
            }
            else if (role == "Teacher" && student.Class.TeacherId != userId)
            {
                return Forbid();
            }
        }

        if (request.Values is null || request.Values.Count == 0)
            return BadRequest(new { message = "En az bir form cevabi gonderilmelidir." });

        var valuesByField = request.Values
            .GroupBy(v => v.FormFieldId)
            .Select(g => g.Last())
            .ToDictionary(v => v.FormFieldId, v => v.Value);

        foreach (var requiredField in template.Fields.Where(f => f.IsRequired))
        {
            if (!valuesByField.TryGetValue(requiredField.Id, out var value) || string.IsNullOrWhiteSpace(value))
                return BadRequest(new { message = $"Zorunlu alan eksik: {requiredField.Label}" });
        }

        var validFieldIds = template.Fields.Select(f => f.Id).ToHashSet();
        if (valuesByField.Keys.Any(fieldId => !validFieldIds.Contains(fieldId)))
            return BadRequest(new { message = "Gonderilen alanlardan en az biri bu forma ait degil." });

        var submission = new FormSubmission
        {
            Id = Guid.NewGuid(),
            FormTemplateId = template.Id,
            SchoolId = schoolId,
            SubmittedById = userId,
            StudentId = request.StudentId,
            Status = "submitted",
            Note = request.Note?.Trim(),
            SubmittedAt = DateTime.UtcNow,
            Values = valuesByField.Select(entry => new FormSubmissionValue
            {
                Id = Guid.NewGuid(),
                FormFieldId = entry.Key,
                Value = entry.Value.Trim()
            }).ToList()
        };

        _db.FormSubmissions.Add(submission);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSubmission), new { id = submission.Id }, new
        {
            submission.Id,
            submission.FormTemplateId,
            submission.StudentId,
            submission.Status,
            submission.SubmittedAt
        });
    }

    private Guid GetUserId() => HttpContext.Items["UserId"] is Guid g ? g : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s : Guid.Empty;
    private string GetRole() => HttpContext.Items["Role"] as string ?? string.Empty;
}

public record UpsertFormTemplateRequest(
    string Title,
    string? Description,
    string Category,
    bool IsActive,
    List<FormFieldRequest> Fields
);

public record FormFieldRequest(
    string Key,
    string Label,
    string Type,
    string? Placeholder,
    string? OptionsJson,
    bool IsRequired,
    int SortOrder
);

public record CreateFormSubmissionRequest(
    Guid TemplateId,
    Guid? StudentId,
    string? Note,
    List<FormSubmissionValueRequest> Values
);

public record FormSubmissionValueRequest(Guid FormFieldId, string Value);
