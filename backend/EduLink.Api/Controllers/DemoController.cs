using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/demo-requests")]
public class DemoController : ControllerBase
{
    private readonly AppDbContext _db;

    public DemoController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Submit([FromBody] SubmitDemoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.SchoolName) ||
            string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest(new { message = "Ad, soyad, okul adı ve telefon zorunludur." });
        }

        var demo = new DemoRequest
        {
            Id         = Guid.NewGuid(),
            FirstName  = request.FirstName.Trim(),
            LastName   = request.LastName.Trim(),
            SchoolName = request.SchoolName.Trim(),
            Phone      = request.Phone.Trim(),
            StudentCount = request.StudentCount?.Trim(),
            City       = request.City?.Trim(),
            Status     = "new",
            CreatedAt  = DateTime.UtcNow,
        };

        _db.DemoRequests.Add(demo);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Demo talebiniz alındı." });
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.DemoRequests.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(d => d.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new
            {
                d.Id,
                d.FirstName,
                d.LastName,
                d.SchoolName,
                d.Phone,
                d.StudentCount,
                d.City,
                d.Status,
                d.Notes,
                d.CreatedAt,
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateDemoStatusRequest request)
    {
        var demo = await _db.DemoRequests.FindAsync(id);
        if (demo is null) return NotFound();

        demo.Status = request.Status.Trim().ToLowerInvariant();
        if (request.Notes is not null) demo.Notes = request.Notes.Trim();
        await _db.SaveChangesAsync();

        return Ok(new { demo.Id, demo.Status });
    }
}

public record SubmitDemoRequest(
    string FirstName,
    string LastName,
    string SchoolName,
    string Phone,
    string? StudentCount,
    string? City
);

public record UpdateDemoStatusRequest(
    string Status,
    string? Notes
);
