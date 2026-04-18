using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SchoolAdmin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/admin/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var schoolId = GetSchoolId();

        var classCount = await _db.Classes
            .CountAsync(c => c.SchoolId == schoolId);

        var teacherCount = await _db.Users
            .CountAsync(u => u.SchoolId == schoolId && u.Role == UserRole.Teacher && u.IsActive);

        var studentCount = await _db.Students
            .CountAsync(s => s.Class.SchoolId == schoolId && s.IsActive);

        var parentCount = await _db.Users
            .CountAsync(u => u.SchoolId == schoolId && u.Role == UserRole.Parent && u.IsActive);

        return Ok(new
        {
            ClassCount    = classCount,
            TeacherCount  = teacherCount,
            StudentCount  = studentCount,
            ParentCount   = parentCount
        });
    }

    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid s ? s : Guid.Empty;
}
