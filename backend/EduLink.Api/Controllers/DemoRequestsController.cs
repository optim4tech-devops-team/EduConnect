using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/demo-requests")]
public class DemoRequestsController : ControllerBase
{
    private static readonly string[] AllowedStatuses = ["new", "contacted", "qualified", "closed"];
    private readonly AppDbContext _db;

    public DemoRequestsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("DemoRequestPolicy")]
    public async Task<IActionResult> Create([FromBody] CreateDemoRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            // Honeypot field: real users never see/fill this field.
            return Accepted(new { message = "Demo talebiniz alindi." });
        }

        var firstName = Clean(request.FirstName);
        var lastName = Clean(request.LastName);
        var schoolName = Clean(request.SchoolName);
        var phone = Clean(request.Phone);
        var normalizedPhone = NormalizePhone(phone);

        if (string.IsNullOrWhiteSpace(firstName) ||
            string.IsNullOrWhiteSpace(lastName) ||
            string.IsNullOrWhiteSpace(schoolName) ||
            string.IsNullOrWhiteSpace(phone))
        {
            return BadRequest(new { message = "Ad, soyad, okul adi ve telefon zorunludur." });
        }

        if (firstName.Length > 100 ||
            lastName.Length > 100 ||
            schoolName.Length > 200 ||
            phone.Length > 30 ||
            normalizedPhone.Length < 10)
        {
            return BadRequest(new { message = "Demo talebi bilgileri beklenen formatta degil." });
        }

        var duplicateWindowStart = DateTime.UtcNow.AddMinutes(-10);
        var recentPhones = await _db.DemoRequests
            .AsNoTracking()
            .Where(item => item.CreatedAt >= duplicateWindowStart)
            .Select(item => item.Phone)
            .ToListAsync();

        if (recentPhones.Any(existingPhone => NormalizePhone(existingPhone) == normalizedPhone))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Bu telefon numarasi icin demo talebi alindi. Lutfen biraz sonra tekrar deneyin."
            });
        }

        var entity = new DemoRequest
        {
            Id = Guid.NewGuid(),
            FirstName = firstName,
            LastName = lastName,
            SchoolName = schoolName,
            Phone = phone,
            StudentCount = CleanOptional(request.StudentCount),
            City = CleanOptional(request.City),
            Status = "new",
            Notes = BuildNotes(request),
            CreatedAt = DateTime.UtcNow
        };

        _db.DemoRequests.Add(entity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new
        {
            entity.Id,
            entity.Status,
            entity.CreatedAt
        });
    }

    [HttpGet]
    [Authorize(Roles = "Admin,PlatformAdmin")]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _db.DemoRequests.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = query.Where(item => item.Status.ToLower() == normalizedStatus);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(item => item.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new
            {
                item.Id,
                item.FirstName,
                item.LastName,
                item.SchoolName,
                item.Phone,
                item.StudentCount,
                item.City,
                item.Status,
                item.Notes,
                item.CreatedAt
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,PlatformAdmin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _db.DemoRequests
            .AsNoTracking()
            .Where(request => request.Id == id)
            .Select(request => new
            {
                request.Id,
                request.FirstName,
                request.LastName,
                request.SchoolName,
                request.Phone,
                request.StudentCount,
                request.City,
                request.Status,
                request.Notes,
                request.CreatedAt,
                request.UpdatedAt
            })
            .FirstOrDefaultAsync();

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin,PlatformAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateDemoRequestStatus request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            return BadRequest(new { message = "Durum zorunludur." });
        }

        var status = request.Status.Trim().ToLowerInvariant();
        if (!AllowedStatuses.Contains(status))
        {
            return BadRequest(new { message = "Gecersiz durum degeri." });
        }

        var item = await _db.DemoRequests.FirstOrDefaultAsync(entry => entry.Id == id);
        if (item is null)
        {
            return NotFound();
        }

        item.Status = status;
        item.Notes = request.Notes?.Trim();
        item.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { item.Id, item.Status });
    }

    private static string Clean(string? value)
    {
        return string.Join(' ', (value ?? string.Empty).Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string? CleanOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return string.Join(' ', value.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string NormalizePhone(string? value)
    {
        return new string((value ?? string.Empty).Where(char.IsDigit).ToArray());
    }

    private static string? BuildNotes(CreateDemoRequest request)
    {
        var parts = new List<string>();
        var email = CleanOptional(request.Email);
        var roleFocus = CleanOptional(request.RoleFocus);
        var notes = CleanOptional(request.Notes);

        if (!string.IsNullOrWhiteSpace(email))
        {
            parts.Add($"E-posta: {email}");
        }

        if (!string.IsNullOrWhiteSpace(roleFocus))
        {
            parts.Add($"Oncelikli ihtiyac: {roleFocus}");
        }

        if (!string.IsNullOrWhiteSpace(notes))
        {
            parts.Add($"Not: {notes}");
        }

        var combined = string.Join(Environment.NewLine, parts);
        return string.IsNullOrWhiteSpace(combined)
            ? null
            : combined.Length > 1000 ? combined[..1000] : combined;
    }
}

public record CreateDemoRequest(
    string FirstName,
    string LastName,
    string SchoolName,
    string Phone,
    string? StudentCount,
    string? City,
    string? Notes,
    string? Email,
    string? RoleFocus,
    string? Website
);

public record UpdateDemoRequestStatus(
    string Status,
    string? Notes
);
