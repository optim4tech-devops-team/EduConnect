using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<IActionResult> Create([FromBody] CreateDemoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.SchoolName) ||
            string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { message = "Ad, soyad, okul adi ve telefon zorunludur." });
        }

        var entity = new DemoRequest
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            SchoolName = request.SchoolName.Trim(),
            Phone = request.Phone.Trim(),
            StudentCount = request.StudentCount?.Trim(),
            City = request.City?.Trim(),
            Status = "new",
            Notes = request.Notes?.Trim(),
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
}

public record CreateDemoRequest(
    string FirstName,
    string LastName,
    string SchoolName,
    string Phone,
    string? StudentCount,
    string? City,
    string? Notes
);

public record UpdateDemoRequestStatus(
    string Status,
    string? Notes
);
