using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EduLink.Application.DTOs.Auth;
using EduLink.Domain.Entities;
using EduLink.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace EduLink.Application.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ISmsService _sms;

    public AuthService(AppDbContext db, IConfiguration config, ISmsService sms)
    {
        _db = db;
        _config = config;
        _sms = sms;
    }

    public async Task<LookupResponse?> LookupAsync(string phoneNumber)
    {
        var normalizedPhone = NormalizePhoneNumber(phoneNumber);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return null;

        var user = await FindActiveUserByPhoneAsync(normalizedPhone, includeSchool: true);

        if (user is null) return null;

        var masked = MaskPhoneNumber(user.Phone ?? normalizedPhone);

        return new LookupResponse(
            SchoolName: user.School.Name,
            SchoolLogoUrl: user.School.LogoUrl,
            MaskedIdentifier: masked
        );
    }

    public async Task<bool> SendOtpAsync(string phoneNumber)
    {
        var normalizedPhone = NormalizePhoneNumber(phoneNumber);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return false;

        var user = await FindActiveUserByPhoneAsync(normalizedPhone);

        if (user is null) return false;

        // Expire existing unused OTPs for this identifier
        var existing = await _db.OtpCodes
            .Where(o => o.Identifier == normalizedPhone && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();
        foreach (var o in existing) o.IsUsed = true;

        var code = Random.Shared.Next(100000, 999999).ToString();
        _db.OtpCodes.Add(new OtpCode
        {
            Identifier = normalizedPhone,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5)
        });
        await _db.SaveChangesAsync();

        await _sms.SendOtpAsync(normalizedPhone, code);
        return true;
    }

    public async Task<LoginResponse?> VerifyOtpAsync(string phoneNumber, string code)
    {
        var normalizedPhone = NormalizePhoneNumber(phoneNumber);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            return null;

        // Master bypass code for testing — disable in production via config
        var masterCode = _config["Otp:MasterCode"];
        var isMasterCode = !string.IsNullOrWhiteSpace(masterCode) && code == masterCode;

        OtpCode? otp = null;
        if (!isMasterCode)
        {
            otp = await _db.OtpCodes
                .Where(o =>
                    o.Identifier == normalizedPhone &&
                    o.Code == code &&
                    !o.IsUsed &&
                    o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();

            if (otp is null) return null;
            otp.IsUsed = true;
        }

        var user = await FindActiveUserByPhoneAsync(normalizedPhone, includeSchool: true);

        if (user is null) return null;

        var accessToken = GenerateAccessToken(user.Id, user.Email, user.Role.ToString(), user.SchoolId);
        var refreshToken = GenerateRefreshToken();

        var refreshExpiryDays = _config.GetValue<int>("Jwt:RefreshExpiryDays", 30);
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _db.SaveChangesAsync();

        return new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            Role: user.Role.ToString(),
            UserId: user.Id,
            FullName: user.FullName,
            AvatarUrl: user.AvatarUrl,
            SchoolId: user.SchoolId,
            Email: user.Email,
            Phone: user.Phone,
            MustChangePassword: user.MustChangePassword
        );
    }

    private async Task<User?> FindActiveUserByPhoneAsync(string phoneNumber, bool includeSchool = false)
    {
        var candidates = BuildPhoneLookupCandidates(phoneNumber);
        if (candidates.Count == 0)
            return null;

        IQueryable<User> query = _db.Users;
        if (includeSchool)
            query = query.Include(u => u.School);

        return await query.FirstOrDefaultAsync(u =>
            u.IsActive &&
            u.Phone != null &&
            candidates.Contains(
                u.Phone
                    .Replace(" ", "")
                    .Replace("-", "")
                    .Replace("(", "")
                    .Replace(")", "")
                    .Replace("+", "")));
    }

    private static string NormalizePhoneNumber(string phoneNumber)
    {
        var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());
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

    private static List<string> BuildPhoneLookupCandidates(string phoneNumber)
    {
        var normalized = NormalizePhoneNumber(phoneNumber);
        if (string.IsNullOrWhiteSpace(normalized))
            return [];

        var candidates = new HashSet<string>(StringComparer.Ordinal)
        {
            normalized
        };

        if (normalized.Length == 11 && normalized.StartsWith('0'))
        {
            var local = normalized[1..];
            candidates.Add(local);
            candidates.Add($"90{local}");
        }

        return [.. candidates];
    }

    private static string MaskPhoneNumber(string phoneNumber)
    {
        var normalized = NormalizePhoneNumber(phoneNumber);
        if (normalized.Length <= 4)
            return new string('*', normalized.Length);

        return new string('*', normalized.Length - 4) + normalized[^4..];
    }

    public async Task<LoginResponse?> LoginAsync(string email, string password)
    {
        var user = await _db.Users
            .Include(u => u.School)
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive);

        if (user is null)
            return null;

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        var accessToken = GenerateAccessToken(user.Id, user.Email, user.Role.ToString(), user.SchoolId);
        var refreshToken = GenerateRefreshToken();

        var refreshExpiryDays = _config.GetValue<int>("Jwt:RefreshExpiryDays", 30);
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _db.SaveChangesAsync();

        return new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            Role: user.Role.ToString(),
            UserId: user.Id,
            FullName: user.FullName,
            AvatarUrl: user.AvatarUrl,
            SchoolId: user.SchoolId,
            Email: user.Email,
            Phone: user.Phone,
            MustChangePassword: user.MustChangePassword
        );
    }

    public async Task<LoginResponse?> RefreshAsync(string refreshToken)
    {
        var user = await _db.Users
            .Include(u => u.School)
            .FirstOrDefaultAsync(u =>
                u.RefreshToken == refreshToken &&
                u.RefreshTokenExpiry > DateTime.UtcNow &&
                u.IsActive);

        if (user is null)
            return null;

        var accessToken = GenerateAccessToken(user.Id, user.Email, user.Role.ToString(), user.SchoolId);
        var newRefreshToken = GenerateRefreshToken();

        var refreshExpiryDays = _config.GetValue<int>("Jwt:RefreshExpiryDays", 30);
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _db.SaveChangesAsync();

        return new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: newRefreshToken,
            Role: user.Role.ToString(),
            UserId: user.Id,
            FullName: user.FullName,
            AvatarUrl: user.AvatarUrl,
            SchoolId: user.SchoolId,
            Email: user.Email,
            Phone: user.Phone
        );
    }

    public async Task<bool> LogoutAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null) return false;

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await _db.SaveChangesAsync();
        return true;
    }

    private string GenerateAccessToken(Guid userId, string email, string role, Guid schoolId)
    {
        var secret = _config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        var expiryMinutes = _config.GetValue<int>("Jwt:ExpiryMinutes", 60);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("role", role),
            new Claim("schoolId", schoolId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
