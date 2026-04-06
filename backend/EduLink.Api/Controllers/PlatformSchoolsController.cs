using EduLink.Domain.Entities;
using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/platform/schools")]
[Authorize(Roles = "PlatformAdmin")]
public class PlatformSchoolsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PlatformSchoolsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetSchools([FromQuery] string? search, [FromQuery] bool? isActive)
    {
        var query = _db.Schools.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s =>
                s.Name.ToLower().Contains(term) ||
                (s.Phone != null && s.Phone.Contains(term)) ||
                (s.Address != null && s.Address.ToLower().Contains(term)));
        }

        if (isActive.HasValue)
            query = query.Where(s => s.IsActive == isActive.Value);

        var schools = await query
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Address,
                s.Phone,
                s.LogoUrl,
                s.IsActive,
                s.Plan,
                s.MaxStudents,
                s.MaxTeachers,
                s.SubscriptionEndsAt,
                s.PrimaryAdminUserId,
                PrimaryAdminName = s.PrimaryAdmin != null ? s.PrimaryAdmin.FullName : null,
                PrimaryAdminPhone = s.PrimaryAdmin != null ? s.PrimaryAdmin.Phone : null,
                TeacherCount = s.Users.Count(u => u.Role == UserRole.Teacher && u.IsActive),
                ParentCount = s.Users.Count(u => u.Role == UserRole.Parent && u.IsActive),
                StudentCount = s.Classes.SelectMany(c => c.Students).Count(st => st.IsActive),
                ClassCount = s.Classes.Count,
                s.CreatedAt
            })
            .ToListAsync();

        return Ok(schools);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSchool(Guid id)
    {
        var school = await _db.Schools
            .Where(s => s.Id == id)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.Address,
                s.Phone,
                s.LogoUrl,
                s.IsActive,
                s.Plan,
                s.MaxStudents,
                s.MaxTeachers,
                s.SubscriptionEndsAt,
                s.PrimaryAdminUserId,
                PrimaryAdmin = s.PrimaryAdmin == null ? null : new
                {
                    s.PrimaryAdmin.Id,
                    s.PrimaryAdmin.FullName,
                    s.PrimaryAdmin.Email,
                    s.PrimaryAdmin.Phone,
                    s.PrimaryAdmin.IsActive
                },
                TeacherCount = s.Users.Count(u => u.Role == UserRole.Teacher && u.IsActive),
                ParentCount = s.Users.Count(u => u.Role == UserRole.Parent && u.IsActive),
                SchoolAdminCount = s.Users.Count(u => u.Role == UserRole.SchoolAdmin && u.IsActive),
                StudentCount = s.Classes.SelectMany(c => c.Students).Count(st => st.IsActive),
                ClassCount = s.Classes.Count,
                s.CreatedAt
            })
            .FirstOrDefaultAsync();

        return school is null ? NotFound() : Ok(school);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSchool([FromBody] CreatePlatformSchoolRequest request)
    {
        var school = new School
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Address = request.Address?.Trim(),
            Phone = NormalizePhoneNumber(request.Phone),
            LogoUrl = request.LogoUrl,
            IsActive = request.IsActive,
            Plan = string.IsNullOrWhiteSpace(request.Plan) ? "starter" : request.Plan.Trim().ToLowerInvariant(),
            MaxStudents = request.MaxStudents,
            MaxTeachers = request.MaxTeachers,
            SubscriptionEndsAt = request.SubscriptionEndsAt,
            CreatedAt = DateTime.UtcNow
        };

        _db.Schools.Add(school);
        await _db.SaveChangesAsync();

        if (request.PrimaryAdmin is not null)
        {
            var assignResult = await UpsertPrimarySchoolAdminAsync(school, request.PrimaryAdmin);
            if (assignResult is not null)
                return assignResult;
        }

        return CreatedAtAction(nameof(GetSchool), new { id = school.Id }, new
        {
            school.Id,
            school.Name,
            school.Plan,
            school.IsActive
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSchool(Guid id, [FromBody] UpdatePlatformSchoolRequest request)
    {
        var school = await _db.Schools.FirstOrDefaultAsync(s => s.Id == id);
        if (school is null)
            return NotFound();

        if (request.Name is not null)
            school.Name = request.Name.Trim();
        if (request.Address is not null)
            school.Address = request.Address.Trim();
        if (request.Phone is not null)
            school.Phone = NormalizePhoneNumber(request.Phone);
        if (request.LogoUrl is not null)
            school.LogoUrl = request.LogoUrl;
        if (request.IsActive.HasValue)
            school.IsActive = request.IsActive.Value;
        if (request.Plan is not null)
            school.Plan = request.Plan.Trim().ToLowerInvariant();
        if (request.MaxStudents.HasValue)
            school.MaxStudents = request.MaxStudents.Value;
        if (request.MaxTeachers.HasValue)
            school.MaxTeachers = request.MaxTeachers.Value;
        if (request.SubscriptionEndsAt.HasValue)
            school.SubscriptionEndsAt = request.SubscriptionEndsAt;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Okul guncellendi." });
    }

    [HttpPost("{id:guid}/assign-admin")]
    public async Task<IActionResult> AssignAdmin(Guid id, [FromBody] AssignPlatformSchoolAdminRequest request)
    {
        var school = await _db.Schools.FirstOrDefaultAsync(s => s.Id == id);
        if (school is null)
            return NotFound();

        var result = await UpsertPrimarySchoolAdminAsync(
            school,
            new SchoolAdminSeedRequest(request.FullName, request.Phone, request.Email, request.AvatarUrl));

        return result ?? Ok(new
        {
            school.Id,
            school.PrimaryAdminUserId
        });
    }

    private async Task<IActionResult?> UpsertPrimarySchoolAdminAsync(School school, SchoolAdminSeedRequest request)
    {
        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return BadRequest(new { message = "Gecerli bir okul yoneticisi telefonu zorunludur." });

        var email = ResolveEmail(request.Email, normalizedPhone, "schooladmin");
        var existingUser = await _db.Users.FirstOrDefaultAsync(u =>
            (u.Email == email || u.Phone == normalizedPhone) &&
            u.SchoolId == school.Id);

        if (await _db.Users.AnyAsync(u => u.SchoolId != school.Id && (u.Email == email || u.Phone == normalizedPhone)))
            return Conflict(new { message = "Okul yoneticisi icin verilen e-posta veya telefon baska bir okulda kullaniliyor." });

        if (existingUser is null)
        {
            existingUser = new User
            {
                Id = Guid.NewGuid(),
                FullName = request.FullName.Trim(),
                Email = email,
                Phone = normalizedPhone,
                AvatarUrl = request.AvatarUrl,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                Role = UserRole.SchoolAdmin,
                SchoolId = school.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(existingUser);
        }
        else
        {
            existingUser.FullName = request.FullName.Trim();
            existingUser.Email = email;
            existingUser.Phone = normalizedPhone;
            existingUser.AvatarUrl = request.AvatarUrl;
            existingUser.Role = UserRole.SchoolAdmin;
            existingUser.IsActive = true;
        }

        school.PrimaryAdminUserId = existingUser.Id;
        await _db.SaveChangesAsync();
        return null;
    }

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

public record CreatePlatformSchoolRequest(
    string Name,
    string? Address,
    string? Phone,
    string? LogoUrl,
    bool IsActive = true,
    string Plan = "starter",
    int MaxStudents = 200,
    int MaxTeachers = 20,
    DateTime? SubscriptionEndsAt = null,
    SchoolAdminSeedRequest? PrimaryAdmin = null
);

public record UpdatePlatformSchoolRequest(
    string? Name,
    string? Address,
    string? Phone,
    string? LogoUrl,
    bool? IsActive,
    string? Plan,
    int? MaxStudents,
    int? MaxTeachers,
    DateTime? SubscriptionEndsAt
);

public record AssignPlatformSchoolAdminRequest(
    string FullName,
    string Phone,
    string? Email,
    string? AvatarUrl
);

public record SchoolAdminSeedRequest(
    string FullName,
    string Phone,
    string? Email,
    string? AvatarUrl
);
