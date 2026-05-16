using EduLink.Application.DTOs.Students;
using EduLink.Application.Services;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO.Compression;
using System.Text.Json;
using System.Xml.Linq;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/students")]
[Authorize]
public class StudentsController : ControllerBase
{
    private static readonly JsonSerializerOptions StudentProfileJsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _db;
    private readonly AiService _aiService;
    private readonly IWebHostEnvironment _environment;

    public StudentsController(AppDbContext db, AiService aiService, IWebHostEnvironment environment)
    {
        _db = db;
        _aiService = aiService;
        _environment = environment;
    }

    /// <summary>Returns all students. School admins/teachers can filter by classId.</summary>
    [HttpGet]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> GetStudents([FromQuery] Guid? classId)
    {
        var schoolId = GetSchoolId();

        var query = _db.Students
            .Include(s => s.Class)
            .Include(s => s.StudentParents)
                .ThenInclude(sp => sp.Parent)
            .Include(s => s.StudentBadges)
            .Where(s => s.Class.SchoolId == schoolId);

        if (classId.HasValue)
            query = query.Where(s => s.ClassId == classId.Value);

        var students = await query
            .OrderBy(s => s.FullName)
            .ToListAsync();

        return Ok(students.Select(BuildStudentDto).ToList());
    }

    /// <summary>Creates a new student.</summary>
    [HttpPost]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> CreateStudent([FromBody] CreateStudentRequest request)
    {
        var schoolId = GetSchoolId();

        // Verify the class belongs to this school
        var classExists = await _db.Classes
            .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId);

        if (!classExists)
            return BadRequest(new { message = "Class not found or does not belong to your school." });

        var student = new Student
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName,
            ClassId = request.ClassId,
            BirthDate = request.BirthDate,
            Notes = SerializeStudentProfile(request),
            AvatarUrl = request.AvatarUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Students.Add(student);
        await _db.SaveChangesAsync();

        var cls = await _db.Classes.FindAsync(request.ClassId);

        student.Class = cls!;

        var dto = BuildStudentDto(student);

        return CreatedAtAction(nameof(GetStudent), new { id = student.Id }, dto);
    }

    /// <summary>Returns a single student by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetStudent(Guid id)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .Include(s => s.StudentParents)
                .ThenInclude(sp => sp.Parent)
            .Include(s => s.StudentBadges)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        var dto = BuildStudentDto(student);

        return Ok(dto);
    }

    /// <summary>Updates an existing student.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> UpdateStudent(Guid id, [FromBody] CreateStudentRequest request)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        // Verify new class belongs to school
        var classExists = await _db.Classes
            .AnyAsync(c => c.Id == request.ClassId && c.SchoolId == schoolId);

        if (!classExists)
            return BadRequest(new { message = "Class not found or does not belong to your school." });

        student.FullName = request.FullName;
        student.ClassId = request.ClassId;
        student.BirthDate = request.BirthDate;
        student.Notes = SerializeStudentProfile(request);
        student.AvatarUrl = request.AvatarUrl;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Uploads a student avatar image and returns a public URL.</summary>
    [HttpPost("avatar-upload")]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> UploadAvatar([FromForm] StudentAvatarUploadRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { message = "Bir gorsel dosyasi secmelisin." });

        if (string.IsNullOrWhiteSpace(request.File.ContentType) || !request.File.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Sadece gorsel dosyalari yuklenebilir." });

        var extension = Path.GetExtension(request.File.FileName);
        if (string.IsNullOrWhiteSpace(extension))
            extension = ".jpg";

        var uploadsRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(uploadsRoot))
        {
            uploadsRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var studentUploadsPath = Path.Combine(uploadsRoot, "uploads", "students");
        Directory.CreateDirectory(studentUploadsPath);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(studentUploadsPath, fileName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await request.File.CopyToAsync(stream);
        }

        var publicUrl = $"{Request.Scheme}://{Request.Host}/uploads/students/{fileName}";
        return Ok(new { url = publicUrl });
    }

    /// <summary>Imports students in bulk from a Notio template XLSX file.</summary>
    [HttpPost("import")]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> ImportStudents([FromForm] StudentImportRequest request)
    {
        if (request.File is null || request.File.Length == 0)
            return BadRequest(new { message = "Import icin bir Excel dosyasi secmelisin." });

        try
        {
            var schoolId = GetSchoolId();
            var rows = await ParseStudentImportRowsAsync(request.File);
            var classes = await _db.Classes
                .Where(c => c.SchoolId == schoolId)
                .ToListAsync();

            var classMap = classes
                .GroupBy(c => c.Name.Trim().ToLowerInvariant())
                .ToDictionary(g => g.Key, g => g.First());

            var imported = 0;
            var errors = new List<string>();

            foreach (var row in rows)
            {
                if (string.IsNullOrWhiteSpace(row.FullName) && string.IsNullOrWhiteSpace(row.ClassName))
                    continue;

                if (string.IsNullOrWhiteSpace(row.FullName))
                {
                    errors.Add($"Satir {row.RowNumber}: Ogrenci adi zorunludur.");
                    continue;
                }

                if (string.IsNullOrWhiteSpace(row.ClassName))
                {
                    errors.Add($"Satir {row.RowNumber}: Sinif adi zorunludur.");
                    continue;
                }

                if (!classMap.TryGetValue(row.ClassName.Trim().ToLowerInvariant(), out var cls))
                {
                    errors.Add($"Satir {row.RowNumber}: '{row.ClassName}' sinifi bulunamadi.");
                    continue;
                }

                DateOnly? birthDate = null;
                if (!string.IsNullOrWhiteSpace(row.BirthDate))
                {
                    if (!DateOnly.TryParse(row.BirthDate, out var parsedBirthDate))
                    {
                        errors.Add($"Satir {row.RowNumber}: Dogum tarihi YYYY-MM-DD formatinda olmali.");
                        continue;
                    }

                    birthDate = parsedBirthDate;
                }

                _db.Students.Add(new Student
                {
                    Id = Guid.NewGuid(),
                    FullName = row.FullName.Trim(),
                    ClassId = cls.Id,
                    BirthDate = birthDate,
                    Notes = SerializeStudentProfile(row),
                    AvatarUrl = string.IsNullOrWhiteSpace(row.AvatarUrl) ? null : row.AvatarUrl.Trim(),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                imported += 1;
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                imported,
                failed = errors.Count,
                errors
            });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    /// <summary>Soft-deletes a student by setting IsActive to false.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> DeleteStudent(Guid id)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound();

        student.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Assigns a parent user to a student.</summary>
    [HttpPost("{id:guid}/assign-parent")]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> AssignParent(Guid id, [FromBody] AssignParentRequest request)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound(new { message = "Student not found." });

        var parent = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == request.ParentId && u.SchoolId == schoolId && u.Role == Domain.Enums.UserRole.Parent);

        if (parent is null)
            return BadRequest(new { message = "Parent user not found." });

        var alreadyLinked = await _db.StudentParents
            .AnyAsync(sp => sp.StudentId == id && sp.ParentId == request.ParentId);

        if (alreadyLinked)
            return Conflict(new { message = "Parent is already assigned to this student." });

        _db.StudentParents.Add(new StudentParent
        {
            StudentId = id,
            ParentId = request.ParentId
        });

        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Enqueues a Hangfire job to enroll the student's face photos in the AI service.</summary>
    [HttpPost("{id:guid}/enroll-face")]
    [Authorize(Roles = "SchoolAdmin,Teacher")]
    public async Task<IActionResult> EnrollFace(Guid id, [FromBody] EnrollFaceRequest request)
    {
        var schoolId = GetSchoolId();

        var student = await _db.Students
            .Include(s => s.Class)
            .FirstOrDefaultAsync(s => s.Id == id && s.Class.SchoolId == schoolId);

        if (student is null)
            return NotFound(new { message = "Student not found." });

        if (request.PhotoUrls is null || request.PhotoUrls.Count == 0)
            return BadRequest(new { message = "At least one photo URL is required." });

        // Enqueue Hangfire background job
        BackgroundJob.Enqueue<AiService>(svc =>
            svc.EnrollFacesAsync(id, request.PhotoUrls));

        return Accepted(new { message = "Face enrollment job enqueued." });
    }

    private Guid GetSchoolId()
    {
        var val = HttpContext.Items["SchoolId"];
        return val is Guid g ? g : Guid.Empty;
    }

    private static async Task<List<StudentImportRow>> ParseStudentImportRowsAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        return extension switch
        {
            ".xlsx" => await ParseXlsxRowsAsync(stream),
            _ => throw new InvalidOperationException("Yalnizca .xlsx uzantili Notio Excel sablonu destekleniyor.")
        };
    }

    private static async Task<List<StudentImportRow>> ParseXlsxRowsAsync(Stream stream)
    {
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory);
        memory.Position = 0;

        using var archive = new ZipArchive(memory, ZipArchiveMode.Read, leaveOpen: false);
        var sharedStrings = ReadSharedStrings(archive);
        var sheetEntry = archive.GetEntry("xl/worksheets/sheet1.xml")
            ?? throw new InvalidOperationException("Excel dosyasinda ilk sayfa bulunamadi.");

        using var sheetStream = sheetEntry.Open();
        var sheet = XDocument.Load(sheetStream);
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        var rows = sheet.Descendants(ns + "sheetData").Elements(ns + "row").ToList();
        if (rows.Count == 0)
            return new List<StudentImportRow>();

        var headers = ReadRowValues(rows[0], sharedStrings);
        var indexMap = headers
            .Select((value, index) => new { value = value.Trim(), index })
            .Where(item => !string.IsNullOrWhiteSpace(item.value))
            .ToDictionary(item => item.value, item => item.index, StringComparer.OrdinalIgnoreCase);

        var requiredHeaders = new[] { "FullName", "ClassName" };
        var missingHeaders = requiredHeaders
            .Where(header => !indexMap.ContainsKey(header))
            .ToList();

        if (missingHeaders.Count > 0)
            throw new InvalidOperationException($"Excel sablonunda eksik kolon var: {string.Join(", ", missingHeaders)}");

        var result = new List<StudentImportRow>();
        foreach (var row in rows.Skip(1))
        {
            var values = ReadRowValues(row, sharedStrings);
            string GetValue(string key)
                => indexMap.TryGetValue(key, out var idx) && idx < values.Count ? values[idx] : string.Empty;

            result.Add(new StudentImportRow(
                (int?)row.Attribute("r") ?? 0,
                GetValue("FullName"),
                GetValue("ClassName"),
                GetValue("BirthDate"),
                GetValue("Gender"),
                GetValue("Allergies"),
                GetValue("MedicationNotes"),
                GetValue("HealthNotes"),
                string.IsNullOrWhiteSpace(GetValue("HealthNotes")) ? GetValue("Notes") : GetValue("HealthNotes"),
                GetValue("AvatarUrl")
            ));
        }

        return result;
    }

    private static List<string> ReadSharedStrings(ZipArchive archive)
    {
        var sharedStringEntry = archive.GetEntry("xl/sharedStrings.xml");
        if (sharedStringEntry is null)
            return new List<string>();

        using var sharedStream = sharedStringEntry.Open();
        var doc = XDocument.Load(sharedStream);
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        return doc.Descendants(ns + "si")
            .Select(si => string.Concat(si.Descendants(ns + "t").Select(t => t.Value)))
            .ToList();
    }

    private static List<string> ReadRowValues(XElement row, List<string> sharedStrings)
    {
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        var cells = row.Elements(ns + "c").ToList();
        var values = new List<string>();

        foreach (var cell in cells)
        {
            var cellReference = (string?)cell.Attribute("r") ?? string.Empty;
            var columnIndex = GetColumnIndex(cellReference);
            while (values.Count < columnIndex)
                values.Add(string.Empty);

            values.Add(ReadCellValue(cell, sharedStrings));
        }

        return values;
    }

    private static string ReadCellValue(XElement cell, List<string> sharedStrings)
    {
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        var cellType = (string?)cell.Attribute("t");
        if (string.Equals(cellType, "inlineStr", StringComparison.OrdinalIgnoreCase))
            return cell.Element(ns + "is")?.Element(ns + "t")?.Value ?? string.Empty;

        var rawValue = cell.Element(ns + "v")?.Value ?? string.Empty;
        if (string.Equals(cellType, "s", StringComparison.OrdinalIgnoreCase) &&
            int.TryParse(rawValue, out var sharedIndex) &&
            sharedIndex >= 0 &&
            sharedIndex < sharedStrings.Count)
        {
            return sharedStrings[sharedIndex];
        }

        return rawValue;
    }

    private static int GetColumnIndex(string cellReference)
    {
        var letters = new string(cellReference.TakeWhile(char.IsLetter).ToArray());
        if (string.IsNullOrWhiteSpace(letters))
            return 0;

        var index = 0;
        foreach (var letter in letters.ToUpperInvariant())
            index = (index * 26) + (letter - 'A' + 1);

        return index - 1;
    }

    private static StudentDto BuildStudentDto(Student student)
    {
        var profile = DeserializeStudentProfile(student.Notes);

        return new StudentDto(
            student.Id,
            student.FullName,
            student.BirthDate,
            student.ClassId,
            student.Class?.Name ?? string.Empty,
            student.AvatarUrl,
            profile.Gender,
            profile.Allergies,
            profile.MedicationNotes,
            profile.HealthNotes,
            student.IsActive,
            student.StudentBadges.Count,
            student.StudentParents.Select(sp => new ParentSummaryDto(
                sp.Parent.Id,
                sp.Parent.FullName,
                sp.Parent.Phone,
                sp.Parent.AvatarUrl
            )).ToList()
        );
    }

    private static StudentProfileData DeserializeStudentProfile(string? rawNotes)
    {
        if (string.IsNullOrWhiteSpace(rawNotes))
            return new StudentProfileData(null, null, null, null);

        try
        {
            using var document = JsonDocument.Parse(rawNotes);
            var root = document.RootElement;

            return new StudentProfileData(
                ReadNullableText(root, "gender"),
                ReadAllergyText(root),
                ReadNullableText(root, "medicationNotes"),
                ReadNullableText(root, "healthNotes"));
        }
        catch (JsonException)
        {
        }

        return new StudentProfileData(null, null, null, rawNotes);
    }

    private static string? SerializeStudentProfile(CreateStudentRequest request)
        => SerializeStudentProfile(
            request.Gender,
            request.Allergies,
            request.MedicationNotes,
            request.HealthNotes);

    private static string? SerializeStudentProfile(StudentImportRow row)
        => SerializeStudentProfile(
            row.Gender,
            row.Allergies,
            row.MedicationNotes,
            row.HealthNotes);

    private static string? SerializeStudentProfile(
        string? gender,
        string? allergies,
        string? medicationNotes,
        string? healthNotes)
    {
        var normalizedGender = string.IsNullOrWhiteSpace(gender) ? null : gender.Trim();
        var normalizedAllergies = string.IsNullOrWhiteSpace(allergies) ? null : allergies.Trim();
        var normalizedMedicationNotes = string.IsNullOrWhiteSpace(medicationNotes) ? null : medicationNotes.Trim();
        var normalizedHealthNotes = string.IsNullOrWhiteSpace(healthNotes) ? null : healthNotes.Trim();

        if (normalizedGender is null &&
            normalizedAllergies is null &&
            normalizedMedicationNotes is null &&
            normalizedHealthNotes is null)
        {
            return null;
        }

        return JsonSerializer.Serialize(
            new StudentProfileData(
                normalizedGender,
                normalizedAllergies,
                normalizedMedicationNotes,
                normalizedHealthNotes),
            StudentProfileJsonOptions);
    }

    private static string? ReadAllergyText(JsonElement root)
    {
        if (!TryGetProperty(root, "allergies", out var allergies))
            return null;

        if (allergies.ValueKind == JsonValueKind.String)
            return NormalizeProfileText(allergies.GetString());

        if (allergies.ValueKind == JsonValueKind.Array)
        {
            var values = allergies
                .EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.String)
                .Select(item => NormalizeProfileText(item.GetString()))
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return values.Count > 0 ? string.Join(", ", values) : null;
        }

        return null;
    }

    private static string? ReadNullableText(JsonElement root, string propertyName)
    {
        if (!TryGetProperty(root, propertyName, out var property) || property.ValueKind != JsonValueKind.String)
            return null;

        return NormalizeProfileText(property.GetString());
    }

    private static bool TryGetProperty(JsonElement root, string propertyName, out JsonElement property)
    {
        if (root.TryGetProperty(propertyName, out property))
            return true;

        var pascalCaseName = $"{char.ToUpperInvariant(propertyName[0])}{propertyName[1..]}";
        return root.TryGetProperty(pascalCaseName, out property);
    }

    private static string? NormalizeProfileText(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }
}

// Local request models used only in this controller
public record AssignParentRequest(Guid ParentId);
public record EnrollFaceRequest(List<string> PhotoUrls);
public class StudentAvatarUploadRequest
{
    public IFormFile? File { get; set; }
}
public class StudentImportRequest
{
    public IFormFile? File { get; set; }
}
public record StudentImportRow(
    int RowNumber,
    string FullName,
    string ClassName,
    string BirthDate,
    string Gender,
    string Allergies,
    string MedicationNotes,
    string HealthNotes,
    string Notes,
    string AvatarUrl
);
public record StudentProfileData(
    string? Gender,
    string? Allergies,
    string? MedicationNotes,
    string? HealthNotes
);
