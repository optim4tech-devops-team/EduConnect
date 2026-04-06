using EduLink.Domain.Entities;
using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/teachers")]
[Authorize(Roles = "SchoolAdmin")]
public class TeachersController : ControllerBase
{
    private readonly AppDbContext _db;

    public TeachersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetTeachers([FromQuery] string? search)
    {
        var schoolId = GetSchoolId();

        var query = _db.Users
            .Where(u => u.SchoolId == schoolId && u.Role == UserRole.Teacher);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.Phone != null && u.Phone.Contains(term)));
        }

        var teachers = await query
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
                ClassCount = _db.Classes.Count(c => c.TeacherId == u.Id && c.SchoolId == schoolId),
                StudentCount = _db.Classes
                    .Where(c => c.TeacherId == u.Id && c.SchoolId == schoolId)
                    .SelectMany(c => c.Students)
                    .Count(s => s.IsActive)
            })
            .ToListAsync();

        return Ok(teachers);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTeacher(Guid id)
    {
        var schoolId = GetSchoolId();

        var teacher = await _db.Users
            .Where(u => u.Id == id && u.SchoolId == schoolId && u.Role == UserRole.Teacher)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.AvatarUrl,
                u.IsActive,
                u.CreatedAt,
                Classes = _db.Classes
                    .Where(c => c.TeacherId == u.Id && c.SchoolId == schoolId)
                    .OrderBy(c => c.Name)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.AcademicYear,
                        StudentCount = c.Students.Count(s => s.IsActive)
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        return teacher is null ? NotFound() : Ok(teacher);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTeacher([FromBody] UpsertTeacherRequest request)
    {
        var schoolId = GetSchoolId();
        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return BadRequest(new { message = "Gecerli bir telefon numarasi zorunludur." });

        var email = ResolveEmail(request.Email, normalizedPhone, "teacher");
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict(new { message = "Bu e-posta adresi zaten kullaniliyor." });

        if (await _db.Users.AnyAsync(u => u.Phone == normalizedPhone))
            return Conflict(new { message = "Bu telefon numarasi zaten kullaniliyor." });

        var teacher = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = normalizedPhone,
            AvatarUrl = request.AvatarUrl,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
            Role = UserRole.Teacher,
            SchoolId = schoolId,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(teacher);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTeacher), new { id = teacher.Id }, new
        {
            teacher.Id,
            teacher.FullName,
            teacher.Email,
            teacher.Phone,
            teacher.AvatarUrl,
            teacher.IsActive,
            teacher.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTeacher(Guid id, [FromBody] UpsertTeacherRequest request)
    {
        var schoolId = GetSchoolId();
        var teacher = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == id && u.SchoolId == schoolId && u.Role == UserRole.Teacher);

        if (teacher is null)
            return NotFound();

        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return BadRequest(new { message = "Gecerli bir telefon numarasi zorunludur." });

        var email = ResolveEmail(request.Email, normalizedPhone, "teacher");

        if (await _db.Users.AnyAsync(u => u.Id != id && u.Email == email))
            return Conflict(new { message = "Bu e-posta adresi zaten kullaniliyor." });

        if (await _db.Users.AnyAsync(u => u.Id != id && u.Phone == normalizedPhone))
            return Conflict(new { message = "Bu telefon numarasi zaten kullaniliyor." });

        teacher.FullName = request.FullName.Trim();
        teacher.Email = email;
        teacher.Phone = normalizedPhone;
        teacher.AvatarUrl = request.AvatarUrl;
        teacher.IsActive = request.IsActive;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Ogretmen guncellendi." });
    }

    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s : Guid.Empty;

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

public record UpsertTeacherRequest(
    string FullName,
    string? Email,
    string Phone,
    string? AvatarUrl,
    bool IsActive = true
);
