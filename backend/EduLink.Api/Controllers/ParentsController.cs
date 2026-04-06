using EduLink.Domain.Entities;
using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/parents")]
[Authorize(Roles = "SchoolAdmin,Teacher")]
public class ParentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ParentsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetParents([FromQuery] string? search)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var role = GetRole();

        var query = _db.Users
            .Include(u => u.StudentParents)
                .ThenInclude(sp => sp.Student)
                    .ThenInclude(s => s.Class)
            .Where(u => u.SchoolId == schoolId && u.Role == UserRole.Parent);

        if (role == "Teacher")
        {
            query = query.Where(u => u.StudentParents.Any(sp => sp.Student.Class.TeacherId == userId));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.Phone != null && u.Phone.Contains(term)));
        }

        var parents = await query
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.AvatarUrl,
                u.IsActive,
                u.CreatedAt,
                Students = u.StudentParents
                    .OrderBy(sp => sp.Student.FullName)
                    .Select(sp => new
                    {
                        sp.StudentId,
                        StudentName = sp.Student.FullName,
                        sp.Student.ClassId,
                        ClassName = sp.Student.Class.Name,
                        sp.Relationship,
                        sp.IsPrimaryContact,
                        sp.CanPickup
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(parents);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetParent(Guid id)
    {
        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var role = GetRole();

        var parent = await _db.Users
            .Include(u => u.StudentParents)
                .ThenInclude(sp => sp.Student)
                    .ThenInclude(s => s.Class)
            .Where(u => u.Id == id && u.SchoolId == schoolId && u.Role == UserRole.Parent)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.AvatarUrl,
                u.IsActive,
                u.CreatedAt,
                Students = u.StudentParents
                    .OrderBy(sp => sp.Student.FullName)
                    .Select(sp => new
                    {
                        sp.StudentId,
                        StudentName = sp.Student.FullName,
                        sp.Student.ClassId,
                        ClassName = sp.Student.Class.Name,
                        sp.Relationship,
                        sp.IsPrimaryContact,
                        sp.CanPickup
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (parent is null)
            return NotFound();

        if (role == "Teacher")
        {
            var hasTeacherStudent = await _db.StudentParents
                .Include(sp => sp.Student)
                    .ThenInclude(s => s.Class)
                .AnyAsync(sp => sp.ParentId == id && sp.Student.Class.TeacherId == userId);

            if (!hasTeacherStudent)
                return Forbid();
        }

        return Ok(parent);
    }

    [HttpPost]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> CreateParent([FromBody] UpsertParentRequest request)
    {
        var schoolId = GetSchoolId();
        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return BadRequest(new { message = "Gecerli bir telefon numarasi zorunludur." });

        var email = ResolveEmail(request.Email, normalizedPhone, "parent");
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "Bu e-posta adresi zaten kullaniliyor." });

        if (await _db.Users.AnyAsync(u => u.Phone == normalizedPhone))
            return Conflict(new { message = "Bu telefon numarasi zaten kullaniliyor." });

        var parent = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = normalizedPhone,
            AvatarUrl = request.AvatarUrl,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
            Role = UserRole.Parent,
            SchoolId = schoolId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(parent);
        await _db.SaveChangesAsync();

        if (request.Students is { Count: > 0 })
        {
            var syncResult = await SyncStudentAssignmentsAsync(parent.Id, schoolId, request.Students);
            if (syncResult is not null)
                return syncResult;
        }

        return CreatedAtAction(nameof(GetParent), new { id = parent.Id }, new
        {
            parent.Id,
            parent.FullName,
            parent.Email,
            parent.Phone,
            parent.AvatarUrl,
            parent.IsActive,
            parent.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> UpdateParent(Guid id, [FromBody] UpsertParentRequest request)
    {
        var schoolId = GetSchoolId();
        var parent = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == id && u.SchoolId == schoolId && u.Role == UserRole.Parent);

        if (parent is null)
            return NotFound();

        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return BadRequest(new { message = "Gecerli bir telefon numarasi zorunludur." });

        var email = ResolveEmail(request.Email, normalizedPhone, "parent");

        if (await _db.Users.AnyAsync(u => u.Id != id && u.Email == email))
            return Conflict(new { message = "Bu e-posta adresi zaten kullaniliyor." });

        if (await _db.Users.AnyAsync(u => u.Id != id && u.Phone == normalizedPhone))
            return Conflict(new { message = "Bu telefon numarasi zaten kullaniliyor." });

        parent.FullName = request.FullName.Trim();
        parent.Email = email;
        parent.Phone = normalizedPhone;
        parent.AvatarUrl = request.AvatarUrl;
        parent.IsActive = request.IsActive;

        if (request.Students is not null)
        {
            var syncResult = await SyncStudentAssignmentsAsync(parent.Id, schoolId, request.Students);
            if (syncResult is not null)
                return syncResult;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Veli guncellendi." });
    }

    private async Task<IActionResult?> SyncStudentAssignmentsAsync(Guid parentId, Guid schoolId, List<ParentStudentAssignmentRequest> assignments)
    {
        var studentIds = assignments.Select(a => a.StudentId).Distinct().ToList();
        var validStudentIds = await _db.Students
            .Include(s => s.Class)
            .Where(s => studentIds.Contains(s.Id) && s.Class.SchoolId == schoolId)
            .Select(s => s.Id)
            .ToListAsync();

        if (validStudentIds.Count != studentIds.Count)
            return BadRequest(new { message = "Ogrenci eslestirmelerinden en az biri okulunuza ait degil." });

        var existing = await _db.StudentParents
            .Where(sp => sp.ParentId == parentId)
            .ToListAsync();

        var assignmentsByStudent = assignments
            .GroupBy(a => a.StudentId)
            .Select(g => g.Last())
            .ToDictionary(a => a.StudentId);

        foreach (var link in existing.Where(e => !assignmentsByStudent.ContainsKey(e.StudentId)))
        {
            _db.StudentParents.Remove(link);
        }

        foreach (var assignment in assignmentsByStudent.Values)
        {
            var existingLink = existing.FirstOrDefault(e => e.StudentId == assignment.StudentId);
            if (existingLink is null)
            {
                _db.StudentParents.Add(new StudentParent
                {
                    StudentId = assignment.StudentId,
                    ParentId = parentId,
                    Relationship = assignment.Relationship,
                    IsPrimaryContact = assignment.IsPrimaryContact,
                    CanPickup = assignment.CanPickup,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existingLink.Relationship = assignment.Relationship;
                existingLink.IsPrimaryContact = assignment.IsPrimaryContact;
                existingLink.CanPickup = assignment.CanPickup;
            }
        }

        await _db.SaveChangesAsync();
        return null;
    }

    private Guid GetUserId() => HttpContext.Items["UserId"] is Guid g ? g : Guid.Empty;
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s : Guid.Empty;
    private string GetRole() => HttpContext.Items["Role"] as string ?? string.Empty;

    private static string NormalizePhoneNumber(string? phoneNumber)
    {
        var digits = new string((phoneNumber ?? string.Empty).Where(char.IsDigit).ToArray());
        if (string.IsNullOrWhiteSpace(digits))
            return string.Empty;

        if (digits.StartsWith("0090"))
            digits = digits[4..];
        else if (digits.StartsWith("90") && digits.Length == 12)
            digits = digits[2..];

        if (digits.Length == 10)
            digits = $"0{digits}";

        return digits;
    }

    private static string ResolveEmail(string? email, string normalizedPhone, string prefix)
    {
        if (!string.IsNullOrWhiteSpace(email))
            return email.Trim().ToLowerInvariant();

        return $"{prefix}.{normalizedPhone}@notio.local";
    }
}

public record UpsertParentRequest(
    string FullName,
    string? Email,
    string Phone,
    string? AvatarUrl,
    bool IsActive = true,
    List<ParentStudentAssignmentRequest>? Students = null
);

public record ParentStudentAssignmentRequest(
    Guid StudentId,
    string? Relationship,
    bool IsPrimaryContact = false,
    bool CanPickup = true
);
