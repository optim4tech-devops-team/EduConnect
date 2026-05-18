using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/routine-rules")]
[Authorize]
public class RoutineRulesController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoutineRulesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "SchoolAdmin,Teacher,Parent")]
    public async Task<IActionResult> List([FromQuery] Guid? classId, [FromQuery] bool includeInactive = false)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var isTeacher = User.IsInRole("Teacher");
        var isParent = User.IsInRole("Parent");

        if (schoolId == Guid.Empty || userId == Guid.Empty)
            return Unauthorized();

        var query = _db.ClassRoutineRules
            .AsNoTracking()
            .Include(rule => rule.Class)
            .Where(rule => rule.SchoolId == schoolId);

        if (!includeInactive)
            query = query.Where(rule => rule.IsActive);

        if (classId.HasValue)
            query = query.Where(rule => rule.ClassId == classId.Value);

        if (isTeacher)
        {
            var classIds = await _db.Classes
                .Where(cls => cls.SchoolId == schoolId && cls.TeacherId == userId)
                .Select(cls => cls.Id)
                .ToListAsync();
            query = query.Where(rule => classIds.Contains(rule.ClassId));
        }
        else if (isParent)
        {
            var classIds = await _db.StudentParents
                .Where(sp => sp.ParentId == userId && sp.Student.Class.SchoolId == schoolId)
                .Select(sp => sp.Student.ClassId)
                .Distinct()
                .ToListAsync();
            query = query.Where(rule => classIds.Contains(rule.ClassId));
        }

        var result = await query
            .OrderBy(rule => rule.Weekday)
            .ThenBy(rule => rule.SendAtHour)
            .ThenBy(rule => rule.SendAtMinute)
            .Select(rule => new RoutineRuleDto(
                rule.Id,
                rule.ClassId,
                rule.Class.Name,
                rule.Title,
                rule.ItemName,
                rule.MessageTemplate,
                rule.Weekday,
                rule.SendAtHour,
                rule.SendAtMinute,
                rule.IsActive,
                rule.CreatedAt
            ))
            .ToListAsync();

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> Create([FromBody] UpsertRoutineRuleRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
            return BadRequest(new { message = validationError });

        var schoolId = GetSchoolId();
        var userId = GetUserId();
        if (schoolId == Guid.Empty || userId == Guid.Empty)
            return Unauthorized();

        var classExists = await _db.Classes.AnyAsync(cls => cls.Id == request.ClassId && cls.SchoolId == schoolId);
        if (!classExists)
            return BadRequest(new { message = "Secilen sinif bu okula ait degil." });

        var entity = new ClassRoutineRule
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            ClassId = request.ClassId,
            CreatedById = userId,
            Title = request.Title.Trim(),
            ItemName = Normalize(request.ItemName),
            MessageTemplate = Normalize(request.MessageTemplate),
            Weekday = request.Weekday,
            SendAtHour = request.SendAtHour,
            SendAtMinute = request.SendAtMinute,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.ClassRoutineRules.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new { entity.Id });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin,Teacher,Parent")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var schoolId = GetSchoolId();
        if (schoolId == Guid.Empty)
            return Unauthorized();

        var rule = await _db.ClassRoutineRules
            .AsNoTracking()
            .Include(item => item.Class)
            .Where(item => item.SchoolId == schoolId && item.Id == id)
            .Select(item => new RoutineRuleDto(
                item.Id,
                item.ClassId,
                item.Class.Name,
                item.Title,
                item.ItemName,
                item.MessageTemplate,
                item.Weekday,
                item.SendAtHour,
                item.SendAtMinute,
                item.IsActive,
                item.CreatedAt
            ))
            .FirstOrDefaultAsync();

        if (rule is null)
            return NotFound();

        return Ok(rule);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertRoutineRuleRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
            return BadRequest(new { message = validationError });

        var schoolId = GetSchoolId();
        if (schoolId == Guid.Empty)
            return Unauthorized();

        var entity = await _db.ClassRoutineRules.FirstOrDefaultAsync(item => item.SchoolId == schoolId && item.Id == id);
        if (entity is null)
            return NotFound();

        var classExists = await _db.Classes.AnyAsync(cls => cls.Id == request.ClassId && cls.SchoolId == schoolId);
        if (!classExists)
            return BadRequest(new { message = "Secilen sinif bu okula ait degil." });

        entity.ClassId = request.ClassId;
        entity.Title = request.Title.Trim();
        entity.ItemName = Normalize(request.ItemName);
        entity.MessageTemplate = Normalize(request.MessageTemplate);
        entity.Weekday = request.Weekday;
        entity.SendAtHour = request.SendAtHour;
        entity.SendAtMinute = request.SendAtMinute;
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync();
        return Ok(new { entity.Id });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var schoolId = GetSchoolId();
        if (schoolId == Guid.Empty)
            return Unauthorized();

        var entity = await _db.ClassRoutineRules.FirstOrDefaultAsync(item => item.SchoolId == schoolId && item.Id == id);
        if (entity is null)
            return NotFound();

        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static string? ValidateRequest(UpsertRoutineRuleRequest request)
    {
        if (request.ClassId == Guid.Empty)
            return "Sinif secimi zorunludur.";

        if (string.IsNullOrWhiteSpace(request.Title))
            return "Rutin basligi zorunludur.";

        if (request.Title.Trim().Length > 140)
            return "Rutin basligi en fazla 140 karakter olabilir.";

        if (!string.IsNullOrWhiteSpace(request.ItemName) && request.ItemName.Trim().Length > 140)
            return "Beklenen oge metni en fazla 140 karakter olabilir.";

        if (!string.IsNullOrWhiteSpace(request.MessageTemplate) && request.MessageTemplate.Trim().Length > 400)
            return "Bildirim metni en fazla 400 karakter olabilir.";

        if (request.Weekday < 0 || request.Weekday > 6)
            return "Hafta gunu 0-6 araliginda olmalidir.";

        if (request.SendAtHour < 0 || request.SendAtHour > 23)
            return "Saat bilgisi 0-23 araliginda olmalidir.";

        if (request.SendAtMinute < 0 || request.SendAtMinute > 59)
            return "Dakika bilgisi 0-59 araliginda olmalidir.";

        return null;
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private Guid GetUserId() => HttpContext.Items["UserId"] is Guid userId ? userId : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid schoolId ? schoolId : Guid.Empty;
}

public record RoutineRuleDto(
    Guid Id,
    Guid ClassId,
    string ClassName,
    string Title,
    string? ItemName,
    string? MessageTemplate,
    int Weekday,
    int SendAtHour,
    int SendAtMinute,
    bool IsActive,
    DateTime CreatedAt
);

public record UpsertRoutineRuleRequest(
    Guid ClassId,
    string Title,
    string? ItemName,
    string? MessageTemplate,
    int Weekday,
    int SendAtHour,
    int SendAtMinute,
    bool IsActive = true
);
