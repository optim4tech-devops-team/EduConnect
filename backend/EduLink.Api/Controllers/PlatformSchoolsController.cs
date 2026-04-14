using EduLink.Application.Services;
using EduLink.Domain.Entities;
using EduLink.Domain.Enums;
using EduLink.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace EduLink.Api.Controllers;

[ApiController]
[Route("api/platform/schools")]
[Authorize(Roles = "Admin")]
public class PlatformSchoolsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _email;
    private readonly ISmsService _sms;

    // Panel URL for school admins — override via Sms:SchoolPanelUrl config
    private const string DefaultPanelUrl = "https://school.bidyno.com";

    public PlatformSchoolsController(AppDbContext db, IEmailService email, ISmsService sms)
    {
        _db    = db;
        _email = email;
        _sms   = sms;
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
                PrimaryAdminName  = s.PrimaryAdmin != null ? s.PrimaryAdmin.FullName : null,
                PrimaryAdminPhone = s.PrimaryAdmin != null ? s.PrimaryAdmin.Phone : null,
                TeacherCount  = s.Users.Count(u => u.Role == UserRole.Teacher  && u.IsActive),
                ParentCount   = s.Users.Count(u => u.Role == UserRole.Parent   && u.IsActive),
                StudentCount  = s.Classes.SelectMany(c => c.Students).Count(st => st.IsActive),
                ClassCount    = s.Classes.Count,
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
                TeacherCount    = s.Users.Count(u => u.Role == UserRole.Teacher    && u.IsActive),
                ParentCount     = s.Users.Count(u => u.Role == UserRole.Parent     && u.IsActive),
                SchoolAdminCount = s.Users.Count(u => u.Role == UserRole.SchoolAdmin && u.IsActive),
                StudentCount    = s.Classes.SelectMany(c => c.Students).Count(st => st.IsActive),
                ClassCount      = s.Classes.Count,
                s.CreatedAt
            })
            .FirstOrDefaultAsync();

        return school is null ? NotFound() : Ok(school);
    }

    [HttpPost]
    public async Task<IActionResult> CreateSchool([FromBody] CreatePlatformSchoolRequest request)
    {
        // Primary admin is now required
        if (request.PrimaryAdmin is null)
            return BadRequest(new { message = "Okul yöneticisi bilgileri zorunludur." });

        if (string.IsNullOrWhiteSpace(request.PrimaryAdmin.FullName))
            return BadRequest(new { message = "Yönetici adı soyadı zorunludur." });

        if (string.IsNullOrWhiteSpace(request.PrimaryAdmin.Email))
            return BadRequest(new { message = "Yönetici e-posta adresi zorunludur." });

        if (string.IsNullOrWhiteSpace(request.PrimaryAdmin.Phone))
            return BadRequest(new { message = "Yönetici telefon numarası zorunludur." });

        var school = new School
        {
            Id               = Guid.NewGuid(),
            Name             = request.Name.Trim(),
            Address          = request.Address?.Trim(),
            Phone            = NormalizePhoneNumber(request.Phone),
            LogoUrl          = request.LogoUrl,
            IsActive         = request.IsActive,
            Plan             = string.IsNullOrWhiteSpace(request.Plan) ? "starter" : request.Plan.Trim().ToLowerInvariant(),
            MaxStudents      = request.MaxStudents,
            MaxTeachers      = request.MaxTeachers,
            SubscriptionEndsAt = request.SubscriptionEndsAt,
            CreatedAt        = DateTime.UtcNow
        };

        var tempPassword = GenerateTemporaryPassword();

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            _db.Schools.Add(school);
            await _db.SaveChangesAsync();

            var assignResult = await UpsertPrimarySchoolAdminAsync(school, request.PrimaryAdmin, tempPassword);
            if (assignResult is not null)
            {
                await tx.RollbackAsync();
                return assignResult;
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        // Send welcome SMS + email with credentials (outside transaction — non-critical)
        _ = SendWelcomeNotificationsAsync(
            toEmail:      request.PrimaryAdmin.Email.Trim(),
            toName:       request.PrimaryAdmin.FullName.Trim(),
            toPhone:      NormalizePhoneNumber(request.PrimaryAdmin.Phone),
            schoolName:   school.Name,
            tempPassword: tempPassword);

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

        if (request.Name        is not null) school.Name        = request.Name.Trim();
        if (request.Address     is not null) school.Address     = request.Address.Trim();
        if (request.Phone       is not null) school.Phone       = NormalizePhoneNumber(request.Phone);
        if (request.LogoUrl     is not null) school.LogoUrl     = request.LogoUrl;
        if (request.IsActive.HasValue)       school.IsActive    = request.IsActive.Value;
        if (request.Plan        is not null) school.Plan        = request.Plan.Trim().ToLowerInvariant();
        if (request.MaxStudents.HasValue)    school.MaxStudents = request.MaxStudents.Value;
        if (request.MaxTeachers.HasValue)    school.MaxTeachers = request.MaxTeachers.Value;
        if (request.SubscriptionEndsAt.HasValue) school.SubscriptionEndsAt = request.SubscriptionEndsAt;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Okul güncellendi." });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSchool(Guid id)
    {
        var platformSchoolId = Guid.Parse("FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF");
        if (id == platformSchoolId)
            return BadRequest(new { message = "Platform okulu silinemez." });

        var school = await _db.Schools.FirstOrDefaultAsync(s => s.Id == id);
        if (school is null)
            return NotFound();

        // Reset primary admin user's school to platform school so FK doesn't block delete
        var adminUser = school.PrimaryAdminUserId.HasValue
            ? await _db.Users.FirstOrDefaultAsync(u => u.Id == school.PrimaryAdminUserId)
            : null;

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            // Detach admin user from this school
            if (adminUser is not null)
            {
                _db.Users.Remove(adminUser);
            }

            school.PrimaryAdminUserId = null;
            await _db.SaveChangesAsync();

            _db.Schools.Remove(school);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return NoContent();
    }

    [HttpPost("{id:guid}/assign-admin")]
    public async Task<IActionResult> AssignAdmin(Guid id, [FromBody] AssignPlatformSchoolAdminRequest request)
    {
        var school = await _db.Schools.FirstOrDefaultAsync(s => s.Id == id);
        if (school is null)
            return NotFound();

        var tempPassword = GenerateTemporaryPassword();
        var result = await UpsertPrimarySchoolAdminAsync(
            school,
            new SchoolAdminSeedRequest(request.FullName, request.Phone, request.Email, request.AvatarUrl),
            tempPassword);

        if (result is not null)
            return result;

        _ = SendWelcomeNotificationsAsync(
            toEmail:      request.Email ?? "",
            toName:       request.FullName,
            toPhone:      NormalizePhoneNumber(request.Phone),
            schoolName:   school.Name,
            tempPassword: tempPassword);

        return Ok(new { school.Id, school.PrimaryAdminUserId });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task<IActionResult?> UpsertPrimarySchoolAdminAsync(
        School school,
        SchoolAdminSeedRequest request,
        string tempPassword)
    {
        var normalizedPhone = NormalizePhoneNumber(request.Phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return BadRequest(new { message = "Geçerli bir okul yöneticisi telefonu zorunludur." });

        var email = ResolveEmail(request.Email, normalizedPhone, "schooladmin");

        if (await _db.Users.AnyAsync(u => u.SchoolId != school.Id && (u.Email == email || u.Phone == normalizedPhone)))
            return Conflict(new { message = "Verilen e-posta veya telefon başka bir okulda kullanılıyor." });

        var existingUser = await _db.Users.FirstOrDefaultAsync(u =>
            (u.Email == email || u.Phone == normalizedPhone) &&
            u.SchoolId == school.Id);

        if (existingUser is null)
        {
            existingUser = new User
            {
                Id                 = Guid.NewGuid(),
                FullName           = request.FullName.Trim(),
                Email              = email,
                Phone              = normalizedPhone,
                AvatarUrl          = request.AvatarUrl,
                PasswordHash       = BCrypt.Net.BCrypt.HashPassword(tempPassword),
                Role               = UserRole.SchoolAdmin,
                SchoolId           = school.Id,
                IsActive           = true,
                MustChangePassword = true,
                CreatedAt          = DateTime.UtcNow
            };
            _db.Users.Add(existingUser);
        }
        else
        {
            existingUser.FullName           = request.FullName.Trim();
            existingUser.Email              = email;
            existingUser.Phone              = normalizedPhone;
            existingUser.AvatarUrl          = request.AvatarUrl;
            existingUser.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(tempPassword);
            existingUser.Role               = UserRole.SchoolAdmin;
            existingUser.IsActive           = true;
            existingUser.MustChangePassword = true;
        }

        school.PrimaryAdminUserId = existingUser.Id;
        await _db.SaveChangesAsync();
        return null;
    }

    private async Task SendWelcomeNotificationsAsync(
        string toEmail, string toName, string toPhone, string schoolName, string tempPassword)
    {
        // 1 — SMS (primary channel)
        if (!string.IsNullOrWhiteSpace(toPhone))
        {
            try
            {
                var smsText =
                    $"Notio - {schoolName} okul yönetici hesabınız oluşturuldu.\n" +
                    $"Panel: {DefaultPanelUrl}\n" +
                    $"Şifre: {tempPassword}\n" +
                    $"İlk girişte şifrenizi değiştirmeniz gerekmektedir.";

                if (_sms is NetgsmSmsService netgsm)
                    await netgsm.SendRawAsync(toPhone, smsText);
                else
                    await _sms.SendOtpAsync(toPhone, tempPassword); // fallback
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[SMS] Welcome SMS failed for {toPhone}: {ex.Message}");
            }
        }

        // 2 — Email (secondary channel)
        if (string.IsNullOrWhiteSpace(toEmail)) return;

        try
        {
            var subject = $"Notio – {schoolName} Okul Yönetici Hesabınız";
            var html = $"""
                <!DOCTYPE html>
                <html lang="tr">
                <head><meta charset="utf-8"/></head>
                <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center" style="padding:40px 20px;">
                      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                          <td style="background:linear-gradient(135deg,#FF8C42,#FF6B1A);padding:32px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Notio</h1>
                            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Platform Yönetimi</p>
                          </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                          <td style="padding:36px 40px;">
                            <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e;">Merhaba <strong>{toName}</strong>,</p>
                            <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.6;">
                              <strong>{schoolName}</strong> okulu için yönetici hesabınız oluşturulmuştur.
                              Aşağıdaki bilgilerle sisteme giriş yapabilirsiniz.
                            </p>

                            <!-- Credentials Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:24px;">
                              <tr>
                                <td style="padding:20px 24px;">
                                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Giriş Bilgileri</p>
                                  <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                      <td style="padding:6px 0;font-size:13px;color:#64748b;width:120px;">E-posta</td>
                                      <td style="padding:6px 0;font-size:14px;color:#1a1a2e;font-weight:600;">{toEmail}</td>
                                    </tr>
                                    <tr>
                                      <td style="padding:6px 0;font-size:13px;color:#64748b;">Geçici Şifre</td>
                                      <td style="padding:6px 0;">
                                        <span style="font-size:15px;font-weight:700;color:#FF8C42;background:#fff4ed;padding:3px 10px;border-radius:6px;letter-spacing:1px;">{tempPassword}</span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;line-height:1.6;">
                              ⚠️ İlk girişinizde şifrenizi değiştirmenizi öneririz.
                            </p>

                            <p style="margin:0;font-size:14px;color:#4a5568;">
                              Herhangi bir sorunuz için platform yöneticisiyle iletişime geçebilirsiniz.
                            </p>
                          </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                          <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#cbd5e1;">© {DateTime.UtcNow.Year} Notio Platform. Tüm hakları saklıdır.</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """;

            await _email.SendAsync(toEmail, toName, subject, html);
        }
        catch (Exception ex)
        {
            // Email failure must not break school creation — log and continue
            Console.Error.WriteLine($"[EMAIL] Welcome email failed for {toEmail}: {ex.Message}");
        }
    }

    private static string GenerateTemporaryPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        var bytes = RandomNumberGenerator.GetBytes(10);
        var sb = new StringBuilder();
        foreach (var b in bytes)
            sb.Append(chars[b % chars.Length]);
        // Ensure at least one digit and one uppercase
        return $"Nt{sb.ToString()[..8]}!";
    }

    private static string NormalizePhoneNumber(string? phoneNumber)
    {
        var digits = new string((phoneNumber ?? string.Empty).Where(char.IsDigit).ToArray());
        if (string.IsNullOrWhiteSpace(digits)) return string.Empty;

        if (digits.StartsWith("0090"))       digits = digits[4..];
        else if (digits.StartsWith("90") && digits.Length == 12) digits = digits[2..];

        if (digits.Length == 10) digits = $"0{digits}";
        return digits;
    }

    private static string ResolveEmail(string? email, string normalizedPhone, string prefix)
    {
        if (!string.IsNullOrWhiteSpace(email))
            return email.Trim().ToLowerInvariant();

        return $"{prefix}.{normalizedPhone}@notioedu.com";
    }
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

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
