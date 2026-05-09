using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/meal-plans")]
[Authorize]
public class MealPlansController : ControllerBase
{
    private readonly AppDbContext _db;

    public MealPlansController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "SchoolAdmin,Teacher,Parent")]
    public async Task<IActionResult> GetMonthlyPlan([FromQuery] int year, [FromQuery] int month, [FromQuery] Guid? classId)
    {
        if (year < 2000 || year > 2100 || month < 1 || month > 12)
            return BadRequest(new { message = "Gecerli bir ay secmelisin." });

        var schoolId = GetSchoolId();
        var firstDay = new DateOnly(year, month, 1);
        var nextMonth = firstDay.AddMonths(1);

        var query = _db.MealPlanEntries
            .Where(entry => entry.SchoolId == schoolId && entry.Date >= firstDay && entry.Date < nextMonth);

        query = classId.HasValue
            ? query.Where(entry => entry.ClassId == classId.Value)
            : query.Where(entry => entry.ClassId == null);

        var entries = await query
            .OrderBy(entry => entry.Date)
            .Select(entry => new MealPlanEntryDto(
                entry.Id,
                entry.Date,
                entry.ClassId,
                entry.Breakfast,
                entry.Lunch,
                entry.Snack,
                entry.Allergens,
                entry.Notes))
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPost("monthly")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> SaveMonthlyPlan([FromBody] SaveMonthlyMealPlanRequest request)
    {
        if (request.Year < 2000 || request.Year > 2100 || request.Month < 1 || request.Month > 12)
            return BadRequest(new { message = "Gecerli bir ay secmelisin." });

        var schoolId = GetSchoolId();
        var userId = GetUserId();
        var firstDay = new DateOnly(request.Year, request.Month, 1);
        var nextMonth = firstDay.AddMonths(1);

        if (request.ClassId.HasValue)
        {
            var classExists = await _db.Classes.AnyAsync(c => c.Id == request.ClassId.Value && c.SchoolId == schoolId);
            if (!classExists)
                return BadRequest(new { message = "Secilen sinif bu okula ait degil." });
        }

        var existingEntries = await _db.MealPlanEntries
            .Where(entry => entry.SchoolId == schoolId && entry.Date >= firstDay && entry.Date < nextMonth)
            .Where(entry => request.ClassId.HasValue ? entry.ClassId == request.ClassId.Value : entry.ClassId == null)
            .ToListAsync();

        var entriesByDate = existingEntries.ToDictionary(entry => entry.Date, entry => entry);
        var touchedDates = new HashSet<DateOnly>();

        foreach (var day in request.Days)
        {
            if (day.Day < 1 || day.Day > DateTime.DaysInMonth(request.Year, request.Month))
                return BadRequest(new { message = $"Ay icin gecersiz gun degeri: {day.Day}" });

            var date = new DateOnly(request.Year, request.Month, day.Day);
            touchedDates.Add(date);

            var breakfast = Normalize(day.Breakfast);
            var lunch = Normalize(day.Lunch);
            var snack = Normalize(day.Snack);
            var allergens = Normalize(day.Allergens);
            var notes = Normalize(day.Notes);
            var hasAnyData = breakfast is not null || lunch is not null || snack is not null || allergens is not null || notes is not null;

            if (entriesByDate.TryGetValue(date, out var existing))
            {
                if (!hasAnyData)
                {
                    _db.MealPlanEntries.Remove(existing);
                    continue;
                }

                existing.Breakfast = breakfast;
                existing.Lunch = lunch;
                existing.Snack = snack;
                existing.Allergens = allergens;
                existing.Notes = notes;
                continue;
            }

            if (!hasAnyData)
                continue;

            _db.MealPlanEntries.Add(new MealPlanEntry
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                ClassId = request.ClassId,
                CreatedById = userId,
                Date = date,
                Breakfast = breakfast,
                Lunch = lunch,
                Snack = snack,
                Allergens = allergens,
                Notes = notes,
                CreatedAt = DateTime.UtcNow
            });
        }

        foreach (var entry in existingEntries.Where(entry => !touchedDates.Contains(entry.Date)))
        {
            _db.MealPlanEntries.Remove(entry);
        }

        await _db.SaveChangesAsync();

        return Ok(new { message = "Aylik yemek takvimi guncellendi." });
    }

    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid schoolId ? schoolId : Guid.Empty;
    private Guid GetUserId() => HttpContext.Items["UserId"] is Guid userId ? userId : Guid.Empty;
    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record MealPlanEntryDto(
    Guid Id,
    DateOnly Date,
    Guid? ClassId,
    string? Breakfast,
    string? Lunch,
    string? Snack,
    string? Allergens,
    string? Notes
);

public record MealPlanDayRequest(
    int Day,
    string? Breakfast,
    string? Lunch,
    string? Snack,
    string? Allergens,
    string? Notes
);

public record SaveMonthlyMealPlanRequest(
    int Year,
    int Month,
    Guid? ClassId,
    List<MealPlanDayRequest> Days
);
