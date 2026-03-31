using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/schools")]
[Authorize]
public class SchoolsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SchoolsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/schools/my
    [HttpGet("my")]
    public async Task<IActionResult> GetMySchool()
    {
        var schoolId = GetSchoolId();

        var school = await _db.Schools
            .FirstOrDefaultAsync(s => s.Id == schoolId);

        if (school is null)
            return NotFound();

        return Ok(new
        {
            school.Id,
            school.Name,
            school.Address,
            school.Phone,
            school.LogoUrl,
            school.CreatedAt
        });
    }

    // PUT /api/schools/my
    [HttpPut("my")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateMySchool([FromBody] UpdateSchoolRequest request)
    {
        var schoolId = GetSchoolId();

        var school = await _db.Schools
            .FirstOrDefaultAsync(s => s.Id == schoolId);

        if (school is null)
            return NotFound();

        if (request.Name is not null)
            school.Name = request.Name;

        if (request.Address is not null)
            school.Address = request.Address;

        if (request.Phone is not null)
            school.Phone = request.Phone;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            school.Id,
            school.Name,
            school.Address,
            school.Phone,
            school.LogoUrl,
            school.CreatedAt
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s : Guid.Empty;
}

public record UpdateSchoolRequest(string? Name, string? Address, string? Phone);
