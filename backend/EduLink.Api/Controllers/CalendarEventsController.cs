using System.Text.Json;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/calendar-events")]
[Authorize]
public class CalendarEventsController : ControllerBase
{
    private const string MetadataPrefix = "\n\n[NOTIO_META]\n";
    private static readonly HashSet<string> AllowedEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "activity",
        "trip",
        "meeting",
        "reminder",
        "other"
    };

    private readonly AppDbContext _db;

    public CalendarEventsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [Authorize(Roles = "SchoolAdmin,Teacher,Parent")]
    public async Task<IActionResult> List(
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] Guid? classId,
        [FromQuery] bool includeInactive = false)
    {
        if (year.HasValue && (year < 2000 || year > 2100))
            return BadRequest(new { message = "Gecerli bir yil secmelisin." });

        if (month.HasValue && (month < 1 || month > 12))
            return BadRequest(new { message = "Gecerli bir ay secmelisin." });

        if (year.HasValue ^ month.HasValue)
            return BadRequest(new { message = "Ay filtrelemesi icin yil ve ay birlikte gonderilmelidir." });

        var schoolId = GetSchoolId();
        if (schoolId == Guid.Empty)
            return Unauthorized();

        var query = _db.SchoolCalendarEvents
            .AsNoTracking()
            .Where(item => item.SchoolId == schoolId);

        if (!includeInactive)
        {
            query = query.Where(item => item.IsActive);
        }

        if (classId.HasValue)
        {
            query = query.Where(item => item.ClassId == classId.Value);
        }

        if (year.HasValue && month.HasValue)
        {
            var firstDay = new DateTime(year.Value, month.Value, 1, 0, 0, 0, DateTimeKind.Utc);
            var nextMonth = firstDay.AddMonths(1);
            query = query.Where(item => item.StartAt >= firstDay && item.StartAt < nextMonth);
        }

        var items = await query
            .OrderBy(item => item.StartAt)
            .Select(item => new
            {
                item.Id,
                item.ClassId,
                ClassName = item.Class != null ? item.Class.Name : null,
                item.Title,
                item.Description,
                item.Type,
                item.Category,
                item.StartAt,
                item.EndAt,
                item.IsAllDay,
                item.IsActive,
                item.CreatedAt
            })
            .ToListAsync();

        var response = items.Select(item =>
        {
            var parsed = ParseDescription(item.Description);
            return new CalendarEventDto(
                item.Id,
                item.ClassId,
                item.ClassName,
                item.Title,
                parsed.Description,
                item.Type,
                item.Category,
                item.StartAt,
                item.EndAt,
                item.IsAllDay,
                item.IsActive,
                item.CreatedAt,
                parsed.RequiredMaterials,
                parsed.DressCodeNotes,
                parsed.ParentNotificationText
            );
        });

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> Create([FromBody] UpsertCalendarEventRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
            return BadRequest(new { message = validationError });

        var schoolId = GetSchoolId();
        var userId = GetUserId();
        if (schoolId == Guid.Empty || userId == Guid.Empty)
            return Unauthorized();

        if (request.ClassId.HasValue)
        {
            var classExists = await _db.Classes.AnyAsync(c => c.Id == request.ClassId.Value && c.SchoolId == schoolId);
            if (!classExists)
                return BadRequest(new { message = "Secilen sinif bu okula ait degil." });
        }

        var entity = new SchoolCalendarEvent
        {
            Id = Guid.NewGuid(),
            SchoolId = schoolId,
            ClassId = request.ClassId,
            CreatedById = userId,
            Title = request.Title.Trim(),
            Type = request.EventType.Trim().ToLowerInvariant(),
            Category = Normalize(request.Category),
            Description = ComposeDescription(
                Normalize(request.Description),
                Normalize(request.RequiredMaterials),
                Normalize(request.DressCodeNotes),
                Normalize(request.ParentNotificationText)),
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            IsAllDay = request.IsAllDay,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.SchoolCalendarEvents.Add(entity);
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

        var item = await _db.SchoolCalendarEvents
            .AsNoTracking()
            .Where(entry => entry.Id == id && entry.SchoolId == schoolId)
            .Select(entry => new
            {
                entry.Id,
                entry.ClassId,
                ClassName = entry.Class != null ? entry.Class.Name : null,
                entry.Title,
                entry.Description,
                entry.Type,
                entry.Category,
                entry.StartAt,
                entry.EndAt,
                entry.IsAllDay,
                entry.IsActive,
                entry.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (item is null)
            return NotFound();

        var parsed = ParseDescription(item.Description);
        return Ok(new CalendarEventDto(
            item.Id,
            item.ClassId,
            item.ClassName,
            item.Title,
            parsed.Description,
            item.Type,
            item.Category,
            item.StartAt,
            item.EndAt,
            item.IsAllDay,
            item.IsActive,
            item.CreatedAt,
            parsed.RequiredMaterials,
            parsed.DressCodeNotes,
            parsed.ParentNotificationText
        ));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertCalendarEventRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
            return BadRequest(new { message = validationError });

        var schoolId = GetSchoolId();
        if (schoolId == Guid.Empty)
            return Unauthorized();

        var entity = await _db.SchoolCalendarEvents.FirstOrDefaultAsync(item => item.Id == id && item.SchoolId == schoolId);
        if (entity is null)
            return NotFound();

        if (request.ClassId.HasValue)
        {
            var classExists = await _db.Classes.AnyAsync(c => c.Id == request.ClassId.Value && c.SchoolId == schoolId);
            if (!classExists)
                return BadRequest(new { message = "Secilen sinif bu okula ait degil." });
        }

        entity.ClassId = request.ClassId;
        entity.Title = request.Title.Trim();
        entity.Type = request.EventType.Trim().ToLowerInvariant();
        entity.Category = Normalize(request.Category);
        entity.Description = ComposeDescription(
            Normalize(request.Description),
            Normalize(request.RequiredMaterials),
            Normalize(request.DressCodeNotes),
            Normalize(request.ParentNotificationText));
        entity.StartAt = request.StartAt;
        entity.EndAt = request.EndAt;
        entity.IsAllDay = request.IsAllDay;
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

        var entity = await _db.SchoolCalendarEvents.FirstOrDefaultAsync(item => item.Id == id && item.SchoolId == schoolId);
        if (entity is null)
            return NotFound();

        entity.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static string? ValidateRequest(UpsertCalendarEventRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return "Etkinlik basligi zorunludur.";

        if (request.Title.Trim().Length > 180)
            return "Etkinlik basligi en fazla 180 karakter olabilir.";

        if (string.IsNullOrWhiteSpace(request.EventType))
            return "Etkinlik tipi zorunludur.";

        if (request.EventType.Trim().Length > 40 || !AllowedEventTypes.Contains(request.EventType.Trim()))
            return "Etkinlik tipi gecersiz.";

        if (!string.IsNullOrWhiteSpace(request.Category) && request.Category.Trim().Length > 80)
            return "Kategori en fazla 80 karakter olabilir.";

        if (!string.IsNullOrWhiteSpace(request.Description) && request.Description.Trim().Length > 700)
            return "Aciklama en fazla 700 karakter olabilir.";

        if (!string.IsNullOrWhiteSpace(request.RequiredMaterials) && request.RequiredMaterials.Trim().Length > 250)
            return "Gerekli malzeme metni en fazla 250 karakter olabilir.";

        if (!string.IsNullOrWhiteSpace(request.DressCodeNotes) && request.DressCodeNotes.Trim().Length > 150)
            return "Kiyafet notu en fazla 150 karakter olabilir.";

        if (!string.IsNullOrWhiteSpace(request.ParentNotificationText) && request.ParentNotificationText.Trim().Length > 250)
            return "Veli bildirimi metni en fazla 250 karakter olabilir.";

        if (request.EndAt.HasValue && request.EndAt.Value < request.StartAt)
            return "Bitis tarihi baslangictan once olamaz.";

        return null;
    }

    private static string? ComposeDescription(
        string? description,
        string? requiredMaterials,
        string? dressCodeNotes,
        string? parentNotificationText)
    {
        var metadata = new CalendarEventMetadata
        {
            RequiredMaterials = requiredMaterials,
            DressCodeNotes = dressCodeNotes,
            ParentNotificationText = parentNotificationText
        };

        var hasMetadata =
            metadata.RequiredMaterials is not null ||
            metadata.DressCodeNotes is not null ||
            metadata.ParentNotificationText is not null;

        if (!hasMetadata)
            return description;

        var metadataJson = JsonSerializer.Serialize(metadata);
        var metadataBlock = $"{MetadataPrefix}{metadataJson}";
        const int maxLength = 1000;

        if (string.IsNullOrWhiteSpace(description))
            return metadataBlock.Length <= maxLength ? metadataBlock : metadataBlock[..maxLength];

        var normalized = description.Trim();
        var availableForDescription = maxLength - metadataBlock.Length;
        if (availableForDescription <= 0)
            return metadataBlock[..maxLength];

        if (normalized.Length > availableForDescription)
            normalized = normalized[..availableForDescription];

        return $"{normalized}{metadataBlock}";
    }

    private static ParsedCalendarEventDescription ParseDescription(string? rawDescription)
    {
        if (string.IsNullOrWhiteSpace(rawDescription))
            return new ParsedCalendarEventDescription(null, null, null, null);

        var markerIndex = rawDescription.IndexOf(MetadataPrefix, StringComparison.Ordinal);
        if (markerIndex < 0)
            return new ParsedCalendarEventDescription(rawDescription.Trim(), null, null, null);

        var descriptionPart = rawDescription[..markerIndex].Trim();
        var metadataPart = rawDescription[(markerIndex + MetadataPrefix.Length)..].Trim();

        if (string.IsNullOrWhiteSpace(metadataPart))
            return new ParsedCalendarEventDescription(descriptionPart, null, null, null);

        try
        {
            var metadata = JsonSerializer.Deserialize<CalendarEventMetadata>(metadataPart);
            return new ParsedCalendarEventDescription(
                string.IsNullOrWhiteSpace(descriptionPart) ? null : descriptionPart,
                Normalize(metadata?.RequiredMaterials),
                Normalize(metadata?.DressCodeNotes),
                Normalize(metadata?.ParentNotificationText));
        }
        catch
        {
            // Backward compatibility: if metadata cannot be parsed, keep original description.
            return new ParsedCalendarEventDescription(rawDescription.Trim(), null, null, null);
        }
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private Guid GetSchoolId() => HttpContext.Items["SchoolId"] is Guid schoolId ? schoolId : Guid.Empty;
    private Guid GetUserId() => HttpContext.Items["UserId"] is Guid userId ? userId : Guid.Empty;

    private sealed class CalendarEventMetadata
    {
        public string? RequiredMaterials { get; set; }
        public string? DressCodeNotes { get; set; }
        public string? ParentNotificationText { get; set; }
    }
}

public record CalendarEventDto(
    Guid Id,
    Guid? ClassId,
    string? ClassName,
    string Title,
    string? Description,
    string Type,
    string? Category,
    DateTime StartAt,
    DateTime? EndAt,
    bool IsAllDay,
    bool IsActive,
    DateTime CreatedAt,
    string? RequiredMaterials,
    string? DressCodeNotes,
    string? ParentNotificationText
);

public record UpsertCalendarEventRequest(
    Guid? ClassId,
    string Title,
    string EventType,
    DateTime StartAt,
    DateTime? EndAt,
    bool IsAllDay,
    bool IsActive,
    string? Description,
    string? Category,
    string? RequiredMaterials,
    string? DressCodeNotes,
    string? ParentNotificationText
);

public record ParsedCalendarEventDescription(
    string? Description,
    string? RequiredMaterials,
    string? DressCodeNotes,
    string? ParentNotificationText
);
